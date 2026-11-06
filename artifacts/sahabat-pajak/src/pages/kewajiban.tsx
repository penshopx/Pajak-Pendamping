import { useMemo, useState } from 'react';
import { CalendarClock, Check, Pencil, Plus, Receipt, Search, Trash2, Info, RotateCcw } from 'lucide-react';
import { TAX_TYPES, useStore, type Obligation, type Payment } from '@/lib/store';
import { daysUntil, dueLabel, formatDate, formatPeriod, rupiah, usePageTitle } from '@/lib/format';
import { EmptyState, Notice, PageHeader } from '@/components/shell';
import { Confirm } from '@/components/confirm';
import { ObligationDialog, PaymentDialog } from '@/components/record-forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

type StatusFilter = 'semua' | 'belum' | 'selesai' | 'lewat';

export default function Kewajiban() {
  usePageTitle('Kewajiban');
  const { obligations, deleteObligation, toggleObligation } = useStore();
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('semua');
  const [tax, setTax] = useState('semua');
  const [editing, setEditing] = useState<Obligation | null>(null);
  const [open, setOpen] = useState(false);
  const [payPreset, setPayPreset] = useState<Partial<Payment> | undefined>();
  const [payOpen, setPayOpen] = useState(false);

  const list = useMemo(() => obligations
    .filter((o) => {
      if (q && !`${o.title} ${o.taxType} ${o.notes}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (tax !== 'semua' && o.taxType !== tax) return false;
      if (status === 'belum' && o.status !== 'belum') return false;
      if (status === 'selesai' && o.status !== 'selesai') return false;
      if (status === 'lewat' && !(o.status === 'belum' && daysUntil(o.dueDate) < 0)) return false;
      return true;
    })
    .sort((a, b) => (a.status === b.status ? a.dueDate.localeCompare(b.dueDate) : a.status === 'belum' ? -1 : 1)), [obligations, q, status, tax]);

  const counts = {
    semua: obligations.length,
    belum: obligations.filter((o) => o.status === 'belum').length,
    selesai: obligations.filter((o) => o.status === 'selesai').length,
    lewat: obligations.filter((o) => o.status === 'belum' && daysUntil(o.dueDate) < 0).length,
  };

  const add = () => { setEditing(null); setOpen(true); };

  return (
    <>
      <PageHeader eyebrow="Kewajiban" title="Apa yang perlu diurus"
        desc="Daftar ini Anda susun sendiri. Tenggat tidak diisi otomatis, jadi cocokkan dengan ketentuan DJP atau KPP terdaftar Anda."
        actions={<Button className="press font-semibold" onClick={add} data-testid="button-add-obligation"><Plus className="h-4 w-4 mr-1.5" />Tambah kewajiban</Button>} />

      <div className="mb-6"><Notice icon={Info}>Status <b className="text-white">Selesai</b> hanyalah tanda pribadi Anda, bukan bukti bahwa pembayaran atau pelaporan sudah diterima DJP.</Notice></div>

      {obligations.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Belum ada kewajiban" desc="Contoh: setor PPh Final UMKM masa bulan lalu. Isi judul, masa pajak, dan tenggat yang Anda ketahui."
          action={<Button className="press" onClick={add} data-testid="button-empty-add-obligation"><Plus className="h-4 w-4 mr-1.5" />Tambah kewajiban</Button>} />
      ) : (
        <>
          <div className="rise mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1" role="tablist" aria-label="Filter status">
              {(['semua', 'belum', 'selesai', 'lewat'] as StatusFilter[]).map((s) => (
                <button key={s} role="tab" aria-selected={status === s} onClick={() => setStatus(s)} data-testid={`tab-status-${s}`}
                  className={`press whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${status === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-white'}`}>
                  {{ semua: 'Semua', belum: 'Belum', selesai: 'Selesai', lewat: 'Lewat tenggat' }[s]} <span className="num text-xs opacity-80">{counts[s]}</span>
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul atau catatan" aria-label="Cari kewajiban" className="h-10 bg-card border-input pl-9" data-testid="input-search-obligations" />
            </div>
            <Select value={tax} onValueChange={setTax}>
              <SelectTrigger className="h-10 lg:w-48 bg-card border-input" aria-label="Jenis pajak" data-testid="select-filter-tax"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="semua">Semua jenis</SelectItem>{TAX_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {list.length === 0 ? (
            <div className="rounded-xl border border-dashed border-input px-4 py-10 text-center text-sm text-muted-foreground">
              Tidak ada yang cocok dengan filter.{' '}
              <button className="font-semibold text-accent underline underline-offset-4" onClick={() => { setQ(''); setStatus('semua'); setTax('semua'); }} data-testid="button-reset-filters">Atur ulang</button>
            </div>
          ) : (
            <ul className="space-y-3">
              {list.map((o, i) => {
                const d = daysUntil(o.dueDate);
                const done = o.status === 'selesai';
                return (
                  <li key={o.id} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }} data-testid={`card-obligation-${o.id}`}
                    className={`rise group grid gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-5 transition-colors ${done ? 'border-border opacity-80' : d < 0 ? 'border-destructive/50' : 'border-border hover:border-primary/50'}`}>
                    <div className={`hidden sm:grid h-14 w-14 place-items-center rounded-xl border text-center ${done ? 'border-border bg-muted' : 'border-primary/40 bg-primary/10'}`}>
                      <div><div className="num text-lg font-bold leading-none text-white">{o.dueDate.slice(8, 10)}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{formatDate(o.dueDate).split(' ')[1]}</div></div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`font-semibold text-white ${done ? 'line-through decoration-muted-foreground' : ''}`}>{o.title}</h3>
                        {o.demo && <span className="rounded bg-[hsl(var(--warn)/.15)] px-1.5 py-0.5 text-[10px] font-semibold text-[hsl(var(--warn))]">CONTOH</span>}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span className="text-accent font-medium">{o.taxType}</span>
                        <span>Masa {formatPeriod(o.period)}</span>
                        <span>Tenggat {formatDate(o.dueDate)}</span>
                        {o.amount > 0 && <span className="num text-foreground">{rupiah(o.amount)}</span>}
                      </div>
                      {o.notes && <p className="mt-2 text-sm text-foreground/75 line-clamp-2">{o.notes}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <span className={`mr-1 rounded-full px-2.5 py-1 text-xs font-semibold ${done ? 'bg-[hsl(var(--success)/.15)] text-[hsl(var(--success))]' : d < 0 ? 'bg-destructive/15 text-destructive' : d <= 7 ? 'bg-[hsl(var(--warn)/.15)] text-[hsl(var(--warn))]' : 'bg-primary/15 text-accent'}`} data-testid={`status-obligation-${o.id}`}>
                        {done ? 'Selesai' : dueLabel(o.dueDate)}
                      </span>
                      <Button size="sm" variant={done ? 'outline' : 'default'} className="press border-input" data-testid={`button-toggle-obligation-${o.id}`}
                        onClick={() => { toggleObligation(o.id); toast({ title: done ? 'Ditandai belum selesai' : 'Ditandai selesai', description: done ? o.title : 'Tanda pribadi. Simpan BPN sebagai bukti.' }); }}>
                        {done ? <><RotateCcw className="h-3.5 w-3.5 mr-1" />Buka lagi</> : <><Check className="h-3.5 w-3.5 mr-1" />Selesai</>}
                      </Button>
                      <Button size="icon" variant="ghost" aria-label="Catat pembayaran untuk kewajiban ini" title="Catat pembayaran" data-testid={`button-pay-obligation-${o.id}`}
                        onClick={() => { setPayPreset({ taxType: o.taxType, period: o.period, amount: o.amount, notes: `Untuk: ${o.title}` }); setPayOpen(true); }}><Receipt className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label="Ubah" title="Ubah" data-testid={`button-edit-obligation-${o.id}`} onClick={() => { setEditing(o); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Confirm title="Hapus kewajiban ini?" desc={`"${o.title}" akan dihapus dari peramban ini dan tidak bisa dikembalikan.`}
                        onConfirm={() => { deleteObligation(o.id); toast({ title: 'Kewajiban dihapus' }); }}
                        trigger={<Button size="icon" variant="ghost" aria-label="Hapus" title="Hapus" className="hover:text-destructive" data-testid={`button-delete-obligation-${o.id}`}><Trash2 className="h-4 w-4" /></Button>} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <ObligationDialog open={open} onOpenChange={setOpen} initial={editing} />
      <PaymentDialog open={payOpen} onOpenChange={setPayOpen} preset={payPreset} />
    </>
  );
}
