/** Cash records plus explicit noncash HPP adjustments; not a tax engine or accrual ledger. */
export type TransactionKind = 'pemasukan' | 'pengeluaran';
export type ResultGroup = 'sales' | 'other-income' | 'cogs' | 'operating' | 'excluded';
export interface BusinessTransaction {
  id: string;
  date: string;
  kind: TransactionKind;
  category: string;
  description: string;
  amount: number;
  notes: string;
  tradeBillId?: string;
}
export interface LedgerPeriod { mode: 'bulanan' | 'tahunan'; year: number; month: number }
export const MAX_TRANSACTION_AMOUNT = 1_000_000_000_000;
export const MAX_TRANSACTIONS = 5000;
export const LEDGER_CATEGORIES: { id: string; label: string; kind: TransactionKind; group: ResultGroup }[] = [
  { id: 'penjualan', label: 'Penjualan usaha', kind: 'pemasukan', group: 'sales' },
  { id: 'pendapatan-lain', label: 'Pendapatan usaha lainnya', kind: 'pemasukan', group: 'other-income' },
  { id: 'modal', label: 'Setoran modal (bukan pendapatan)', kind: 'pemasukan', group: 'excluded' },
  { id: 'pinjaman-masuk', label: 'Penerimaan pinjaman (bukan pendapatan)', kind: 'pemasukan', group: 'excluded' },
  { id: 'transfer-masuk', label: 'Transfer masuk antar-rekening sendiri', kind: 'pemasukan', group: 'excluded' },
  { id: 'hpp', label: 'Penyesuaian HPP (nonkas)', kind: 'pengeluaran', group: 'cogs' },
  { id: 'operasional', label: 'Beban operasional', kind: 'pengeluaran', group: 'operating' },
  { id: 'gaji', label: 'Beban gaji', kind: 'pengeluaran', group: 'operating' },
  { id: 'sewa', label: 'Beban sewa', kind: 'pengeluaran', group: 'operating' },
  { id: 'beban-lain', label: 'Beban usaha lainnya', kind: 'pengeluaran', group: 'operating' },
  { id: 'prive', label: 'Penarikan pemilik (bukan beban)', kind: 'pengeluaran', group: 'excluded' },
  { id: 'pokok-pinjaman', label: 'Pelunasan pokok pinjaman (bukan beban)', kind: 'pengeluaran', group: 'excluded' },
  { id: 'aset', label: 'Pembelian aset (tidak dibebankan langsung)', kind: 'pengeluaran', group: 'excluded' },
  { id: 'persediaan', label: 'Pembelian persediaan (belum menjadi HPP)', kind: 'pengeluaran', group: 'excluded' },
  { id: 'transfer-keluar', label: 'Transfer keluar antar-rekening sendiri', kind: 'pengeluaran', group: 'excluded' },
];
export const categoryFor = (id: string) => LEDGER_CATEGORIES.find((c) => c.id === id);
// Stock purchases already consume cash. Recognizing their HPP later must not
// consume cash a second time.
export const isCashTransaction = (transaction: BusinessTransaction) => transaction.category !== 'hpp';
export function validLedgerDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 1900 && year <= 2100 && date.toISOString().slice(0, 10) === value;
}
export function validateTransaction(value: unknown): value is BusinessTransaction {
  if (!value || typeof value !== 'object') return false;
  const t = value as BusinessTransaction;
  return typeof t.id === 'string' && t.id.length > 0
    && typeof t.date === 'string' && validLedgerDate(t.date)
    && typeof t.description === 'string' && t.description.trim().length >= 3 && t.description.length <= 120
    && typeof t.notes === 'string' && t.notes.length <= 1000
    && (t.tradeBillId === undefined || (typeof t.tradeBillId === 'string' && t.tradeBillId.length > 0 && t.tradeBillId.length <= 120))
    && Number.isSafeInteger(t.amount) && t.amount > 0 && t.amount <= MAX_TRANSACTION_AMOUNT
    && typeof t.category === 'string' && (t.kind === 'pemasukan' || t.kind === 'pengeluaran')
    && categoryFor(t.category)?.kind === t.kind;
}
export function periodKey(period: LedgerPeriod) {
  if (!['bulanan', 'tahunan'].includes(period.mode)
    || !Number.isInteger(period.year) || period.year < 1900 || period.year > 2100
    || !Number.isInteger(period.month) || period.month < 1 || period.month > 12) throw new Error('Pilih periode yang valid.');
  return `${period.year}${period.mode === 'bulanan' ? `-${String(period.month).padStart(2, '0')}` : ''}`;
}
export function summarizeLedger(transactions: BusinessTransaction[], period: LedgerPeriod) {
  if (transactions.length > MAX_TRANSACTIONS) throw new Error('Jumlah transaksi melampaui batas rekap lokal.');
  const key = periodKey(period);
  const entries = transactions.filter((t) => t.date.startsWith(key))
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  let sales = 0, otherIncome = 0, cogs = 0, operatingExpenses = 0, cashIn = 0, cashOut = 0, excludedIn = 0, excludedOut = 0;
  const byCategory: Record<string, number> = {};
  for (const t of entries) {
    if (!validateTransaction(t)) throw new Error('Ada transaksi tidak valid. Laporan tidak dapat dihitung.');
    const category = categoryFor(t.category)!;
    byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
    if (isCashTransaction(t)) {
      if (t.kind === 'pemasukan') cashIn += t.amount; else cashOut += t.amount;
    }
    if (category.group === 'excluded') {
      if (t.kind === 'pemasukan') excludedIn += t.amount; else excludedOut += t.amount;
    }
    if (category.group === 'sales') sales += t.amount;
    if (category.group === 'other-income') otherIncome += t.amount;
    if (category.group === 'cogs') cogs += t.amount;
    if (category.group === 'operating') operatingExpenses += t.amount;
  }
  const income = sales + otherIncome, expenses = cogs + operatingExpenses;
  return {
    entries, byCategory, sales, otherIncome, income, cogs, operatingExpenses, expenses,
    grossProfit: sales - cogs, netProfit: income - expenses,
    cashIn, cashOut, cashNet: cashIn - cashOut,
    excludedIn, excludedOut,
  };
}
export type LedgerSummary = ReturnType<typeof summarizeLedger>;

// Spreadsheet formula injection prevention applies to user-entered text, not numeric cells.
export function ledgerCSV(rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    let s = String(v);
    if (typeof v === 'string' && (/^[\s]*[=+\-@]/.test(s) || /^[\t\r\n]/.test(s))) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  return '\uFEFF' + rows.map((r) => r.map(escape).join(',')).join('\r\n');
}
export function transactionCSV(entries: BusinessTransaction[]) {
  return ledgerCSV([
    ['Tanggal', 'Uraian', 'Jenis', 'Kategori', 'Perlakuan rekap', 'Perlakuan kas', 'Nominal IDR', 'Catatan', 'Tagihan terkait (ID)'],
    ...entries.map((t) => [t.date, t.description, t.kind, categoryFor(t.category)?.label ?? t.category,
      categoryFor(t.category)?.group === 'excluded' ? 'Di luar laba rugi' : 'Masuk laba rugi',
      isCashTransaction(t) ? 'Transaksi kas' : 'Penyesuaian nonkas, tidak mengubah kas', t.amount, t.notes, t.tradeBillId ?? '']),
  ]);
}
export function profitLossCSV(summary: LedgerSummary, period: LedgerPeriod) {
  return ledgerCSV([
    ['Periode', 'Komponen', 'Nominal IDR'],
    [periodKey(period), 'Penjualan', summary.sales],
    [periodKey(period), 'HPP', summary.cogs],
    [periodKey(period), 'Laba kotor', summary.grossProfit],
    ...LEDGER_CATEGORIES.filter((c) => c.group === 'operating').map((c) => [periodKey(period), c.label, summary.byCategory[c.id] ?? 0]),
    [periodKey(period), 'Total beban operasional', summary.operatingExpenses],
    [periodKey(period), 'Pendapatan usaha lainnya', summary.otherIncome],
    [periodKey(period), 'Hasil sederhana sebelum rekonsiliasi fiskal', summary.netProfit],
    [periodKey(period), 'Kas masuk di luar laba rugi', summary.excludedIn],
    [periodKey(period), 'Kas keluar di luar laba rugi', summary.excludedOut],
    [periodKey(period), 'Selisih arus kas tercatat (bukan saldo rekening)', summary.cashNet],
    [periodKey(period), 'CATATAN: Rekap manajemen kas dengan penyesuaian HPP nonkas manual. Bukan laporan akrual lengkap, penghasilan kena pajak, atau tagihan pajak.', ''],
  ]);
}
