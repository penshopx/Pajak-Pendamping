import { MAX_TRANSACTION_AMOUNT } from './business-ledger';
import { rupiah } from './format';

/** Parses a whole-rupiah string. Accepts "150000" or "150.000". Returns error text or a number. */
export function parseRupiah(raw: string): { ok: true; value: number } | { ok: false; error: string } {
  const s = raw.replace(/\s/g, '').replace(/^Rp/i, '');
  if (!s) return { ok: false, error: 'Isi nominal.' };
  if (/^-/.test(s)) return { ok: false, error: 'Nominal tidak boleh negatif.' };
  if (/,/.test(s) || /\.\d{1,2}$/.test(s)) return { ok: false, error: 'Nominal harus rupiah utuh, tanpa desimal atau sen.' };
  if (!/^\d+$/.test(s) && !/^\d{1,3}(\.\d{3})+$/.test(s)) return { ok: false, error: 'Gunakan angka saja, misalnya 150000 atau 150.000.' };
  const digits = s.replace(/\./g, '');
  if (digits.length > 13) return { ok: false, error: `Nominal melebihi batas ${rupiah(MAX_TRANSACTION_AMOUNT)}.` };
  const n = Number(digits);
  if (n <= 0) return { ok: false, error: 'Nominal harus lebih dari nol.' };
  if (n > MAX_TRANSACTION_AMOUNT) return { ok: false, error: `Nominal melebihi batas ${rupiah(MAX_TRANSACTION_AMOUNT)}.` };
  return { ok: true, value: n };
}
