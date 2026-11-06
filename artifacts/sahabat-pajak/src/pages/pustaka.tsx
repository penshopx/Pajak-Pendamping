import { useMemo, useState } from 'react';
import { ArrowUpRight, BookOpenCheck, Library, Search, TriangleAlert } from 'lucide-react';
import { useListTaxResources } from '@workspace/api-client-react';
import { formatDate, usePageTitle } from '@/lib/format';
import { EmptyState, Notice, PageHeader } from '@/components/shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { CoretaxAccessGuide } from '@/components/coretax-access-guide';

const CATS = ['Panduan Ringkas', 'Registrasi', 'Pembayaran', 'Pelaporan SPT', 'Layanan', 'Artikel', 'Regulasi', 'Konsultan Pajak', 'PJAP'];

export default function Pustaka() {
  usePageTitle('Pustaka');
  const { data, isLoading, isError, refetch, isFetching } = useListTaxResources();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('Semua');

  const cats = useMemo(() => {
    const extra = (data ?? []).map((r) => r.category).filter((c) => !CATS.includes(c));
    return ['Semua', ...CATS, ...new Set(extra)];
  }, [data]);
  const count = (c: string) => (data ?? []).filter((r) => c === 'Semua' || r.category === c).length;

  const list = useMemo(() => (data ?? []).filter((r) => {
    if (cat !== 'Semua' && r.category !== cat) return false;
    if (!q) return true;
    return `${r.title} ${r.description} ${r.excerpt} ${r.publisher}`.toLowerCase().includes(q.toLowerCase());
  }), [data, q, cat]);

  return (
    <>
      <PageHeader eyebrow="Pustaka" title="Sumber resmi, dikurasi"
        desc="Tautan menuju halaman asli DJP dan sumber terkait. Tidak semuanya berkekuatan hukum: artikel mencerminkan pendapat penulisnya. Baca sumber aslinya untuk ketentuan yang berlaku." />
      <Notice icon={BookOpenCheck}>Informasi konsultan pajak dan PJAP adalah rujukan edukasi. Sahabat Pajak tidak mengklaim izin praktik konsultan, penunjukan sebagai PJAP, atau verifikasi izin pihak tertentu. Periksa status dan saluran layanan melalui sumber resmi.</Notice>

      {!isLoading && !isError && <div className="mt-5"><CoretaxAccessGuide resources={data ?? []} /></div>}

      <div className="rise sticky top-14 md:top-0 z-20 -mx-4 mb-6 space-y-3 bg-background/85 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari: aktivasi, KODJP, SPT, konsultan, PJAP" aria-label="Cari pustaka"
            className="h-12 rounded-xl bg-card border-input pl-11 text-[15px]" data-testid="input-search-library" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Kategori">
          {cats.map((c) => (
            <button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)} data-testid={`chip-category-${c}`}
              className={`press whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${cat === c ? 'border-primary bg-primary text-primary-foreground' : 'border-input text-foreground/80 hover:border-primary/60 hover:text-white'}`}>
              {c}{data && <span className="num ml-1.5 text-xs opacity-75">{count(c)}</span>}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl bg-muted" />)}</div>
      ) : isError ? (
        <EmptyState icon={TriangleAlert} title="Pustaka gagal dimuat" desc="Periksa koneksi Anda, lalu coba lagi."
          action={<Button onClick={() => refetch()} disabled={isFetching} data-testid="button-retry-library">{isFetching ? 'Memuat...' : 'Coba lagi'}</Button>} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon={Library} title="Pustaka masih kosong" desc="Belum ada sumber yang tersedia dari layanan." />
      ) : list.length === 0 ? (
        <EmptyState icon={Search} title="Tidak ditemukan" desc={`Tidak ada sumber yang cocok dengan "${q}" di kategori ${cat}.`}
          action={<Button variant="outline" onClick={() => { setQ(''); setCat('Semua'); }} data-testid="button-reset-library">Atur ulang pencarian</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((r, i) => (
            <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" data-testid={`card-resource-${r.id}`} style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
              className="rise lift group flex flex-col rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${r.category === 'Regulasi' ? 'bg-accent/15 text-accent' : r.category === 'Artikel' ? 'bg-[hsl(var(--warn)/.15)] text-[hsl(var(--warn))]' : 'bg-primary/15 text-primary'}`}>{r.category}</span>
                <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <h2 className="mt-3 font-sans text-lg font-semibold leading-snug tracking-normal text-white group-hover:underline underline-offset-4 decoration-primary">{r.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-foreground/80">{r.description}</p>
              {r.excerpt && <blockquote className="mt-3 border-l-2 border-primary/60 pl-3 text-sm italic text-muted-foreground line-clamp-3">{r.excerpt}</blockquote>}
              {r.category === 'Artikel' && <p className="mt-3 text-xs text-[hsl(var(--warn))]">Artikel: pendapat penulis, bukan dasar hukum.</p>}
              <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{r.publisher}</span>
                <span>{r.sourceType}</span>
                <span className="num">Dicek {formatDate(r.checkedAt)}</span>
              </div>
            </a>
          ))}
        </div>
      )}

      <div className="mt-8"><Notice icon={BookOpenCheck}>Tanggal "dicek" menunjukkan kapan tautan terakhir ditinjau, bukan jaminan isinya terbaru. Peraturan bisa berubah; pastikan ke DJP atau KPP.</Notice></div>
    </>
  );
}
