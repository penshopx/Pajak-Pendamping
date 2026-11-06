import { useState } from 'react';
import { ArrowUpRight, ClipboardList, TriangleAlert } from 'lucide-react';
import type { TaxResource } from '@workspace/api-client-react';

export function SptReportingGuide({ resources }: { resources: TaxResource[] }) {
  const [kind, setKind] = useState<'op' | 'badan'>('op');
  const steps = resources.filter((r) => r.id.startsWith(`spt-guide-${kind}-`));
  const common = resources.filter((r) => ['spt-guide-deadlines', 'spt-guide-policy-alert'].includes(r.id));
  const hub = resources.find((r) => r.id === 'spt-guide-hub');
  if (!steps.length && !hub) return null;

  return (
    <section className="rounded-2xl border border-primary/35 bg-card p-5 sm:p-6" aria-labelledby="spt-guide-title" data-testid="section-spt-guide">
      <div className="flex items-start gap-3">
        <ClipboardList className="mt-1 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
        <div>
          <h2 id="spt-guide-title" className="text-lg font-semibold">Panduan pelaporan SPT Tahunan UMKM</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Persiapan dokumen, alur pelaporan, dan bukti penerimaan. Pilih bentuk wajib pajak, bukan hanya ukuran usahanya.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Bentuk wajib pajak">
        {(['op', 'badan'] as const).map((value) => <button key={value} type="button" aria-pressed={kind === value}
          onClick={() => setKind(value)} data-testid={`button-spt-kind-${value}`}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${kind === value ? 'border-primary bg-primary text-primary-foreground' : 'border-input text-foreground hover:border-primary'}`}>
          {value === 'op' ? 'Orang pribadi' : 'Badan'}
        </button>)}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground" data-testid="text-spt-scope">
        {kind === 'op' ? 'Untuk usaha atas nama wajib pajak orang pribadi. Panduan alur Coretaxpedia diperbarui 27 Februari 2026; contoh dokumen dan BPE dari manual 2025.' : 'Untuk wajib pajak badan. Contoh manual versi September 2025 menggunakan badan perdagangan dengan tahun buku nonkalender; bukan jawaban baku untuk semua badan UMKM.'}
      </p>
      <div className="mt-4 space-y-3" aria-live="polite">
        {steps.map((r, index) => <details key={r.id} open={index === 0 ? true : undefined}
          className="rounded-xl border border-border bg-background/50 p-4" data-testid={`details-${r.id}`}>
          <summary className="cursor-pointer text-sm font-semibold">
            <span className="mr-2 text-primary">{index + 1}.</span>{r.title.replace(/^(Orang pribadi|Badan) — /, '')}
          </summary>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/85">{r.excerpt}</p>
          <SourceLink resource={r} />
        </details>)}
      </div>
      <div className="mt-4 rounded-xl border border-[hsl(var(--warn)/.35)] bg-[hsl(var(--warn)/.06)] p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><TriangleAlert className="h-4 w-4 shrink-0 text-[hsl(var(--warn))]" aria-hidden="true" />Periksa tahun pajak dan tenggatnya</h3>
        <p className="mt-2 text-sm leading-relaxed text-foreground/85">Batas umum bukan tanggal jatuh tempo pasti untuk kasus Anda. Akhir tahun buku, perpanjangan, dan kebijakan khusus perlu diperiksa. Panduan ini tidak menentukan sanksi atau kelayakan PPh final.</p>
        {common.map((r) => <details key={r.id} className="mt-3 text-sm" data-testid={`details-${r.id}`}>
          <summary className="cursor-pointer font-medium">{r.title}</summary>
          <p className="mt-2 whitespace-pre-line leading-relaxed text-foreground/85">{r.excerpt}</p>
          <SourceLink resource={r} />
        </details>)}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Konsep, kode billing, dan bukti bayar bukan Bukti Penerimaan Elektronik (BPE) pelaporan. Periksa hasil di portal resmi. Sahabat Pajak tidak mengirim atau memverifikasi SPT, dan tidak meminta dokumen keuangan, NPWP/NIK, kata sandi, OTP, atau passphrase.</p>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        <a href="https://coretaxdjp.pajak.go.id/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-accent underline underline-offset-4" data-testid="link-spt-official-portal">Buka portal resmi Coretax<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a>
        {hub && <SourceLink resource={hub} label="Pusat panduan SPT DJP" />}
      </div>
    </section>
  );
}

function SourceLink({ resource, label = 'Buka rujukan DJP' }: { resource: TaxResource; label?: string }) {
  return <a href={resource.url} target="_blank" rel="noopener noreferrer"
    className="mt-2 inline-flex items-center gap-1 text-sm text-accent underline underline-offset-4"
    data-testid={`link-${resource.id}`}>
    {label}<ArrowUpRight className="h-4 w-4" aria-hidden="true" />
  </a>;
}
