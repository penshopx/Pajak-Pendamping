import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { buildRestore, MAX_BACKUP_BYTES, MAX_BACKUP_ROWS, parseBackup, restoreSnapshot, type RestorableData } from './backup';
import { categoryFor, summarizeLedger, type BusinessTransaction } from './business-ledger';
import { StoreProvider, useStore } from './store';
import { SPT_ITEMS } from './spt-preparation';

const legacy = () => ({
  profile: { businessName: 'Cadangan', businessType: 'orang-pribadi' as const },
  obligations: [{ id: 'ob', title: 'Setor pajak', taxType: 'PPh Final UMKM', period: '2026-06',
    dueDate: '2026-07-15', amount: 100, status: 'belum' as const, notes: '' }],
  payments: [{ id: 'pay', taxType: 'PPh Final UMKM', period: '2026-06', amount: 100,
    date: '2026-07-10', notes: '', ntpn: '' }],
});
const tx = (id: string, category = 'penjualan', amount = 100): BusinessTransaction => ({
  id, category, kind: categoryFor(category)!.kind, amount, date: '2026-06-01', description: 'Catatan usaha', notes: '',
});
const validCurrent = (): RestorableData & { chat: unknown[] } => ({
  ...legacy(), profile: { businessName: 'Lokal', businessType: 'badan' }, transactions: [tx('local')],
  tradeBills: [], chat: [{ id: 'chat', role: 'user', content: 'Tetap lokal' }],
  learningCompleted: ['profil-usaha'], sptProgress: { 'op:2026': { [SPT_ITEMS[0].id]: true } },
});

test('legacy backup has no assumed transactions, trade bills or chat; metadata is not imported', () => {
  const b = parseBackup(JSON.stringify({ ...legacy(), chat: [{ bad: true }], exportedAt: 'metadata' }));
  assert.equal(b.transactions, undefined);
  assert.equal('chat' in b, false);
  assert.equal('exportedAt' in b, false);
  for (const mode of ['merge', 'replace'] as const) {
    const local = validCurrent();
    const restored = buildRestore(local, b, mode);
    assert.deepEqual(restored.transactions, local.transactions);
    assert.deepEqual(restored.chat, local.chat);
    assert.deepEqual(restored.learningCompleted, local.learningCompleted);
    assert.deepEqual(restored.sptProgress, local.sptProgress);
    assert.equal(restored.profile.businessName, mode === 'merge' ? 'Lokal' : 'Cadangan');
  }
});
test('merge is idempotent and keeps locally edited IDs, including progress conflicts', () => {
  const local = validCurrent();
  const b = parseBackup(JSON.stringify({ ...legacy(), transactions: [tx('local', 'penjualan', 999), tx('new')],
    learningCompleted: ['dasar-skema'], sptProgress: { 'op:2026': { [SPT_ITEMS[0].id]: false, [SPT_ITEMS[1].id]: true } } }));
  const result = buildRestore(local, b, 'merge');
  assert.equal(result.transactions.length, 2);
  assert.equal(result.transactions[0].amount, 100);
  assert.equal(result.sptProgress['op:2026'][SPT_ITEMS[0].id], true);
  assert.equal(result.sptProgress['op:2026'][SPT_ITEMS[1].id], true);
  assert.deepEqual(result.learningCompleted, ['profil-usaha', 'dasar-skema']);
  assert.deepEqual(buildRestore(result, b, 'merge'), result);
});
test('replacement clears only explicitly present empty sections and preserves chat', () => {
  const local = validCurrent();
  const b = parseBackup(JSON.stringify({ ...legacy(), obligations: [], payments: [], transactions: [],
    tradeBills: [], learningCompleted: [], sptProgress: {} }));
  const result = buildRestore(local, b, 'replace');
  assert.deepEqual(result.obligations, []);
  assert.deepEqual(result.transactions, []);
  assert.deepEqual(result.sptProgress, {});
  assert.deepEqual(result.chat, local.chat);
});
test('reject malformed JSON, unsafe keys, wrong structure, and oversized bytes or collections', () => {
  for (const value of ['{', 'null', '[]', '{}', '{"__proto__":{}}', '{"constructor":{}}',
    JSON.stringify({ ...legacy(), transactions: null }), JSON.stringify({ ...legacy(), profile: { businessName: [] } })]) {
    assert.throws(() => parseBackup(value));
  }
  assert.throws(() => parseBackup(' '.repeat(MAX_BACKUP_BYTES + 1)), /5 MB/);
  assert.throws(() => parseBackup(JSON.stringify({ ...legacy(),
    transactions: Array.from({ length: MAX_BACKUP_ROWS + 1 }, (_, i) => tx(String(i))) })));
});
test('reject impossible dates, invalid periods, fractional/negative/unsafe amounts, wrong categories and direction', () => {
  for (const changes of [{ date: '2026-02-29' }, { date: '2101-01-01' }, { amount: 0 }, { amount: -1 },
    { amount: 1.5 }, { amount: 1e12 + 1 }, { amount: Number.MAX_SAFE_INTEGER }, { category: 'unknown' },
    { kind: 'pengeluaran' }, { description: '<' }, { id: 'x'.repeat(121) }]) {
    assert.throws(() => parseBackup(JSON.stringify({ ...legacy(), transactions: [{ ...tx('t'), ...changes }] })));
  }
  for (const changes of [{ period: '2026-13' }, { dueDate: '2026-04-31' }, { amount: -1 },
    { amount: 0.5 }, { status: 'paid' }, { taxType: 'unrecognized' }]) {
    assert.throws(() => parseBackup(JSON.stringify({ ...legacy(), obligations: [{ ...legacy().obligations[0], ...changes }] })));
  }
  assert.throws(() => parseBackup(JSON.stringify({ ...legacy(), payments: [{ ...legacy().payments[0], date: '2026-02-30' }] })));
  assert.doesNotThrow(() => parseBackup(JSON.stringify({ ...legacy(), transactions: [{ ...tx('leap'), date: '2024-02-29' }] })));
});
test('reject duplicate IDs and combined limits before writing', () => {
  assert.throws(() => parseBackup(JSON.stringify({ ...legacy(), payments: [legacy().payments[0], legacy().payments[0]] })));
  assert.throws(() => parseBackup(JSON.stringify({ ...legacy(), transactions: [tx('same'), tx('same')] })));
  const local = validCurrent();
  local.transactions = Array.from({ length: MAX_BACKUP_ROWS }, (_, i) => tx(String(i)));
  const b = parseBackup(JSON.stringify({ ...legacy(), transactions: [tx('extra')] }));
  assert.throws(() => buildRestore(local, b, 'merge'));
  assert.equal(local.transactions.length, MAX_BACKUP_ROWS);
});
test('preserve trade links and reject missing references, overpayments and incompatible collisions', () => {
  const bill = { id: 'bill', kind: 'piutang', party: 'Pelanggan', reference: '', description: 'Tagihan penjualan',
    date: '2026-06-01', dueDate: '2026-07-01', amount: 200, category: 'penjualan', notes: '' };
  const payment = { ...tx('settlement'), tradeBillId: 'bill' };
  const b = parseBackup(JSON.stringify({ ...legacy(), tradeBills: [bill], transactions: [payment] }));
  const local = validCurrent();
  assert.equal(buildRestore(local, b, 'merge').transactions[1].tradeBillId, 'bill');
  assert.throws(() => parseBackup(JSON.stringify({ ...b, tradeBills: [] })));
  assert.throws(() => parseBackup(JSON.stringify({ ...b, transactions: [{ ...payment, amount: 201 }] })));
  assert.throws(() => parseBackup(JSON.stringify({ ...b, transactions: [payment, { ...payment, id: 'twice', amount: 101 }] })));
  const collision = { ...local, tradeBills: [{ ...bill, kind: 'utang' as const, category: 'operasional' }] };
  assert.throws(() => buildRestore(collision, b, 'merge'));
});
test('HPP remains noncash after restoration, without creating extra payment entries', () => {
  const b = parseBackup(JSON.stringify({ ...legacy(), transactions: [tx('sale', 'penjualan', 1000),
    tx('stock', 'persediaan', 500), tx('hpp', 'hpp', 300)] }));
  const restored = buildRestore(validCurrent(), b, 'replace');
  const report = summarizeLedger(restored.transactions, { mode: 'bulanan', year: 2026, month: 6 });
  assert.equal(report.cashOut, 500);
  assert.equal(report.cashNet, 500);
  assert.equal(report.netProfit, 700);
  assert.equal(restored.transactions.length, 3);
});

function harness() {
  let raw = JSON.stringify(validCurrent());
  let fails = false;
  let writes = 0;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => raw,
    setItem: (_key: string, value: string) => {
      if (fails) throw new DOMException('Storage full', 'QuotaExceededError');
      raw = value; writes++;
    },
  } });
  let store!: ReturnType<typeof useStore>;
  const load = () => {
    function Capture() { store = useStore(); return null; }
    renderToString(React.createElement(StoreProvider, { children: React.createElement(Capture) }));
    return store;
  };
  return { load, raw: () => raw, writes: () => writes, fail: () => { fails = true; },
    externalChange: () => { raw = JSON.stringify({ ...JSON.parse(raw), transactions: [tx('other-tab')] }); } };
}
test('store commits once, preserves chat, and restores ledger after remount', () => {
  const h = harness(), store = h.load();
  const b = parseBackup(JSON.stringify({ ...legacy(), transactions: [tx('restored', 'hpp', 50)] }));
  store.restoreBackup(b, 'replace', restoreSnapshot(store));
  assert.equal(h.writes(), 1);
  const reloaded = h.load();
  assert.deepEqual(reloaded.transactions, b.transactions);
  assert.deepEqual(reloaded.chat, store.chat);
});
test('quota and invalid input leave the exact original storage and displayed state untouched', () => {
  const h = harness(), store = h.load(), original = h.raw(), before = store.transactions;
  const b = parseBackup(JSON.stringify({ ...legacy(), transactions: [tx('restored')] }));
  assert.throws(() => store.restoreBackup({ ...b, transactions: [tx('bad', 'hpp', 0)] }, 'replace', restoreSnapshot(store)));
  assert.equal(h.raw(), original);
  h.fail();
  assert.throws(() => store.restoreBackup(b, 'replace', restoreSnapshot(store)), /Penyimpanan peramban gagal/);
  assert.equal(h.raw(), original);
  assert.deepEqual(store.transactions, before);
  assert.equal(h.writes(), 0);
});
test('do not overwrite changes made after preview, even before the storage event arrives', () => {
  const h = harness(), store = h.load(), expected = restoreSnapshot(store);
  h.externalChange();
  const changed = h.raw();
  assert.throws(() => store.restoreBackup(parseBackup(JSON.stringify(legacy())), 'replace', expected), /berubah sejak pratinjau/);
  assert.equal(h.raw(), changed);
  assert.equal(h.writes(), 0);
});
