import {
  categoryFor, isCashTransaction, LEDGER_CATEGORIES, ledgerCSV, MAX_TRANSACTION_AMOUNT,
  MAX_TRANSACTIONS, validLedgerDate, validateTransaction, type BusinessTransaction,
} from './business-ledger';

export type TradeBillKind = 'piutang' | 'utang';
export interface TradeBill {
  id: string;
  kind: TradeBillKind;
  party: string;
  reference: string;
  description: string;
  date: string;
  dueDate: string;
  amount: number;
  category: string;
  notes: string;
}
export const MAX_TRADE_BILLS = 5000;
const expenseCategories = new Set(['operasional', 'gaji', 'sewa', 'beban-lain', 'persediaan', 'aset']);
export function billCategories(kind: TradeBillKind) {
  return LEDGER_CATEGORIES.filter(c => kind === 'piutang'
    ? c.group === 'sales' || c.group === 'other-income'
    : expenseCategories.has(c.id));
}
export function validateTradeBill(value: unknown): value is TradeBill {
  if (!value || typeof value !== 'object') return false;
  const b = value as TradeBill;
  return typeof b.id === 'string' && b.id.length > 0 && b.id.length <= 120
    && (b.kind === 'piutang' || b.kind === 'utang')
    && typeof b.party === 'string' && b.party.trim().length >= 2 && b.party.length <= 80
    && typeof b.reference === 'string' && b.reference.length <= 60
    && typeof b.description === 'string' && b.description.trim().length >= 3 && b.description.length <= 120
    && typeof b.notes === 'string' && b.notes.length <= 1000
    && typeof b.date === 'string' && validLedgerDate(b.date)
    && typeof b.dueDate === 'string' && validLedgerDate(b.dueDate) && b.dueDate >= b.date
    && Number.isSafeInteger(b.amount) && b.amount > 0 && b.amount <= MAX_TRANSACTION_AMOUNT
    && billCategories(b.kind).some(c => c.id === b.category);
}
export function billProgress(bill: TradeBill, transactions: BusinessTransaction[], today: string) {
  const payments = transactions.filter(t => t.tradeBillId === bill.id)
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  const paid = payments.reduce((sum, t) => sum + t.amount, 0);
  const remaining = bill.amount - paid;
  const status = remaining === 0 ? 'lunas' : paid > 0 ? 'sebagian' : 'belum';
  return { payments, paid, remaining, status, overdue: remaining > 0 && bill.dueDate < today };
}
export function eligibleTradeTransactions(bill: TradeBill, transactions: BusinessTransaction[]) {
  const { remaining } = billProgress(bill, transactions, bill.date);
  return transactions.filter(t => !t.tradeBillId && isCashTransaction(t)
    && t.kind === (bill.kind === 'piutang' ? 'pemasukan' : 'pengeluaran')
    && t.category === bill.category && t.date >= bill.date && t.amount <= remaining);
}
/** Enforce financial links on load and before every atomic ledger mutation. */
export function assertTradeLedger(bills: TradeBill[], transactions: BusinessTransaction[]) {
  if (bills.length > MAX_TRADE_BILLS || !bills.every(validateTradeBill)
    || new Set(bills.map(b => b.id)).size !== bills.length) throw new Error('Ada tagihan usaha tidak valid. Perubahan dibatalkan.');
  if (transactions.length > MAX_TRANSACTIONS || !transactions.every(validateTransaction)
    || new Set(transactions.map(t => t.id)).size !== transactions.length) throw new Error('Ada transaksi tidak valid. Perubahan dibatalkan.');
  const byId = new Map(bills.map(b => [b.id, b]));
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (!t.tradeBillId) continue;
    const b = byId.get(t.tradeBillId);
    if (!b) throw new Error('Transaksi tertaut pada tagihan yang tidak ditemukan.');
    if (!isCashTransaction(t) || t.category !== b.category
      || t.kind !== (b.kind === 'piutang' ? 'pemasukan' : 'pengeluaran') || t.date < b.date) {
      throw new Error('Tanggal, jenis, atau kategori pembayaran tidak cocok dengan tagihan.');
    }
    totals.set(b.id, (totals.get(b.id) ?? 0) + t.amount);
    if (totals.get(b.id)! > b.amount) throw new Error('Total pembayaran melebihi nilai tagihan. Perubahan dibatalkan.');
  }
}
export interface TradeLedger { tradeBills: TradeBill[]; transactions: BusinessTransaction[] }
export function saveBillInLedger(ledger: TradeLedger, bill: TradeBill, isEdit: boolean): TradeLedger {
  const old = ledger.tradeBills.find(b => b.id === bill.id);
  if (isEdit && !old) throw new Error('Tagihan sudah dihapus. Muat ulang daftar.');
  if (!isEdit && old) throw new Error('ID tagihan sudah digunakan.');
  if (!isEdit && ledger.tradeBills.length >= MAX_TRADE_BILLS) throw new Error('Batas tagihan lokal tercapai. Ekspor catatan sebelum melanjutkan.');
  if (old && ledger.transactions.some(t => t.tradeBillId === bill.id)
    && (old.kind !== bill.kind || old.category !== bill.category)) {
    throw new Error('Jenis dan kategori tagihan yang memiliki pembayaran tidak dapat diubah. Lepaskan tautan pembayaran terlebih dahulu.');
  }
  const tradeBills = old ? ledger.tradeBills.map(b => b.id === bill.id ? bill : b) : [bill, ...ledger.tradeBills];
  assertTradeLedger(tradeBills, ledger.transactions);
  return { ...ledger, tradeBills };
}
export interface TradePaymentInput { billId: string; paymentId: string; date: string; amount: number; notes: string }
export function recordPaymentInLedger(ledger: TradeLedger, input: TradePaymentInput): TradeLedger {
  const bill = ledger.tradeBills.find(b => b.id === input.billId);
  if (!bill) throw new Error('Tagihan tidak ditemukan.');
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(input.paymentId)) throw new Error('Identitas pencatatan pembayaran tidak valid.');
  const id = `trade-payment-${input.paymentId}`;
  const existing = ledger.transactions.find(t => t.id === id);
  if (existing) {
    if (existing.tradeBillId === bill.id && existing.date === input.date && existing.amount === input.amount
      && existing.notes === input.notes.trim()) return ledger; // Same submission must not create another cash entry.
    throw new Error('Identitas pembayaran sudah digunakan. Buka ulang formulir.');
  }
  const transaction: BusinessTransaction = {
    id, tradeBillId: bill.id, date: input.date, amount: input.amount, notes: input.notes.trim(),
    kind: bill.kind === 'piutang' ? 'pemasukan' : 'pengeluaran', category: bill.category,
    description: `${bill.kind === 'piutang' ? 'Terima' : 'Bayar'} ${bill.reference || bill.description} · ${bill.party}`.slice(0, 120),
  };
  const transactions = [transaction, ...ledger.transactions];
  assertTradeLedger(ledger.tradeBills, transactions);
  return { ...ledger, transactions };
}
export function linkTransactionInLedger(ledger: TradeLedger, billId: string, transactionId: string): TradeLedger {
  const bill = ledger.tradeBills.find(b => b.id === billId);
  const transaction = ledger.transactions.find(t => t.id === transactionId);
  if (!bill || !transaction) throw new Error('Tagihan atau transaksi tidak ditemukan. Muat ulang daftar.');
  if (transaction.tradeBillId === billId) return ledger;
  if (transaction.tradeBillId) throw new Error('Transaksi sudah tertaut pada tagihan lain.');
  const transactions = ledger.transactions.map(t => t.id === transactionId ? { ...t, tradeBillId: billId } : t);
  assertTradeLedger(ledger.tradeBills, transactions);
  return { ...ledger, transactions };
}
export function unlinkTransactionInLedger(ledger: TradeLedger, transactionId: string): TradeLedger {
  const existing = ledger.transactions.find(t => t.id === transactionId);
  if (!existing?.tradeBillId) throw new Error('Tautan pembayaran tidak ditemukan.');
  const transactions = ledger.transactions.map(t => {
    if (t.id !== transactionId) return t;
    const { tradeBillId: _billId, ...unlinked } = t;
    return unlinked;
  });
  assertTradeLedger(ledger.tradeBills, transactions);
  return { ...ledger, transactions };
}
export function deleteBillInLedger(ledger: TradeLedger, id: string): TradeLedger {
  if (!ledger.tradeBills.some(b => b.id === id)) throw new Error('Tagihan sudah dihapus.');
  if (ledger.transactions.some(t => t.tradeBillId === id)) {
    throw new Error('Tagihan masih memiliki pembayaran. Lepaskan tautan terlebih dahulu; transaksi kas tidak akan dihapus otomatis.');
  }
  return { ...ledger, tradeBills: ledger.tradeBills.filter(b => b.id !== id) };
}
export function tradeBillsCSV(bills: TradeBill[], transactions: BusinessTransaction[], today: string) {
  return ledgerCSV([
    ['Jenis', 'Pihak', 'Referensi', 'Uraian', 'Tanggal tagihan', 'Jatuh tempo', 'Kategori saat pembayaran', 'Nilai IDR', 'Terbayar IDR', 'Sisa IDR', 'Status', 'Lewat jatuh tempo', 'Catatan'],
    ...bills.map(b => {
      const p = billProgress(b, transactions, today);
      return [b.kind, b.party, b.reference, b.description, b.date, b.dueDate, categoryFor(b.category)?.label ?? b.category,
        b.amount, p.paid, p.remaining, p.status, p.overdue ? 'Ya' : 'Tidak', b.notes];
    }),
  ]);
}
