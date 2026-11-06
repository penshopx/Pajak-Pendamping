import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { ArrowUpRight, BookText, GraduationCap, HardDrive, Library, MessagesSquare, Search, ShieldAlert, Split, TriangleAlert, X } from 'lucide-react';
import { usePageTitle } from '@/lib/format';
import { GLOSSARY_CATEGORIES, GLOSSARY_SOURCES, GLOSSARY_TERMS, type GlossaryTerm } from '@/lib/glossary-data';
import { filterGlossary, glossaryQuestionHref, glossaryTerm, glossaryTermHref, normalizeGlossaryQuery } from '@/lib/glossary';
import { LEARNING_STEPS } from '@/lib/learning-path';
import { EmptyState, Notice, PageHeader } from '@/components/shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const DESC = 'Glosarium pajak UMKM: ringkasan edukatif istilah seperti PKP, PTKP, NTPN, BPE, dan omzet, lengkap dengan contoh, catatan kehati-hatian, serta metadata sumber rujukan.';

function useMeta() {
  useEffect(() => {
    const set = (sel: string, attr: 'name' | 'property', key: string, value: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(sel);
      const created = !el;
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
      const prev = el.content; el.content = value;
      return () => { if (created) el!.remove(); else el!.content = prev; };
    };
    const undo = [
      set('meta[name="description"]', 'name', 'description', DESC),
      set('meta[property="og:title"]', 'property', 'og:title', 'Glosarium pajak UMKM · Sahabat Pajak'),
      set('meta[property="og:description"]', 'property', 'og:description', DESC),
    ];
    return () => undo.forEach(fn => fn());
  }, []);
}

const catLabel = (id: string) => GLOSSARY_CATEGORIES.find(c => c.id === id)?.label ?? id;
const formatReviewed = (d: string) => { const t = new Date(`${d}T00:00:00`); return isNaN(t.getTime()) ? d : t.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); };

function TermDetail({ term, onRelated }: { term: GlossaryTerm; onRelated: (id: string) => void }) {
  const sources = term.sourceIds.map(id => GLOSSARY_SOURCES.find(s => s.id === id)).filter((s): s is NonNullable<typeof s> => !!s);
  const lesson = LEARNING_STEPS.find(s => s.id === term.lessonId);
  const sharedAlias = GLOSSARY_TERMS.filter(t => t.id !== term.id && t.aliases.some(a => term.aliases.some(b => normalizeGlossaryQuery(a) === normalizeGlossaryQuery(b))));
  return (
    <article aria-labelledby="judul-istilah" data-testid={`detail-term-${term.id}`} className="rise min-w-0 rounded-2xl border border-primary/40 bg-card p-5 sm:p-7">
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
        <span className="rounded-md bg-primary/15 px-2 py-0.5 text-primary">{catLabel(term.category)}</span>
        <span className="text-muted-foreground">Ringkasan edukatif</span>
      </div>
      <h2 id="judul-istilah" tabIndex={-1} className="mt-3 break-words text-2xl font-extrabold text-white outline-none sm:text-3xl" data-testid="text-term-title">{term.term}</h2>
      {term.aliases.length > 0 && <p className="mt-2 flex flex-wrap gap-1.5" data-testid="text-term-aliases">
        <span className="sr-only">Sebutan lain:</span>
        {term.aliases.map(a => <span key={a} className="num rounded-md border border-input px-2 py-0.5 text-xs text-foreground/90">{a}</span>)}
      </p>}

      {sharedAlias.length > 0 && <div className="mt-4 rounded-xl border border-[hsl(var(--warn)/.45)] bg-[hsl(var(--warn)/.08)] p-3 text-sm" data-testid="text-term-disambiguation">
        <p className="flex items-center gap-2 font-semibold text-white"><Split className="h-4 w-4 text-[hsl(var(--warn))]" />Singkatan yang sama dipakai untuk istilah lain</p>
        <div className="mt-2 flex flex-wrap gap-2">{sharedAlias.map(t => <button key={t.id} type="button" onClick={() => onRelated(t.id)} data-testid={`button-disambiguation-${t.id}`}
          className="press rounded-lg border border-[hsl(var(--warn)/.5)] px-3 py-1.5 text-sm font-semibold text-[hsl(var(--warn))] hover:bg-[hsl(var(--warn)/.12)]">Lihat {t.term}</button>)}</div>
      </div>}

      <section className="mt-5"><h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Penjelasan sederhana</h3>
        <p className="mt-1.5 text-[15px] leading-relaxed text-foreground" data-testid="text-term-description">{term.description}</p></section>
      <section className="mt-4"><h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Contoh</h3>
        <p className="mt-1.5 border-l-2 border-primary/60 pl-3 text-[15px] leading-relaxed text-foreground/90" data-testid="text-term-example">{term.example}</p></section>
      <section className="mt-4 rounded-xl border border-[hsl(var(--warn)/.4)] bg-[hsl(var(--warn)/.07)] p-3">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--warn))]"><ShieldAlert className="h-3.5 w-3.5" />Hati-hati</h3>
        <p className="mt-1.5 text-[15px] leading-relaxed text-foreground" data-testid="text-term-caution">{term.caution}</p></section>

      {term.relatedIds.length > 0 && <section className="mt-5"><h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Istilah terkait</h3>
        <div className="mt-2 flex flex-wrap gap-2">{term.relatedIds.map(id => { const r = glossaryTerm(id); return r ? <button key={id} type="button" onClick={() => onRelated(id)} data-testid={`button-related-${id}`}
          className="press max-w-full break-words rounded-lg border border-input bg-background/60 px-3 py-1.5 text-left text-sm font-semibold text-white hover:border-primary">{r.term}{r.aliases[0] ? <span className="ml-1 font-normal text-muted-foreground">({r.aliases[0]})</span> : null}</button> : null; })}</div></section>}

      <section className="mt-6 border-t border-border pt-5"><h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Sumber rujukan yang ditinjau</h3>
        <ul className="mt-2 space-y-3">{sources.map(s => <li key={s.id} className="rounded-xl border border-border bg-background/50 p-3.5 text-sm" data-testid={`source-${term.id}-${s.id}`}>
          <a href={s.url} target="_blank" rel="noopener noreferrer" data-testid={`link-source-${s.id}`} className="inline-flex max-w-full items-start gap-1.5 break-words font-semibold text-white underline decoration-primary underline-offset-4 hover:text-primary">
            <span className="min-w-0 break-words">{s.title}</span><ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span className="sr-only">(membuka tab baru)</span></a>
          <dl className="mt-2 grid gap-1.5 text-foreground/85 sm:grid-cols-[110px_1fr]">
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jenis</dt><dd>{s.kind}</dd>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bagian</dt><dd className="break-words">{s.locator}</dd>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Batasan</dt><dd className="break-words">{s.limitation}</dd>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ditinjau</dt><dd className="num text-xs">{formatReviewed(s.reviewedAt)}</dd>
          </dl></li>)}</ul>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Peninjauan sumber bukan konfirmasi hukum dan tidak menjamin versi terbaru. Ringkasan ini bukan kutipan resmi atau saran untuk kasus Anda.</p></section>

      <div className="mt-5 flex flex-wrap gap-2">
        {lesson && <Link href={`/belajar#tahap-${lesson.id}`} data-testid={`link-term-lesson-${term.id}`}
          className="press inline-flex max-w-full items-center gap-1.5 rounded-xl border border-input bg-background/60 px-3.5 py-2 text-sm font-semibold text-white hover:border-primary">
          <GraduationCap className="h-4 w-4 shrink-0 text-accent" /><span className="min-w-0 break-words">Tahap belajar: {lesson.title}</span></Link>}
        <Link href={glossaryQuestionHref(term)} data-testid={`link-term-ask-${term.id}`}
          className="press inline-flex items-center gap-1.5 rounded-xl border border-primary/50 bg-primary/10 px-3.5 py-2 text-sm font-semibold text-primary hover:bg-primary/20">
          <MessagesSquare className="h-4 w-4" />Siapkan pertanyaan AI</Link>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Pertanyaan hanya diisikan ke Konsultasi sebagai draf. Tinjau, ubah, lalu kirim sendiri.</p>
    </article>
  );
}

export default function Glosarium() {
  usePageTitle('Glosarium pajak UMKM');
  useMeta();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('semua');
  const [selected, setSelected] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef({ q, cat }); filtersRef.current = { q, cat };

  useEffect(() => {
    const id = new URLSearchParams(search).get('istilah');
    if (!id) { setInvalid(null); setSelected(null); return; }
    const t = glossaryTerm(id);
    if (!t) { setInvalid(id.slice(0, 80)); setSelected(null); return; }
    setInvalid(null); setSelected(t.id);
    const { q: cq, cat: cc } = filtersRef.current;
    if (!filterGlossary(cq, cc).some(x => x.id === t.id)) { setQ(''); setCat('semua'); }
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      document.getElementById('judul-istilah')?.focus({ preventScroll: true });
    });
  }, [search]);

  const list = useMemo(() => filterGlossary(q, cat), [q, cat]);
  const countFor = (c: string) => filterGlossary(q, c).length;
  const needle = normalizeGlossaryQuery(q);
  // An acronym can have several meanings even when the active category hides one.
  const meanings = needle ? filterGlossary(q).filter(t => t.aliases.some(a => normalizeGlossaryQuery(a) === needle)) : [];
  const current = selected && list.some(t => t.id === selected) ? glossaryTerm(selected) : null;
  const open = (id: string) => {
    if (!filterGlossary(q, cat).some(t => t.id === id)) { setQ(''); setCat('semua'); }
    setLocation(glossaryTermHref(id));
    // Reopening the current URL does not trigger the query-change effect.
    if (selected === id) requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      document.getElementById('judul-istilah')?.focus({ preventScroll: true });
    });
  };
  const reset = () => { setQ(''); setCat('semua'); };
  const resetAll = () => { reset(); setLocation('/glosarium'); };
  const backToList = () => {
    setLocation('/glosarium');
    requestAnimationFrame(() => {
      document.getElementById('daftar-istilah')?.scrollIntoView({ block: 'start' });
      document.querySelector<HTMLButtonElement>('#daftar-istilah button')?.focus({ preventScroll: true });
    });
  };

  return (
    <>
      <PageHeader eyebrow="Glosarium" title="Kamus istilah pajak UMKM"
        desc="Penjelasan sederhana, contoh, dan catatan kehati-hatian untuk istilah yang sering muncul. Setiap entri menunjukkan sumber rujukan beserta batasannya." />
      <div className="grid gap-3 md:grid-cols-2">
        <Notice icon={HardDrive}>Fakta aplikasi: catatan di Sahabat Pajak tersimpan lokal dan tidak diverifikasi ke DJP. Glosarium tidak menghitung pajak atau menentukan kewajiban Anda.</Notice>
        <Notice tone="warn" icon={ShieldAlert}>Definisi adalah ringkasan edukatif dari sumber eksternal, bukan kutipan hukum resmi atau konsolidasi peraturan terkini.</Notice>
      </div>

      <div className="rise sticky top-14 z-20 -mx-4 mt-6 space-y-3 bg-background/85 px-4 py-3 backdrop-blur md:top-0 sm:mx-0 sm:px-0">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={q} maxLength={120} onChange={e => setQ(e.target.value.slice(0, 120))} aria-label="Cari istilah atau singkatan"
            placeholder="Cari: PKP, PTKP, NTPN, BPE, omzet" className="h-12 rounded-xl border-input bg-card pl-11 pr-11 text-[15px]" data-testid="input-search-glossary" />
          {q && <button type="button" onClick={() => setQ('')} aria-label="Hapus pencarian" data-testid="button-clear-search"
            className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:text-white"><X className="h-4 w-4" /></button>}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Kategori istilah">
          {[{ id: 'semua', label: 'Semua' }, ...GLOSSARY_CATEGORIES].map(c => (
            <button key={c.id} type="button" aria-pressed={cat === c.id} onClick={() => setCat(c.id)} data-testid={`chip-glossary-category-${c.id}`}
              className={`press whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium ${cat === c.id ? 'border-primary bg-primary text-primary-foreground' : 'border-input text-foreground/85 hover:border-primary/60 hover:text-white'}`}>
              {c.label}<span className="num ml-1.5 text-xs opacity-80">{countFor(c.id)}</span></button>))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p role="status" aria-live="polite" className="text-muted-foreground" data-testid="text-glossary-count">
            <span className="num font-semibold text-white">{list.length}</span> dari {GLOSSARY_TERMS.length} istilah{cat !== 'semua' ? ` · ${catLabel(cat)}` : ''}</p>
          {(q || cat !== 'semua') && <button type="button" onClick={reset} data-testid="button-clear-filters" className="font-semibold text-accent underline underline-offset-4">Hapus filter</button>}
        </div>
      </div>

      {invalid && <div role="alert" className="mb-5 flex flex-col gap-3 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-white sm:flex-row sm:items-center" data-testid="text-invalid-term">
        <TriangleAlert className="h-4 w-4 shrink-0 text-destructive" />
        <span className="min-w-0 flex-1 break-words">Istilah "<span className="num">{invalid}</span>" tidak ada di glosarium. Tautan mungkin salah atau sudah berubah.</span>
        <Button size="sm" variant="outline" className="border-input" onClick={resetAll} data-testid="button-invalid-reset">Lihat semua istilah</Button>
      </div>}

      {meanings.length > 1 && <div className="mb-5 rounded-xl border border-[hsl(var(--warn)/.45)] bg-[hsl(var(--warn)/.08)] p-4" data-testid="panel-disambiguation">
        <p className="flex items-center gap-2 font-semibold text-white"><Split className="h-4 w-4 text-[hsl(var(--warn))]" />"{q.trim()}" punya {meanings.length} arti. Pilih sesuai konteks bacaan Anda.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">{meanings.map(t => <button key={t.id} type="button" onClick={() => open(t.id)} data-testid={`button-meaning-${t.id}`}
          className="press rounded-lg border border-input bg-background/60 p-3 text-left hover:border-primary">
          <span className="block font-semibold text-white">{t.term}</span><span className="text-xs text-muted-foreground">{catLabel(t.category)}</span></button>)}</div>
      </div>}

      {list.length === 0 ? (
        <EmptyState icon={Search} title="Istilah tidak ditemukan" desc={`Tidak ada istilah yang cocok dengan "${q.trim()}"${cat !== 'semua' ? ` di kategori ${catLabel(cat)}` : ''}. Coba singkatan lain atau buka seluruh katalog.`}
          action={<Button variant="outline" className="border-input" onClick={reset} data-testid="button-no-results-reset">Tampilkan semua istilah</Button>} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <ul id="daftar-istilah" className="order-2 scroll-mt-64 space-y-2 lg:order-1 lg:scroll-mt-44" aria-label="Daftar istilah">
            {list.map(t => { const active = t.id === selected; return <li key={t.id}>
              <button type="button" onClick={() => open(t.id)} aria-current={active ? 'true' : undefined} aria-controls="detail-istilah" data-testid={`card-term-${t.id}`}
                className={`press lift w-full rounded-xl border p-4 text-left ${active ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}>
                <span className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="break-words font-semibold text-white">{t.term}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">{catLabel(t.category)}</span></span>
                {t.aliases.length > 0 && <span className="num mt-1 block break-words text-xs text-muted-foreground">{t.aliases.join(' · ')}</span>}
                <span className="mt-1.5 line-clamp-2 block text-sm text-foreground/80">{t.description}</span>
              </button></li>; })}
          </ul>
          <div id="detail-istilah" ref={detailRef} className="order-1 scroll-mt-64 lg:order-2 lg:sticky lg:top-44 lg:scroll-mt-44 lg:self-start">
            {current && <button type="button" onClick={backToList} data-testid="button-back-glossary-list"
              className="mb-3 text-sm font-semibold text-accent underline underline-offset-4 lg:hidden">Kembali ke daftar istilah</button>}
            {current ? <TermDetail term={current} onRelated={open} /> : (
              <div className="rise rounded-2xl border border-dashed border-input bg-card/50 p-6" data-testid="panel-glossary-intro">
                <BookText className="h-6 w-6 text-primary" />
                <h2 className="mt-3 text-xl font-bold text-white">Pilih istilah untuk dibaca</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Setiap entri berisi penjelasan, contoh, hal yang perlu diwaspadai, istilah terkait, sumber rujukan, dan tahap belajar yang relevan. Mulai dari istilah yang sering tertukar:</p>
                <div className="mt-4 flex flex-wrap gap-2">{['pengusaha-kena-pajak', 'penghasilan-kena-pajak', 'ntpn', 'bpe', 'omzet'].map(id => { const t = glossaryTerm(id); return t ? <button key={id} type="button" onClick={() => open(id)} data-testid={`button-start-${id}`}
                  className="press rounded-lg border border-input px-3 py-1.5 text-sm font-semibold text-white hover:border-primary">{t.term}</button> : null; })}</div>
                <Link href="/pustaka" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent underline underline-offset-4" data-testid="link-glossary-library"><Library className="h-4 w-4" />Buka Pustaka sumber resmi</Link>
              </div>)}
          </div>
        </div>
      )}
    </>
  );
}
