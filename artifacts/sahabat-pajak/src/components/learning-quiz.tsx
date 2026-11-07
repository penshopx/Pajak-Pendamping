import { useReducer } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { emptyQuizAttempt, QUIZ_QUESTIONS, QUIZ_SOURCES, quizFeedback, updateQuizAttempt, type QuizQuestion } from '@/lib/learning-quiz';

function Question({ question }: { question: QuizQuestion }) {
  const [attempt, dispatch] = useReducer(
    (state: ReturnType<typeof emptyQuizAttempt>, action: Parameters<typeof updateQuizAttempt>[2]) => updateQuizAttempt(question, state, action),
    undefined, emptyQuizAttempt,
  );
  const form = useForm<{ answer: string }>({ defaultValues: { answer: '' } });
  const feedback = quizFeedback(question, attempt);
  return (
    <div className="rounded-xl border border-border bg-background/50 p-4" data-testid={`quiz-question-${question.id}`}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(({ answer }) => {
          dispatch({ type: 'select', optionId: answer });
          dispatch({ type: 'submit' });
        })}>
          <fieldset disabled={attempt.submitted}>
            <legend className="font-semibold leading-relaxed text-white">{question.prompt}</legend>
            <div className="mt-3 space-y-2">
              {question.options.map(option => (
                <label key={option.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-input p-3 text-sm leading-relaxed text-foreground has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                  <input type="radio" value={option.id} className="mt-1 shrink-0 accent-[hsl(var(--primary))]"
                    data-testid={`input-quiz-${question.id}-${option.id}`}
                    {...form.register('answer', { required: 'Pilih satu jawaban terlebih dahulu.' })} />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          {form.formState.errors.answer && <p role="alert" className="mt-2 text-sm text-accent" data-testid={`quiz-error-${question.id}`}>{form.formState.errors.answer.message}</p>}
          {!feedback && <Button type="submit" className="mt-3" data-testid={`button-check-quiz-${question.id}`}>Periksa jawaban</Button>}
        </form>
      </Form>
      {feedback && (
        <div className="mt-4 border-t border-border pt-4">
          <div role="status" aria-live="polite" data-testid={`quiz-feedback-${question.id}`}>
            <p className="font-semibold text-accent">{feedback.correct ? 'Tepat untuk skenario ini.' : 'Masih ada konsep yang tertukar.'}</p>
            <p className="mt-2 text-sm leading-relaxed">{feedback.reason}</p>
            <p className="mt-2 text-sm"><b>Jawaban yang sesuai:</b> {feedback.correctLabel}</p>
            <p className="mt-2 text-sm leading-relaxed">{feedback.explanation}</p>
          </div>
          <p className="mt-3 text-xs font-semibold text-accent">
            {question.basis === 'app' ? 'Tentang cara kerja aplikasi — bukan pernyataan DJP atau penetapan pajak.' : 'Rujukan istilah resmi — diperiksa 6 November 2026, bukan verifikasi kondisi Anda.'}
          </p>
          {question.sourceIds.map(id => {
            const source = QUIZ_SOURCES.find(s => s.id === id)!;
            return <div key={id} className="mt-2 text-xs leading-relaxed">
              <a href={source.url} target="_blank" rel="noopener noreferrer" data-testid={`link-quiz-source-${question.id}-${id}`} className="font-semibold text-primary underline underline-offset-4">{source.title} (tab baru)</a>
              <p className="mt-1 text-muted-foreground">{source.scope}</p>
            </div>;
          })}
          <p className="mt-2 text-xs text-muted-foreground">Batas aplikasi: hasil latihan maupun isian lokal tidak memverifikasi pembayaran atau SPT ke DJP.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" data-testid={`button-retry-quiz-${question.id}`} onClick={() => {
              dispatch({ type: 'retry' });
              form.reset({ answer: '' });
            }}>Coba lagi</Button>
            <Link href={question.guide.href} data-testid={`link-quiz-guide-${question.id}`} className="text-sm font-semibold text-primary underline underline-offset-4">{question.guide.label}</Link>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Coba lagi menghapus pilihan dan pembahasan soal ini saja; catatan lain tidak berubah.</p>
        </div>
      )}
    </div>
  );
}

export function LearningQuiz({ stepId }: { stepId: string }) {
  const questions = QUIZ_QUESTIONS.filter(question => question.stepId === stepId);
  if (!questions.length) return null;
  return (
    <details className="mt-6 rounded-xl border border-primary/35 bg-primary/5 p-4" data-testid={`quiz-section-${stepId}`}>
      <summary className="cursor-pointer font-semibold text-primary" data-testid={`toggle-quiz-${stepId}`}>Uji pemahaman (opsional) · {questions.length} soal singkat</summary>
      <p className="mt-3 text-sm leading-relaxed text-foreground/90">
        Soal dan pembahasan tetap, bukan penilaian AI. Tidak ada sertifikat atau klaim lulus kepatuhan.
        Jawaban tidak disimpan dan tidak dikirim ke layanan luar. Pilihan serta hasil hilang saat meninggalkan atau memuat ulang halaman.
        Latihan tidak mengubah tanda belajar, transaksi, pembayaran, ataupun progres SPT; semua tahap tetap dapat dibuka.
      </p>
      <div className="mt-4 space-y-4">
        {questions.map(question => <Question key={question.id} question={question} />)}
      </div>
    </details>
  );
}
