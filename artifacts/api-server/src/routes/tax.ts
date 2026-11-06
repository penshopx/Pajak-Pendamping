import { Router, type IRouter } from "express";
import { ConsultTaxBody, ConsultTaxResponse, ListTaxResourcesResponse } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { taxResources, taxDisclaimer } from "../lib/tax-resources";
import { taxCheckedAt } from "../lib/tax-excerpts";
import { consultationSources } from "../lib/tax-source-monitor";
import { appStatusAnswer, groundedResponse, insufficientSourcesAnswer, searchTaxSources } from "../lib/tax-retrieval";
import { taxConsultationSystemPrompt } from "../lib/tax-consultation-prompt";

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
    }, { timeout: 90_000 });
    const output: unknown = JSON.parse(result.choices[0]?.message?.content ?? "{}");
    // A monitor or reviewer can hold a source while the AI request is in flight.
    const stillAllowed = new Set((await consultationSources()).map(r => r.id));
    const grounded = groundedResponse(output, retrieved);
    const response = grounded.sources.some(r => !stillAllowed.has(r.id))
      ? { answer: insufficientSourcesAnswer, sources: [] } : grounded;
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
