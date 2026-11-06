import type { TaxResource } from "@workspace/api-zod";
import { taxConsultationSystemPrompt } from "../lib/tax-consultation-prompt";
import { groundedResponse, insufficientSourcesAnswer, searchTaxSources } from "../lib/tax-retrieval";
import { taxResources } from "../lib/tax-resources";
import { taxCheckedAt } from "../lib/tax-excerpts";
import { taxEvalCases, type TaxEvalCase } from "./tax-cases";
import { commonRubric, judgeFailures, judgeMessages, judgeResponseFormat } from "./tax-evaluator";

export type Messages = { role: "system" | "user" | "assistant"; content: string }[];
export type Complete = (messages: Messages, format?: ReturnType<typeof judgeResponseFormat>) => Promise<unknown>;
export const evalModel = "gpt-5.4-mini";
export const maxInputCharacters = 60_000;

export function evaluationOptions(args: string[]) {
  let live = false;
  let all = false;
  let calibrate = false;
  let maxCalls = 2;
  const ids: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--live") live = true;
    else if (arg === "--calibrate") calibrate = true;
    else if (arg === "--all") all = true;
    else if (arg === "--case" && args[i + 1]) ids.push(args[++i]);
    else if (arg === "--max-calls" && args[i + 1]) maxCalls = Number(args[++i]);
    else throw new Error(`Argumen tidak dikenal/tidak lengkap: ${arg}`);
  }
  if (!Number.isInteger(maxCalls) || maxCalls < 1 || maxCalls > 16) throw new Error("Batas panggilan harus 1–16.");
  if (all && ids.length) throw new Error("Pilih --all atau --case, bukan keduanya.");
  if (ids.some(id => !taxEvalCases.some(c => c.id === id))) throw new Error("ID kasus tidak dikenal.");
  const cases = all ? taxEvalCases : taxEvalCases.filter(c => (ids.length ? ids : ["nppn-no-deadline"]).includes(c.id));
  if (live && cases.length * 2 > maxCalls) throw new Error(`Perlu maksimum ${cases.length * 2} panggilan; naikkan --max-calls secara eksplisit.`);
  return { live, calibrate, cases, maxCalls };
}

/** Uses an explicit curated snapshot, never approves monitor baselines or queries taxpayer data. */
export async function evaluateCase(c: TaxEvalCase, complete: Complete, resources: TaxResource[] = taxResources) {
  const sources = searchTaxSources(c.question, c.history, resources);
  const base = {
    id: c.id, sourceIds: sources.map(s => s.id), checkedAt: taxCheckedAt,
    sourceSnapshot: sources.map(({ id, excerpt, locator, version, limitations }) => ({ id, excerpt, locator, version, limitations })),
    rubric: [...commonRubric, ...c.rubric],
  };
  if (!sources.length) return { ...base, failures: ["retrieval-empty"] };
  const output = await complete([
    { role: "system", content: taxConsultationSystemPrompt(sources, taxCheckedAt) },
    ...(c.history ?? []), { role: "user", content: c.question },
  ]);
  const grounded = groundedResponse(output, sources);
  // Do not let fail-closed production fallback conceal a failed generated answer.
  if (grounded.answer === insufficientSourcesAnswer) return { ...base, output, failures: ["answer-format-or-citations"] };
  const verdict = await complete(judgeMessages(c, grounded.answer, sources), judgeResponseFormat(c));
  return { ...base, output, verdict, failures: judgeFailures(c, grounded.answer, sources, verdict) };
}

/** Check the judge against a known supported answer AND an ID-valid but false answer. */
export async function calibrateCase(c: TaxEvalCase, complete: Complete) {
  const sources = searchTaxSources(c.question, c.history);
  const goodVerdict = await complete(judgeMessages(c, c.good, sources), judgeResponseFormat(c));
  const badVerdict = await complete(judgeMessages(c, c.bad[0].answer, sources), judgeResponseFormat(c));
  const goodFailures = judgeFailures(c, c.good, sources, goodVerdict);
  const badFailures = judgeFailures(c, c.bad[0].answer, sources, badVerdict);
  // A malformed verdict is not proof the judge recognized the false assertion.
  const recognizedBad = badFailures.some(f => f.startsWith("criterion-") || f.startsWith("unsupported:"));
  return {
    id: c.id, mode: "calibration", goodVerdict, badVerdict, goodFailures, badFailures,
    failures: [...goodFailures.map(f => `reference: ${f}`), ...(recognizedBad ? [] : ["false-answer-not-recognized"])],
  };
}
