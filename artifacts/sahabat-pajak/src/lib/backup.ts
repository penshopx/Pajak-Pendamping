import { z } from 'zod';
import { MAX_TRANSACTION_AMOUNT, validateTransaction, validLedgerDate, type BusinessTransaction } from './business-ledger';
import { assertTradeLedger, validateTradeBill, type TradeBill } from './trade-ledger';
import { validateLearningCompleted } from './learning-path';
import { assertSptProgress, type SptProgress } from './spt-preparation';
import type { Obligation, Payment } from './store';
import { assertServiceRooms, ROOM_STEP_IDS, type ServiceRoom } from './service-center';

export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
export const MAX_BACKUP_ROWS = 5000;
const text = (max: number) => z.string().max(max);
const id = text(120).min(1);
const date = z.string().refine(validLedgerDate);
const period = z.string().regex(/^(19\d{2}|20\d{2}|2100)-(0[1-9]|1[0-2])$/);
const amount = z.number().int().min(0).max(MAX_TRANSACTION_AMOUNT);
const taxType = z.enum(['PPh Final UMKM', 'PPh 21', 'PPh 23', 'PPh 25', 'PPh 4 ayat (2)', 'PPh Tahunan (SPT)', 'PPN', 'PBB', 'Lainnya']);
const common = { id, taxType, period, amount, notes: text(1000), demo: z.boolean().optional() };
const obligation = z.object({
  ...common, title: text(120).min(1), dueDate: date, status: z.enum(['belum', 'selesai']),
});
const payment = z.object({ ...common, date, ntpn: text(100).optional() });
const transaction = z.object({
  id, date, kind: z.enum(['pemasukan', 'pengeluaran']), category: text(80),
  description: text(120), amount, notes: text(1000), tradeBillId: id.optional(),
}).refine(validateTransaction);
const tradeBill = z.object({
  id, kind: z.enum(['piutang', 'utang']), party: text(80), reference: text(60),
  description: text(120), date, dueDate: date, amount, category: text(80), notes: text(1000),
}).refine(validateTradeBill);
const rows = <T extends z.ZodType<{ id: string }>>(schema: T) => z.array(schema).max(MAX_BACKUP_ROWS)
  .refine(items => new Set(items.map(item => item.id)).size === items.length);
const schema = z.object({
  profile: z.object({ businessName: text(80), businessType: z.enum(['orang-pribadi', 'badan']) }),
  obligations: rows(obligation), payments: rows(payment),
  transactions: rows(transaction).optional(), tradeBills: rows(tradeBill).optional(),
  learningCompleted: z.custom<string[]>(validateLearningCompleted).optional(),
  sptProgress: z.custom<SptProgress>(value => {
    try { assertSptProgress(value); return Object.keys(value as object).length <= 500; } catch { return false; }
  }).optional(),
  serviceRooms: rows(z.object({
    id, title: text(80).min(1), topic: z.enum(['umkm', 'coretax', 'pembayaran', 'spt', 'sp2dk']),
    period: z.string(), checked: z.array(z.enum(ROOM_STEP_IDS)),
  })).refine(value => {
    try { assertServiceRooms(value); return true; } catch { return false; }
  }).optional(),
});
export type BackupData = z.infer<typeof schema>;
export type RestorableData = Omit<Required<BackupData>, 'obligations' | 'payments' | 'serviceRooms'> & {
  obligations: Obligation[]; payments: Payment[]; serviceRooms?: ServiceRoom[];
};
export type RestoreMode = 'merge' | 'replace';

/** Select known fields only. Chat and export metadata never become imported state. */
export function validateBackup(value: unknown): BackupData {
  const result = schema.safeParse(value);
  if (!result.success) {
    const path = result.error.issues[0]?.path.join('.') || 'struktur';
    throw new Error(`Cadangan tidak valid pada ${path}. Periksa struktur, batas 5.000 catatan per jenis / 100 ruang persiapan, tanggal nyata (1900–2100), kategori, dan rupiah bulat (maksimal 1 triliun).`);
  }
  assertTradeLedger(result.data.tradeBills ?? [], result.data.transactions ?? []);
  return result.data;
}
export function parseBackup(text: string): BackupData {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) throw new Error('Ukuran cadangan melebihi batas 5 MB.');
  let value: unknown;
  try {
    value = JSON.parse(text.replace(/^\uFEFF/, ''), (key, value) => {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Unsafe key');
      return value;
    });
  } catch { throw new Error('File bukan JSON cadangan yang aman dan dapat dibaca.'); }
  return validateBackup(value);
}
export function restoreSnapshot(s: RestorableData) {
  return JSON.stringify({
    profile: s.profile, obligations: s.obligations, payments: s.payments, transactions: s.transactions,
    tradeBills: s.tradeBills, learningCompleted: s.learningCompleted, sptProgress: s.sptProgress,
    serviceRooms: s.serviceRooms ?? [],
  });
}
function combine<T extends { id: string }>(local: T[], incoming: T[]) {
  const ids = new Set(local.map(item => item.id));
  return [...local, ...incoming.filter(item => !ids.has(item.id))];
}
/** Missing sections of older backups are preserved, even in replacement mode. */
export function buildRestore<T extends RestorableData>(current: T, input: BackupData, mode: RestoreMode): T {
  if (mode !== 'merge' && mode !== 'replace') throw new Error('Pilih cara pemulihan yang valid.');
  const backup = validateBackup(input);
  const choose = <R extends { id: string }>(local: R[], incoming: R[] | undefined) =>
    incoming === undefined ? local : mode === 'replace' ? incoming : combine(local, incoming);
  const sptProgress = { ...backup.sptProgress, ...current.sptProgress };
  if (mode === 'merge' && backup.sptProgress) {
    for (const scope of Object.keys(backup.sptProgress)) {
      sptProgress[scope] = { ...backup.sptProgress[scope], ...current.sptProgress[scope] };
    }
  }
  const next = {
    ...current,
    profile: mode === 'replace' ? backup.profile : current.profile,
    obligations: choose(current.obligations, backup.obligations),
    payments: choose(current.payments, backup.payments),
    transactions: choose<BusinessTransaction>(current.transactions, backup.transactions),
    tradeBills: choose<TradeBill>(current.tradeBills, backup.tradeBills),
    learningCompleted: backup.learningCompleted === undefined ? current.learningCompleted
      : mode === 'replace' ? backup.learningCompleted : [...new Set([...current.learningCompleted, ...backup.learningCompleted])],
    sptProgress: backup.sptProgress === undefined ? current.sptProgress : mode === 'replace' ? backup.sptProgress : sptProgress,
    ...(current.serviceRooms !== undefined || backup.serviceRooms !== undefined
      ? { serviceRooms: choose(current.serviceRooms ?? [], backup.serviceRooms) } : {}),
  };
  // Also catches combined limits, broken links and overpaid bills after ID collisions.
  validateBackup(next);
  return next;
}
