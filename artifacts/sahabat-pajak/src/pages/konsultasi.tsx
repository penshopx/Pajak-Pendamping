import { useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowUpRight, Eraser, LockKeyhole, RefreshCw, Sparkles, TriangleAlert } from 'lucide-react';
import { useSearch } from 'wouter';
import { useConsultTax } from '@workspace/api-client-react';
import { uid, useStore, type ChatMessage } from '@/lib/store';
import { formatDate, usePageTitle } from '@/lib/format';
import { Notice, PageHeader } from '@/components/shell';
import { Confirm } from '@/components/confirm';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sp2dkReadiness } from '@/components/sp2dk-readiness';

const SUGGESTED = [
  'Apa itu PPh Final 0,5% untuk UMKM dan siapa yang bisa memakainya?',
  'Bagaimana cara membuat kode billing di Coretax?',
  'Apa bedanya NTPN dan kode billing?',
  'Kapan saya perlu melapor SPT Tahunan sebagai orang pribadi?',
  'Apa yang perlu disiapkan untuk mendaftar NPWP badan usaha?',
  'Apa perbedaan konsultan pajak berizin dan PJAP?',
  'Apa kewajiban dan larangan PJAP menurut halaman DJP?',
  'Saya punya NPWP tetapi belum pernah memakai DJP Online. Bagaimana aktivasi Coretax?',
  'Bagaimana cara memohon dan memeriksa status Kode Otorisasi DJP?',
  'Saya UMKM orang pribadi. Apa dokumen dan alur pelaporan SPT Tahunan, serta cara memperoleh BPE?',
  'Bagaimana alur SPT Tahunan badan melalui akun PIC, dan apa bedanya BPE dengan bukti bayar?',
];

const MIN = 5, MAX = 2000;

function Formatted({ text, sources, messageId }: { text: string; sources: ChatMessage['sources']; messageId: string }) {
  const renderInline = (text: string) => inline(text, sources, messageId);
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-foreground">
      {blocks.map((b, i) => {
        const lines = b.split('\n').filter(Boolean);
        if (lines.length && lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l))) {
          const ordered = /^\s*\d/.test(lines[0]);
          const items = lines.map((l, j) => <li key={j}>{renderInline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ''))}</li>);
          return ordered ? <ol key={i} className="list-decimal space-y-1 pl-5 marker:text-accent">{items}</ol> : <ul key={i} className="list-disc space-y-1 pl-5 marker:text-primary">{items}</ul>;
        }
        if (/^#{1,4}\s/.test(b)) return <h3 key={i} className="font-display text-lg font-bold text-white">{renderInline(b.replace(/^#+\s/, ''))}</h3>;
        return <p key={i} className="whitespace-pre-wrap">{renderInline(b)}</p>;
      })}
    </div>
  );
}
function inline(s: string, sources: ChatMessage['sources'], messageId: string) {
  return s.split(/(\*\*[^*]+\*\*|\[[a-zA-Z0-9_-]+\])/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-semibold text-white">{inline(part.slice(2, -2), sources, messageId)}</strong>;
    const index = sources?.findIndex(source => `[${source.id}]` === part) ?? -1;
    if (index >= 0) return <a key={i} href={`#source-${messageId}-${sources![index].id}`}
      className="rounded px-1 font-semibold text-accent underline underline-offset-4"
      aria-label={`Rujukan ${index + 1}: ${sources![index].title}`}>[{index + 1}]</a>;
    return <span key={i}>{part}</span>;
  });
}

export default function Konsultasi() {
  usePageTitle('Konsultasi');
  const { chat, addChat, clearChat } = useStore();
  const consult = useConsultTax();
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastQ, setLastQ] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const search = useSearch();
  const [prefilled, setPrefilled] = useState(false);
  const draftFromLink = new URLSearchParams(search).get('pertanyaan');
  // Prefill only (never send) when a new ?pertanyaan= value is navigated to; user edits are kept otherwise.
  useEffect(() => {
    setPrefilled(false);
    if (!draftFromLink || !draftFromLink.trim()) return;
    setQ(draftFromLink.slice(0, MAX));
    setPrefilled(true);
    taRef.current?.focus();
  }, [draftFromLink]);

  useEffect(() => {
    if (chat.length || consult.isPending || error) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chat.length, consult.isPending, error]);

  const trimmed = q.trim();
  const valid = trimmed.length >= MIN && trimmed.length <= MAX;

  const send = async (question: string, appendUser = true) => {
    if (consult.isPending) return;
    setPrefilled(false);
    setError(null);
    const history = chat.slice(-8).map((m) => ({ role: m.role, content: m.content.slice(0, 6000) }));
    if (appendUser) addChat({ id: uid(), role: 'user', content: question, createdAt: new Date().toISOString() });
    setLastQ(question);
    setQ('');
    try {
      const res = await consult.mutateAsync({ data: { question, history: history.length ? history : undefined } });
      const msg: ChatMessage = {
        id: uid(), role: 'assistant', content: res.answer, createdAt: new Date().toISOString(),
        disclaimer: res.disclaimer, checkedAt: res.checkedAt,
        sources: res.sources.map((s) => ({ id: s.id, title: s.title, url: s.url, publisher: s.publisher, category: s.category, checkedAt: s.checkedAt,
          sourceType: s.sourceType, locator: s.locator, version: s.version, verification: s.verification, limitations: s.limitations, excerpt: s.excerpt })),
      };
      addChat(msg);
      setLastQ(null);
    } catch {
      setError('Layanan konsultasi sedang tidak bisa dihubungi. Pertanyaan Anda tetap tersimpan di atas.');
    }
  };

  const submit = () => { if (valid) void send(trimmed); };

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col">
      <PageHeader eyebrow="Konsultasi" title="Tanya soal pajak"
        desc="Jawaban disusun dari sumber resmi yang terdaftar di pustaka. Bersifat edukasi, bukan nasihat hukum. Verifikasi ke DJP atau KPP untuk keputusan penting."
        actions={chat.length > 0 ? <Confirm title="Hapus riwayat percakapan?" desc="Riwayat di peramban ini akan dihapus." confirmLabel="Hapus riwayat" onConfirm={clearChat}
          trigger={<Button variant="outline" className="press border-input" data-testid="button-clear-chat"><Eraser className="h-4 w-4 mr-1.5" />Hapus riwayat</Button>} /> : undefined} />

      <div className="mb-5"><Notice tone="warn" icon={LockKeyhole}>Pertanyaan dikirim ke layanan AI untuk diproses. Jangan kirim NPWP, NIK, kata sandi, OTP, atau data rahasia lain.</Notice></div>
      <Sp2dkReadiness />

      <div className="flex-1 space-y-5" aria-live="polite">
        {chat.length === 0 && !consult.isPending && (
          <div className="rise rounded-2xl border border-border bg-card p-5 sm:p-7">
            <div className="flex items-center gap-2 text-sm font-semibold text-accent"><Sparkles className="h-4 w-4" />Mulai dari pertanyaan berikut</div>
            <div className="mt-4 flex flex-col gap-2">
              {SUGGESTED.map((s, i) => (
                <button key={s} onClick={() => { setQ(s); setPrefilled(false); taRef.current?.focus(); }} data-testid={`button-suggest-${i}`}
                  className="lift press group flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 px-4 py-3 text-left text-[15px] text-foreground">
                  {s}<ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Memilih saran hanya mengisi kolom. Tekan Kirim untuk bertanya.</p>
          </div>
        )}

        {chat.map((m) => m.role === 'user' ? (
          <div key={m.id} className="rise flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-[15px] leading-relaxed text-primary-foreground font-medium whitespace-pre-wrap" data-testid={`msg-user-${m.id}`}>{m.content}</div>
          </div>
        ) : (
          <article key={m.id} className="rise max-w-3xl rounded-2xl rounded-bl-md border border-border bg-card p-5" data-testid={`msg-assistant-${m.id}`}>
            <Formatted text={m.content} sources={m.sources} messageId={m.id} />
            {m.sources && m.sources.length > 0 && (
              <div className="mt-5 border-t border-border pt-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">Sumber rujukan</div>
                <ol className="grid gap-2 sm:grid-cols-2">
                  {m.sources.map((s, i) => (
                    <li key={s.id + i} id={`source-${m.id}-${s.id}`} className="scroll-mt-24 min-w-0">
                      <a href={s.url} target="_blank" rel="noopener noreferrer" data-testid={`link-source-${s.id}`}
                        className="lift group flex h-full gap-3 rounded-lg border border-border bg-background/60 p-3">
                        <span className="num grid h-6 w-6 shrink-0 place-items-center rounded bg-primary/20 text-xs font-bold text-accent">{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold leading-snug text-white group-hover:underline underline-offset-4">{s.title}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">{s.publisher} · kurasi {formatDate(s.checkedAt)}</span>
                          <span className="mt-1 block text-xs text-accent">{s.sourceType ?? s.category}{s.verification === 'directory' ? ' · hanya direktori' : s.verification === 'metadata' ? ' · hanya metadata' : ''}</span>
                          {s.locator && <span className="mt-1 block text-xs leading-relaxed text-foreground">{s.locator}</span>}
                          {s.version && <span className="mt-1 block text-xs text-muted-foreground">Versi: {s.version}</span>}
                        </span>
                      </a>
                      {(s.excerpt || s.limitations) && <details className="mt-1 rounded-lg border border-border p-3 text-xs leading-relaxed text-muted-foreground">
                        <summary className="cursor-pointer font-semibold text-accent">Lihat cuplikan dan batas sumber</summary>
                        {s.excerpt && <p className="mt-2 whitespace-pre-wrap text-foreground">{s.excerpt}</p>}
                        {s.limitations && <p className="mt-2">{s.limitations}</p>}
                      </details>}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {m.disclaimer && <p className="mt-4 rounded-lg bg-muted/60 px-3 py-2 text-xs leading-relaxed text-foreground/80">{m.disclaimer}</p>}
            {m.checkedAt && <p className="mt-2 text-[11px] text-muted-foreground">Tanggal kurasi rujukan {formatDate(m.checkedAt)} — bukan status kesiapan saat ini.</p>}
          </article>
        ))}

        {consult.isPending && (
          <div className="max-w-3xl rounded-2xl border border-primary/40 bg-card p-5" role="status" data-testid="status-thinking">
            <div className="flex items-center gap-2 text-sm text-accent">
              <span className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${i * 120}ms` }} />)}</span>
              Membaca sumber resmi dan menyusun jawaban
            </div>
            <div className="mt-4 space-y-2">{[92, 78, 85].map((w) => <div key={w} className="h-3 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />)}</div>
          </div>
        )}

        {error && (
          <div className="flex max-w-3xl flex-col gap-3 rounded-2xl border border-destructive/50 bg-destructive/10 p-4 sm:flex-row sm:items-center" role="alert">
            <TriangleAlert className="h-5 w-5 shrink-0 text-destructive" />
            <p className="flex-1 text-sm">{error}</p>
            {lastQ && <Button size="sm" variant="outline" className="press border-input" onClick={() => void send(lastQ, false)} data-testid="button-retry-consult"><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Coba lagi</Button>}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {prefilled && <p className="mt-6 rounded-xl border border-primary/40 bg-primary/[.07] px-4 py-3 text-sm leading-relaxed text-foreground/90" role="note" data-testid="text-prefill-notice">
        Draf pertanyaan sudah diisikan di kolom bawah dan <b className="text-white">belum dikirim</b>. Tinjau dan ubah bila perlu, pastikan tidak ada data rahasia, lalu tekan Kirim.
      </p>}

      <form className="sticky bottom-20 md:bottom-4 mt-6 rounded-2xl border border-input bg-popover/95 p-2 backdrop-blur focus-within:border-primary transition-colors"
        onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <label htmlFor="q" className="sr-only">Pertanyaan pajak</label>
        <Textarea id="q" ref={taRef} value={q} rows={2} maxLength={MAX} data-testid="input-question"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder="Tulis pertanyaan Anda. Enter untuk kirim, Shift+Enter untuk baris baru."
          className="resize-none border-0 bg-transparent text-[15px] focus-visible:ring-0 focus-visible:ring-offset-0" />
        <div className="flex items-center justify-between px-2 pb-1">
          <span className={`num text-xs ${trimmed.length > 0 && !valid ? 'text-destructive' : 'text-muted-foreground'}`}>
            {trimmed.length > 0 && trimmed.length < MIN ? `Minimal ${MIN} karakter · ` : ''}{q.length}/{MAX}
          </span>
          <Button type="submit" disabled={!valid || consult.isPending} className="press rounded-xl font-semibold" data-testid="button-send">
            Kirim<ArrowUp className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
