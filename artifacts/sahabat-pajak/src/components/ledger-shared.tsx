import { useMemo } from 'react';
import { Link } from 'wouter';
import { HardDrive } from 'lucide-react';
import { MONTHS } from '@/lib/format';
import { Notice } from '@/components/shell';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BusinessTransaction, LedgerPeriod } from '@/lib/business-ledger';

export type PeriodMode = 'semua' | LedgerPeriod['mode'];

export function thisMonth() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function useLedgerYears(transactions: BusinessTransaction[], selected: number) {
  return useMemo(() => {
    const set = new Set<number>([thisMonth().year, selected]);
    for (const t of transactions) { const y = Number(t.date.slice(0, 4)); if (Number.isInteger(y)) set.add(y); }
    return [...set].filter((y) => y >= 1900 && y <= 2100).sort((a, b) => b - a);
  }, [transactions, selected]);
}

export function validPeriod(year: number, month: number) {
  return Number.isInteger(year) && year >= 1900 && year <= 2100 && Number.isInteger(month) && month >= 1 && month <= 12;
}

export function periodLabel(p: LedgerPeriod) {
  return p.mode === 'bulanan' ? `${MONTHS[p.month - 1]} ${p.year}` : `Tahun ${p.year}`;
}

export function PeriodPicker({ mode, year, month, years, allowAll, onChange, idPrefix }: {
  mode: PeriodMode; year: number; month: number; years: number[]; allowAll?: boolean; idPrefix: string;
  onChange: (v: { mode: PeriodMode; year: number; month: number }) => void;
}) {
  const trig = 'h-10 bg-card border-input';
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Periode">
      <div className="inline-flex rounded-lg border border-input bg-card p-1" role="radiogroup" aria-label="Jenis periode">
        {(allowAll ? ['semua', 'bulanan', 'tahunan'] as const : ['bulanan', 'tahunan'] as const).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m}
            onClick={() => onChange({ mode: m, year, month })}
            data-testid={`${idPrefix}-mode-${m}`}
            className={`press rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${mode === m ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:text-white'}`}>
            {m === 'semua' ? 'Semua' : m === 'bulanan' ? 'Bulanan' : 'Tahunan'}
          </button>
        ))}
      </div>
      {mode === 'bulanan' && (
        <Select value={String(month)} onValueChange={(v) => onChange({ mode, year, month: Number(v) })}>
          <SelectTrigger className={`${trig} w-36`} aria-label="Bulan" data-testid={`${idPrefix}-month`}><SelectValue /></SelectTrigger>
          <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
        </Select>
      )}
      {mode !== 'semua' && (
        <Select value={String(year)} onValueChange={(v) => onChange({ mode, year: Number(v), month })}>
          <SelectTrigger className={`${trig} w-28`} aria-label="Tahun" data-testid={`${idPrefix}-year`}><SelectValue /></SelectTrigger>
          <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
      )}
    </div>
  );
}

export function LocalDataNotice() {
  return (
    <Notice icon={HardDrive}>
      Catatan transaksi dan penyesuaian HPP hanya tersimpan di peramban ini dan bisa hilang bila data peramban dihapus. Buat cadangan berkala lewat{' '}
      <Link href="/pengaturan" className="font-semibold text-accent underline underline-offset-4" data-testid="link-settings-backup">Pengaturan</Link>.
    </Notice>
  );
}
