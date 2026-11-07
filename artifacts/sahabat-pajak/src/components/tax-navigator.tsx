import { useId, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { ArrowUpRight, Compass, MessagesSquare, ShieldAlert, X } from 'lucide-react';
import { findTaxActions, NAVIGATOR_EXAMPLES, MAX_NAVIGATOR_QUERY } from '@/lib/tax-navigator';
import '@/styles/tax-navigator.css';

export default function TaxNavigator() {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const result = useMemo(() => findTaxActions(query), [query]);
  const summary =
    result.status === 'idle' ? 'Belum ada kebutuhan. Tulis kebutuhan umum atau pilih contoh.'
    : result.status === 'too-long' ? `Teks melebihi ${MAX_NAVIGATOR_QUERY} karakter. Persingkat agar dapat dicocokkan.`
    : result.status === 'unmatched' ? 'Tidak ada fitur yang cocok dengan kata kunci tersebut.'
    : `${result.matches.length} fitur cocok: ${result.matches.map(match => match.action.title).join('; ')}.`;
  const clear = () => { setQuery(''); inputRef.current?.focus(); };

  return (
    <section className="tnav mt-8 rounded-2xl p-4 sm:p-6" aria-labelledby={`${id}-h`} data-testid="section-tax-navigator">
      <div className="flex items-start gap-3">
        <Compass className="mt-1 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Navigator kebutuhan</div>
          <h2 id={`${id}-h`} className="mt-1 text-xl font-bold text-white">Mau mengerjakan apa berikutnya?</h2>
          <p className="mt-1 text-sm leading-relaxed text-foreground/85">Tulis kebutuhan secara umum. Navigator mencocokkan kata kunci dengan fitur yang sudah ada di aplikasi ini. Ini bukan penetapan hukum, bukan penilaian kewajiban Anda, dan tidak menjamin sumber rujukan mencakup kasus Anda.</p>
        </div>
      </div>

      <form className="mt-4" role="search" onSubmit={e => e.preventDefault()}>
        <label htmlFor={`${id}-q`} className="text-sm font-semibold text-white">Kebutuhan umum</label>
        <div className="tnav-field mt-1.5">
          <input id={`${id}-q`} ref={inputRef} type="search" className="tnav-input" value={query}
            onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Escape' && query) { e.preventDefault(); clear(); } }}
            placeholder="mis. catat penjualan bulan ini" autoComplete="off" spellCheck={false}
            aria-describedby={`${id}-hint ${id}-count`} aria-invalid={result.status === 'too-long'} data-testid="input-navigator-query" />
          <button type="button" className="tnav-clear press" onClick={clear} disabled={!query}
            aria-label="Hapus pencarian dan hasil" data-testid="button-navigator-clear"><X className="h-4 w-4" aria-hidden="true" />Hapus</button>
        </div>
        <p id={`${id}-hint`} className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          Cukup kebutuhan umum. Jangan tulis NIK, NPWP, OTP, kata sandi, atau isi surat asli. Teks tidak disimpan atau dikirim; hilang saat halaman ditinggalkan.
        </p>
        <p id={`${id}-count`} className={`mt-0.5 text-xs ${result.status === 'too-long' ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
          <span className="num">{query.length}</span>/<span className="num">{MAX_NAVIGATOR_QUERY}</span> karakter
        </p>
      </form>

      <div className="mt-3" role="group" aria-label="Contoh kebutuhan">
        <div className="text-xs font-semibold text-foreground/85">Atau pilih contoh:</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {NAVIGATOR_EXAMPLES.map((ex, i) => (
            <button key={ex.label} type="button" className="tnav-chip press" aria-pressed={query === ex.query}
              onClick={() => setQuery(ex.query)} data-testid={`button-navigator-example-${i}`}>{ex.label}</button>
          ))}
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-testid="status-navigator-summary">{summary}</p>

      <div className="mt-5">
        {result.status === 'matched' && (
          <>
            <p className="text-sm font-semibold text-white" aria-hidden="true">{summary}</p>
            <ul className="tnav-results mt-3" data-testid="list-navigator-results">
              {result.matches.map(({ action, matchedTerms }) => (
                <li key={action.id} className="tnav-result rise" data-testid={`card-navigator-${action.id}`}>
                  <h3 className="text-base font-bold text-white">{action.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/90">{action.description}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground"><b className="text-accent">Mengapa muncul: </b>{action.reason}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Kata kunci cocok:</span>
                    {matchedTerms.map(t => <span key={t} className="tnav-term">{t}</span>)}
                  </div>
                  <Link href={action.href} className="mt-3 inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline" data-testid={`link-navigator-${action.id}`}>
                    Buka {action.title}<ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
        {result.status === 'unmatched' && (
          <div className="tnav-result" data-testid="state-navigator-unmatched">
            <h3 className="flex items-center gap-2 text-base font-bold text-white"><ShieldAlert className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />Belum ada fitur yang cocok</h3>
            <p className="mt-1 text-sm leading-relaxed text-foreground/90">Navigator hanya mengenali kata kunci tertentu, jadi tidak menebak. Teks Anda tetap di kolom agar bisa disunting. Coba kata lain, pilih salah satu contoh di atas, atau susun pertanyaan umum sendiri.</p>
            <Link href="/konsultasi" className="mt-3 inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline" data-testid="link-navigator-konsultasi-fallback">
              <MessagesSquare className="h-4 w-4 shrink-0" aria-hidden="true" />Buka konsultasi umum
            </Link>
          </div>
        )}
        {result.status === 'too-long' && (
          <p className="rounded-lg border border-destructive/60 bg-destructive/15 px-3 py-2 text-sm text-white" data-testid="text-navigator-too-long">
            Teks terlalu panjang. Persingkat menjadi maksimal <span className="num">{MAX_NAVIGATOR_QUERY}</span> karakter; hasil tidak ditampilkan.
          </p>
        )}
        {result.status === 'idle' && (
          <p className="text-sm text-muted-foreground" data-testid="text-navigator-idle">Hasil akan muncul di sini setelah Anda menulis kebutuhan atau memilih contoh.</p>
        )}
      </div>
    </section>
  );
}
