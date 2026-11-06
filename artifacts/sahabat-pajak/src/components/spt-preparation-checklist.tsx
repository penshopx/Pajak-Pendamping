import { useState } from 'react';
import { useStore } from '@/lib/store';
import { SPT_ITEMS, sptScope, type SptKind } from '@/lib/spt-preparation';
import { Button } from '@/components/ui/button';
import { Confirm } from '@/components/confirm';
import { useToast } from '@/hooks/use-toast';

export function SptPreparationChecklist({ kind }: { kind: SptKind }) {
  const { sptProgress, setSptChecked, resetSptProgress, storageError } = useStore();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear - 1);
  const savedYears = Object.keys(sptProgress).map(scope => Number(scope.split(':')[1]));
  const years = [...new Set([year, ...savedYears, ...Array.from({ length: currentYear - 1999 }, (_, i) => currentYear - i)])].sort((a, b) => b - a);
  const progress = sptProgress[sptScope(kind, year)] ?? {};
  const count = SPT_ITEMS.filter(item => progress[item.id]).length;
  const scopeLabel = `${kind === 'op' ? 'Orang pribadi' : 'Badan'} · tahun pajak ${year}`;
  const save = (action: () => void) => {
    try { action(); }
    catch (error) {
      toast({ title: 'Perubahan tidak disimpan', description: error instanceof Error ? error.message : 'Penyimpanan lokal gagal.', variant: 'destructive' });
    }
  };

  return <div className="mt-4 rounded-xl border border-border bg-background/50 p-4" data-testid="section-spt-checklist">
    <h3 className="font-semibold">Daftar periksa persiapan pribadi</h3>
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <label htmlFor="spt-tax-year" className="text-sm font-medium">Tahun pajak</label>
      <select id="spt-tax-year" value={year} onChange={e => setYear(Number(e.target.value))}
        className="rounded-lg border border-input bg-background px-3 py-2 text-foreground" data-testid="select-spt-year">
        {years.map(value => <option key={value} value={value}>{value}</option>)}
      </select>
    </div>
    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Pilih tahun pajak, bukan tahun pengiriman SPT. Pilihan tahun hanya untuk mengelompokkan catatan, bukan memastikan portal atau ketentuan tertentu berlaku.</p>
    <p className="mt-3 text-sm font-semibold" data-testid="text-spt-progress" role="status">
      {scopeLabel}: {count} dari {SPT_ITEMS.length} ditandai oleh Anda
    </p>
    <p className="mt-2 text-sm leading-relaxed text-foreground/85" data-testid="text-spt-acknowledgment">
      Centang hanya pengakuan Anda, bukan bukti SPT terkirim atau validasi DJP. Meski semua dicentang, periksa sendiri Bukti Penerimaan Elektronik (BPE) di portal resmi. Catatan ini tidak mengubah status kewajiban atau pembayaran.
    </p>
    <div className="mt-4 space-y-3">
      {SPT_ITEMS.map(item => <label key={item.id} className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
        <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-primary" checked={progress[item.id] === true}
          onChange={e => save(() => setSptChecked(kind, year, item.id, e.target.checked))}
          data-testid={`checkbox-spt-${item.id}`} />
        <span>{item.label}</span>
      </label>)}
    </div>
    <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Hanya status centang yang disimpan di peramban ini, terpisah menurut jenis wajib pajak dan tahun. Tidak tersinkron antarperangkat; data dapat hilang jika data peramban dihapus atau mode penyamaran ditutup. Ekspor JSON melalui Pengaturan untuk cadangan. Jangan unggah atau masukkan NPWP/NIK, dokumen keuangan, OTP, kata sandi, atau passphrase.</p>
    {storageError && <p role="alert" className="mt-3 text-sm text-destructive" data-testid="text-spt-storage-error">Progres belum dapat disimpan. {storageError}</p>}
    <div className="mt-4">
      <Confirm key={`${kind}:${year}`} title="Atur ulang progres persiapan SPT?"
        desc={`Hanya centang ${scopeLabel} yang dihapus. Jenis wajib pajak/tahun lain serta catatan kewajiban dan pembayaran tidak dihapus.`}
        confirmLabel="Atur ulang progres" onConfirm={() => save(() => {
          resetSptProgress(kind, year);
          toast({ title: 'Progres persiapan diatur ulang', description: scopeLabel });
        })}
        trigger={<Button type="button" variant="outline" disabled={count === 0} data-testid="button-reset-spt-progress">Atur ulang progres ini</Button>} />
    </div>
  </div>;
}
