import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { ArrowUpRight, CalendarClock, CircleCheck, FlaskConical, MessagesSquare, Plus, Receipt, ShieldAlert, Library } from 'lucide-react';
import { useListTaxResources } from '@workspace/api-client-react';
import { useStore } from '@/lib/store';
import { MONTHS, currentPeriod, daysUntil, dueLabel, formatDate, formatPeriod, rupiah, usePageTitle } from '@/lib/format';
import { PageHeader, Notice } from '@/components/shell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ObligationDialog, PaymentDialog } from '@/components/record-forms';

export default function Overview() {
  usePageTitle('Ringkasan');
  const { profile, obligations, payments, loadDemo, removeDemo, hasDemo, toggleObligation } = useStore();
  const resources = useListTaxResources();
  const [year, setYear] = useState(currentPeriod().slice(0, 4));
  const [month, setMonth] = useState<string>(currentPeriod().slice(5, 7));
  const [obOpen, setObOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const years = useMemo(() => {
    const s = new Set<string>([currentPeriod().slice(0, 4)]);
    obligations.forEach((o) => s.add(o.period.slice(0, 4)));
    payments.forEach((p) => s.add(p.period.slice(0, 4)));
    return [...s].sort().reverse();
  }, [obligations, payments]);

  const inPeriod = (p: string) => (month === 'all' ? p.startsWith(year + '-') : p === `${year}-${month}`);
  const obs = obligations.filter((o) => inPeriod(o.period));
  const pays = payments.filter((p) => inPeriod(p.period));
  const open = obs.filter((o) => o.status === 'belum');
  const done = obs.length - open.length;
  const estOpen = open.reduce((a, o) => a + (o.amount || 0), 0);
  const paid = pays.reduce((a, p) => a + p.amount, 0);
  const pct = obs.length ? Math.round((done / obs.length) * 100) : 0;
  const upcoming = obligations.filter((o) => o.status === 'belum').sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
  const overdue = obligations.filter((o) => o.status === 'belum' && daysUntil(o.dueDate) < 0).length;
  const periodLabel = month === 'all' ? `Tahun ${year}` : formatPeriod(`${year}-${month}`);
  const empty = obligations.length === 0 && payments.length === 0;

  return (
    <>
      <PageHeader eyebrow={profile.businessName || 'Ringkasan'}
        title={profile.businessName ? 'Posisi pajak Anda' : 'Selamat datang'}
        desc="Semua angka di sini dihitung dari catatan yang Anda masukkan di peramban ini. Bukan data dari DJP."
        actions={<>
          <Button variant="outline" className="press border-input" onClick={() => setPayOpen(true)} data-testid="button-quick-payment"><Receipt className="h-4 w-4 mr-1.5" />Catat bayar</Button>
          <Button className="press font-semibold" onClick={() => setObOpen(true)} data-testid="button-quick-obligation"><Plus className="h-4 w-4 mr-1.5" />Kewajiban</Button>
        </>} />

      {empty && (
        <div className="rise mb-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/20 via-card to-card p-6 sm:p-8">
            <div className="grid-lines absolute inset-0 opacity-30 [mask-image:linear-gradient(to_left,black,transparent)]" />
            <div className="relative">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Mulai dari satu kewajiban.</h2>
              <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-foreground/85">Tulis apa yang perlu disetor dan kapan tenggatnya menurut informasi resmi yang Anda pegang. Sahabat Pajak akan mengingatkan urutannya.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button className="press font-semibold" onClick={() => setObOpen(true)} data-testid="button-first-obligation"><Plus className="h-4 w-4 mr-1.5" />Tambah kewajiban pertama</Button>
                <Button variant="outline" asChild className="border-input"><Link href="/konsultasi" data-testid="link-ask">Tanya dulu</Link></Button>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-dashed border-[hsl(var(--warn)/.5)] bg-card/60 p-6">
            <div className="flex items-center gap-2 text-[hsl(var(--warn))] font-semibold text-sm"><FlaskConical className="h-4 w-4" />Ingin mencoba dulu?</div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Muat beberapa catatan berlabel <b className="text-foreground">[Contoh]</b>. Angkanya fiktif, hanya untuk melihat cara kerja aplikasi, dan bisa dihapus sekali klik.</p>
            <Button variant="outline" className="press mt-4 border-[hsl(var(--warn)/.5)]" onClick={loadDemo} data-testid="button-load-demo">Muat data contoh</Button>
          </div>
        </div>
      )}

      {hasDemo && (
        <div className="mb-6"><Notice tone="warn" icon={FlaskConical}>
          Data contoh sedang tampil dan ikut terhitung di ringkasan. Angka ini fiktif.{' '}
          <button className="font-semibold underline underline-offset-4 hover:text-white" onClick={removeDemo} data-testid="button-remove-demo">Hapus data contoh</button>
        </Notice></div>
      )}

      <section aria-labelledby="period-h" className="rise mb-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 id="period-h" className="text-lg font-bold text-white mr-auto">Periode: <span className="text-accent">{periodLabel}</span></h2>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-40 bg-card border-input" aria-label="Bulan" data-testid="select-month"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Sepanjang tahun</SelectItem>
              {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1).padStart(2, '0')}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-28 bg-card border-input" aria-label="Tahun" data-testid="select-year"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Kewajiban di periode" value={String(obs.length)} sub={`${done} selesai, ${open.length} belum`} testid="stat-obligations">
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Persentase selesai">
              <div className="h-full origin-left rounded-full bg-primary transition-transform duration-700" style={{ transform: `scaleX(${pct / 100})` }} />
            </div>
          </Stat>
          <Stat label="Perkiraan belum selesai" value={rupiah(estOpen)} sub="Dari nominal yang Anda isi" testid="stat-open-amount" mono />
          <Stat label="Pembayaran tercatat" value={rupiah(paid)} sub={`${pays.length} catatan, belum diverifikasi DJP`} testid="stat-paid" mono accent />
          <Stat label="Lewat tenggat (semua)" value={String(overdue)} sub={overdue ? 'Perlu dicek segera' : 'Tidak ada yang lewat'} testid="stat-overdue" danger={overdue > 0} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="rise rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="up-h">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="up-h" className="text-lg font-bold text-white flex items-center gap-2"><CalendarClock className="h-5 w-5 text-primary" />Tenggat terdekat</h2>
            <Link href="/kewajiban" className="text-sm font-medium text-accent hover:underline underline-offset-4" data-testid="link-all-obligations">Semua</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="rounded-xl border border-dashed border-input px-4 py-8 text-center text-sm text-muted-foreground">Tidak ada kewajiban yang belum selesai.</p>
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((o) => {
                const d = daysUntil(o.dueDate);
                return (
                  <li key={o.id} className="flex items-center gap-3 py-3" data-testid={`row-upcoming-${o.id}`}>
                    <button onClick={() => toggleObligation(o.id)} aria-label={`Tandai selesai: ${o.title}`} data-testid={`button-toggle-${o.id}`}
                      className="press grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-input text-transparent hover:border-[hsl(var(--success))] hover:text-[hsl(var(--success))] transition-colors">
                      <CircleCheck className="h-4 w-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-white">{o.title}</div>
                      <div className="text-xs text-muted-foreground">{o.taxType} · {formatPeriod(o.period)}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-semibold ${d < 0 ? 'text-destructive' : d <= 7 ? 'text-[hsl(var(--warn))]' : 'text-accent'}`}>{dueLabel(o.dueDate)}</div>
                      <div className="num text-xs text-muted-foreground">{formatDate(o.dueDate)}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rise rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="pay-h">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="pay-h" className="text-lg font-bold text-white flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" />Pembayaran terakhir</h2>
            <Link href="/pembayaran" className="text-sm font-medium text-accent hover:underline underline-offset-4" data-testid="link-all-payments">Semua</Link>
          </div>
          {payments.length === 0 ? (
            <p className="rounded-xl border border-dashed border-input px-4 py-8 text-center text-sm text-muted-foreground">Belum ada pembayaran yang dicatat.</p>
          ) : (
            <ul className="space-y-2">
              {[...payments].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4).map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
                  <div><div className="text-sm font-medium text-white">{p.taxType}</div><div className="text-xs text-muted-foreground">{formatDate(p.date)}</div></div>
                  <div className="num text-sm font-semibold text-white">{rupiah(p.amount)}</div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 flex gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldAlert className="h-4 w-4 shrink-0 text-accent" />Catatan bayar tidak sama dengan bukti terverifikasi. Simpan BPN asli Anda.</p>
        </section>
      </div>

      <section className="rise mt-8" aria-labelledby="res-h">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="res-h" className="text-lg font-bold text-white flex items-center gap-2"><Library className="h-5 w-5 text-primary" />Bacaan resmi yang berguna</h2>
          <Link href="/pustaka" className="text-sm font-medium text-accent hover:underline underline-offset-4" data-testid="link-library">Buka pustaka</Link>
        </div>
        {resources.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl bg-muted" />)}</div>
        ) : resources.isError ? (
          <div className="flex items-center justify-between rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
            Pustaka belum bisa dimuat.
            <Button size="sm" variant="outline" onClick={() => resources.refetch()} data-testid="button-retry-resources">Coba lagi</Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(resources.data ?? []).slice(0, 4).map((r) => (
              <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" data-testid={`link-resource-${r.id}`}
                className="lift group rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-accent">{r.category}</div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <div className="mt-1.5 font-semibold text-white leading-snug">{r.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{r.publisher}</div>
              </a>
            ))}
          </div>
        )}
        <Link href="/konsultasi" data-testid="link-consult-banner" className="lift mt-4 flex items-center gap-4 rounded-xl border border-primary/40 bg-primary/10 p-4">
          <MessagesSquare className="h-6 w-6 text-primary shrink-0" />
          <div className="flex-1"><div className="font-semibold text-white">Bingung istilahnya?</div><div className="text-sm text-muted-foreground">Tanyakan ke asisten yang menjawab berdasarkan sumber resmi.</div></div>
          <ArrowUpRight className="h-5 w-5 text-primary" />
        </Link>
      </section>

      <ObligationDialog open={obOpen} onOpenChange={setObOpen} />
      <PaymentDialog open={payOpen} onOpenChange={setPayOpen} />
    </>
  );
}

function Stat({ label, value, sub, testid, mono, accent, danger, children }: { label: string; value: string; sub: string; testid: string; mono?: boolean; accent?: boolean; danger?: boolean; children?: ReactNode }) {
  return (
    <div className={`lift rounded-2xl border bg-card p-4 sm:p-5 ${danger ? 'border-destructive/50' : accent ? 'border-primary/40' : 'border-border'}`}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={`mt-2 break-words text-xl sm:text-2xl font-bold ${mono ? 'num' : 'font-display'} ${danger ? 'text-destructive' : 'text-white'}`} data-testid={testid}>{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      {children}
    </div>
  );
}
