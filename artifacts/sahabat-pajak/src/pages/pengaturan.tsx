import { useEffect, useState } from 'react';
import { Building2, Download, FileJson, FileSpreadsheet, FlaskConical, HardDrive, Trash2, UserRound } from 'lucide-react';
import { useStore, type BusinessType } from '@/lib/store';
import { downloadFile, toCSV, todayISO, usePageTitle } from '@/lib/format';
import { Notice, PageHeader } from '@/components/shell';
import { Confirm } from '@/components/confirm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { transactionCSV } from '@/lib/business-ledger';
import { tradeBillsCSV } from '@/lib/trade-ledger';
import { learningSummary } from '@/lib/learning-path';

export default function Pengaturan() {
  usePageTitle('Pengaturan');
  const s = useStore();
  const { toast } = useToast();
  const [name, setName] = useState(s.profile.businessName);
  const [type, setType] = useState<BusinessType>(s.profile.businessType);
  useEffect(() => { setName(s.profile.businessName); setType(s.profile.businessType); }, [s.profile.businessName, s.profile.businessType]);
  const dirty = name.trim() !== s.profile.businessName || type !== s.profile.businessType;

  const exportJSON = () => {
    downloadFile(`sahabat-pajak-${todayISO()}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), note: 'Data lokal Sahabat Pajak. Tidak diverifikasi DJP. Transaksi usaha adalah rekap kas dan penyesuaian HPP manual, bukan penghasilan kena pajak. Tagihan belum dibayar tidak otomatis masuk laba rugi. Progres belajar adalah penanda pribadi, bukan bukti pemenuhan kewajiban.', profile: s.profile, obligations: s.obligations, payments: s.payments, transactions: s.transactions, tradeBills: s.tradeBills, learningCompleted: s.learningCompleted }, null, 2), 'application/json');
    toast({ title: 'JSON diunduh' });
  };
  const exportCSV = (kind: 'kewajiban' | 'pembayaran') => {
    const rows = kind === 'kewajiban'
      ? s.obligations.map((o) => ({ judul: o.title, jenis_pajak: o.taxType, masa: o.period, tenggat: o.dueDate, nominal: o.amount, status: o.status, catatan: o.notes, contoh: o.demo ? 'ya' : '' }))
      : s.payments.map((p) => ({ jenis_pajak: p.taxType, masa: p.period, nominal: p.amount, tanggal_bayar: p.date, ntpn: p.ntpn ?? '', catatan: p.notes, contoh: p.demo ? 'ya' : '' }));
    if (!rows.length) { toast({ title: 'Belum ada data', description: `Tidak ada ${kind} untuk diekspor.` }); return; }
    downloadFile(`sahabat-pajak-${kind}-${todayISO()}.csv`, '\uFEFF' + toCSV(rows), 'text/csv;charset=utf-8');
    toast({ title: 'CSV diunduh', description: `${rows.length} baris ${kind}.` });
  };

  return (
    <>
      <PageHeader eyebrow="Pengaturan" title="Profil dan data" desc="Semua tersimpan di peramban ini saja. Tidak ada akun, tidak ada sinkronisasi." />
      <div className="mb-6"><Notice tone="warn" icon={HardDrive}>Data lokal tidak disinkronkan. Menghapus data peramban, mode penyamaran, atau berganti perangkat akan menghilangkan catatan. Ekspor secara berkala sebagai cadangan.</Notice></div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rise rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="prof-h">
          <h2 id="prof-h" className="text-xl font-bold text-white">Profil usaha</h2>
          <p className="mt-1 text-sm text-muted-foreground">Hanya nama dan bentuk usaha. Jangan simpan NPWP, NIK, atau kredensial.</p>
          <form className="mt-5 space-y-5" onSubmit={(e) => { e.preventDefault(); s.setProfile({ businessName: name.trim(), businessType: type }); toast({ title: 'Profil disimpan' }); }}>
            <div className="space-y-1.5">
              <Label htmlFor="bn" className="font-semibold">Nama usaha</Label>
              <Input id="bn" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Warung Kopi Bu Ratna" className="h-11 bg-background border-input" data-testid="input-business-name" />
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Bentuk wajib pajak</legend>
              <div className="grid grid-cols-2 gap-3" role="radiogroup">
                {([['orang-pribadi', 'Orang pribadi', 'Usaha atas nama sendiri', UserRound], ['badan', 'Badan', 'CV, PT, koperasi, dsb.', Building2]] as const).map(([v, l, d, Icon]) => (
                  <button type="button" key={v} role="radio" aria-checked={type === v} onClick={() => setType(v)} data-testid={`radio-type-${v}`}
                    className={`press rounded-xl border p-4 text-left transition-colors ${type === v ? 'border-primary bg-primary/12 ring-1 ring-primary' : 'border-input hover:border-primary/50'}`}>
                    <Icon className={`h-5 w-5 ${type === v ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="mt-2 font-semibold text-white">{l}</div>
                    <div className="text-xs text-muted-foreground">{d}</div>
                  </button>
                ))}
              </div>
            </fieldset>
            <Button type="submit" disabled={!dirty} className="press font-semibold" data-testid="button-save-profile">Simpan profil</Button>
          </form>
        </section>

        <section className="rise rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="exp-h">
          <h2 id="exp-h" className="text-xl font-bold text-white flex items-center gap-2"><Download className="h-5 w-5 text-primary" />Ekspor data</h2>
          <p className="mt-1 text-sm text-muted-foreground"><span className="num text-foreground">{s.obligations.length}</span> kewajiban, <span className="num text-foreground">{s.payments.length}</span> pembayaran, <span className="num text-foreground">{s.transactions.length}</span> transaksi usaha, <span className="num text-foreground">{s.tradeBills.length}</span> tagihan piutang/utang tersimpan.</p>
          <div className="mt-5 grid gap-2">
            <p className="text-sm text-muted-foreground">Progres belajar: <span className="num text-foreground">{learningSummary(s.learningCompleted).done} dari {learningSummary(s.learningCompleted).total}</span> tahap ditandai selesai. Ini bukan status pemenuhan pajak.</p>
            <ExportBtn icon={FileJson} title="Semua catatan usaha (JSON)" desc="Profil, kewajiban, pembayaran, transaksi, piutang/utang, progres belajar; tanpa chat" onClick={exportJSON} id="json" />
            <ExportBtn icon={FileSpreadsheet} title="Kewajiban (CSV)" desc="Buka di Excel atau Google Sheets" onClick={() => exportCSV('kewajiban')} id="csv-obligations" />
            <ExportBtn icon={FileSpreadsheet} title="Pembayaran (CSV)" desc="Termasuk NTPN yang Anda catat" onClick={() => exportCSV('pembayaran')} id="csv-payments" />
            <ExportBtn icon={FileSpreadsheet} title="Transaksi usaha (CSV)" desc="Seluruh periode, pemasukan dan pengeluaran" id="csv-transactions"
              onClick={() => {
                if (!s.transactions.length) { toast({ title: 'Belum ada transaksi untuk diekspor' }); return; }
                downloadFile(`sahabat-pajak-transaksi-${todayISO()}.csv`, transactionCSV(s.transactions), 'text/csv;charset=utf-8');
                toast({ title: 'CSV transaksi diunduh', description: `${s.transactions.length} baris, seluruh periode.` });
              }} />
            <ExportBtn icon={FileSpreadsheet} title="Piutang dan utang usaha (CSV)" desc="Seluruh tagihan, nilai terbayar, dan sisa saat ini" id="csv-trade-bills"
              onClick={() => {
                if (!s.tradeBills.length) { toast({ title: 'Belum ada piutang atau utang untuk diekspor' }); return; }
                downloadFile(`sahabat-pajak-piutang-utang-${todayISO()}.csv`, tradeBillsCSV(s.tradeBills, s.transactions, todayISO()), 'text/csv;charset=utf-8');
                toast({ title: 'CSV piutang dan utang diunduh', description: `${s.tradeBills.length} tagihan, seluruh periode.` });
              }} />
          </div>
        </section>

        <section className="rise rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="demo-h">
          <h2 id="demo-h" className="text-xl font-bold text-white flex items-center gap-2"><FlaskConical className="h-5 w-5 text-[hsl(var(--warn))]" />Data contoh</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Catatan fiktif berlabel [Contoh] untuk mencoba fitur. Data Anda sendiri tidak terpengaruh.</p>
          <div className="mt-4">
            {s.hasDemo
              ? <Button variant="outline" className="press border-input" onClick={() => { s.removeDemo(); toast({ title: 'Data contoh dihapus' }); }} data-testid="button-settings-remove-demo">Hapus data contoh</Button>
              : <Button variant="outline" className="press border-input" onClick={() => { s.loadDemo(); toast({ title: 'Data contoh dimuat', description: 'Berlabel [Contoh], angka fiktif.' }); }} data-testid="button-settings-load-demo">Muat data contoh</Button>}
          </div>
        </section>

        <section className="rise rounded-2xl border border-destructive/40 bg-card p-5 sm:p-6" aria-labelledby="del-h">
          <h2 id="del-h" className="text-xl font-bold text-white">Hapus semua data</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Profil, kewajiban, pembayaran, transaksi usaha, piutang/utang, progres belajar, dan riwayat konsultasi dihapus dari peramban ini.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Confirm title="Hapus riwayat konsultasi?" desc="Percakapan tersimpan akan dihapus." confirmLabel="Hapus riwayat" onConfirm={() => { s.clearChat(); toast({ title: 'Riwayat dihapus' }); }}
              trigger={<Button variant="outline" className="border-input" data-testid="button-clear-chat-settings">Hapus riwayat chat</Button>} />
            <Confirm title="Hapus semua data lokal?" desc="Tindakan ini permanen. Ekspor dulu jika perlu cadangan." confirmLabel="Hapus semua" onConfirm={() => { s.clearAll(); toast({ title: 'Semua data lokal dihapus' }); }}
              trigger={<Button variant="destructive" data-testid="button-clear-all"><Trash2 className="h-4 w-4 mr-1.5" />Hapus semua</Button>} />
          </div>
        </section>
      </div>
    </>
  );
}

function ExportBtn({ icon: Icon, title, desc, onClick, id }: { icon: typeof Download; title: string; desc: string; onClick: () => void; id: string }) {
  return (
    <button onClick={onClick} data-testid={`button-export-${id}`} className="lift press group flex items-center gap-3 rounded-xl border border-border bg-background/60 p-3.5 text-left">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15"><Icon className="h-5 w-5 text-primary" /></span>
      <span className="flex-1"><span className="block font-semibold text-white">{title}</span><span className="block text-xs text-muted-foreground">{desc}</span></span>
      <Download className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-y-0.5 group-hover:text-primary" />
    </button>
  );
}
