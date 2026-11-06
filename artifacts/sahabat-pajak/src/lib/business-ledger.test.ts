import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  type BusinessTransaction, type LedgerPeriod,
  categoryFor, ledgerCSV, MAX_TRANSACTION_AMOUNT, periodKey, profitLossCSV,
  summarizeLedger, transactionCSV, validLedgerDate, validateTransaction,
} from './business-ledger';

const month: LedgerPeriod = { mode: 'bulanan', year: 2026, month: 6 };
const tx = (category: string, amount: number, date = '2026-06-15'): BusinessTransaction => ({
  id: `${category}-${amount}-${date}`, date, kind: categoryFor(category)!.kind,
  category, amount, description: `Catatan ${category}`, notes: '',
});

test('real dates and period ranges are required, without timezone month shifts', () => {
  for (const date of ['2026-06-01', '2026-06-30', '2024-02-29', '1900-01-01', '2100-12-31']) assert.equal(validLedgerDate(date), true, date);
  for (const date of ['2026-02-29', '2026-06-31', '2026-13-01', '2026-1-01', '', '2101-01-01']) assert.equal(validLedgerDate(date), false, date);
  assert.equal(periodKey(month), '2026-06');
  assert.equal(periodKey({ ...month, mode: 'tahunan' }), '2026');
  for (const period of [{ ...month, month: 13 }, { ...month, year: 1899 }, { ...month, mode: 'invalid' }]) {
    assert.throws(() => periodKey(period as LedgerPeriod));
  }
});

test('reject zero, negative, fractional, excessive amounts, and wrong category direction', () => {
  assert.equal(validateTransaction(tx('penjualan', MAX_TRANSACTION_AMOUNT)), true);
  for (const amount of [0, -1, 0.5, Infinity, NaN, MAX_TRANSACTION_AMOUNT + 1]) assert.equal(validateTransaction(tx('penjualan', amount)), false);
  assert.equal(validateTransaction({ ...tx('penjualan', 1), kind: 'pengeluaran' }), false);
  assert.equal(validateTransaction({ ...tx('penjualan', 1), category: 'not-real' }), false);
  assert.equal(validateTransaction({ ...tx('penjualan', 1), category: undefined, kind: undefined }), false);
  assert.equal(validateTransaction({ ...tx('penjualan', 1), date: '2026-02-30' }), false);
  assert.equal(validateTransaction({ ...tx('penjualan', 1), description: '  ' }), false);
});

test('HPP recognition after stock purchase does not spend cash twice', () => {
  const s = summarizeLedger([
    tx('penjualan', 1_000_000), tx('modal', 500_000), tx('persediaan', 300_000),
    tx('hpp', 200_000), tx('operasional', 100_000), tx('prive', 50_000),
  ], month);
  assert.equal(s.sales, 1_000_000);
  assert.equal(s.cogs, 200_000);
  assert.equal(s.grossProfit, 800_000);
  assert.equal(s.operatingExpenses, 100_000);
  assert.equal(s.netProfit, 700_000);
  assert.equal(s.cashIn, 1_500_000);
  assert.equal(s.cashOut, 450_000);
  assert.equal(s.cashNet, 1_050_000);
  assert.equal(s.excludedIn, 500_000);
  assert.equal(s.excludedOut, 350_000);
});

test('capital, debt principal, assets and transfers are not profit or expense', () => {
  const s = summarizeLedger([
    tx('modal', 10_000), tx('pinjaman-masuk', 15_000), tx('transfer-masuk', 2_000),
    tx('aset', 5_000), tx('pokok-pinjaman', 3_000), tx('prive', 1_000), tx('transfer-keluar', 2_000),
  ], month);
  assert.equal(s.netProfit, 0);
  assert.equal(s.cashNet, 16_000);
  assert.equal(s.excludedIn, 27_000);
  assert.equal(s.excludedOut, 11_000);
});

test('month/year filters include boundaries and a later edit/delete recalculates results', () => {
  const entries = [
    tx('penjualan', 100, '2026-06-01'), tx('gaji', 150, '2026-06-30'),
    tx('penjualan', 500, '2026-07-01'), tx('pendapatan-lain', 20, '2026-01-01'),
    tx('penjualan', 900, '2025-06-01'),
  ];
  assert.equal(summarizeLedger(entries, month).netProfit, -50);
  assert.equal(summarizeLedger(entries, { ...month, mode: 'tahunan' }).netProfit, 470);
  assert.equal(summarizeLedger(entries.map((t, i) => i === 0 ? { ...t, amount: 200 } : t), month).netProfit, 50);
  assert.equal(summarizeLedger(entries.filter((_, i) => i !== 1), month).netProfit, 100);
  assert.equal(summarizeLedger(entries, { ...month, month: 12 }).entries.length, 0);
});

test('invalid records fail visibly instead of turning into plausible figures', () => {
  assert.throws(() => summarizeLedger([{ ...tx('penjualan', 100), amount: -1 }], month), /tidak valid/);
});

test('CSV exports neutralize formulas and preserve numeric negative results', () => {
  const raw = ledgerCSV([['Uraian', 'Nominal'], ['=SUM(1,2)', -100], [' @command', 10], ['Teks, \"kutip\"\\nbaris', 2]]);
  assert.ok(raw.startsWith('\uFEFF'));
  assert.ok(raw.includes("\"'=SUM(1,2)\""));
  assert.ok(raw.includes("\"' @command\""));
  assert.ok(raw.includes('"-100"'));
  assert.ok(raw.includes('""kutip""'));
  const data = [tx('hpp', 10), tx('modal', 5)];
  assert.match(transactionCSV(data), /Penyesuaian nonkas, tidak mengubah kas/);
  assert.match(transactionCSV(data), /Di luar laba rugi/);
  const csv = profitLossCSV(summarizeLedger(data, month), month);
  assert.match(csv, /"2026-06","Hasil sederhana sebelum rekonsiliasi fiskal","-10"/);
  assert.match(csv, /Bukan laporan akrual lengkap/);
});
