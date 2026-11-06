import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { useStore } from '@/lib/store';
import { buildRestore, MAX_BACKUP_BYTES, parseBackup, restoreSnapshot, type BackupData, type RestoreMode } from '@/lib/backup';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Confirm } from './confirm';

const sections = [
  ['obligations', 'kewajiban'], ['payments', 'pembayaran'], ['transactions', 'transaksi usaha'],
  ['tradeBills', 'piutang/utang'], ['learningCompleted', 'tahap belajar'],
] as const;

export function BackupRestore() {
  const store = useStore();
  const [backup, setBackup] = useState<BackupData | null>(null);
  const [filename, setFilename] = useState('');
  const [mode, setMode] = useState<RestoreMode>('merge');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const selection = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const confirmedSnapshot = useRef('');
  let preview: ReturnType<typeof buildRestore> | null = null;
  let previewError = '';
  if (backup) {
    try { preview = buildRestore(store, backup, mode); }
    catch (cause) { previewError = cause instanceof Error ? cause.message : 'Cadangan tidak dapat dipulihkan.'; }
  }
  const expected = restoreSnapshot(store);
  const restore = () => {
    if (!backup || !preview) return;
    try {
      store.restoreBackup(backup, mode, confirmedSnapshot.current);
      setSuccess('Cadangan berhasil dipulihkan. Transaksi dan laporan sudah diperbarui dan tersimpan di peramban ini.');
      setBackup(null); setError(''); setFilename('');
      if (input.current) input.current.value = '';
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Pemulihan gagal. Catatan lama tidak dihapus.');
    }
  };
  return (
    <section className="rise rounded-2xl border border-border bg-card p-5 sm:p-6 lg:col-span-2" aria-labelledby="restore-h">
      <h2 id="restore-h" className="flex items-center gap-2 text-xl font-bold text-white"><Upload className="h-5 w-5 text-primary" />Pulihkan cadangan JSON</h2>
      <p className="mt-2 text-sm text-muted-foreground">File dibaca hanya di perangkat ini, tidak diunggah ke server. Batas 5 MB dan 5.000 catatan per jenis. CSV hanya untuk ekspor. Jangan sertakan NPWP, NIK, atau kredensial.</p>
      <div className="mt-4 space-y-2">
        <Label htmlFor="backup-file">Pilih file cadangan Sahabat Pajak (.json)</Label>
        <Input ref={input} id="backup-file" data-testid="input-backup-file" type="file" accept=".json,application/json" disabled={busy}
          className="h-auto bg-background file:mr-3 file:text-foreground" onChange={async event => {
            const file = event.target.files?.[0];
            const ticket = ++selection.current;
            setBackup(null); setFilename(''); setError(''); setSuccess('');
            if (!file) return;
            setBusy(true);
            try {
              if (!/\.json$/i.test(file.name)) throw new Error('Pilih file JSON. CSV tidak dapat diimpor.');
              if (file.size > MAX_BACKUP_BYTES) throw new Error('Ukuran cadangan melebihi batas 5 MB.');
              const parsed = parseBackup(await file.text());
              if (ticket === selection.current) { setBackup(parsed); setFilename(file.name); }
            } catch (cause) {
              if (ticket === selection.current) setError(cause instanceof Error ? cause.message : 'File tidak dapat dibaca. Catatan lama tidak diubah.');
            } finally { if (ticket === selection.current) setBusy(false); }
          }} />
        {busy && <p role="status" className="text-sm">Memeriksa cadangan…</p>}
        {success && <p role="status" className="text-sm text-primary">{success}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
      {backup && <div className="mt-5 space-y-4" data-testid="backup-preview">
        <p className="break-all text-sm font-semibold">Pratinjau: {filename}</p>
        <fieldset className="space-y-2">
          <legend className="mb-2 font-semibold">Cara pemulihan</legend>
          <label className="flex items-start gap-2 text-sm"><input type="radio" name="restore-mode" checked={mode === 'merge'} onChange={() => { setMode('merge'); setError(''); }} />
            Gabungkan: tambah ID baru saja; ID sama dan profil tetap memakai catatan lokal. Progres lokal dipertahankan.</label>
          <label className="flex items-start gap-2 text-sm"><input type="radio" name="restore-mode" checked={mode === 'replace'} onChange={() => { setMode('replace'); setError(''); }} />
            Ganti: profil dan bagian yang ada dalam file menggantikan catatan lokal, termasuk bagian berisi daftar kosong. Ekspor catatan saat ini terlebih dahulu.</label>
        </fieldset>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr><th className="py-2">Data</th><th>Sekarang</th><th>Dalam file</th><th>Setelah pemulihan</th></tr></thead>
            <tbody>{sections.map(([key, label]) => <tr key={key} className="border-t border-border">
              <th className="py-2 font-normal">{label}</th><td>{store[key].length}</td>
              <td>{backup[key]?.length ?? 'Tidak ada; dipertahankan'}</td><td>{preview?.[key].length ?? '—'}</td>
            </tr>)}
              <tr className="border-t border-border"><th className="py-2 font-normal">Lingkup persiapan SPT</th><td>{Object.keys(store.sptProgress).length}</td>
                <td>{backup.sptProgress === undefined ? 'Tidak ada; dipertahankan' : Object.keys(backup.sptProgress).length}</td>
                <td>{preview ? Object.keys(preview.sptProgress).length : '—'}</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground">Bagian yang tidak ada pada cadangan lama tetap dipertahankan, termasuk transaksi baru. Riwayat chat tidak diimpor atau dihapus. HPP tetap penyesuaian nonkas, bukan pengeluaran kas kedua.</p>
        <p className="text-sm">Profil setelah pemulihan: {preview?.profile.businessName || '(tanpa nama)'} · {preview?.profile.businessType === 'badan' ? 'Badan' : 'Orang pribadi'}.</p>
        {previewError && <p role="alert" className="text-sm text-destructive">{previewError} Tidak ada perubahan disimpan.</p>}
        <div className="flex flex-wrap gap-2">
          <Confirm title={mode === 'replace' ? 'Ganti catatan lokal dengan cadangan?' : 'Gabungkan cadangan dengan catatan lokal?'}
            desc={mode === 'replace' ? 'Profil dan bagian yang tercantum dalam file akan ditimpa sesuai pratinjau. Catatan lokal pada bagian tersebut bisa hilang. Bagian yang tidak ada dan chat tetap disimpan. Pastikan Anda sudah mengekspor cadangan terbaru.'
              : 'Hanya ID baru ditambahkan sesuai pratinjau. ID yang sama tidak diperbarui; profil dan catatan lokal tetap dipakai. Chat tidak diubah.'}
            confirmLabel={mode === 'replace' ? 'Ya, ganti catatan' : 'Ya, gabungkan'} onConfirm={restore}
            trigger={<Button disabled={!preview} onClick={() => { confirmedSnapshot.current = expected; }} data-testid="button-restore-backup">Pulihkan sesuai pratinjau</Button>} />
          <Button variant="outline" onClick={() => { setBackup(null); setError(''); setFilename(''); if (input.current) input.current.value = ''; }}>Batal</Button>
        </div>
      </div>}
    </section>
  );
}
