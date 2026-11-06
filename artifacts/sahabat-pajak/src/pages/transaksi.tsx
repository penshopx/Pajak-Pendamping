import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Link2, ArrowDownLeft, ArrowUpRight, Download, Pencil, Plus, Search, Trash2, Wallet } from 'lucide-react';
import { useStore } from '@/lib/store';
import { downloadFile, formatDate, rupiah, usePageTitle } from '@/lib/format';
import { LEDGER_CATEGORIES, categoryFor, isCashTransaction, periodKey, transactionCSV, type BusinessTransaction } from '@/lib/business-ledger';
import { EmptyState, PageHeader } from '@/components/shell';
import { Confirm } from '@/components/confirm';
import { TransactionDialog } from '@/components/transaction-dialog';
import { LocalDataNotice, PeriodPicker, periodLabel, thisMonth, useLedgerYears, validPeriod, type PeriodMode } from '@/components/ledger-shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function Transaksi() {
  usePageTitle('Transaksi');
  const { transactions, deleteTransaction, tradeBills } = useStore();
  const billById = useMemo(() => new Map(tradeBills.map((b) => [b.id, b])), [tradeBills]);
  const { toast } = useToast();
  const now = thisMonth();
  const [period, setPeriod] = useState<{ mode: PeriodMode; year: number; month: number }>({ mode: 'bulanan', ...now });
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('semua');
  const [cat, setCat] = useState('semua');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessTransaction | null>(null);
  const years = useLedgerYears(transactions, period.year);

  const key = period.mode !== 'semua' && validPeriod(period.year, period.month)
    ? periodKey({ mode: period.mode, year: period.year, month: period.month }) : '';
  const inPeriod = useMemo(() => transactions.filter((t) => !key || t.date.startsWith(key)), [transactions, key]);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return inPeriod.filter((t) => {
      if (kind !== 'semua' && t.kind !== kind) return false;
      if (cat !== 'semua' && t.category !== cat) return false;
      if (needle && !`${t.description} ${t.notes} ${categoryFor(t.category)?.label ?? ''}`.toLowerCase().includes(needle)) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  }, [inPeriod, q, kind, cat]);
  const cashList = list.filter(isCashTransaction);
  const nonCash = list.length - cashList.length;
  const totIn = cashList.filter((t) => t.kind === 'pemasukan').reduce((a, t) => a + t.amount, 0);
  const totOut = cashList.filter((t) => t.kind === 'pengeluaran').reduce((a, t) => a + t.amount, 0);
  const filtersActive = q.trim() !== '' || kind !== 'semua' || cat !== 'semua';
  const scope = period.mode === 'semua' ? 'Semua periode' : periodLabel({ mode: period.mode, year: period.year, month: period.month });

  const resetFilters = () => { setQ(''); setKind('semua'); setCat('semua'); };
  const add = () => { setEditing(null); setOpen(true); };
  const exportCSV = () => {
    if (!list.length) return;
    downloadFile(`sahabat-pajak-transaksi-${key || 'semua'}${filtersActive ? '-tersaring' : ''}.csv`, transactionCSV(list), 'text/csv;charset=utf-8');
    toast({ title: 'CSV transaksi diunduh', description: `${list.length} transaksi · ${scope}${filtersActive ? ' · dengan filter' : ''}` });
  };
  const remove = (t: BusinessTransaction) => {
    try { deleteTransaction(t.id); }
    catch (e) { toast({ variant: 'destructive', title: 'Transaksi gagal dihapus', description: e instanceof Error ? e.message : 'Penyimpanan peramban menolak perubahan.' }); return; }
    toast({ title: 'Transaksi dihapus', description: t.description });
  };
  const cats = LEDGER_CATEGORIES.filter((c) => kind === 'semua' || c.kind === kind);

  return (
    <>
      <PageHeader eyebrow="Transaksi usaha" title="Uang masuk dan keluar"
        desc="Catatan kas sederhana ditambah penyesuaian HPP nonkas yang Anda isi manual. Bukan pembukuan akrual dan tidak menghitung pajak."
        actions={<>
          <Link href="/laba-rugi" className="press inline-flex h-10 items-center rounded-md border border-input px-4 text-sm font-semibold text-foreground hover:text-white" data-testid="link-to-laba-rugi">Lihat laba rugi</Link>
          <Button className="press font-semibold" onClick={add} data-testid="button-add-transaction"><Plus className="h-4 w-4 mr-1.5" />Catat transaksi</Button>
        </>} />

      <div className="mb-6 space-y-3">
        <LocalDataNotice />
      </div>

      {transactions.length === 0 ? (
        <EmptyState icon={Wallet} title="Belum ada transaksi"
          desc="Mulai dari penjualan atau pengeluaran terakhir. Nominal yang Anda isi adalah satu-satunya sumber angka di laporan."
          action={<Button className="press" onClick={add} data-testid="button-empty-add-transaction"><Plus className="h-4 w-4 mr-1.5" />Catat transaksi pertama</Button>} />
      ) : (
        <>
          <div className="rise mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <PeriodPicker idPrefix="transaksi-period" allowAll mode={period.mode} year={period.year} month={period.month} years={years} onChange={setPeriod} />
            <Button variant="outline" className="press border-input" disabled={!list.length} onClick={exportCSV} data-testid="button-export-transactions">
              <Download className="h-4 w-4 mr-1.5" />Unduh CSV ({list.length})
            </Button>
          </div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari uraian, catatan, kategori" aria-label="Cari transaksi" className="h-10 bg-card border-input pl-9" data-testid="input-search-transactions" />
            </div>
            <Select value={kind} onValueChange={(v) => { setKind(v); if (cat !== 'semua' && categoryFor(cat)?.kind !== v && v !== 'semua') setCat('semua'); }}>
              <SelectTrigger className="h-10 sm:w-40 bg-card border-input" aria-label="Jenis" data-testid="select-filter-kind"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="semua">Semua jenis</SelectItem><SelectItem value="pemasukan">Pemasukan</SelectItem><SelectItem value="pengeluaran">Pengeluaran / beban</SelectItem></SelectContent>
            </Select>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="h-10 sm:w-56 bg-card border-input" aria-label="Kategori" data-testid="select-filter-category"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="semua">Semua kategori</SelectItem>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1 text-sm" data-testid="text-transaction-count">
            <span className="text-foreground/85">
              <b className="text-white">{list.length}</b> dari {inPeriod.length} transaksi · {scope}
              {filtersActive && <button className="ml-2 font-semibold text-accent underline underline-offset-4" onClick={resetFilters} data-testid="button-clear-filters">hapus filter</button>}
            </span>
            <span className="num text-foreground/85">Kas masuk <b className="text-accent">{rupiah(totIn)}</b> · Kas keluar <b className="text-white">{rupiah(totOut)}</b>{nonCash > 0 && <span className="text-foreground/70"> · {nonCash} penyesuaian nonkas tidak dihitung</span>}</span>
          </div>

          {list.length === 0 ? (
            <div className="rounded-xl border border-dashed border-input px-4 py-10 text-center text-sm text-foreground/80" data-testid="text-no-results">
              {inPeriod.length === 0 ? <>Tidak ada transaksi pada {scope.toLowerCase()}. Pilih periode lain atau catat transaksi baru.</>
                : <>Tidak ada transaksi yang cocok dengan filter.{' '}<button className="font-semibold text-accent underline underline-offset-4" onClick={resetFilters} data-testid="button-reset-transaction-filters">Atur ulang filter</button></>}
            </div>
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
              {list.map((t) => {
                const bill = t.tradeBillId ? billById.get(t.tradeBillId) : undefined;
                const c = categoryFor(t.category); const isIn = t.kind === 'pemasukan'; const cash = isCashTransaction(t);
                return (
                  <li key={t.id} className="group grid gap-2 p-4 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center hover:bg-muted/40 transition-colors" data-testid={`row-transaction-${t.id}`}>
                    <span className={`hidden sm:grid h-9 w-9 place-items-center rounded-lg ${isIn ? 'bg-accent/15 text-accent' : 'bg-primary/15 text-primary'}`}>{isIn ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}</span>
                    <div className="min-w-0">
                      <div className="font-semibold text-white break-words">{t.description}</div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/75">
                        <span>{formatDate(t.date)}</span>
                        <span>{c?.label ?? t.category}</span>
                        {!cash && <span className="rounded bg-primary/15 px-1.5 font-semibold text-primary">Penyesuaian nonkas</span>}
                        {t.tradeBillId && <Link href="/piutang-utang" className="inline-flex items-center gap-1 rounded bg-accent/15 px-1.5 font-semibold text-accent hover:underline" data-testid={`link-transaction-bill-${t.id}`}><Link2 className="h-3 w-3" />{bill ? `Pembayaran ${bill.kind} · ${bill.reference || bill.description} · ${bill.party}` : 'Pembayaran tagihan'}</Link>}
                        {c?.group === 'excluded' && <span className="font-semibold text-[hsl(var(--warn))]">Di luar laba rugi</span>}
                      </div>
                      {t.notes && <p className="mt-1.5 text-sm text-foreground/75 line-clamp-2">{t.notes}</p>}
                    </div>
                    <div className={`num text-lg font-semibold sm:text-right ${!cash ? 'text-foreground/80' : isIn ? 'text-accent' : 'text-white'}`} data-testid={`text-transaction-amount-${t.id}`}>{!cash ? '' : isIn ? '+' : '−'}{rupiah(t.amount)}</div>
                    <div className="flex gap-1 sm:opacity-60 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" aria-label={`Ubah ${t.description}`} data-testid={`button-edit-transaction-${t.id}`} onClick={() => { setEditing(t); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Confirm title="Hapus transaksi?" desc={`"${t.description}" sebesar ${rupiah(t.amount)} akan dihapus dari peramban ini dan dari laporan laba rugi.${t.tradeBillId ? ` Transaksi ini adalah pembayaran ${bill ? `${bill.kind} ${bill.reference || bill.description} (${bill.party})` : 'tagihan usaha'}; sisa tagihan tersebut akan bertambah ${rupiah(t.amount)}.` : ''}`}
                        onConfirm={() => remove(t)}
                        trigger={<Button size="icon" variant="ghost" aria-label={`Hapus ${t.description}`} className="hover:text-destructive" data-testid={`button-delete-transaction-${t.id}`}><Trash2 className="h-4 w-4" /></Button>} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <TransactionDialog open={open} onOpenChange={setOpen} initial={editing} />
    </>
  );
}
