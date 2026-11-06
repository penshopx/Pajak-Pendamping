import { useEffect } from 'react';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
export { MONTHS };

export const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);

export function formatPeriod(p: string) {
  const [y, m] = p.split('-');
  const i = Number(m) - 1;
  return MONTHS[i] ? `${MONTHS[i]} ${y}` : p;
}

export function formatDate(d: string) {
  const dt = new Date(d.length === 10 ? d + 'T00:00:00' : d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const currentPeriod = () => todayISO().slice(0, 7);

export function daysUntil(date: string) {
  const a = new Date(todayISO() + 'T00:00:00').getTime();
  const b = new Date(date + 'T00:00:00').getTime();
  return Math.round((b - a) / 86400000);
}

export function dueLabel(date: string) {
  const d = daysUntil(date);
  if (d < 0) return `Lewat ${-d} hari`;
  if (d === 0) return 'Hari ini';
  if (d === 1) return 'Besok';
  return `${d} hari lagi`;
}

export function usePageTitle(title: string) {
  useEffect(() => { document.title = `${title} · Sahabat Pajak`; }, [title]);
}

export function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export function toCSV(rows: Record<string, unknown>[]) {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === undefined || v === null ? '' : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n');
}
