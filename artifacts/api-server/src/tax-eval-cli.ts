import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { evaluationOptions, evaluateCase, calibrateCase, evalModel, maxInputCharacters, type Complete } from "./evals/tax-runner";
import { taxEvalCases } from "./evals/tax-cases";

async function main() {
  const options = evaluationOptions(process.argv.slice(2));
  if (!options.live) {
    process.stdout.write(`Tidak ada panggilan AI. Kasus sintetis: ${taxEvalCases.map(c => c.id).join(", ")}\nJalankan dengan --live --case <id> atau --live --all --max-calls 16. Tambahkan --calibrate untuk menilai contoh benar/salah.\n`);
    return;
  }
  // Import only after opt-in and budget preflight; offline tests/usage require no credentials.
  const { openai, batchProcess } = await import("@workspace/integrations-openai-ai-server");
  let calls = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  const complete: Complete = async (messages, format) => {
    if (calls >= options.maxCalls) throw new Error("call-budget");
    if (JSON.stringify(messages).length > maxInputCharacters) throw new Error("input-budget");
    calls++;
    const result = await openai.chat.completions.create({
      model: evalModel, max_completion_tokens: 8192,
      response_format: format ?? { type: "json_object" }, messages,
    }, { timeout: 90_000, maxRetries: 0 });
    inputTokens += result.usage?.prompt_tokens ?? 0;
    outputTokens += result.usage?.completion_tokens ?? 0;
    if (result.choices[0]?.finish_reason !== "stop") throw new Error("incomplete-output");
    return JSON.parse(result.choices[0]?.message?.content ?? "");
  };
  const results = await batchProcess(options.cases, async c => {
    try {
      return options.calibrate ? await calibrateCase(c, complete) : await evaluateCase(c, complete);
    } catch {
      // Never print provider errors (may contain credentials or request text).
      return { id: c.id, failures: ["provider-json-or-budget-error"] };
    }
  }, { concurrency: 1, retries: 0 });
  const report = {
    generatedAt: new Date().toISOString(), model: evalModel,
    mode: options.calibrate ? "calibration" : "generated",
    corpus: "curated-evaluation-snapshot-not-monitor-approved-live-sources",
    budget: { maxCalls: options.maxCalls, calls, maxInputCharacters, maxCompletionTokensPerCall: 8192, retries: 0 },
    usage: { inputTokens, outputTokens }, results,
  };
  // This fixed location is ignored by Git and deployment; no arbitrary user data input is supported.
  const directory = fileURLToPath(new URL("./tax-evals/", import.meta.url));
  await mkdir(directory, { recursive: true });
  const path = `${directory}${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  await writeFile(path, JSON.stringify(report, null, 2));
  for (const r of results) process.stdout.write(`${r.id}: ${r.failures.length ? `FAIL (${r.failures.join("; ")})` : "PASS"}\n`);
  process.stdout.write(`Panggilan: ${calls}/${options.maxCalls}; token input/output: ${inputTokens}/${outputTokens}. Laporan: ${path}\n`);
  if (results.some(r => r.failures.length)) process.exitCode = 1;
}

main().catch(() => {
  process.stderr.write("Evaluasi tidak berjalan. Periksa argumen, batas panggilan, dan konfigurasi integrasi AI. Tidak ada detail kredensial yang dicatat.\n");
  process.exitCode = 1;
});
