import { useState } from 'react';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import type { TaxResource } from '@workspace/api-client-react';

const PATHS = [
  { id: 'activation-guide-online', label: 'Sudah memakai DJP Online' },
  { id: 'activation-guide-no-online', label: 'Punya NPWP, belum DJP Online' },
  { id: 'activation-guide-no-npwp', label: 'Belum memiliki NPWP' },
];

export function CoretaxAccessGuide({ resources }: { resources: TaxResource[] }) {
  const [path, setPath] = useState('');
  const selected = resources.find((r) => r.id === path);
  const kodjp = resources.filter((r) => ['kodjp-guide-request', 'kodjp-guide-validation'].includes(r.id));
  const available = PATHS.filter((p) => resources.some((r) => r.id === p.id));
  if (available.length === 0 && kodjp.length === 0) return null;

  return (
    <section className="mb-6 rounded-2xl border border-primary/35 bg-card p-5" aria-labelledby="access-guide-title">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-accent" aria-hidden="true" />
        <h2 id="access-guide-title" className="text-lg font-semibold">Mulai akses Coretax &amp; Kode Otorisasi DJP</h2>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Pilih kondisi Anda untuk membaca jalur yang sesuai. Ini panduan, bukan formulir aktivasi. Jangan masukkan NPWP/NIK, swafoto, kata sandi, OTP, atau passphrase di aplikasi ini.</p>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Kondisi akses Coretax Anda">
        {available.map((p) => <button key={p.id} type="button" aria-pressed={path === p.id}
          onClick={() => setPath(p.id)}
          className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${path === p.id ? 'border-primary bg-primary text-primary-foreground' : 'border-input text-foreground hover:border-primary'}`}>
          {p.label}
        </button>)}
      </div>
      {selected ? <div className="mt-4 rounded-xl border border-border bg-background/50 p-4" aria-live="polite">
        <h3 className="font-semibold">{selected.title}</h3>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/85">{selected.excerpt}</p>
        <SourceLink resource={selected} />
      </div> : <p className="mt-3 text-sm text-muted-foreground">Belum memilih jalur. Tidak perlu mengisi nomor identitas atau data akun.</p>}
      {kodjp.length > 0 && <div className="mt-5 grid gap-3 md:grid-cols-2">
        {kodjp.map((r) => <details key={r.id} className="rounded-xl border border-border bg-background/50 p-4">
          <summary className="cursor-pointer text-sm font-semibold">{r.title}</summary>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/85">{r.excerpt}</p>
          <SourceLink resource={r} />
        </details>)}
      </div>}
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Aktivasi akun, pendaftaran wajib pajak, permohonan KODJP, dan validasi sertifikat adalah tahap berbeda. Panduan menampilkan tanggal/versi sumber; tampilan portal dapat berubah. Sahabat Pajak tidak memeriksa status akun atau sertifikat Anda.</p>
      <a href="https://coretaxdjp.pajak.go.id/" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent underline underline-offset-4">
        Buka portal resmi Coretax<ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </a>
    </section>
  );
}

function SourceLink({ resource }: { resource: TaxResource }) {
  return <a href={resource.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm text-accent underline underline-offset-4">
    Buka sumber DJP<ArrowUpRight className="h-4 w-4" aria-hidden="true" />
  </a>;
}
