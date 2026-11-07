import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { ArrowUpRight, BookText, CircleCheck, Clock, Download, FileText, Library, MessagesSquare, RotateCcw, ShieldAlert, TriangleAlert } from 'lucide-react';
import { downloadFile, usePageTitle } from '@/lib/format';
import { SP2DK_AI_DRAFT_HREF, SP2DK_DRAFT_FIELDS, SP2DK_DRAFT_LIMIT, SP2DK_PRIVACY_NOTICE, SP2DK_SOURCES, SP2DK_STEPS, SP2DK_TIME_NOTES, buildSp2dkDraft, emptySp2dkDraft, type Sp2dkDraft } from '@/lib/sp2dk-guide';
import { Notice, PageHeader } from '@/components/shell';
import { Button } from '@/components/ui/button';
import { Sp2dkReadiness } from '@/components/sp2dk-readiness';

const DESC = 'Panduan edukatif menyiapkan fakta dan rujukan resmi sebelum menanggapi SP2DK: daftar periksa pribadi, kerangka netral yang dapat diunduh, dan batasan sumber. Tidak menghitung tenggat.';

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
      set('meta[property="og:title"]', 'property', 'og:title', 'Persiapan tanggapan SP2DK · Sahabat Pajak'),
      set('meta[property="og:description"]', 'property', 'og:description', DESC),
    ];
    return () => undo.forEach(fn => fn());
  }, []);
}

const fmt = (d: string) => { const t = new Date(`${d}T00:00:00`); return isNaN(t.getTime()) ? d : t.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); };
const srcTitle = (id: string) => SP2DK_SOURCES.find(s => s.id === id)?.title ?? id;

export default function Sp2dk() {
  usePageTitle('Persiapan tanggapan SP2DK');
  useMeta();
  const [draft, setDraft] = useState<Sp2dkDraft>(emptySp2dkDraft);
  const [checked, setChecked] = useState<string[]>([]);
  const [status, setStatus] = useState<{ tone: 'ok' | 'err'; msg: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!['sp2dk-waktu', 'sp2dk-langkah', 'sp2dk-kerangka', 'sp2dk-sumber'].includes(id)) return;
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, []);

  const built = useMemo(() => { try { return { text: buildSp2dkDraft(draft, checked), error: null as string | null }; } catch (e) { return { text: '', error: e instanceof Error ? e.message : 'Kerangka gagal disusun.' }; } }, [draft, checked]);
  const filled = SP2DK_DRAFT_FIELDS.filter(f => draft[f.id].trim()).length;
  const dirty = filled > 0 || checked.length > 0;
  const toggle = (id: string) => {
    setChecked(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);
    setStatus(null);
  };

  const download = () => {
    try {
      const text = buildSp2dkDraft(draft, checked);
      downloadFile('draf-persiapan-sp2dk.txt', text, 'text/plain;charset=utf-8');
      setStatus({ tone: 'ok', msg: 'Unduhan dimulai di peramban. Periksa folder unduhan; aplikasi tidak dapat memastikan file tersimpan. Ini draf persiapan, bukan surat siap kirim.' });
    } catch (e) {
      setStatus({ tone: 'err', msg: `Kerangka tidak dapat diunduh. ${e instanceof Error ? e.message : ''} Salin pratinjau secara manual bila perlu.` });
    }
  };
  const doReset = () => { setDraft(emptySp2dkDraft()); setChecked([]); setStatus(null); setConfirmReset(false); };
  const askReset = () => dirty ? setConfirmReset(true) : doReset();

  return (
    <>
      <PageHeader eyebrow="SP2DK" title="Siapkan fakta sebelum berdiskusi"
        desc="Panduan edukatif untuk merapikan catatan dan rujukan resmi saat menerima Surat Permintaan Penjelasan atas Data dan/atau Keterangan. Halaman ini tidak menilai perkara, menghitung tenggat, atau mengirim apa pun." />

      <div className="grid gap-3 md:grid-cols-2">
        <Notice tone="warn" icon={ShieldAlert}><span data-testid="text-sp2dk-scope">Bukan nasihat untuk kasus Anda dan bukan penyelesaian perkara. Keputusan tetap pada DJP/KPP; minta bantuan konsultan berizin bila perlu.</span></Notice>
        <Notice icon={Clock}>Batas waktu tidak disederhanakan menjadi satu rumus. Baca catatan waktu di bawah dan konfirmasikan kepada KPP sesegera mungkin.</Notice>
      </div>

      <Sp2dkReadiness />
      <nav aria-label="Lompat ke bagian" className="mt-5 flex flex-wrap gap-2 text-sm">
        {[['#sp2dk-waktu', 'Catatan waktu'], ['#sp2dk-langkah', 'Langkah & centang'], ['#sp2dk-kerangka', 'Kerangka tanggapan'], ['#sp2dk-sumber', 'Sumber']].map(([h, l]) => (
          <a key={h} href={h} data-testid={`link-jump-${h.slice(7)}`} className="press rounded-full border border-input px-3.5 py-1.5 font-semibold text-foreground/90 hover:border-primary hover:text-white">{l}</a>))}
      </nav>

      <section id="sp2dk-waktu" aria-labelledby="h-waktu" className="rise mt-6 scroll-mt-20 rounded-2xl border border-[hsl(var(--warn)/.45)] bg-[hsl(var(--warn)/.06)] p-5 sm:p-6">
        <h2 id="h-waktu" className="flex items-center gap-2 text-xl font-bold text-white"><Clock className="h-5 w-5 text-[hsl(var(--warn))]" />Catatan waktu — bukan perhitungan tenggat</h2>
        <ol className="mt-4 space-y-3">{SP2DK_TIME_NOTES.map((n, i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-foreground" data-testid={`text-time-note-${i}`}>
            <span className="num mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[hsl(var(--warn)/.18)] text-xs font-bold text-[hsl(var(--warn))]">{i + 1}</span><span className="min-w-0 break-words">{n}</span></li>))}</ol>
        <p className="mt-3 text-xs text-muted-foreground">Sumber: {srcTitle('pmk111')}. Lihat batasan sumber di bagian Rujukan.</p>
      </section>

      <div role="note" className="mt-6 flex gap-3 rounded-xl border-2 border-primary/60 bg-primary/10 p-4 text-sm leading-relaxed text-white" data-testid="text-sp2dk-privacy">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><p><b className="block text-primary">Privasi sesi</b>{SP2DK_PRIVACY_NOTICE}</p>
      </div>

      <section id="sp2dk-langkah" aria-labelledby="h-langkah" className="mt-8 scroll-mt-20">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="h-langkah" className="text-2xl font-bold text-white">Enam langkah persiapan</h2>
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite" data-testid="text-sp2dk-progress">
            <span className="num font-semibold text-white">{checked.length}/{SP2DK_STEPS.length}</span> persiapan pribadi dicentang — bukan status kepatuhan</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div className="h-full origin-left rounded-full bg-primary transition-transform duration-500 motion-reduce:transition-none" style={{ transform: `scaleX(${checked.length / SP2DK_STEPS.length})` }} />
        </div>
        <ol className="mt-5 space-y-3">
          {SP2DK_STEPS.map((s, i) => { const on = checked.includes(s.id); return (
            <li key={s.id} className={`rounded-2xl border bg-card p-4 transition-colors sm:p-5 ${on ? 'border-primary/60' : 'border-border'}`} data-testid={`card-step-${s.id}`}>
              <div className="flex gap-3">
                <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-primary/40 bg-primary/10 text-sm font-bold text-primary">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-lg font-bold text-white">{s.title}</h3>
                  <p className="mt-1 flex flex-wrap gap-1.5">{s.sourceIds.map(id => <a key={id} href={`#sumber-${id}`} className="rounded-md bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent hover:underline" data-testid={`link-step-source-${s.id}-${id}`}>Rujukan: {srcTitle(id)}</a>)}</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-foreground/90">{s.description}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-foreground/85">{s.tasks.map(t => <li key={t} className="break-words">{t}</li>)}</ul>
                  <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-input bg-background/60 p-3 text-sm text-white focus-within:border-primary hover:border-primary/60">
                    <input type="checkbox" checked={on} onChange={() => toggle(s.id)} className="mt-0.5 h-5 w-5 shrink-0 accent-[hsl(var(--primary))]" data-testid={`checkbox-step-${s.id}`} />
                    <span className="min-w-0 break-words">{s.check}</span>
                  </label>
                </div>
              </div>
            </li>); })}
        </ol>
        {checked.length === SP2DK_STEPS.length && <p className="mt-3 flex gap-2 rounded-xl border border-[hsl(var(--success)/.45)] bg-[hsl(var(--success)/.08)] p-3 text-sm text-white" data-testid="text-sp2dk-all-checked">
          <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--success))]" />Semua centang persiapan pribadi terisi. Ini bukan tanda SP2DK selesai, tanggapan terkirim, atau pengawasan ditutup.</p>}
      </section>

      <section id="sp2dk-kerangka" aria-labelledby="h-kerangka" className="mt-10 scroll-mt-20">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 id="h-kerangka" className="text-2xl font-bold text-white">Kerangka tanggapan netral</h2>
            <p className="mt-1 text-sm text-muted-foreground">Gunakan label anonim. Kolom kosong tetap menjadi templat dengan penanda untuk dilengkapi sendiri.</p></div>
          <Button variant="outline" className="border-input" onClick={askReset} data-testid="button-sp2dk-reset"><RotateCcw className="mr-1.5 h-4 w-4" />Kosongkan halaman</Button>
        </div>
        {confirmReset && <div role="alertdialog" aria-label="Konfirmasi kosongkan" className="mt-3 flex flex-col gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-white sm:flex-row sm:items-center" data-testid="panel-sp2dk-reset-confirm">
          <span className="flex-1">Hapus semua isian dan centang di halaman ini? Data lain di aplikasi tidak berubah.</span>
          <div className="flex gap-2"><Button size="sm" variant="destructive" onClick={doReset} data-testid="button-sp2dk-reset-confirm">Ya, kosongkan</Button>
            <Button size="sm" variant="outline" className="border-input" onClick={() => setConfirmReset(false)} data-testid="button-sp2dk-reset-cancel">Batal</Button></div>
        </div>}

        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            {SP2DK_DRAFT_FIELDS.map(f => { const len = draft[f.id].length; return (
              <div key={f.id}>
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor={`sp2dk-${f.id}`} className="text-sm font-semibold text-white">{f.label}</label>
                  <span id={`sp2dk-${f.id}-count`} className={`num text-xs ${len >= SP2DK_DRAFT_LIMIT ? 'text-[hsl(var(--warn))]' : 'text-muted-foreground'}`} data-testid={`text-count-${f.id}`}>{len}/{SP2DK_DRAFT_LIMIT}</span>
                </div>
                <textarea id={`sp2dk-${f.id}`} value={draft[f.id]} maxLength={SP2DK_DRAFT_LIMIT} rows={4} placeholder={f.placeholder} aria-describedby={`sp2dk-${f.id}-count`}
                  onChange={e => { const v = e.target.value.slice(0, SP2DK_DRAFT_LIMIT); setDraft(d => ({ ...d, [f.id]: v })); setStatus(null); }}
                  className="mt-1.5 w-full resize-y rounded-xl border border-input bg-card px-3.5 py-3 text-[15px] leading-relaxed text-white placeholder:text-muted-foreground/80 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid={`input-sp2dk-${f.id}`} />
              </div>); })}
          </div>
          <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-accent"><FileText className="h-4 w-4" />Pratinjau draf</h3>
              <span className="text-xs text-muted-foreground" data-testid="text-sp2dk-filled">{filled === 0 ? 'Templat kosong — bukan siap kirim' : `${filled}/${SP2DK_DRAFT_FIELDS.length} kolom terisi — tetap draf`}</span>
            </div>
            {built.error ? <p role="alert" className="mt-2 rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-white" data-testid="text-sp2dk-build-error">{built.error}</p> :
              <pre tabIndex={0} aria-label="Pratinjau kerangka" className="mt-2 max-h-[28rem] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-background/70 p-4 font-mono text-xs leading-relaxed text-foreground/90" data-testid="text-sp2dk-preview">{built.text}</pre>}
            <Button onClick={download} disabled={!!built.error} className="mt-3 w-full sm:w-auto" data-testid="button-sp2dk-download"><Download className="mr-1.5 h-4 w-4" />Unduh draf .txt</Button>
            {status && <p role={status.tone === 'err' ? 'alert' : 'status'} className={`mt-2 text-sm ${status.tone === 'err' ? 'text-destructive' : 'text-foreground/90'}`} data-testid="text-sp2dk-download-status">
              {status.tone === 'err' && <TriangleAlert className="mr-1 inline h-4 w-4" />}{status.msg}</p>}
            <p className="mt-2 text-xs text-muted-foreground">Nama file generik. Tidak ada pengiriman otomatis dari aplikasi.</p>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-3 sm:grid-cols-2">
        <Link href={SP2DK_AI_DRAFT_HREF} className="press flex gap-3 rounded-xl border border-primary/50 bg-primary/10 p-4 text-sm hover:bg-primary/15" data-testid="link-sp2dk-ai">
          <MessagesSquare className="h-5 w-5 shrink-0 text-primary" /><span><b className="block text-white">Siapkan pertanyaan umum ke Konsultasi</b><span className="text-foreground/85">Hanya pertanyaan generik yang diisikan sebagai draf; isian halaman ini tidak ikut. Tinjau lalu kirim sendiri.</span></span></Link>
        <div className="flex flex-col gap-2 rounded-xl border border-input bg-card p-4 text-sm">
          <Link href="/glosarium?istilah=bpe" className="inline-flex items-center gap-1.5 font-semibold text-accent underline underline-offset-4" data-testid="link-sp2dk-bpe"><BookText className="h-4 w-4" />BPE dalam konteks SPT (glosarium)</Link>
          <p className="text-xs leading-relaxed text-muted-foreground">Glosarium mencontohkan bukti pelaporan SPT. Untuk SP2DK, cocokkan bukti penerimaan dengan layanan tanggapan yang digunakan; jangan menyamakan bukti kedua layanan.</p>
          <Link href="/pustaka" className="inline-flex items-center gap-1.5 font-semibold text-accent underline underline-offset-4" data-testid="link-sp2dk-pustaka"><Library className="h-4 w-4" />Pustaka sumber resmi</Link>
          <Link href="/belajar" className="inline-flex items-center gap-1.5 font-semibold text-accent underline underline-offset-4" data-testid="link-sp2dk-belajar"><BookText className="h-4 w-4" />Peta belajar pajak UMKM</Link>
        </div>
      </section>

      <section id="sp2dk-sumber" aria-labelledby="h-sumber" className="mt-10 scroll-mt-20">
        <h2 id="h-sumber" className="text-2xl font-bold text-white">Rujukan dan batasannya</h2>
        <ul className="mt-4 space-y-3">{SP2DK_SOURCES.map(s => (
          <li key={s.id} id={`sumber-${s.id}`} className="scroll-mt-20 rounded-2xl border border-border bg-card p-4" data-testid={`source-sp2dk-${s.id}`}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-start gap-1.5 font-semibold text-white underline decoration-primary underline-offset-4 hover:text-primary" data-testid={`link-sp2dk-source-${s.id}`}>
              <span className="min-w-0 break-words">{s.title}</span><ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span className="sr-only">(membuka tab baru)</span></a>
            <details className="group mt-2 text-sm">
              <summary className="cursor-pointer font-semibold text-accent" data-testid={`toggle-sp2dk-source-${s.id}`}>Metadata dan batasan</summary>
              <dl className="mt-2 grid gap-1.5 text-foreground/85 sm:grid-cols-[110px_1fr]">
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jenis</dt><dd>{s.kind}</dd>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bagian</dt><dd className="break-words">{s.locator}</dd>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Batasan</dt><dd className="break-words">{s.limitation}</dd>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tanggal kurasi</dt><dd className="num text-xs">{fmt(s.reviewedAt)} — bukan persetujuan sumber untuk AI.</dd>
              </dl>
            </details>
            <p className="mt-2 text-xs text-[hsl(var(--warn))]">Batasan: {s.limitation}</p>
          </li>))}</ul>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Naskah peraturan bukan jaminan konsolidasi perubahan terbaru. Saran keamanan di halaman ini adalah panduan aplikasi, bukan kutipan DJP.</p>
      </section>
    </>
  );
}
