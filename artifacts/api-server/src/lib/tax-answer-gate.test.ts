import { test } from "node:test";
import assert from "node:assert/strict";
import { ConsultTaxResponse } from "@workspace/api-zod";
import { answerGatePolicy, answerUnits, gateMessages, gateResponseFormat, gateTaxAnswer, heldAnswer, validGateVerdict, type GateInput, type GateJudge } from "./tax-answer-gate";
import { groundedResponse, searchTaxSources } from "./tax-retrieval";
import { sp2dkEvalCases } from "../evals/tax-sp2dk-cases";
import { answerOutput } from "../evals/tax-evaluator";

const c = sp2dkEvalCases.find(c => c.id === "sp2dk-not-closed")!;
const sources = searchTaxSources(c.question);
const source = sources.find(s => s.id === "sp2dk-followup")!;
const quote = "BPE bukan bukti penjelasan disetujui maupun pengawasan ditutup";
const answer = `BPE bukan bukti penjelasan disetujui maupun pengawasan ditutup [${source.id}].`;
const input: GateInput = {
  question: c.question, history: [], units: answerUnits(answer),
  sources: sources.map(s => ({ id: s.id, excerpt: s.excerpt, limitations: s.limitations ?? "" })),
};
const verdict = () => ({ units: [{ index: 0, kind: "factual", supported: true, evidence: [{ sourceId: source.id, quote }] }] });
const run = (judge: GateJudge, extra: Partial<Parameters<typeof gateTaxAnswer>[0]> = {}) =>
  gateTaxAnswer({ output: answerOutput(answer), question: c.question, retrieved: sources, judge, currentSources: async () => sources, ...extra });

test("supported answer passes both gates and retains the existing client contract", async () => {
  assert.equal(validGateVerdict(input, verdict()), true);
  const result = await run(async () => verdict());
  assert.equal(result.reason, "passed");
  assert.equal(result.answer, answer);
  ConsultTaxResponse.parse({ ...result, disclaimer: "Edukasi, bukan kepastian hukum", checkedAt: "2026-11-07" });
});

test("judge contract separates the evaluated text from untrusted question/history and constrains exact quotes", () => {
  const messages = gateMessages(input);
  assert.deepEqual(JSON.parse(messages.at(-1)!.content), { evaluated_answer_units: input.units });
  assert.ok(messages[1].content.includes("context_only_not_answer"));
  const schema = gateResponseFormat(input).json_schema.schema.properties.units;
  assert.equal(schema.minItems, input.units.length);
  assert.equal(schema.maxItems, input.units.length);
  const allowedQuotes = schema.items.properties.evidence.items.properties.quote.enum;
  for (const q of allowedQuotes) assert.ok(input.sources.some(s => s.excerpt.includes(q) || s.limitations.includes(q)));
});

test("all SP2DK adversarial fixtures have valid IDs but a negative semantic verdict withholds the entire candidate", async () => {
  // Mock verdicts exercise enforcement, not proof that a real AI understands the law.
  for (const fixture of sp2dkEvalCases) {
    const retrieved = searchTaxSources(fixture.question, fixture.history);
    for (const bad of fixture.bad) {
      assert.ok(groundedResponse(answerOutput(bad.answer), retrieved).sources.length);
      const result = await gateTaxAnswer({
        output: answerOutput(bad.answer), question: fixture.question, retrieved,
        currentSources: async () => retrieved,
        judge: async data => ({ units: data.units.map(u => ({ index: u.index, kind: "factual", supported: false, evidence: [] })) }),
      });
      assert.equal(result.reason, "unsupported", bad.label);
      assert.equal(result.answer, heldAnswer);
      assert.deepEqual(result.sources, []);
      assert.ok(!result.answer.includes(bad.answer));
    }
  }
});

test("malformed, omitted, duplicate, fabricated, wrong-source and uncited evidence fail closed", async () => {
  const invalid: unknown[] = [null, {}, { units: [] }, { units: [null] }];
  const missing = verdict(); missing.units[0].evidence = []; invalid.push(missing);
  const unsupported = verdict(); unsupported.units[0].supported = false; invalid.push(unsupported);
  const fabricated = verdict(); fabricated.units[0].evidence[0].quote = "Kutipan yang tidak ada di sumber"; invalid.push(fabricated);
  const wrongSource = verdict(); wrongSource.units[0].evidence[0].sourceId = "sp2dk-extension"; invalid.push(wrongSource);
  const nonFactual = verdict(); nonFactual.units[0].kind = "non_factual"; nonFactual.units[0].evidence = []; invalid.push(nonFactual);
  const wrongIndex = verdict(); wrongIndex.units[0].index = 1; invalid.push(wrongIndex);
  for (const v of invalid) {
    assert.equal(validGateVerdict(input, v), false);
    assert.equal((await run(async () => v)).reason, "unsupported");
  }
  const twoUnits = { ...input, units: answerUnits(`${answer}\nKlaim kedua tanpa sitasi.`) };
  assert.equal(validGateVerdict(twoUnits, verdict()), false);
  assert.equal(validGateVerdict(twoUnits, { units: [verdict().units[0], verdict().units[0]] }), false);
  assert.equal(validGateVerdict({ ...input, units: answerUnits("Klaim tanpa sitasi.") }, verdict()), false);
});

test("clarification and self-limitations need no legal quote but cannot hide a cited proposition", () => {
  const unit = { index: 0, kind: "non_factual", supported: true, evidence: [] };
  assert.equal(validGateVerdict({ ...input, units: answerUnits("Saya belum dapat memastikan. Apa status dan saluran surat?") },
    { units: [unit, { ...unit, index: 1 }] }), true);
  assert.equal(validGateVerdict(input, { units: [unit] }), false);
});

test("exception and timeout abort with no leak; late approval cannot release held answer", async () => {
  assert.equal((await run(async () => { throw new Error("private provider payload"); })).reason, "unavailable");
  let signal: AbortSignal | undefined;
  let resolve!: (v: unknown) => void;
  const result = await run(async (_input, abort) => {
    signal = abort;
    return new Promise(r => { resolve = r; });
  }, { timeoutMs: 5 });
  assert.equal(signal?.aborted, true);
  assert.equal(result.reason, "unavailable");
  resolve(verdict());
  await new Promise(r => setTimeout(r, 0));
  assert.equal(result.answer, heldAnswer);
});

test("monitor changes during semantic review and monitor errors also hold the answer", async () => {
  const result = await run(async () => verdict(), { currentSources: async () => [] });
  assert.equal(result.reason, "source-held");
  assert.equal((await run(async () => verdict(), { currentSources: async () => { throw new Error("offline"); } })).reason, "unavailable");
});

test("no judge call for invalid citations or exhausted byte/answer/unit budgets", async () => {
  let calls = 0;
  const judge: GateJudge = async () => { calls++; return verdict(); };
  assert.equal((await run(judge, { output: answerOutput("Salah [palsu].") })).reason, "citations");
  for (const extra of [
    { output: answerOutput(`${"x".repeat(answerGatePolicy.maxAnswerChars)} [${source.id}].`) },
    { question: "x".repeat(answerGatePolicy.maxInputBytes) },
    { output: answerOutput(Array.from({ length: 49 }, () => answer).join("\n")) },
  ]) assert.equal((await run(judge, extra)).reason, "budget");
  assert.equal(calls, 0);
});
