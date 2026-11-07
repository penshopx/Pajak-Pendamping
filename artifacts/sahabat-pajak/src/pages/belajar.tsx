import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, BookOpen, BookText, Check, CheckCircle2, Circle, Clock, HardDrive, Library, MessagesSquare, RotateCcw, ShieldAlert, TriangleAlert, Undo2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { usePageTitle } from '@/lib/format';
import { LEARNING_STEPS, learningQuestionHref, learningSummary, type LearningStep } from '@/lib/learning-path';
import { Notice, PageHeader } from '@/components/shell';
import { Confirm } from '@/components/confirm';
import { Button } from '@/components/ui/button';
import { LearningQuiz } from '@/components/learning-quiz';

const DESC = 'Peta belajar pajak UMKM: enam tahap mandiri untuk memahami apa yang perlu diperiksa dan dipraktikkan. Progres hanya catatan belajar, bukan pemenuhan kewajiban pajak.';

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
      set('meta[property="og:title"]', 'property', 'og:title', 'Peta belajar pajak UMKM · Sahabat Pajak'),
      set('meta[property="og:description"]', 'property', 'og:description', DESC),
    ];
    return () => undo.forEach(fn => fn());
  }, []);
}

function List({ title, items, tone, testid }: { title: string; items: string[]; tone: string; testid: string }) {
  return (
    <div data-testid={testid}>
      <h4 className={`mb-2 text-xs font-semibold uppercase tracking-[0.16em] ${tone}`}>{title}</h4>
      <ul className="space-y-2">
        {items.map((t, i) => <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-foreground/90">
          <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />{t}</li>)}
      </ul>
    </div>
  );
}

function StepCard({ step, index, done, onToggle, error }: { step: LearningStep; index: number; done: boolean; onToggle: () => void; error: string | null }) {
  const actions = step.actions.filter(a => a.href !== step.library.href);
  return (
    <article id={`tahap-${step.id}`} aria-labelledby={`judul-${step.id}`} data-testid={`card-step-${step.id}`}
      className={`rise scroll-mt-24 rounded-2xl border bg-card p-5 sm:p-7 ${done ? 'border-[hsl(var(--success)/.45)]' : 'border-border'}`}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <span className={`num grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold ${done ? 'bg-[hsl(var(--success)/.15)] text-[hsl(var(--success))]' : 'bg-primary/15 text-primary'}`}>
            {done ? <Check className="h-5 w-5" aria-hidden="true" /> : String(index + 1).padStart(2, '0')}
          </span>
          <div>
            <h3 id={`judul-${step.id}`} className="text-xl font-bold leading-snug text-white sm:text-2xl">{step.title}</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Perkiraan {step.duration} (panduan saja)</span>
              <span data-testid={`status-step-${step.id}`} className={done ? 'font-semibold text-[hsl(var(--success))]' : ''}>{done ? 'Ditandai selesai dipelajari' : 'Belum ditandai'}</span>
            </div>
          </div>
        </div>
        <Button variant={done ? 'outline' : 'default'} onClick={onToggle} aria-pressed={done} data-testid={`button-toggle-step-${step.id}`}
          className={`press shrink-0 rounded-xl font-semibold ${done ? 'border-input' : ''}`}>
          {done ? <><Undo2 className="mr-1.5 h-4 w-4" />Batalkan tanda</> : <><CheckCircle2 className="mr-1.5 h-4 w-4" />Tandai selesai dipelajari</>}
        </Button>
      </header>
      {error && <p role="alert" className="mt-3 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-white" data-testid={`text-step-error-${step.id}`}>{error}</p>}
      <p className="mt-4 max-w-3xl text-[15px] font-medium leading-relaxed text-accent">{step.purpose}</p>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <List title="Poin penting" items={step.takeaways} tone="text-primary" testid={`list-takeaways-${step.id}`} />
        <div className="space-y-6">
          <List title="Latihan" items={step.practice} tone="text-accent" testid={`list-practice-${step.id}`} />
          <List title="Periksa diri" items={step.selfCheck} tone="text-[hsl(var(--success))]" testid={`list-selfcheck-${step.id}`} />
        </div>
      </div>
      <LearningQuiz stepId={step.id} />
      <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
        {actions.map((a, i) => <Link key={a.href} href={a.href} data-testid={`link-step-action-${step.id}-${i}`}
          className="press inline-flex items-center gap-1.5 rounded-xl border border-input bg-background/60 px-3.5 py-2 text-sm font-semibold text-white hover:border-primary">
          {a.label}<ArrowRight className="h-4 w-4 text-primary" /></Link>)}
        <Link href={step.library.href} data-testid={`link-step-library-${step.id}`}
          className="press inline-flex items-center gap-1.5 rounded-xl border border-input bg-background/60 px-3.5 py-2 text-sm font-semibold text-white hover:border-primary">
          <Library className="h-4 w-4 text-accent" />{step.library.label}</Link>
        <Link href={learningQuestionHref(step)} data-testid={`link-step-ask-${step.id}`}
          className="press inline-flex items-center gap-1.5 rounded-xl border border-primary/50 bg-primary/10 px-3.5 py-2 text-sm font-semibold text-primary hover:bg-primary/20">
          <MessagesSquare className="h-4 w-4" />Siapkan pertanyaan AI</Link>
      </div>
      <details className="mt-3 text-sm text-muted-foreground">
        <summary className="cursor-pointer font-semibold text-accent" data-testid={`toggle-question-${step.id}`}>Lihat pertanyaan yang akan diisikan</summary>
        <p className="mt-2 rounded-lg border border-border bg-background/60 p-3 leading-relaxed text-foreground/90">{step.question}</p>
        <p className="mt-1.5 text-xs">Pertanyaan hanya diisikan ke kolom Konsultasi. Tinjau dan ubah bila perlu, lalu tekan Kirim sendiri.</p>
      </details>
    </article>
  );
}

export default function Belajar() {
  usePageTitle('Peta belajar pajak UMKM');
  useMeta();
  const { learningCompleted, setLearningComplete, resetLearningProgress } = useStore();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetError, setResetError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const { done, total, percent, next } = learningSummary(learningCompleted);
  useEffect(() => {
    const stage = LEARNING_STEPS.find(s => window.location.hash === `#tahap-${s.id}`);
    if (!stage) return;
    const raf = requestAnimationFrame(() => document.getElementById(`tahap-${stage.id}`)?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(raf);
  }, []);

  const toggle = (step: LearningStep) => {
    const target = !learningCompleted.includes(step.id);
    try {
      setLearningComplete(step.id, target);
      setErrors(e => { const { [step.id]: _, ...rest } = e; return rest; });
      setStatus(`${step.title}: ${target ? 'ditandai selesai dipelajari' : 'tanda dibatalkan'}.`);
    } catch (err) {
      setErrors(e => ({ ...e, [step.id]: err instanceof Error ? err.message : 'Progres belajar gagal disimpan.' }));
    }
  };
  const reset = () => {
    try { resetLearningProgress(); setResetError(null); setErrors({}); setStatus('Progres belajar diatur ulang.'); }
    catch (err) { setResetError(err instanceof Error ? err.message : 'Progres belajar gagal diatur ulang.'); }
  };

  return (
    <>
      <PageHeader eyebrow="Belajar" title="Peta belajar pajak UMKM"
        desc="Enam tahap mandiri untuk mengenali apa yang perlu diperiksa dan dipraktikkan. Buka tahap mana pun sesuai kebutuhan; urutan hanya saran."
        actions={done > 0 ? <Confirm title="Atur ulang progres belajar?" confirmLabel="Atur ulang progres"
          desc="Hanya tanda selesai pada peta belajar yang dihapus. Profil, transaksi, tagihan, kewajiban, pembayaran, riwayat konsultasi, dan catatan persiapan SPT tidak berubah."
          onConfirm={reset}
          trigger={<Button variant="outline" className="press border-input" data-testid="button-reset-learning"><RotateCcw className="mr-1.5 h-4 w-4" />Atur ulang progres</Button>} /> : undefined} />

      <p className="sr-only" role="status" aria-live="polite" data-testid="status-learning-live">{status}</p>
      {resetError && <div role="alert" className="mb-4 flex gap-2 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-white" data-testid="text-reset-error"><TriangleAlert className="h-4 w-4 shrink-0 text-destructive" />{resetError}</div>}

      <section aria-labelledby="ringkasan-belajar" className="rise rounded-2xl border border-border bg-card p-5 sm:p-6" data-testid="section-learning-summary">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="ringkasan-belajar" className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Progres pribadi</h2>
            <p className="mt-1 text-3xl font-extrabold text-white"><span className="num" data-testid="text-learning-progress">{done}/{total}</span> <span className="text-base font-medium text-muted-foreground">tahap ditandai dipelajari</span></p>
            <div className="mt-3 flex gap-1.5" aria-hidden="true">
              {LEARNING_STEPS.map(s => <span key={s.id} className={`h-1.5 w-8 rounded-full sm:w-10 ${learningCompleted.includes(s.id) ? 'bg-[hsl(var(--success))]' : 'bg-muted'}`} />)}
            </div>
            <span className="sr-only">{percent} persen</span>
          </div>
          {next ? (
            <a href={`#tahap-${next.id}`} data-testid="link-learning-next"
              className="press group flex max-w-md items-center gap-3 rounded-xl border border-primary/50 bg-primary/10 px-4 py-3 hover:bg-primary/15">
              <BookOpen className="h-5 w-5 shrink-0 text-primary" />
              <span><span className="block text-xs font-semibold uppercase tracking-wider text-primary">Tahap berikutnya</span>
                <span className="block font-semibold text-white">{next.title}</span></span>
              <ArrowRight className="ml-auto h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5" />
            </a>
          ) : (
            <div className="max-w-md rounded-xl border border-[hsl(var(--success)/.45)] bg-[hsl(var(--success)/.08)] px-4 py-3 text-sm leading-relaxed" data-testid="text-learning-finished">
              <b className="text-white">Semua tahap telah Anda tandai.</b> Ini catatan belajar, bukan sertifikat atau bukti kepatuhan. Kewajiban tetap perlu diperiksa dan dilaksanakan melalui saluran resmi.
            </div>
          )}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Notice icon={HardDrive}>Progres hanya tersimpan di peramban ini dan ditandai sendiri oleh Anda. Membuka tautan atau bertanya ke AI tidak menandai tahap selesai.</Notice>
          <Notice tone="warn" icon={ShieldAlert}>Menyelesaikan pelajaran bukan pelaporan SPT, pembayaran, ataupun persetujuan DJP. Periksa ketentuan dan sumber resmi terkini.</Notice>
        </div>
      </section>

      <Link href="/glosarium" data-testid="link-learning-glossary"
        className="press mt-4 flex items-center gap-3 rounded-xl border border-input bg-card px-4 py-3 text-sm hover:border-primary">
        <BookText className="h-5 w-5 shrink-0 text-accent" />
        <span><b className="text-white">Istilah membingungkan?</b> <span className="text-foreground/85">Buka Glosarium untuk PKP, PTKP, NTPN, BPE, dan lainnya.</span></span>
      </Link>

      <nav aria-label="Daftar tahap" className="mt-6 flex gap-2 overflow-x-auto pb-1" data-testid="nav-learning-steps">
        {LEARNING_STEPS.map((s, i) => {
          const d = learningCompleted.includes(s.id);
          return <a key={s.id} href={`#tahap-${s.id}`} data-testid={`link-jump-step-${s.id}`}
            className="press inline-flex shrink-0 items-center gap-2 rounded-full border border-input px-3.5 py-1.5 text-sm font-medium text-foreground/90 hover:border-primary hover:text-white">
            {d ? <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" aria-label="selesai" /> : <Circle className="h-4 w-4 text-muted-foreground" aria-label="belum" />}
            <span className="num text-xs text-muted-foreground">{i + 1}</span>{s.title}</a>;
        })}
      </nav>

      <ol className="mt-6 space-y-5">
        {LEARNING_STEPS.map((s, i) => <li key={s.id}>
          <StepCard step={s} index={i} done={learningCompleted.includes(s.id)} onToggle={() => toggle(s)} error={errors[s.id] ?? null} />
        </li>)}
      </ol>
    </>
  );
}
