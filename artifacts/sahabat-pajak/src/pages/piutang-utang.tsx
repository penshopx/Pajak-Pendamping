import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, ChevronDown, Download, Info, Link2, Pencil, Plus, Search, Trash2, Unlink, Wallet } from 'lucide-react';
import { useStore } from '@/lib/store';
import { downloadFile, formatDate, rupiah, todayISO, usePageTitle } from '@/lib/format';
import { categoryFor } from '@/lib/business-ledger';
import { billProgress, tradeBillsCSV, type TradeBill, type TradeBillKind } from '@/lib/trade-ledger';
import { EmptyState, Notice, PageHeader } from '@/components/shell';
import { Confirm } from '@/components/confirm';
import { LocalDataNotice } from '@/components/ledger-shared';
import { TradeBillDialog } from '@/components/trade-bill-dialog';
import { TradePaymentDialog } from '@/components/trade-payment-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

type StatusFilter = 'semua' | 'terbuka' | 'belum' | 'sebagian' | 'lunas' | 'lewat';
const STATUS_LABEL = { belum: 'Belum dibayar', sebagian: 'Dibayar sebagian', lunas: 'Lunas' } as const;

export default function PiutangUtang() {
  usePageTitle('Piutang & Utang');
  const { tradeBills, transactions, deleteTradeBill, unlinkTradeTransaction } = useStore();
  const { toast } = useToast();
  const today = todayISO();
  const [kind, setKind] = useState<'semua' | TradeBillKind>('semua');
  const [status, setStatus] = useState<StatusFilter>('semua');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'date-desc' | 'date-asc' | 'due-asc' | 'due-desc'>('due-asc');
  const [billOpen, setBillOpen] = useState(false);
  const [editing, setEditing] = useState<TradeBill | null>(null);
  const [newKind, setNewKind] = useState<TradeBillKind>('piutang');
  const [payBill, setPayBill] = useState<TradeBill | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; msg: string } | null>(null);

  const rows = useMemo(() => tradeBills.map((b) => ({ bill: b, p: billProgress(b, transactions, today) })), [tradeBills, transactions, today]);
  const totals = useMemo(() => {
    const t = { piutang: { rem: 0, n: 0, overdue: 0 }, utang: { rem: 0, n: 0, overdue: 0 } };
    for (const { bill, p } of rows) if (p.remaining > 0) { t[bill.kind].rem += p.remaining; t[bill.kind].n++; if (p.overdue) t[bill.kind].overdue += p.remaining; }
    return t;
  }, [rows]);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter(({ bill, p }) => {
      if (kind !== 'semua' && bill.kind !== kind) return false;
      if (status === 'terbuka' && p.status === 'lunas') return false;
      if (status === 'lewat' && !p.overdue) return false;
      if ((status === 'belum' || status === 'sebagian' || status === 'lunas') && p.status !== status) return false;
      if (needle && !`${bill.party} ${bill.reference} ${bill.description} ${bill.notes}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    const [field, dir] = sort.split('-') as ['date' | 'due', 'asc' | 'desc'];
    const key = (b: TradeBill) => (field === 'date' ? b.date : b.dueDate);
    return out.sort((a, b) => (dir === 'asc' ? 1 : -1) * key(a.bill).localeCompare(key(b.bill)) || a.bill.id.localeCompare(b.bill.id));
  }, [rows, q, kind, status, sort]);
  const filtersActive = q.trim() !== '' || kind !== 'semua' || status !== 'semua';
  const reset = () => { setQ(''); setKind('semua'); setStatus('semua'); };

  const add = (k: TradeBillKind) => { setEditing(null); setNewKind(k); setBillOpen(true); };
  const exportCSV = () => {
    if (!list.length) return;
    downloadFile(`sahabat-pajak-piutang-utang-${today}${filtersActive ? '-tersaring' : ''}.csv`, tradeBillsCSV(list.map((r) => r.bill), transactions, today), 'text/csv;charset=utf-8');
    toast({ title: 'CSV tagihan diunduh', description: `${list.length} tagihan${filtersActive ? ' · dengan filter' : ''}` });
  };
  const remove = (b: TradeBill) => {
    setRowError(null);
    try { deleteTradeBill(b.id); }
    catch (e) { setRowError({ id: b.id, msg: e instanceof Error ? e.message : 'Tagihan gagal dihapus.' }); return; }
    toast({ title: 'Tagihan dihapus', description: `${b.party} · ${rupiah(b.amount)}` });
  };
  const unlink = (b: TradeBill, tId: string, amount: number) => {
    setRowError(null);
    try { unlinkTradeTransaction(tId); }
    catch (e) { setRowError({ id: b.id, msg: e instanceof Error ? e.message : 'Tautan gagal dilepas.' }); return; }
    toast({ title: 'Tautan dilepas', description: `Sisa tagihan bertambah ${rupiah(amount)}. Transaksi kas tetap ada.` });
  };

  return (
    <>
      <PageHeader eyebrow="Tagihan usaha" title="Piutang & utang"
        desc="Lacak siapa yang belum membayar Anda dan siapa yang belum Anda bayar. Ini pelacak sisa tagihan, bukan neraca akrual lengkap atau dasar pajak."
        actions={<>
          <Button variant="outline" className="press border-input font-semibold" onClick={() => add('utang')} data-testid="button-add-utang"><ArrowUpRight className="h-4 w-4 mr-1.5" />Utang baru</Button>
          <Button className="press font-semibold" onClick={() => add('piutang')} data-testid="button-add-bill"><Plus className="h-4 w-4 mr-1.5" />Piutang baru</Button>
        </>} />

      <div className="rise mb-6 grid gap-3 sm:grid-cols-2">
        {(['piutang', 'utang'] as const).map((k) => (
          <button key={k} type="button" onClick={() => setKind(kind === k ? 'semua' : k)} aria-pressed={kind === k} data-testid={`card-total-${k}`}
            className={`press lift rounded-2xl border bg-card p-5 text-left ${kind === k ? 'border-primary' : 'border-border'}`}>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              {k === 'piutang' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
              {k === 'piutang' ? 'Sisa piutang · akan Anda terima' : 'Sisa utang · harus Anda bayar'}
            </div>
            <div className="num mt-2 text-3xl font-semibold text-white" data-testid={`text-total-${k}`}>{rupiah(totals[k].rem)}</div>
            <div className="mt-1 text-sm text-foreground/80">{totals[k].n} tagihan terbuka{totals[k].overdue > 0 && <> · <span className="font-semibold text-[hsl(var(--warn))]">{rupiah(totals[k].overdue)} lewat jatuh tempo</span></>}</div>
          </button>
        ))}
      </div>

      <div className="mb-6 space-y-3">
        <Notice icon={Info}>Mencatat tagihan <b className="text-white">tidak</b> membuat transaksi kas atau mengubah laba rugi. Hanya pembayaran yang dicatat atau ditautkan yang masuk rekap kas sederhana. Menautkan transaksi yang sudah ada hanya mengubah sisa tagihan, tidak menghitung kas dua kali. Tidak ada perhitungan PPN atau tarif apa pun.</Notice>
        <LocalDataNotice />
      </div>

      {tradeBills.length === 0 ? (
        <EmptyState icon={ArrowLeftRight} title="Belum ada piutang atau utang"
          desc="Catat nota yang belum lunas, misalnya pesanan pelanggan yang dibayar tempo atau bahan baku yang dibeli dengan termin."
          action={<><Button className="press" onClick={() => add('piutang')} data-testid="button-empty-add-piutang"><Plus className="h-4 w-4 mr-1.5" />Catat piutang</Button>
            <Button variant="outline" className="press border-input" onClick={() => add('utang')} data-testid="button-empty-add-utang">Catat utang</Button></>} />
      ) : (
        <>
          <div className="mb-3 flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari pihak, referensi, uraian" aria-label="Cari tagihan" className="h-10 bg-card border-input pl-9" data-testid="input-search-bills" />
            </div>
            <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
              <SelectTrigger className="h-10 lg:w-40 bg-card border-input" aria-label="Jenis" data-testid="select-filter-bill-kind"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="semua">Semua jenis</SelectItem><SelectItem value="piutang">Piutang</SelectItem><SelectItem value="utang">Utang</SelectItem></SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
              <SelectTrigger className="h-10 lg:w-48 bg-card border-input" aria-label="Status" data-testid="select-filter-bill-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua status</SelectItem><SelectItem value="terbuka">Belum lunas</SelectItem>
                <SelectItem value="belum">Belum dibayar</SelectItem><SelectItem value="sebagian">Dibayar sebagian</SelectItem>
                <SelectItem value="lunas">Lunas</SelectItem><SelectItem value="lewat">Lewat jatuh tempo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
              <SelectTrigger className="h-10 lg:w-52 bg-card border-input" aria-label="Urutkan" data-testid="select-sort-bills"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="due-asc">Jatuh tempo terdekat</SelectItem><SelectItem value="due-desc">Jatuh tempo terjauh</SelectItem>
                <SelectItem value="date-desc">Tanggal tagihan terbaru</SelectItem><SelectItem value="date-asc">Tanggal tagihan terlama</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1 text-sm">
            <span className="text-foreground/85" data-testid="text-bill-count"><b className="text-white">{list.length}</b> dari {tradeBills.length} tagihan
              {filtersActive && <button className="ml-2 font-semibold text-accent underline underline-offset-4" onClick={reset} data-testid="button-clear-bill-filters">hapus filter</button>}</span>
            <Button variant="outline" size="sm" className="press border-input" disabled={!list.length} onClick={exportCSV} data-testid="button-export-bills"><Download className="h-4 w-4 mr-1.5" />Unduh CSV ({list.length})</Button>
          </div>

          {list.length === 0 ? (
            <div className="rounded-xl border border-dashed border-input px-4 py-10 text-center text-sm text-foreground/80" data-testid="text-no-bill-results">
              Tidak ada tagihan yang cocok dengan filter. <button className="font-semibold text-accent underline underline-offset-4" onClick={reset} data-testid="button-reset-bill-filters">Atur ulang filter</button>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {list.map(({ bill: b, p }) => {
                const pct = Math.round((p.paid / b.amount) * 1000) / 10;
                const open = expanded === b.id;
                const isIn = b.kind === 'piutang';
                return (
                  <li key={b.id} className="rounded-2xl border border-border bg-card" data-testid={`row-bill-${b.id}`}>
                    <div className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${isIn ? 'bg-accent/15 text-accent' : 'bg-primary/15 text-primary'}`}>{b.kind}</span>
                          <span className="font-semibold text-white break-words">{b.party}</span>
                          {b.reference && <span className="num text-xs text-foreground/75">{b.reference}</span>}
                        </div>
                        <div className="mt-1 text-sm text-foreground/85 break-words">{b.description}</div>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/75">
                          <span>Tagihan {formatDate(b.date)}</span>
                          <span className={p.overdue ? 'font-semibold text-[hsl(var(--warn))]' : ''}>Jatuh tempo {formatDate(b.dueDate)}</span>
                          <span>{categoryFor(b.category)?.label}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span data-testid={`status-bill-${b.id}`} className={`rounded px-1.5 py-0.5 text-xs font-semibold ${p.status === 'lunas' ? 'bg-[hsl(var(--success)/.15)] text-[hsl(var(--success))]' : p.status === 'sebagian' ? 'bg-accent/15 text-accent' : 'bg-muted text-foreground'}`}>{STATUS_LABEL[p.status as keyof typeof STATUS_LABEL]}</span>
                          {p.overdue && <span className="rounded bg-[hsl(var(--warn)/.15)] px-1.5 py-0.5 text-xs font-semibold text-[hsl(var(--warn))]" data-testid={`status-bill-overdue-${b.id}`}>Lewat jatuh tempo</span>}
                        </div>
                      </div>
                      <div className="md:w-72">
                        <div className="grid grid-cols-3 gap-2 text-right text-xs text-foreground/75">
                          <div>Nilai<div className="num text-sm font-semibold text-white">{rupiah(b.amount)}</div></div>
                          <div>Terbayar<div className="num text-sm font-semibold text-accent">{rupiah(p.paid)}</div></div>
                          <div>Sisa<div className="num text-sm font-semibold text-white" data-testid={`text-bill-remaining-${b.id}`}>{rupiah(p.remaining)}</div></div>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-label={`${pct}% terbayar`}>
                          <div className="h-full origin-left rounded-full bg-accent transition-transform duration-500" style={{ transform: `scaleX(${p.paid / b.amount})` }} />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 border-t border-border px-3 py-2">
                      <Button size="sm" variant="ghost" className="text-foreground" onClick={() => setExpanded(open ? null : b.id)} aria-expanded={open} data-testid={`button-toggle-history-${b.id}`}>
                        <ChevronDown className={`h-4 w-4 mr-1 transition-transform ${open ? 'rotate-180' : ''}`} />Riwayat ({p.payments.length})
                      </Button>
                      <div className="ml-auto flex flex-wrap gap-1">
                        <Button size="sm" className="press font-semibold" disabled={p.remaining <= 0} onClick={() => setPayBill(b)} data-testid={`button-pay-bill-${b.id}`}>
                          <Wallet className="h-4 w-4 mr-1.5" />{isIn ? 'Catat penerimaan' : 'Catat pembayaran'}
                        </Button>
                        <Button size="icon" variant="ghost" aria-label={`Ubah ${b.party}`} onClick={() => { setEditing(b); setBillOpen(true); }} data-testid={`button-edit-bill-${b.id}`}><Pencil className="h-4 w-4" /></Button>
                        {p.payments.length > 0 ? (
                          <Button size="icon" variant="ghost" aria-label={`Hapus ${b.party}`} className="hover:text-destructive" data-testid={`button-delete-bill-${b.id}`}
                            onClick={() => { setExpanded(b.id); setRowError({ id: b.id, msg: 'Tagihan masih memiliki pembayaran tertaut. Lepaskan semua tautan di riwayat terlebih dahulu; transaksi kas tidak akan dihapus otomatis.' }); }}><Trash2 className="h-4 w-4" /></Button>
                        ) : (
                          <Confirm title="Hapus tagihan?" desc={`Tagihan ${b.party} sebesar ${rupiah(b.amount)} akan dihapus dari peramban ini. Tidak ada transaksi kas yang terpengaruh.`}
                            onConfirm={() => remove(b)}
                            trigger={<Button size="icon" variant="ghost" aria-label={`Hapus ${b.party}`} className="hover:text-destructive" data-testid={`button-delete-bill-${b.id}`}><Trash2 className="h-4 w-4" /></Button>} />
                        )}
                      </div>
                    </div>
                    {rowError?.id === b.id && <div role="alert" className="mx-4 mb-3 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-foreground" data-testid={`text-bill-error-${b.id}`}>{rowError.msg}</div>}
                    {open && (
                      <div className="border-t border-border px-4 py-3">
                        {b.notes && <p className="mb-3 text-sm text-foreground/80 whitespace-pre-line">{b.notes}</p>}
                        {p.payments.length === 0 ? <p className="text-sm text-foreground/75">Belum ada pembayaran tertaut.</p> : (
                          <ul className="divide-y divide-border">
                            {p.payments.map((t) => (
                              <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm" data-testid={`row-bill-payment-${t.id}`}>
                                <Link2 className="h-4 w-4 text-accent" />
                                <span className="text-foreground/85">{formatDate(t.date)}</span>
                                <span className="min-w-0 flex-1 truncate text-white">{t.description}</span>
                                <span className="num font-semibold text-white">{rupiah(t.amount)}</span>
                                <Link href="/transaksi" className="text-xs font-semibold text-accent underline underline-offset-4" data-testid={`link-payment-transaction-${t.id}`}>Lihat di Transaksi</Link>
                                <Confirm title="Lepaskan tautan pembayaran?" confirmLabel="Lepaskan tautan"
                                  desc={`Transaksi kas ${rupiah(t.amount)} tetap ada di Transaksi dan laba rugi. Sisa tagihan ${b.party} akan bertambah ${rupiah(t.amount)}. Untuk menautkannya lagi, gunakan "Tautkan transaksi yang ada", jangan mencatat pembayaran baru.`}
                                  onConfirm={() => unlink(b, t.id, t.amount)}
                                  trigger={<Button size="sm" variant="ghost" className="h-8 hover:text-destructive" data-testid={`button-unlink-payment-${t.id}`}><Unlink className="h-3.5 w-3.5 mr-1" />Lepas</Button>} />
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <TradeBillDialog open={billOpen} onOpenChange={setBillOpen} initial={editing} defaultKind={newKind} />
      <TradePaymentDialog open={!!payBill} onOpenChange={(o) => { if (!o) setPayBill(null); }} bill={tradeBills.find(b => b.id === payBill?.id) ?? null} />
    </>
  );
}
