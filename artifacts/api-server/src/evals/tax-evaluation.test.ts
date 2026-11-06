import { test } from "node:test";
import assert from "node:assert/strict";
import { taxEvalCases } from "./tax-cases";
import { answerOutput, checkFixture, commonRubric, judgeFailures, judgeMessages, judgeResponseFormat } from "./tax-evaluator";
import { evaluationOptions, evaluateCase, calibrateCase } from "./tax-runner";
import { groundedResponse, insufficientSourcesAnswer, searchTaxSources } from "../lib/tax-retrieval";
import { taxConsultationSystemPrompt } from "../lib/tax-consultation-prompt";
import { taxCheckedAt } from "../lib/tax-excerpts";

for (const c of taxEvalCases) {
  test(`${c.id}: retrieval has traceable evidence and the supported reference passes`, () => {
    const sources = searchTaxSources(c.question, c.history);
    for (const e of c.evidence) {
      const source = sources.find(s => s.id === e.sourceId);
      assert.ok(source, `${e.sourceId}: expected source not retrieved`);
      assert.ok(source?.excerpt?.includes(e.quote), `${e.sourceId}: expected evidence not retrieved`);
      assert.ok(source.locator && source.version && source.limitations);
    }
    assert.deepEqual(checkFixture(c, c.good, sources), []);
    assert.ok(c.rubric.length >= 3);
  });

  for (const bad of c.bad) {
    test(`${c.id}: catches ${bad.label} despite syntactically valid citations`, () => {
      const sources = searchTaxSources(c.question, c.history);
      // Demonstrates why the existing guard alone is insufficient.
      assert.notEqual(groundedResponse(answerOutput(bad.answer), sources).answer, insufficientSourcesAnswer);
      assert.ok(checkFixture(c, bad.answer, sources).includes(bad.fails));
    });
  }
  test(`${c.id}: missing source limits cannot pass with otherwise correct claims`, () => {
    const noLimits = c.good.slice(0, c.good.indexOf("Batas:"));
    assert.ok(checkFixture(c, noLimits, searchTaxSources(c.question, c.history)).includes("limitations"));
  });
}

const c = taxEvalCases.find(c => c.id === "nppn-no-deadline")!;
const sources = searchTaxSources(c.question);
const claim = "AS.04-01 Pemberitahuan Penggunaan NPPN [nppn]";
const makeVerdict = () => ({
  criteria: [...commonRubric, ...c.rubric].map((_, index) => ({ index, pass: true, reason: "Didukung cuplikan dan batasnya." })),
  claims: [{ claim, kind: "tax_fact", supported: true, evidence: [{ sourceId: "nppn", quote: "AS.04-01 Pemberitahuan Penggunaan NPPN" }] }],
});

test("judge schema/evidence fails closed, including invented quotations and wrong-source attribution", () => {
  assert.deepEqual(judgeFailures(c, c.good, sources, makeVerdict()), []);
  const malformed: unknown[] = [null, {}, { criteria: [], claims: [] }];
  const falseClaim = makeVerdict(); falseClaim.claims[0].supported = false; malformed.push(falseClaim);
  const wrongQuote = makeVerdict(); wrongQuote.claims[0].evidence[0].quote = "31 Maret 2026 batas terakhir"; malformed.push(wrongQuote);
  const wrongSource = makeVerdict(); wrongSource.claims[0].evidence[0].sourceId = "pp20-final"; malformed.push(wrongSource);
  const missing = makeVerdict(); missing.criteria.pop(); malformed.push(missing);
  const duplicate = makeVerdict(); duplicate.criteria[1].index = 0; malformed.push(duplicate);
  const notInAnswer = makeVerdict(); notInAnswer.claims[0].claim = "Klaim yang tidak ada [nppn]"; malformed.push(notInAnswer);
  const noEvidence = makeVerdict(); noEvidence.claims[0].evidence = []; malformed.push(noEvidence);
  const noCite = makeVerdict(); noCite.claims[0].claim = "AS.04-01 Pemberitahuan Penggunaan NPPN"; malformed.push(noCite);
  const rejected = makeVerdict(); rejected.criteria[0].pass = false; malformed.push(rejected);
  const noFacts = makeVerdict(); noFacts.claims[0].kind = "non_tax"; malformed.push(noFacts);
  for (const verdict of malformed) assert.ok(judgeFailures(c, c.good, sources, verdict).length > 0);
});

test("non-tax clarification does not require legal evidence, but tax assertions still do", () => {
  const verdict = makeVerdict();
  verdict.claims.push({ claim: "Saya tidak dapat menebak tanggal", kind: "non_tax", supported: false, evidence: [] });
  assert.deepEqual(judgeFailures(c, c.good, sources, verdict), []);
  verdict.claims[1].kind = "tax_fact";
  assert.ok(judgeFailures(c, c.good, sources, verdict).some(f => f.startsWith("unsupported:")));
});

test("judge receives claim-level and case-specific criteria, source text and untrusted history", () => {
  const fake = taxEvalCases.find(c => c.id === "fake-source")!;
  const messages = judgeMessages(fake, fake.bad[0].answer, searchTaxSources(fake.question));
  assert.match(messages[0].content, /SETIAP|seluruh makna/);
  assert.match(messages[0].content, /bukan sekadar|disitasi ke bagian salah/);
  const input = JSON.parse(messages[1].content);
  assert.equal(input.criteria.length, commonRubric.length + fake.rubric.length);
  assert.equal(input.history[0].content, fake.history![0].content);
  assert.match(input.sources, /Cuplikan:|Batas:/);
});

test("a correct proposition attributed to the wrong retrieved source is rejected", () => {
  const op = taxEvalCases[0];
  const retrieved = searchTaxSources(op.question);
  const wrongAttribution = op.good.replaceAll("[pp55-base]", "[pp20-final]");
  assert.notEqual(groundedResponse(answerOutput(wrongAttribution), retrieved).answer, insufficientSourcesAnswer);
  assert.ok(checkFixture(op, wrongAttribution, retrieved).includes("op-only"));
});

test("paid evaluation is explicit, budgeted before any request, and limited to synthetic IDs", () => {
  assert.equal(evaluationOptions([]).live, false);
  assert.equal(evaluationOptions(["--live"]).maxCalls, 2);
  assert.equal(evaluationOptions(["--calibrate"]).live, false);
  assert.equal(evaluationOptions(["--live", "--all", "--max-calls", "16"]).cases.length, 8);
  for (const args of [
    ["--live", "--all"], ["--live", "--case", "unknown"],
    ["--max-calls", "17"], ["--max-calls", "NaN"], ["--max-calls", "0"],
    ["--case"], ["--question", "real-data"], ["--all", "--case", c.id],
  ]) assert.throws(() => evaluationOptions(args));
});

test("live runner shares the production prompt, evaluates raw answer, and returns semantic rejection", async () => {
  let calls = 0;
  const verdict = makeVerdict();
  verdict.criteria[0].pass = false;
  verdict.criteria[0].reason = "Klaim terlalu luas";
  const result = await evaluateCase(c, async (messages, format) => {
    calls++;
    if (calls === 1) {
      assert.equal(messages[0].content, taxConsultationSystemPrompt(sources, taxCheckedAt));
      assert.equal(messages.at(-1)?.content, c.question);
      return answerOutput(c.good);
    }
    assert.deepEqual(format, judgeResponseFormat(c));
    assert.deepEqual(messages, judgeMessages(c, c.good, sources));
    return verdict;
  });
  assert.equal(calls, 2);
  assert.ok(result.failures.some(s => s.includes("Klaim terlalu luas")));
});

test("invalid answer cannot be hidden by production fallback or incur judge cost", async () => {
  let calls = 0;
  const result = await evaluateCase(c, async () => { calls++; return { answer: "Sesuai [palsu]", sourceIds: ["palsu"] }; });
  assert.equal(calls, 1);
  assert.deepEqual(result.failures, ["answer-format-or-citations"]);
});

test("missing corpus fails without AI calls", async () => {
  const result = await evaluateCase(c, async () => { assert.fail("No provider call allowed"); }, []);
  assert.deepEqual(result.failures, ["retrieval-empty"]);
});

test("calibration requires recognizing false content, not merely a malformed judge response", async () => {
  let calls = 0;
  const result = await calibrateCase(c, async () => ++calls === 1 ? makeVerdict() : {});
  assert.equal(calls, 2);
  assert.ok(result.failures.includes("false-answer-not-recognized"));
});
