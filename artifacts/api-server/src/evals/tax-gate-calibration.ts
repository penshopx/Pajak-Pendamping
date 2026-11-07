import { batchProcess } from "@workspace/integrations-openai-ai-server/batch";
import { sp2dkEvalCases } from "./tax-sp2dk-cases";
import { answerOutput } from "./tax-evaluator";
import { searchTaxSources } from "../lib/tax-retrieval";
import { gateTaxAnswer } from "../lib/tax-answer-gate";
import { judgeTaxAnswer } from "../lib/tax-answer-judge";

// Explicit curated snapshot ONLY. Never changes monitor baselines or source approvals.
const samples = sp2dkEvalCases.flatMap(c => [
  { c, label: "supported", answer: c.good, expected: "passed" },
  ...c.bad.map(b => ({ c, label: b.label, answer: b.answer, expected: "unsupported" })),
]);
const live = process.argv.includes("--live");
const diagnose = process.argv.includes("--diagnose-fixtures");
const selectedCase = process.argv[process.argv.indexOf("--case") + 1];
const selected = process.argv.includes("--case") ? samples.filter(s => s.c.id === selectedCase) : samples;
if (!selected.length) throw new Error("Unknown fixture case");
if (!live) {
  console.info(`Dry run: ${selected.length} synthetic SP2DK samples; use --live to incur AI credit charges (one call/sample, no retries).`);
} else {
  const results = await batchProcess(selected, async sample => {
    const retrieved = searchTaxSources(sample.c.question, sample.c.history);
    const started = Date.now();
    const result = await gateTaxAnswer({
      output: answerOutput(sample.answer), question: sample.c.question, history: sample.c.history,
      retrieved, currentSources: async () => retrieved, judge: async (input, signal) => {
        const verdict = await judgeTaxAnswer(input, signal);
        // Explicit synthetic-fixture debugging ONLY; never enable in the request path.
        if (diagnose) console.info(JSON.stringify({ fixture: sample.c.id, label: sample.label, input, verdict }));
        return verdict;
      },
    });
    return { case: sample.c.id, label: sample.label, expected: sample.expected, actual: result.reason,
      matches: result.reason === sample.expected, durationMs: Date.now() - started };
  }, { concurrency: 1, retries: 0 });
  console.info(JSON.stringify({ warning: "Calibration, not legal certainty or baseline approval", results }, null, 2));
  if (results.some(r => !r.matches)) process.exitCode = 1;
}
