import { Router, type IRouter } from "express";
import { ConsultTaxBody, ConsultTaxResponse, ListTaxResourcesResponse } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { taxResources, taxDisclaimer } from "../lib/tax-resources";
import { taxCheckedAt } from "../lib/tax-excerpts";
import { consultationSources } from "../lib/tax-source-monitor";
import { appStatusAnswer, insufficientSourcesAnswer, searchTaxSources } from "../lib/tax-retrieval";
import { taxConsultationSystemPrompt } from "../lib/tax-consultation-prompt";
import { gateTaxAnswer } from "../lib/tax-answer-gate";
import { judgeTaxAnswer } from "../lib/tax-answer-judge";

const router: IRouter = Router();
// Fixed windows and bounded map avoid retaining chat text or unbounded IP keys.
const windows = new Map<string, { count: number; expires: number }>();
let active = 0;

router.get("/tax/resources", (_req, res) => {
  res.json(ListTaxResourcesResponse.parse(taxResources));
});

router.post("/tax/consult", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const parsed = ConsultTaxBody.safeParse(req.body);
  if (!parsed.success || parsed.data.question.trim().length < 5) {
    res.status(400).json({ error: "Tulis pertanyaan sepanjang 5–2.000 karakter." });
    return;
  }
  const now = Date.now();
  for (const [key, value] of windows) if (value.expires <= now) windows.delete(key);
  const key = req.ip ?? "unknown";
  const window = windows.get(key) ?? { count: 0, expires: now + 60_000 };
  if (window.count >= 6 || active >= 4 || (!windows.has(key) && windows.size >= 2000)) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "Batas konsultasi sementara tercapai. Silakan coba lagi dalam satu menit." });
    return;
  }
  window.count++;
  windows.set(key, window);
  active++;
  try {
    const internalAnswer = appStatusAnswer(parsed.data.question);
    if (internalAnswer) {
      res.json(ConsultTaxResponse.parse({ answer: internalAnswer, sources: [], disclaimer: taxDisclaimer, checkedAt: taxCheckedAt }));
      return;
    }
    const retrieved = searchTaxSources(parsed.data.question, parsed.data.history, await consultationSources());
    if (!retrieved.length) {
      res.json(ConsultTaxResponse.parse({ answer: insufficientSourcesAnswer, sources: [], disclaimer: taxDisclaimer, checkedAt: taxCheckedAt }));
      return;
    }
    const result = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      max_completion_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: taxConsultationSystemPrompt(retrieved) },
        ...(parsed.data.history ?? []).map(message => ({ role: message.role as "user" | "assistant", content: message.content })),
        { role: "user", content: parsed.data.question.trim() },
      ],
    }, { timeout: 60_000, maxRetries: 0 });
    if (result.choices[0]?.finish_reason !== "stop") throw new Error("Incomplete consultation");
    const output: unknown = JSON.parse(result.choices[0]?.message?.content ?? "{}");
    const started = Date.now();
    const response = await gateTaxAnswer({
      output, retrieved, question: parsed.data.question, history: parsed.data.history,
      judge: judgeTaxAnswer, currentSources: consultationSources,
    });
    // Codes and timing only: never persist taxpayer text, verdicts, or provider errors.
    req.log.info({ gate: response.reason, durationMs: Date.now() - started }, "Tax answer gate");
    res.json(ConsultTaxResponse.parse({ ...response, disclaimer: taxDisclaimer, checkedAt: taxCheckedAt }));
  } catch {
    // Do not log prompts, answers or provider errors that may include sensitive text.
    req.log.warn("Tax consultation provider unavailable");
    res.status(503).json({ error: "Konsultasi AI belum dapat dijawab. Coba lagi nanti atau buka pustaka sumber resmi." });
  } finally {
    active--;
  }
});

export default router;
