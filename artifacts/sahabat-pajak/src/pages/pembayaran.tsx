import { useMemo, useState } from 'react';
import { ArrowUpRight, Pencil, Plus, Receipt, Search, ShieldAlert, Trash2 } from 'lucide-react';
import { TAX_TYPES, useStore, type Payment } from '@/lib/store';
import { formatDate, formatPeriod, rupiah, usePageTitle } from '@/lib/format';
import { EmptyState, Notice, PageHeader } from '@/components/shell';
import { Confirm } from '@/components/confirm';
import { PaymentDialog } from '@/components/record-forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const STEPS = [
  { t: 'Pastikan kewajibannya', d: 'Cek jenis pajak, masa pajak, dan nominal yang benar-benar terutang. Bila ragu, tanyakan ke KPP atau Kring Pajak.' },
  { t: 'Buat kode billing di Coretax', d: 'Masuk ke portal resmi Coretax DJP dan buat kode billing di sana. Sahabat Pajak tidak membuat kode billing.', link: { href: 'https://coretaxdjp.pajak.go.id/', label: 'coretaxdjp.pajak.go.id' } },
  { t: 'Bayar lewat kanal resmi', d: 'Gunakan bank atau kanal persepsi yang diakui. Aplikasi ini tidak pernah menerima uang dari Anda.' },
  { t: 'Simpan BPN dan NTPN', d: 'Bukti Penerimaan Negara memuat NTPN. Simpan dokumen aslinya di tempat aman milik Anda.' },
  { t: 'Catat di sini', d: 'Masukkan nominal, tanggal, dan NTPN secara manual sebagai pengingat pribadi.' },
];

export default function Pembayaran() {
  usePageTitle('Pembayaran');
  const { payments, deletePayment } = useStore();
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [tax, setTax] = useState('semua');
  const [year, setYear] = useState('semua');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);

  const years = useMemo(() => [...new Set(payments.map((p) => p.period.slice(0, 4)))].sort().reverse(), [payments]);
  const list = useMemo(() => payments.filter((p) => {
    if (tax !== 'semua' && p.taxType !== tax) return false;
    if (year !== 'semua' && !p.period.startsWith(year)) return false;
    if (q && !`${p.taxType} ${p.ntpn ?? ''} ${p.notes}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date)), [payments, q, tax, year]);
  const total = list.reduce((a, p) => a + p.amount, 0);
  const add = () => { setEditing(null); setOpen(true); };

  return (
    <>
      <PageHeader eyebrow="Pembayaran" title="Catatan setoran Anda"
        desc="Arsip pribadi atas pembayaran yang sudah Anda lakukan di kanal resmi. Tidak tersambung dan tidak diverifikasi ke DJP."
        actions={<Button className="press font-semibold" onClick={add} data-testid="button-add-payment"><Plus className="h-4 w-4 mr-1.5" />Catat pembayaran</Button>} />

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 order-2 lg:order-1">
          {payments.length === 0 ? (
            <EmptyState icon={Receipt} title="Belum ada pembayaran tercatat" desc="Setelah membayar lewat kanal resmi, salin nominal, tanggal, dan NTPN dari BPN ke sini."
              action={<Button className="press" onClick={add} data-testid="button-empty-add-payment"><Plus className="h-4 w-4 mr-1.5" />Catat pembayaran</Button>} />
          ) : (
            <>
              <div className="rise mb-4 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari NTPN atau catatan" aria-label="Cari pembayaran" className="h-10 bg-card border-input pl-9" data-testid="input-search-payments" />
                </div>
                <Select value={tax} onValueChange={setTax}>
                  <SelectTrigger className="h-10 sm:w-44 bg-card border-input" aria-label="Jenis pajak" data-testid="select-payment-tax"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="semua">Semua jenis</SelectItem>{TAX_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="h-10 sm:w-32 bg-card border-input" aria-label="Tahun masa" data-testid="select-payment-year"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="semua">Semua tahun</SelectItem>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="mb-3 flex items-baseline justify-between px-1 text-sm">
                <span className="text-muted-foreground">{list.length} catatan</span>
                <span className="text-muted-foreground">Total tercatat <b className="num text-white" data-testid="text-payment-total">{rupiah(total)}</b></span>
              </div>
              {list.length === 0 ? (
                <div className="rounded-xl border border-dashed border-input px-4 py-10 text-center text-sm text-muted-foreground">
                  Tidak ada yang cocok.{' '}
                  <button className="font-semibold text-accent underline underline-offset-4" onClick={() => { setQ(''); setTax('semua'); setYear('semua'); }} data-testid="button-reset-payment-filters">Atur ulang</button>
                </div>
              ) : (
                <ul className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
                  {list.map((p) => (
                    <li key={p.id} className="group grid gap-2 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center hover:bg-muted/40 transition-colors" data-testid={`row-payment-${p.id}`}>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-white">{p.taxType}</span>
                          <span className="text-sm text-muted-foreground">masa {formatPeriod(p.period)}</span>
                          {p.demo && <span className="rounded bg-[hsl(var(--warn)/.15)] px-1.5 py-0.5 text-[10px] font-semibold text-[hsl(var(--warn))]">CONTOH</span>}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                          <span>Dibayar {formatDate(p.date)}</span>
                          <span>NTPN <span className="num text-foreground">{p.ntpn || 'tidak dicatat'}</span></span>
                          <span className="text-[hsl(var(--warn))]">Belum diverifikasi DJP</span>
                        </div>
                        {p.notes && <p className="mt-1.5 text-sm text-foreground/75 line-clamp-2">{p.notes}</p>}
                      </div>
                      <div className="num text-lg font-semibold text-white sm:text-right">{rupiah(p.amount)}</div>
                      <div className="flex gap-1 sm:opacity-60 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" aria-label="Ubah" data-testid={`button-edit-payment-${p.id}`} onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <Confirm title="Hapus catatan pembayaran?" desc="Catatan ini hanya dihapus dari peramban. Pembayaran di DJP tidak terpengaruh."
                          onConfirm={() => { deletePayment(p.id); toast({ title: 'Catatan pembayaran dihapus' }); }}
                          trigger={<Button size="icon" variant="ghost" aria-label="Hapus" className="hover:text-destructive" data-testid={`button-delete-payment-${p.id}`}><Trash2 className="h-4 w-4" /></Button>} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <aside className="order-1 lg:order-2 space-y-4" aria-labelledby="guide-h">
          <div className="rise rounded-2xl border border-primary/40 bg-gradient-to-b from-primary/15 to-card p-5">
            <h2 id="guide-h" className="text-xl font-bold text-white">Alur membayar</h2>
            <p className="mt-1 text-sm text-muted-foreground">Ringkasan umum. Ikuti petunjuk resmi DJP untuk kasus Anda.</p>
            <ol className="mt-5 space-y-4">
              {STEPS.map((s, i) => (
                <li key={s.t} className="relative flex gap-3">
                  <span className="num grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                  <div>
                    <div className="font-semibold text-white">{s.t}</div>
                    <p className="mt-0.5 text-sm leading-relaxed text-foreground/80">{s.d}</p>
                    {s.link && <a href={s.link.href} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline underline-offset-4" data-testid="link-coretax">{s.link.label}<ArrowUpRight className="h-3.5 w-3.5" /></a>}
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-5 space-y-1.5 border-t border-border pt-4 text-sm">
              <a href="https://www.pajak.go.id/id/artikel/pembayaran-dan-penyetoran-pajak-di-era-coretax" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-2 text-accent hover:underline underline-offset-4" data-testid="link-article-payment">Artikel DJP: pembayaran di era Coretax<ArrowUpRight className="h-3.5 w-3.5 shrink-0" /></a>
              <a href="https://www.pajak.go.id/id/coretax" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-2 text-accent hover:underline underline-offset-4" data-testid="link-coretax-hub">Pusat informasi Coretax<ArrowUpRight className="h-3.5 w-3.5 shrink-0" /></a>
            </div>
          </div>
          <Notice tone="warn" icon={ShieldAlert}>Sahabat Pajak tidak membuat kode billing, tidak menerima dana, dan tidak memeriksa status setoran. Waspadai pihak yang meminta transfer di luar kanal resmi.</Notice>
        </aside>
      </div>

      <PaymentDialog open={open} onOpenChange={setOpen} initial={editing} />
    </>
  );
}
