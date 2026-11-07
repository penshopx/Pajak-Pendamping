import { useEffect, useReducer, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { emptyQuizAttempt, QUIZ_QUESTIONS, QUIZ_SOURCES, quizFeedback, updateQuizAttempt, type QuizAttempt, type QuizQuestion } from '@/lib/learning-quiz';

export type QuizAttemptChange = (question: QuizQuestion, attempt: QuizAttempt) => void;

function Question({ question, onAttemptChange }: { question: QuizQuestion; onAttemptChange?: QuizAttemptChange }) {
  const [attempt, dispatch] = useReducer(
    (state: ReturnType<typeof emptyQuizAttempt>, action: Parameters<typeof updateQuizAttempt>[2]) => updateQuizAttempt(question, state, action),
    undefined, emptyQuizAttempt,
  );
  const form = useForm<{ answer: string }>({ defaultValues: { answer: '' } });
  const wasSubmitted = useRef(false);
  const checkButtonRef = useRef<HTMLButtonElement>(null);
  const { setFocus } = form;
  useEffect(() => {
    // Implicit Enter submission may start on a radio that has just become disabled.
    if (!wasSubmitted.current && attempt.submitted) checkButtonRef.current?.focus();
    // Wait until React has re-enabled the fieldset before restoring radio focus.
    if (wasSubmitted.current && !attempt.submitted) setFocus('answer');
    wasSubmitted.current = attempt.submitted;
  }, [attempt.submitted, setFocus]);
  const feedback = quizFeedback(question, attempt);
  const errorId = `quiz-error-${question.id}`;
  const feedbackId = `quiz-feedback-${question.id}`;
  return (
    <div id={`soal-${question.id}`} tabIndex={-1} className="scroll-mt-24 rounded-xl border border-border bg-background/50 p-4" data-testid={`quiz-question-${question.id}`}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(({ answer }) => {
          dispatch({ type: 'select', optionId: answer });
          dispatch({ type: 'submit' });
          onAttemptChange?.(question, updateQuizAttempt(question, { selectedId: answer, submitted: false }, { type: 'submit' }));
        })}>
          <fieldset disabled={attempt.submitted} aria-describedby={feedback ? feedbackId : undefined} className="min-w-0">
            <legend className="w-full break-words font-semibold leading-relaxed text-white">{question.prompt}</legend>
            <div className="mt-3 space-y-2">
              {question.options.map(option => (
                <label key={option.id} className="flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border border-input p-3 text-sm leading-relaxed text-foreground has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary">
                  <input type="radio" value={option.id} className="mt-1 shrink-0 accent-[hsl(var(--primary))]"
                    aria-invalid={!!form.formState.errors.answer}
                    aria-describedby={form.formState.errors.answer ? errorId : feedback ? feedbackId : undefined}
                    data-testid={`input-quiz-${question.id}-${option.id}`}
                    {...form.register('answer', { required: 'Pilih satu jawaban terlebih dahulu.' })} />
                  <span className="min-w-0 break-words">{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {form.formState.errors.answer && <p id={errorId} role="alert" className="mt-2 text-sm text-accent" data-testid={errorId}>{form.formState.errors.answer.message}</p>}
          {/* Keep this DOM node so checking an answer never removes the focused button.
              Once checked, it has no action and leaves the subsequent tab order. */}
          <Button ref={checkButtonRef} type={feedback ? 'button' : 'submit'} aria-disabled={!!feedback}
            tabIndex={feedback ? -1 : undefined}
            className="mt-3 aria-disabled:cursor-default aria-disabled:opacity-60"
            data-testid={`button-check-quiz-${question.id}`}>
            {feedback ? 'Jawaban sudah diperiksa' : 'Periksa jawaban'}
          </Button>
        </form>
      </Form>
      <div id={feedbackId} role="status" aria-live="polite" aria-atomic="true">
        {feedback && (
          <div className="mt-4 border-t border-border pt-4" data-testid={`quiz-feedback-${question.id}`}>
            <p className="font-semibold text-accent">{feedback.correct ? 'Tepat untuk skenario ini.' : 'Masih ada konsep yang tertukar.'}</p>
            <p className="mt-2 text-sm leading-relaxed">{feedback.reason}</p>
            <p className="mt-2 text-sm"><b>Jawaban yang sesuai:</b> {feedback.correctLabel}</p>
            <p className="mt-2 text-sm leading-relaxed">{feedback.explanation}</p>
          </div>
        )}
      </div>
      {feedback && (
        <div>
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
              onAttemptChange?.(question, emptyQuizAttempt());
            }}>Coba lagi</Button>
            <Link href={question.guide.href} data-testid={`link-quiz-guide-${question.id}`} className="text-sm font-semibold text-primary underline underline-offset-4">{question.guide.label}</Link>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Coba lagi menghapus pilihan dan pembahasan soal ini saja; catatan lain tidak berubah.</p>
        </div>
      )}
    </div>
  );
}

export function LearningQuiz({ stepId, onAttemptChange }: { stepId: string; onAttemptChange?: QuizAttemptChange }) {
  const questions = QUIZ_QUESTIONS.filter(question => question.stepId === stepId);
  if (!questions.length) return null;
  return (
    <details className="mt-6 rounded-xl border border-primary/35 bg-primary/5 p-4" data-testid={`quiz-section-${stepId}`}>
      <summary className="cursor-pointer rounded-sm font-semibold text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary" data-testid={`toggle-quiz-${stepId}`}>Uji pemahaman (opsional) · {questions.length} soal singkat</summary>
      <p className="mt-3 text-sm leading-relaxed text-foreground/90">
        Soal dan pembahasan tetap, bukan penilaian AI. Tidak ada sertifikat atau klaim lulus kepatuhan.
        Jawaban tidak disimpan dan tidak dikirim ke layanan luar. Pilihan serta hasil hilang saat meninggalkan atau memuat ulang halaman.
        Latihan tidak mengubah tanda belajar, transaksi, pembayaran, ataupun progres SPT; semua tahap tetap dapat dibuka.
      </p>
      <div className="mt-4 space-y-4">
        {questions.map(question => <Question key={question.id} question={question} onAttemptChange={onAttemptChange} />)}
      </div>
    </details>
  );
}
