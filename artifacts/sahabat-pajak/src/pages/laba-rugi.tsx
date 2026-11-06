import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { AlertTriangle, Download, FileSpreadsheet, Info, Plus } from 'lucide-react';
import { useStore } from '@/lib/store';
import { downloadFile, rupiah, usePageTitle } from '@/lib/format';
import { LEDGER_CATEGORIES, periodKey, profitLossCSV, summarizeLedger, type LedgerPeriod } from '@/lib/business-ledger';
import { EmptyState, Notice, PageHeader } from '@/components/shell';
import { LocalDataNotice, PeriodPicker, periodLabel, thisMonth, useLedgerYears, validPeriod } from '@/components/ledger-shared';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

function Line({ label, value, strong, minus, sub, testId }: { label: ReactNode; value: number; strong?: boolean; minus?: boolean; sub?: boolean; testId: string }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-2.5 ${strong ? 'border-t border-border font-bold text-white' : 'text-foreground/90'} ${sub ? 'pl-4 text-sm' : ''}`}>
      <span>{label}</span>
      <span className="num whitespace-nowrap" data-testid={testId}>{minus && value ? `(${rupiah(value)})` : rupiah(value)}</span>
    </div>
  );
}

export default function LabaRugi() {
  usePageTitle('Laba rugi');
  const { transactions } = useStore();
  const { toast } = useToast();
  const [sel, setSel] = useState<LedgerPeriod>({ mode: 'bulanan', ...thisMonth() });
  const years = useLedgerYears(transactions, sel.year);

  const result = useMemo(() => {
    if (!validPeriod(sel.year, sel.month)) return { error: 'Pilih periode yang valid.' } as const;
    try { return { summary: summarizeLedger(transactions, sel) } as const; }
    catch (e) { return { error: e instanceof Error ? e.message : 'Laporan tidak dapat dihitung.' } as const; }
  }, [transactions, sel]);

  const label = periodLabel(sel);
  const exportCSV = () => {
    if (!('summary' in result) || !result.summary || !result.summary.entries.length) return;
    downloadFile(`sahabat-pajak-laba-rugi-${periodKey(sel)}.csv`, profitLossCSV(result.summary, sel), 'text/csv;charset=utf-8');
    toast({ title: 'CSV laba rugi diunduh', description: `${label} · ${result.summary.entries.length} transaksi, tanpa filter pencarian` });
  };

  const s = 'summary' in result ? result.summary : null;
  const opCats = LEDGER_CATEGORIES.filter((c) => c.group === 'operating');
  const exIn = LEDGER_CATEGORIES.filter((c) => c.group === 'excluded' && c.kind === 'pemasukan');
  const exOut = LEDGER_CATEGORIES.filter((c) => c.group === 'excluded' && c.kind === 'pengeluaran');

  return (
    <>
      <PageHeader eyebrow="Laporan sederhana" title="Laba rugi sederhana"
        desc="Rekap dari catatan kas Anda ditambah penyesuaian HPP nonkas yang diisi manual. Bukan laporan keuangan akrual, bukan penghasilan kena pajak, dan tidak menghitung PPh atau PPN."
        actions={<Button variant="outline" className="press border-input" disabled={!s || !s.entries.length} onClick={exportCSV} data-testid="button-export-profit-loss"><Download className="h-4 w-4 mr-1.5" />Unduh CSV {label}</Button>} />

      <div className="rise mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PeriodPicker idPrefix="report-period" mode={sel.mode} year={sel.year} month={sel.month} years={years}
          onChange={(v) => v.mode !== 'semua' && setSel({ mode: v.mode, year: v.year, month: v.month })} />
        {s && <span className="text-sm text-foreground/80" data-testid="text-report-count">{s.entries.length} transaksi pada {label}</span>}
      </div>

      {'error' in result ? (
        <div role="alert" className="flex gap-2 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm" data-testid="text-report-error">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <span>{result.error} Periksa daftar di <Link href="/transaksi" className="font-semibold text-accent underline underline-offset-4" data-testid="link-fix-transactions">Transaksi</Link>.</span>
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState icon={FileSpreadsheet} title="Belum ada angka untuk dilaporkan" desc="Laporan ini hanya memakai transaksi yang Anda catat. Tidak ada angka contoh."
          action={<Link href="/transaksi" className="press inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground" data-testid="link-empty-add-transaction"><Plus className="h-4 w-4 mr-1.5" />Catat transaksi</Link>} />
      ) : s && s.entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-input px-4 py-10 text-center text-sm text-foreground/80" data-testid="text-report-empty-period">
          Tidak ada transaksi pada {label}. Pilih periode lain atau <Link href="/transaksi" className="font-semibold text-accent underline underline-offset-4" data-testid="link-period-add-transaction">catat transaksi</Link>.
        </div>
      ) : s && (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6 min-w-0">
            <section className="rise rounded-2xl border border-border bg-card p-5" aria-labelledby="pl-h">
              <h2 id="pl-h" className="text-lg font-bold text-white">Laba rugi sederhana · {label}</h2>
              <div className="mt-3">
                <Line label="Penjualan usaha" value={s.sales} testId="text-sales" />
                <Line label="HPP (penyesuaian nonkas, manual)" value={s.cogs} minus testId="text-cogs" />
                <Line label="Laba kotor" value={s.grossProfit} strong testId="text-gross-profit" />
                {opCats.map((c) => <Line key={c.id} sub label={c.label} value={s.byCategory[c.id] ?? 0} minus testId={`text-op-${c.id}`} />)}
                <Line label="Total beban operasional" value={s.operatingExpenses} minus testId="text-operating" />
                <Line label="Pendapatan usaha lainnya" value={s.otherIncome} testId="text-other-income" />
                <div className={`mt-2 flex items-baseline justify-between gap-4 rounded-xl px-4 py-3.5 ${s.netProfit >= 0 ? 'bg-accent/12 border border-accent/40' : 'bg-destructive/10 border border-destructive/40'}`}>
                  <span className="font-bold text-white">Hasil sederhana {s.netProfit >= 0 ? '(laba)' : '(rugi)'}</span>
                  <span className="num text-xl font-extrabold text-white" data-testid="text-net-profit">{rupiah(s.netProfit)}</span>
                </div>
                <p className="mt-2 text-xs text-foreground/70">Penjualan − HPP = laba kotor; − beban operasional + pendapatan lainnya = hasil sederhana sebelum rekonsiliasi fiskal.</p>
              </div>
            </section>

            <section className="rise rounded-2xl border border-border bg-card p-5" aria-labelledby="cf-h">
              <h2 id="cf-h" className="text-lg font-bold text-white">Arus kas tercatat · {label}</h2>
              <p className="mt-1 text-sm text-foreground/75">Hanya transaksi kas. Penyesuaian HPP nonkas tidak dihitung di sini. Termasuk modal, pinjaman, prive, aset, persediaan, dan transfer yang tidak masuk laba rugi.</p>
              <div className="mt-3">
                <Line label="Total uang masuk" value={s.cashIn} testId="text-cash-in" />
                {exIn.map((c) => <Line key={c.id} sub label={c.label} value={s.byCategory[c.id] ?? 0} testId={`text-ex-${c.id}`} />)}
                <Line label="Total uang keluar" value={s.cashOut} minus testId="text-cash-out" />
                {exOut.map((c) => <Line key={c.id} sub label={c.label} value={s.byCategory[c.id] ?? 0} minus testId={`text-ex-${c.id}`} />)}
                <Line label="Selisih arus kas tercatat" value={s.cashNet} strong testId="text-cash-net" />
              </div>
              <p className="mt-2 text-xs text-foreground/70">Selisih ini hanya perubahan dari transaksi yang dicatat. Bukan saldo rekening dan tidak sama dengan laba.</p>
            </section>
          </div>

          <aside className="space-y-3">
            <Notice tone="warn" icon={AlertTriangle}>
              HPP adalah penyesuaian nonkas yang Anda isi manual: harga pokok barang yang terjual. Pembelian persediaan mengurangi kas tetapi bukan HPP; kas tidak dikurangi dua kali. Tidak ada penilaian persediaan otomatis. Tidak ada rekonsiliasi piutang, utang, akrual, persediaan, atau penyusutan.
            </Notice>
            <Notice icon={Info}>
              Pembayaran pajak yang Anda catat di menu Pembayaran tidak diimpor atau dikurangkan. PPh dan PPN tidak dihitung di sini. Tanyakan KPP atau konsultan pajak berizin untuk kasus Anda.
            </Notice>
            <Notice icon={FileSpreadsheet}>
              CSV laporan dihitung dari seluruh transaksi {label}, terlepas dari filter di halaman Transaksi.
            </Notice>
            <LocalDataNotice />
          </aside>
        </div>
      )}
    </>
  );
}
