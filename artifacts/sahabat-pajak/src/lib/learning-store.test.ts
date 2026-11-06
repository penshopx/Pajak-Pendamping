import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StoreProvider, useStore } from './store';
import { LEARNING_STEPS } from './learning-path';

const KEY = 'sahabat-pajak:v1';
function harness(raw: string | null) {
  let stored = raw;
  let fail = false;
  let writes = 0;
  const mock = {
    getItem: () => stored,
    setItem: (_key: string, value: string) => {
      if (fail) throw new DOMException('Test storage capacity exceeded', 'QuotaExceededError');
      writes++; stored = value;
    },
  };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: mock });
  let store!: ReturnType<typeof useStore>;
  function Capture() { store = useStore(); return null; }
  renderToString(React.createElement(StoreProvider, { children: React.createElement(Capture) }));
  return { store, raw: () => stored, parsed: () => JSON.parse(stored!), writes: () => writes, fail: () => { fail = true; } };
}
const legacy = {
  profile: { businessName: 'Test only', businessType: 'orang-pribadi' },
  obligations: [{ id: 'sentinel', status: 'belum' }], payments: [], chat: [],
  transactions: [{ id: 'cash', date: '2026-06-01', kind: 'pemasukan', category: 'penjualan', amount: 100, description: 'Test sale', notes: '' }],
  tradeBills: [],
  sptPreparation: { '2025': { source: 'independent-progress', ready: false } },
};
test('legacy snapshot loads without learning marks; completion, undo and reset preserve all other records', () => {
  const h = harness(JSON.stringify(legacy));
  assert.deepEqual(h.store.learningCompleted, []);
  assert.equal(h.writes(), 0);
  h.store.setLearningComplete(LEARNING_STEPS[0].id, true);
  h.store.setLearningComplete(LEARNING_STEPS[2].id, true);
  assert.deepEqual(h.parsed().learningCompleted, [LEARNING_STEPS[0].id, LEARNING_STEPS[2].id]);
  h.store.setLearningComplete(LEARNING_STEPS[0].id, false);
  assert.deepEqual(h.parsed().learningCompleted, [LEARNING_STEPS[2].id]);
  h.store.resetLearningProgress();
  const { learningCompleted, ...rest } = h.parsed();
  assert.deepEqual(learningCompleted, []);
  assert.deepEqual(rest, legacy);
});
test('completion reloads and failed/invalid writes never commit phantom progress', () => {
  const h = harness(JSON.stringify(legacy));
  h.store.setLearningComplete(LEARNING_STEPS[0].id, true);
  const reloaded = harness(h.raw());
  assert.deepEqual(reloaded.store.learningCompleted, [LEARNING_STEPS[0].id]);
  const saved = reloaded.raw();
  assert.throws(() => reloaded.store.setLearningComplete('invalid-stage', true), /tidak valid/);
  assert.equal(reloaded.raw(), saved);
  reloaded.fail();
  assert.throws(() => reloaded.store.setLearningComplete(LEARNING_STEPS[1].id, true), /Penyimpanan peramban gagal/);
  assert.equal(reloaded.raw(), saved);
  assert.throws(() => reloaded.store.resetLearningProgress(), /Penyimpanan peramban gagal/);
  assert.equal(reloaded.raw(), saved);
});
test('unreadable learning data is retained, not overwritten at load or on failed save', () => {
  const bad = JSON.stringify({ ...legacy, learningCompleted: ['same', 'same'] });
  const h = harness(bad);
  assert.ok(h.store.storageError);
  assert.equal(h.writes(), 0);
  assert.throws(() => h.store.setLearningComplete(LEARNING_STEPS[0].id, true), /Data lokal/);
  assert.equal(h.raw(), bad);
});
test('explicit clear-all resets learning and finance together, without a second storage key', () => {
  const h = harness(JSON.stringify({ ...legacy, learningCompleted: [LEARNING_STEPS[0].id] }));
  h.store.clearAll();
  assert.deepEqual(h.parsed().learningCompleted, []);
  assert.deepEqual(h.parsed().transactions, []);
  assert.deepEqual(h.parsed().obligations, []);
  assert.equal(h.writes(), 1);
  assert.equal(KEY, 'sahabat-pajak:v1');
});
