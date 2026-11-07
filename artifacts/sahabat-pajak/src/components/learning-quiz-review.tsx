import { Link } from 'wouter';
import { QUIZ_CONCEPTS, QUIZ_QUESTIONS, type QuizReview } from '@/lib/learning-quiz';

export function LearningQuizReview({ review }: { review: QuizReview }) {
  const confused = QUIZ_QUESTIONS.filter(question => review[question.id] === false);
  const hasChecked = QUIZ_QUESTIONS.some(question => review[question.id] !== undefined);
  return (
    <section aria-labelledby="ringkasan-latihan" className="mt-4 rounded-2xl border border-primary/35 bg-card p-5 sm:p-6" data-testid="section-quiz-review">
      <h2 id="ringkasan-latihan" className="text-lg font-bold text-white">Konsep untuk dipelajari ulang</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Ringkasan sementara dari jawaban terakhir yang diperiksa pada kunjungan ini, bukan nilai kelulusan atau bukti kepatuhan.
        Tidak disimpan atau dikirim sebagai analitik jawaban; hilang saat meninggalkan atau memuat ulang halaman.
        Tanda belajar dan progres SPT tidak berubah. Coba lagi menghapus entri soal itu saja sampai jawaban berikutnya diperiksa.
      </p>
      <p role="status" className="mt-3 text-sm text-accent" data-testid="status-quiz-review">
        {confused.length ? 'Masih ada konsep yang tertukar. Gunakan tautan berikut untuk mengulang.' :
          hasChecked ? 'Belum ada konsep tertukar dari jawaban terakhir yang sudah diperiksa. Soal lain mungkin belum dicoba; ini bukan tanda lulus.' :
            'Belum ada jawaban yang diperiksa. Buka “Uji pemahaman” pada tahap yang ingin Anda coba.'}
      </p>
      {confused.length > 0 && (
        <ul className="mt-4 space-y-3">
          {confused.map(question => (
            <li key={question.id} className="rounded-xl border border-border p-4" data-testid={`quiz-review-${question.id}`}>
              <h3 className="font-semibold text-white">{QUIZ_CONCEPTS[question.id]}</h3>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-primary">
                <a href={`#soal-${question.id}`} data-testid={`link-review-question-${question.id}`}
                  className="underline underline-offset-4" onClick={() => {
                    const target = document.getElementById(`soal-${question.id}`);
                    const section = target?.closest('details');
                    if (section) section.open = true;
                    target?.focus({ preventScroll: true });
                  }}>Kembali ke soal</a>
                <Link href={question.guide.href} data-testid={`link-review-guide-${question.id}`}
                  className="underline underline-offset-4">{question.guide.label}</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
