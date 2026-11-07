import { useGetSp2dkReadiness, type PublicSourceReadiness } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';

const LABELS: Record<PublicSourceReadiness['status'], string> = {
  ready: 'Siap digunakan untuk konsultasi AI',
  not_checked: 'Belum diperiksa — belum dapat digunakan untuk AI',
  awaiting_review: 'Menunggu tinjauan — belum disetujui untuk AI',
  access_failed: 'Gagal diakses saat pemeriksaan — belum dapat digunakan untuk AI',
  expired: 'Pemeriksaan atau tinjauan kedaluwarsa — perlu diperbarui sebelum digunakan untuk AI',
  needs_review: 'Perlu tinjauan ulang — belum dapat digunakan untuk AI',
  companion_held: 'Menunggu rujukan pendamping — belum dapat digunakan untuk AI',
};

export function Sp2dkReadiness() {
  const query = useGetSp2dkReadiness({
    query: { staleTime: 0, refetchOnMount: 'always', refetchInterval: 60_000, retry: false },
    request: { cache: 'no-store' },
  });
  // Never present a cached success as current when the latest request failed.
  const data = query.isError ? undefined : query.data;
  return (
    <section aria-label="Kesiapan rujukan SP2DK" className="my-5 rounded-xl border border-input bg-card p-4 text-sm leading-relaxed" data-testid="panel-sp2dk-readiness">
      <div role="status" aria-live="polite">
        <h2 className="font-semibold text-white">Rujukan SP2DK untuk konsultasi AI</h2>
        <p className="mt-1 text-foreground">
          {query.isError ? 'Status belum dapat diperiksa. Jangan anggap rujukan siap digunakan untuk AI.' :
            !data ? 'Sedang memeriksa kesiapan rujukan. Status belum diketahui.' :
            data.ready ? 'Rujukan SP2DK siap digunakan untuk konsultasi AI saat status ini diperiksa.' :
            'Rujukan SP2DK belum siap seluruhnya. Jawaban AI tentang SP2DK dapat ditahan karena sumber belum cukup.'}
        </p>
      </div>
      {data && <details className="mt-2">
        <summary className="cursor-pointer font-semibold text-accent">Lihat status tiap rujukan</summary>
        <ul className="mt-2 space-y-2">{data.sources.map(s => <li key={s.id}>
          <span className="block font-medium text-white">{s.title}</span>
          <span className={s.status === 'ready' ? 'text-accent' : 'text-[hsl(var(--warn))]'}>{LABELS[s.status]}</span>
        </li>)}</ul>
        <p className="mt-2 text-xs text-muted-foreground">Status diperiksa {new Date(data.evaluatedAt).toLocaleString('id-ID')}. Status dapat berubah.</p>
      </details>}
      <p className="mt-2 text-xs text-muted-foreground">Tanggal kurasi bukan persetujuan sumber untuk AI atau jaminan aturan terbaru. Server tetap memeriksa ulang rujukan sebelum memberikan jawaban. Konfirmasikan keputusan penting kepada DJP/KPP.</p>
      <Button type="button" variant="outline" size="sm" className="mt-3 border-input" disabled={query.isFetching}
        onClick={() => void query.refetch()} data-testid="button-refresh-sp2dk-readiness">
        {query.isFetching ? 'Memeriksa status…' : 'Perbarui status'}
      </Button>
    </section>
  );
}
