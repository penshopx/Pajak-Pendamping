import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categoryFor, MAX_TRANSACTION_AMOUNT, MAX_TRANSACTIONS, summarizeLedger, type BusinessTransaction } from './business-ledger';
import {
  assertTradeLedger, billCategories, billProgress, deleteBillInLedger, eligibleTradeTransactions,
  linkTransactionInLedger, MAX_TRADE_BILLS, recordPaymentInLedger, saveBillInLedger,
  tradeBillsCSV, unlinkTransactionInLedger, validateTradeBill, type TradeBill, type TradeLedger,
} from './trade-ledger';

const bill = (changes: Partial<TradeBill> = {}): TradeBill => ({
  id: 'invoice-a', kind: 'piutang', party: 'Pelanggan Contoh', reference: 'INV-01',
  description: 'Penjualan kredit contoh', date: '2026-06-01', dueDate: '2026-06-30',
  amount: 1_000_000, category: 'penjualan', notes: '', ...changes,
});
const transaction = (id: string, category: string, amount: number, date = '2026-06-15'): BusinessTransaction => ({
  id, category, kind: categoryFor(category)!.kind, amount, date, description: 'Transaksi contoh', notes: '',
});
const empty: TradeLedger = { tradeBills: [], transactions: [] };
const initial = (): TradeLedger => saveBillInLedger(empty, bill(), false);
const month = { mode: 'bulanan' as const, year: 2026, month: 6 };
const payment = (amount = 400_000, paymentId = 'submission-a') => ({
  billId: 'invoice-a', paymentId, date: '2026-06-15', amount, notes: 'Pembayaran contoh',
});

test('validate invoice kind, names, actual dates, whole IDR and allowed cash categories', () => {
  assert.equal(validateTradeBill(bill()), true);
  assert.equal(validateTradeBill(bill({ dueDate: '2026-06-01', amount: MAX_TRANSACTION_AMOUNT })), true);
  for (const changes of [
    { party: ' ' }, { reference: 'x'.repeat(61) }, { description: 'a' },
    { date: '2026-02-30' }, { dueDate: '2026-05-31' }, { amount: 0 }, { amount: -1 },
    { amount: 0.5 }, { amount: NaN }, { amount: Infinity }, { amount: MAX_TRANSACTION_AMOUNT + 1 },
    { category: 'modal' }, { category: 'hpp' }, { kind: 'utang', category: 'penjualan' },
    { kind: 'piutang', category: 'operasional' },
  ]) assert.equal(validateTradeBill(bill(changes as Partial<TradeBill>)), false, JSON.stringify(changes));
  assert.ok(billCategories('utang').some(c => c.id === 'persediaan'));
  assert.ok(!billCategories('utang').some(c => ['hpp', 'prive', 'pokok-pinjaman'].includes(c.id)));
});

test('creating/editing/deleting an unpaid bill never produces cash or income', () => {
  const ledger = initial();
  assert.equal(ledger.transactions.length, 0);
  assert.equal(summarizeLedger(ledger.transactions, month).netProfit, 0);
  assert.equal(billProgress(ledger.tradeBills[0], [], '2026-06-30').overdue, false);
  assert.equal(billProgress(ledger.tradeBills[0], [], '2026-07-01').overdue, true);
  const changed = saveBillInLedger(ledger, bill({ amount: 900_000 }), true);
  assert.equal(billProgress(changed.tradeBills[0], [], '2026-06-30').remaining, 900_000);
  assert.equal(deleteBillInLedger(changed, 'invoice-a').tradeBills.length, 0);
  assert.equal(ledger.tradeBills[0].amount, 1_000_000); // No in-place mutation.
  assert.throws(() => saveBillInLedger(empty, bill(), true), /dihapus/);
});

test('partial and full settlements create exactly one cash entry per unique submission', () => {
  const ledger = recordPaymentInLedger(initial(), payment());
  assert.equal(ledger.transactions.length, 1);
  const p = billProgress(ledger.tradeBills[0], ledger.transactions, '2026-07-01');
  assert.equal(p.paid, 400_000);
  assert.equal(p.remaining, 600_000);
  assert.equal(p.status, 'sebagian');
  assert.equal(p.overdue, true);
  assert.equal(summarizeLedger(ledger.transactions, month).cashIn, 400_000);
  assert.equal(summarizeLedger(ledger.transactions, month).netProfit, 400_000);
  assert.strictEqual(recordPaymentInLedger(ledger, payment()), ledger);
  assert.throws(() => recordPaymentInLedger(ledger, payment(400_001)), /digunakan/);
  const full = recordPaymentInLedger(ledger, payment(600_000, 'submission-b'));
  assert.equal(full.transactions.length, 2);
  const done = billProgress(full.tradeBills[0], full.transactions, '2026-07-01');
  assert.equal(done.remaining, 0);
  assert.equal(done.status, 'lunas');
  assert.equal(done.overdue, false);
  assert.throws(() => recordPaymentInLedger(full, payment(1, 'submission-c')), /melebihi/);
});

test('bad dates, wrong amounts and overpayment fail without changing source records', () => {
  const ledger = initial();
  const original = JSON.stringify(ledger);
  for (const input of [
    payment(0), payment(-1), payment(0.5), payment(NaN), payment(1_000_001),
    { ...payment(), date: '2026-05-31' }, { ...payment(), date: '2026-06-31' },
    { ...payment(), billId: 'missing' }, { ...payment(), paymentId: '' },
  ]) {
    assert.throws(() => recordPaymentInLedger(ledger, input));
    assert.equal(JSON.stringify(ledger), original);
  }
});

test('link existing cash does not add or count cash/P&L again, and cannot be reused elsewhere', () => {
  const cash = transaction('existing', 'penjualan', 400_000);
  let ledger = { ...initial(), transactions: [cash] };
  const cashBefore = summarizeLedger(ledger.transactions, month);
  ledger = linkTransactionInLedger(ledger, 'invoice-a', cash.id);
  assert.equal(ledger.transactions.length, 1);
  assert.equal(billProgress(ledger.tradeBills[0], ledger.transactions, '2026-07-01').remaining, 600_000);
  assert.equal(summarizeLedger(ledger.transactions, month).cashIn, cashBefore.cashIn);
  assert.equal(summarizeLedger(ledger.transactions, month).netProfit, cashBefore.netProfit);
  assert.strictEqual(linkTransactionInLedger(ledger, 'invoice-a', cash.id), ledger);
  const other = saveBillInLedger(ledger, bill({ id: 'invoice-b' }), false);
  assert.throws(() => linkTransactionInLedger(other, 'invoice-b', cash.id), /lain/);
});

test('only unlinked matching cash transactions within remaining balance are eligible', () => {
  const ledger = recordPaymentInLedger(initial(), payment());
  const candidates = [
    ...ledger.transactions, transaction('valid', 'penjualan', 600_000),
    transaction('excess', 'penjualan', 600_001), transaction('before', 'penjualan', 1, '2026-05-31'),
    transaction('wrong-category', 'pendapatan-lain', 1), transaction('wrong-kind', 'operasional', 1),
    transaction('noncash', 'hpp', 1),
  ];
  assert.deepEqual(eligibleTradeTransactions(bill(), candidates).map(t => t.id), ['valid']);
  for (const id of ['excess', 'before', 'wrong-category', 'wrong-kind', 'noncash']) {
    assert.throws(() => linkTransactionInLedger({ ...ledger, transactions: candidates }, 'invoice-a', id));
  }
});

test('unlink retains original cash; deletion cannot silently remove paid invoice or cash', () => {
  const paid = recordPaymentInLedger(initial(), payment());
  const id = paid.transactions[0].id;
  assert.throws(() => deleteBillInLedger(paid, 'invoice-a'), /Lepaskan tautan/);
  const unlinked = unlinkTransactionInLedger(paid, id);
  assert.equal(unlinked.transactions.length, 1);
  assert.equal(unlinked.transactions[0].tradeBillId, undefined);
  assert.equal(billProgress(unlinked.tradeBills[0], unlinked.transactions, '2026-07-01').remaining, 1_000_000);
  assert.equal(summarizeLedger(unlinked.transactions, month).cashIn, 400_000);
  const deleted = deleteBillInLedger(unlinked, 'invoice-a');
  assert.equal(deleted.transactions.length, 1);
  assert.equal(deleted.tradeBills.length, 0);
  assert.equal(paid.transactions[0].tradeBillId, 'invoice-a');
});

test('editing linked invoice/transaction enforces amount, date, kind, category; deleting cash reopens balance', () => {
  const ledger = recordPaymentInLedger(initial(), payment());
  for (const changes of [
    { amount: 399_999 }, { category: 'pendapatan-lain' },
    { kind: 'utang' as const, category: 'operasional' }, { date: '2026-06-16' },
  ]) assert.throws(() => saveBillInLedger(ledger, bill(changes), true));
  const edited = saveBillInLedger(ledger, bill({ amount: 1_200_000, party: 'Pelanggan Baru', dueDate: '2026-07-31' }), true);
  assert.equal(billProgress(edited.tradeBills[0], edited.transactions, '2026-07-01').remaining, 800_000);
  assert.equal(billProgress(edited.tradeBills[0], edited.transactions, '2026-07-01').overdue, false);
  for (const changes of [{ amount: 1_000_001 }, { date: '2026-05-31' }, { category: 'pendapatan-lain' }, { kind: 'pengeluaran' as const }]) {
    assert.throws(() => assertTradeLedger(ledger.tradeBills, [{ ...ledger.transactions[0], ...changes }]));
  }
  assert.equal(billProgress(ledger.tradeBills[0], [], '2026-07-01').status, 'belum');
});

test('stock and asset payables spend cash only at settlement and never create HPP automatically', () => {
  for (const category of ['persediaan', 'aset']) {
    let ledger = saveBillInLedger(empty, bill({ kind: 'utang', category }), false);
    assert.equal(summarizeLedger(ledger.transactions, month).cashOut, 0);
    ledger = recordPaymentInLedger(ledger, payment(1_000_000));
    let summary = summarizeLedger(ledger.transactions, month);
    assert.equal(summary.cashOut, 1_000_000);
    assert.equal(summary.netProfit, 0);
    assert.equal(summary.cogs, 0);
    summary = summarizeLedger([...ledger.transactions, transaction('manual-hpp', 'hpp', 200_000)], month);
    assert.equal(summary.cashOut, 1_000_000);
    assert.equal(summary.cogs, 200_000);
  }
  const operating = recordPaymentInLedger(saveBillInLedger(empty, bill({ kind: 'utang', category: 'operasional' }), false), payment(100_000));
  assert.equal(summarizeLedger(operating.transactions, month).netProfit, -100_000);
});

test('cash and profit follow settlement date, not invoice issue date', () => {
  const ledger = recordPaymentInLedger(initial(), { ...payment(), date: '2026-07-01' });
  assert.equal(summarizeLedger(ledger.transactions, month).cashIn, 0);
  assert.equal(summarizeLedger(ledger.transactions, { ...month, month: 7 }).cashIn, 400_000);
  assert.equal(summarizeLedger(ledger.transactions, { ...month, month: 7 }).netProfit, 400_000);
});

test('bad imports, orphan links, duplicate IDs, limits and invalid direction fail closed', () => {
  const ledger = recordPaymentInLedger(initial(), payment());
  assert.throws(() => assertTradeLedger([], ledger.transactions), /tidak ditemukan/);
  assert.throws(() => assertTradeLedger([bill(), bill()], []), /tidak valid/);
  assert.throws(() => assertTradeLedger([bill()], [ledger.transactions[0], ledger.transactions[0]]), /tidak valid/);
  assert.throws(() => assertTradeLedger([bill({ amount: -1 })], []), /tidak valid/);
  assert.throws(() => assertTradeLedger(Array(MAX_TRADE_BILLS + 1).fill(bill()), []), /tidak valid/);
  assert.throws(() => assertTradeLedger([bill()], Array(MAX_TRANSACTIONS + 1).fill(transaction('x', 'penjualan', 1))), /tidak valid/);
});

test('CSV includes amounts/status for supplied scope and escapes customer formula injection', () => {
  const b = bill({ party: '=HYPERLINK(\"bad\")', reference: ' @danger', notes: 'Kutip \"teks\", catatan' });
  const ledger = recordPaymentInLedger(saveBillInLedger(empty, b, false), payment());
  const csv = tradeBillsCSV(ledger.tradeBills, ledger.transactions, '2026-07-01');
  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(csv, /"'=HYPERLINK/);
  assert.match(csv, /"' @danger"/);
  assert.match(csv, /"1000000","400000","600000","sebagian","Ya"/);
  assert.equal(tradeBillsCSV([], ledger.transactions, '2026-07-01').split('\r\n').length, 1);
});
