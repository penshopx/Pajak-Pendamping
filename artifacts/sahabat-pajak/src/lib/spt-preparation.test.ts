import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StoreProvider, useStore } from './store';
import { assertSptProgress, resetSptScope, setSptItem, SPT_ITEMS } from './spt-preparation';

test('progress is isolated by taxpayer and tax year, can be unchecked, and survives JSON', () => {
  let progress = setSptItem({}, 'op', 2025, 'documents', true);
  progress = setSptItem(progress, 'badan', 2025, 'access', true);
  progress = setSptItem(progress, 'op', 2024, 'review', true);
  const reloaded = JSON.parse(JSON.stringify(progress));
  assertSptProgress(reloaded);
  assert.equal(reloaded['op:2025'].documents, true);
  assert.equal(reloaded['badan:2025'].documents, undefined);
  assert.equal(reloaded['op:2024'].documents, undefined);
  const unchecked = setSptItem(reloaded, 'op', 2025, 'documents', false);
  assert.equal(unchecked['op:2025'].documents, false);
  assert.equal(reloaded['op:2025'].documents, true);
  const reset = resetSptScope(reloaded, 'op', 2025);
  assert.equal(reset['op:2025'], undefined);
  assert.deepEqual(reset['op:2024'], reloaded['op:2024']);
  assert.deepEqual(reset['badan:2025'], reloaded['badan:2025']);
});

test('invalid progress cannot silently replace existing data', () => {
  for (const bad of [null, [], true, { 'op:2025': [] }, { 'op:2025': { documents: 'true' } },
    { 'op:2025': { unknown: true } }, { 'op:1899': {} }, { 'other:2025': {} }]) {
    assert.throws(() => assertSptProgress(bad));
  }
  assert.throws(() => setSptItem({}, 'op', 2025.5, 'documents', true));
  assert.throws(() => setSptItem({}, 'op', 1899, 'documents', true));
});

const KEY = 'sahabat-pajak:v1';
function browser(initial: unknown) {
  let raw = typeof initial === 'string' ? initial : JSON.stringify(initial);
  let failWrite = false;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => raw,
    setItem: (_key: string, value: string) => {
      if (failWrite) throw new DOMException('Storage full', 'QuotaExceededError');
      raw = value;
    },
  } });
  return { raw: () => raw, snapshot: () => JSON.parse(raw), fail: () => { failWrite = true; } };
}
function mountStore() {
  let store!: ReturnType<typeof useStore>;
  function Read() { store = useStore(); return null; }
  renderToStaticMarkup(createElement(StoreProvider, { children: createElement(Read) }));
  return store;
}
const legacy = () => ({
  profile: { businessName: 'Contoh', businessType: 'orang-pribadi' },
  obligations: [{ id: 'obligation', status: 'belum' }], payments: [{ id: 'payment', amount: 1000 }],
  chat: [], transactions: [], tradeBills: [],
});

test('legacy storage loads without mount writes; changes persist through a fresh provider', () => {
  const data = browser(legacy());
  const original = data.raw();
  const store = mountStore();
  assert.deepEqual(store.sptProgress, {});
  assert.equal(data.raw(), original);
  store.setSptChecked('op', 2025, 'documents', true);
  assert.equal(mountStore().sptProgress['op:2025'].documents, true);
  assert.deepEqual(data.snapshot().obligations, legacy().obligations);
  assert.deepEqual(data.snapshot().payments, legacy().payments);
});

test('reset touches only the chosen scope, even when all items are acknowledged', () => {
  const data = browser(legacy());
  const store = mountStore();
  for (const item of SPT_ITEMS) store.setSptChecked('op', 2025, item.id, true);
  store.setSptChecked('badan', 2025, 'access', true);
  store.setSptChecked('op', 2024, 'access', true);
  store.resetSptProgress('op', 2025);
  const next = mountStore();
  assert.equal(next.sptProgress['op:2025'], undefined);
  assert.equal(next.sptProgress['badan:2025'].access, true);
  assert.equal(next.sptProgress['op:2024'].access, true);
  assert.deepEqual(data.snapshot().obligations, legacy().obligations);
  assert.deepEqual(data.snapshot().payments, legacy().payments);
  store.clearAll();
  assert.deepEqual(mountStore().sptProgress, {});
});

test('storage failure and corrupt progress preserve the original snapshot', () => {
  const data = browser(legacy());
  const store = mountStore();
  const original = data.raw();
  data.fail();
  assert.throws(() => store.setSptChecked('op', 2025, 'documents', true), /tidak disimpan/);
  assert.equal(data.raw(), original);
  assert.deepEqual(mountStore().sptProgress, {});
  const corrupt = browser({ ...legacy(), sptProgress: { 'op:2025': 'broken' } });
  const raw = corrupt.raw();
  const broken = mountStore();
  assert.match(broken.storageError!, /tidak dapat dibaca/);
  assert.throws(() => broken.resetSptProgress('op', 2025), /tidak dapat dibaca/);
  assert.equal(corrupt.raw(), raw);
});

test('a stale provider reads the latest browser snapshot before saving', () => {
  browser(legacy());
  const first = mountStore();
  const second = mountStore();
  first.setSptChecked('op', 2025, 'documents', true);
  second.setSptChecked('op', 2025, 'access', true);
  const current = JSON.parse(localStorage.getItem(KEY)!);
  assert.deepEqual(current.sptProgress['op:2025'], { documents: true, access: true });
});
