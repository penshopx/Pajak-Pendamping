import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { LEARNING_STEPS } from './learning-path';
import { QUIZ_QUESTIONS, QUIZ_SOURCES, emptyQuizAttempt, updateQuizAttempt, quizFeedback } from './learning-quiz';
import { LearningQuiz } from '../components/learning-quiz';
import { StoreProvider, useStore } from './store';

const expected = {
  modal: 'modal', 'tautkan-piutang': 'tautkan', 'tautkan-utang': 'tautkan',
  billing: 'siap', 'bukti-bayar': 'bpn', bpe: 'lapor',
};

test('every reviewed question has a unique stable answer mapping, reasons and a related guide', () => {
  assert.equal(QUIZ_QUESTIONS.length, 6);
  assert.equal(new Set(QUIZ_QUESTIONS.map(q => q.id)).size, 6);
  for (const q of QUIZ_QUESTIONS) {
    assert.equal(q.correctId, expected[q.id as keyof typeof expected]);
    assert.ok(LEARNING_STEPS.some(step => step.id === q.stepId));
    assert.equal(q.options.length, 3);
    assert.equal(new Set(q.options.map(o => o.id)).size, 3);
    assert.ok(q.options.every(o => o.label.length > 10 && o.reason.length > 25));
    assert.ok(q.explanation.length > 80);
    assert.ok(['/laba-rugi', '/piutang-utang', '/pembayaran', '/pustaka'].includes(new URL(q.guide.href, 'https://test.invalid').pathname));
  }
});

test('official claims carry scoped official sources; internal app facts are not attributed to DJP', () => {
  assert.equal(new Set(QUIZ_SOURCES.map(s => s.id)).size, QUIZ_SOURCES.length);
  for (const q of QUIZ_QUESTIONS) {
    if (q.basis === 'app') {
      assert.deepEqual(q.sourceIds, []);
    } else {
      assert.ok(q.sourceIds.length > 0);
      for (const id of q.sourceIds) assert.ok(QUIZ_SOURCES.some(s => s.id === id));
    }
  }
  for (const source of QUIZ_SOURCES) {
    const url = new URL(source.url);
    assert.equal(url.protocol, 'https:');
    assert.ok(['pajak.go.id', 'jdih.kemenkeu.go.id'].includes(url.hostname));
    assert.ok(source.scope.length > 100);
  }
});

test('each choice produces its own reviewed reason and correct answer only after submission', () => {
  for (const q of QUIZ_QUESTIONS) {
    for (const option of q.options) {
      const empty = Object.freeze(emptyQuizAttempt());
      const selected = updateQuizAttempt(q, empty, { type: 'select', optionId: option.id });
      assert.equal(quizFeedback(q, selected), null);
      const submitted = updateQuizAttempt(q, selected, { type: 'submit' });
      const feedback = quizFeedback(q, submitted)!;
      assert.equal(feedback.correct, option.id === expected[q.id as keyof typeof expected]);
      assert.equal(feedback.reason, option.reason);
      assert.equal(feedback.explanation, q.explanation);
      assert.equal(feedback.correctLabel, q.options.find(o => o.id === q.correctId)!.label);
      assert.deepEqual(empty, { selectedId: '', submitted: false });
      assert.strictEqual(updateQuizAttempt(q, submitted, { type: 'select', optionId: q.correctId }), submitted);
    }
  }
});

test('retry clears only this question, accepts a different answer and hides previous feedback', () => {
  for (const q of QUIZ_QUESTIONS) {
    const wrong = q.options.find(o => o.id !== q.correctId)!;
    const submitted = updateQuizAttempt(q, { selectedId: wrong.id, submitted: false }, { type: 'submit' });
    assert.equal(quizFeedback(q, submitted)?.correct, false);
    const reset = updateQuizAttempt(q, submitted, { type: 'retry' });
    assert.deepEqual(reset, emptyQuizAttempt());
    assert.equal(quizFeedback(q, reset), null);
    const chosen = updateQuizAttempt(q, reset, { type: 'select', optionId: q.correctId });
    assert.equal(quizFeedback(q, updateQuizAttempt(q, chosen, { type: 'submit' }))?.correct, true);
    assert.equal(quizFeedback(q, submitted)?.correct, false);
  }
});

test('empty and invalid choices cannot produce misleading feedback', () => {
  const q = QUIZ_QUESTIONS[0];
  assert.throws(() => updateQuizAttempt(q, emptyQuizAttempt(), { type: 'submit' }), /Pilih satu/);
  assert.throws(() => updateQuizAttempt(q, emptyQuizAttempt(), { type: 'select', optionId: 'unknown' }), /tidak valid/);
  assert.throws(() => quizFeedback(q, { selectedId: 'unknown', submitted: true }), /tidak valid/);
});

test('render, all answers and retries leave the actual local store and SPT progress unchanged, even with writes blocked', () => {
  const snapshot = {
    profile: { businessName: 'Contoh', businessType: 'orang-pribadi' },
    obligations: [{ id: 'obligation', status: 'belum' }],
    payments: [{ id: 'payment', amount: 100 }],
    transactions: [{ id: 'cash', date: '2026-06-01', kind: 'pemasukan', category: 'penjualan', amount: 100, description: 'Penjualan contoh', notes: '' }],
    tradeBills: [], chat: [],
    learningCompleted: ['profil-usaha'], sptProgress: { 'op:2025': { documents: true, bpe: false } },
  };
  const raw = JSON.stringify(snapshot);
  let writes = 0;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => raw,
    setItem: () => { writes++; throw new Error('Storage blocked'); },
    removeItem: () => { writes++; throw new Error('Storage blocked'); },
  } });
  let store!: ReturnType<typeof useStore>;
  function Capture() { store = useStore(); return React.createElement(LearningQuiz, { stepId: 'catatan-usaha' }); }
  const html = renderToString(React.createElement(StoreProvider, { children: React.createElement(Capture) }));
  assert.equal(store.storageError, null);
  assert.deepEqual(store.transactions, snapshot.transactions);
  assert.deepEqual(store.sptProgress, snapshot.sptProgress);
  for (const q of QUIZ_QUESTIONS) {
    let attempt = emptyQuizAttempt();
    for (const o of q.options) {
      attempt = updateQuizAttempt(q, attempt, { type: 'select', optionId: o.id });
      attempt = updateQuizAttempt(q, attempt, { type: 'submit' });
      assert.ok(quizFeedback(q, attempt));
      attempt = updateQuizAttempt(q, attempt, { type: 'retry' });
    }
  }
  assert.equal(writes, 0);
  for (const key of ['transactions', 'tradeBills', 'payments', 'obligations', 'learningCompleted', 'sptProgress'] as const) assert.deepEqual(store[key], snapshot[key]);
  assert.match(html, /tidak disimpan dan tidak dikirim/);
  assert.match(html, /hilang saat meninggalkan atau memuat ulang/);
});

test('quiz UI wires each question, validation, feedback and retry without store or network access', () => {
  for (const step of LEARNING_STEPS) {
    const html = renderToString(React.createElement(LearningQuiz, { stepId: step.id }));
    const questions = QUIZ_QUESTIONS.filter(q => q.stepId === step.id);
    if (!questions.length) { assert.equal(html, ''); continue; }
    for (const q of questions) {
      assert.ok(html.includes(`quiz-question-${q.id}`));
      assert.ok(html.includes(`button-check-quiz-${q.id}`));
      for (const option of q.options) assert.ok(html.includes(`input-quiz-${q.id}-${option.id}`));
      assert.ok(!html.includes(`quiz-feedback-${q.id}`));
    }
    assert.match(html, /bukan penilaian AI/);
    assert.match(html, /Tidak ada sertifikat/);
  }
  for (const file of ['src/lib/learning-quiz.ts', 'src/components/learning-quiz.tsx']) {
    const code = readFileSync(`artifacts/sahabat-pajak/${file}`, 'utf8');
    assert.doesNotMatch(code, /useStore|localStorage|sessionStorage|fetch\(|sendBeacon|api-client|setLearningComplete|setSptChecked/);
  }
  const ui = readFileSync('artifacts/sahabat-pajak/src/components/learning-quiz.tsx', 'utf8');
  assert.match(ui, /type: 'retry'/);
  assert.match(ui, /form\.reset\(\{ answer: '' \}\)/);
  assert.match(ui, /form\.handleSubmit/);
  assert.match(ui, /disabled=\{attempt\.submitted\}/);
});
