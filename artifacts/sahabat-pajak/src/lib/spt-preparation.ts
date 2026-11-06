export type SptKind = 'op' | 'badan';
export const SPT_ITEMS = [
  { id: 'documents', label: 'Saya sudah menyiapkan catatan dan dokumen yang sesuai dengan bentuk wajib pajak saya.' },
  { id: 'access', label: 'Saya sudah memeriksa akses akun dan kesiapan otorisasi di portal resmi, tanpa membagikan kredensial.' },
  { id: 'period', label: 'Saya sudah memeriksa jenis SPT, tahun pajak/tahun buku, serta ketentuan dan tenggat yang berlaku di portal resmi.' },
  { id: 'review', label: 'Saya sudah memeriksa kembali isian serta lampiran yang diperlukan di portal resmi.' },
  { id: 'bpe', label: 'Saya sudah memeriksa sendiri BPE dan kecocokan tahun pajaknya di portal resmi setelah pelaporan.' },
] as const;
export type SptItemId = typeof SPT_ITEMS[number]['id'];
export type SptProgress = Record<string, Partial<Record<SptItemId, boolean>>>;

export function sptScope(kind: SptKind, year: number): string {
  if (!['op', 'badan'].includes(kind) || !Number.isInteger(year) || year < 1900 || year > 9999) {
    throw new Error('Jenis wajib pajak atau tahun pajak tidak valid.');
  }
  return `${kind}:${year}`;
}

export function assertSptProgress(value: unknown): asserts value is SptProgress {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Progres SPT tidak valid.');
  for (const [scope, items] of Object.entries(value)) {
    if (!/^(op|badan):[1-9]\d{3}$/.test(scope) || Number(scope.split(':')[1]) < 1900
      || !items || typeof items !== 'object' || Array.isArray(items)) throw new Error('Progres SPT tidak valid.');
    for (const [id, checked] of Object.entries(items)) {
      if (!SPT_ITEMS.some(item => item.id === id) || typeof checked !== 'boolean') throw new Error('Progres SPT tidak valid.');
    }
  }
}

export function setSptItem(progress: SptProgress, kind: SptKind, year: number, item: SptItemId, checked: boolean): SptProgress {
  const scope = sptScope(kind, year);
  if (!SPT_ITEMS.some(entry => entry.id === item) || typeof checked !== 'boolean') throw new Error('Butir SPT tidak valid.');
  return { ...progress, [scope]: { ...progress[scope], [item]: checked } };
}

export function resetSptScope(progress: SptProgress, kind: SptKind, year: number): SptProgress {
  const next = { ...progress };
  delete next[sptScope(kind, year)];
  return next;
}
