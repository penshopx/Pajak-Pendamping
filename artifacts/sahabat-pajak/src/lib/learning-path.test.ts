import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEARNING_STEPS, learningQuestionHref, learningSummary, updateLearningCompleted, validateLearningCompleted } from './learning-path';

test('stable unique stages have educational content, real internal destinations and reviewable questions', () => {
  assert.equal(new Set(LEARNING_STEPS.map(step => step.id)).size, 6);
  for (const step of LEARNING_STEPS) {
    assert.ok(step.purpose && step.takeaways.length && step.practice.length && step.selfCheck.length);
    assert.ok(step.question.length >= 5 && step.question.length <= 2000);
    const destinations = ['/pengaturan', '/kewajiban', '/pustaka', '/pembayaran', '/transaksi', '/piutang-utang', '/laba-rugi'];
    for (const action of [...step.actions, step.library]) {
      const url = new URL(action.href, 'https://test.invalid');
      assert.equal(url.origin, 'https://test.invalid');
      assert.ok(destinations.includes(url.pathname), action.href);
      assert.ok(!action.href.startsWith('//'));
    }
    const consult = new URL(learningQuestionHref(step), 'https://test.invalid');
    assert.equal(consult.pathname, '/konsultasi');
    assert.equal(consult.searchParams.get('pertanyaan'), step.question);
  }
});
test('empty, partial and complete progress derive the correct next incomplete stage', () => {
  assert.deepEqual(learningSummary([]), { done: 0, total: 6, percent: 0, next: LEARNING_STEPS[0] });
  const partial = [LEARNING_STEPS[0].id, LEARNING_STEPS[2].id];
  assert.equal(learningSummary(partial).done, 2);
  assert.equal(learningSummary(partial).percent, 33);
  assert.equal(learningSummary(partial).next?.id, LEARNING_STEPS[1].id);
  const complete = learningSummary(LEARNING_STEPS.map(step => step.id));
  assert.equal(complete.done, 6);
  assert.equal(complete.percent, 100);
  assert.equal(complete.next, null);
});
test('completion updates are explicit, idempotent and do not mutate the prior snapshot', () => {
  const old: string[] = [];
  const first = updateLearningCompleted(old, LEARNING_STEPS[0].id, true);
  assert.deepEqual(old, []);
  assert.deepEqual(first, [LEARNING_STEPS[0].id]);
  assert.deepEqual(updateLearningCompleted(first, LEARNING_STEPS[0].id, true), first);
  assert.deepEqual(updateLearningCompleted(first, LEARNING_STEPS[0].id, false), []);
  assert.deepEqual(updateLearningCompleted([], LEARNING_STEPS[0].id, false), []);
  assert.throws(() => updateLearningCompleted(first, 'unknown-stage', true), /tidak valid/);
});
test('validate untrusted progress and preserve unknown future stage IDs without counting them', () => {
  for (const value of [null, {}, '', [null], ['INVALID'], ['x', 'x'], ['a'.repeat(65)], Array(101).fill('stage')]) {
    assert.equal(validateLearningCompleted(value), false);
  }
  const old = ['future-stage'];
  assert.equal(validateLearningCompleted(old), true);
  assert.equal(learningSummary(old).done, 0);
  const next = updateLearningCompleted(old, LEARNING_STEPS[0].id, true);
  assert.ok(next.includes('future-stage'));
  assert.deepEqual(updateLearningCompleted(next, LEARNING_STEPS[0].id, false), old);
});
test('separate progress from tax completion: educational marks do not require financial data', () => {
  const financial = { obligations: [{ id: 'keep', status: 'belum' }], transactions: [{ id: 'keep-cash' }], sptPreparation: { '2025': { ready: false } } };
  const next = { ...financial, learningCompleted: updateLearningCompleted([], LEARNING_STEPS[0].id, true) };
  assert.strictEqual(next.obligations, financial.obligations);
  assert.strictEqual(next.transactions, financial.transactions);
  assert.strictEqual(next.sptPreparation, financial.sptPreparation);
  const reset = { ...next, learningCompleted: [] };
  assert.deepEqual(reset.obligations, financial.obligations);
  assert.equal(reset.sptPreparation['2025'].ready, false);
});
