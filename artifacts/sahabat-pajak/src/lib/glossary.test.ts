import test from 'node:test';
import assert from 'node:assert/strict';
import { GLOSSARY_CATEGORIES, GLOSSARY_SOURCES, GLOSSARY_TERMS } from './glossary-data';
import { filterGlossary, glossaryQuestionHref, glossaryTerm, glossaryTermHref, normalizeGlossaryQuery } from './glossary';
import { LEARNING_STEPS } from './learning-path';

test('catalog IDs, categories, references, related terms and learning stages are valid', () => {
  const ids = new Set(GLOSSARY_TERMS.map(t => t.id));
  const sources = new Set(GLOSSARY_SOURCES.map(s => s.id));
  const categories = new Set<string>(GLOSSARY_CATEGORIES.map(c => c.id));
  const lessons = new Set(LEARNING_STEPS.map(s => s.id));
  assert.equal(ids.size, GLOSSARY_TERMS.length);
  assert.equal(sources.size, GLOSSARY_SOURCES.length);
  for (const t of GLOSSARY_TERMS) {
    assert.match(t.id, /^[a-z]+(?:-[a-z]+)*$/);
    assert.ok(categories.has(t.category));
    assert.ok(lessons.has(t.lessonId));
    for (const text of [t.term, t.description, t.example, t.caution]) assert.ok(text.trim().length > 3);
    assert.ok(t.sourceIds.length > 0);
    t.sourceIds.forEach(id => assert.ok(sources.has(id), `${t.id}: missing source ${id}`));
    assert.equal(new Set(t.relatedIds).size, t.relatedIds.length);
    t.relatedIds.forEach(id => assert.ok(id !== t.id && ids.has(id), `${t.id}: invalid related term ${id}`));
  }
});
test('each reference points to an official HTTPS domain and keeps its scope limitations', () => {
  const hosts = new Set(['pajak.go.id', 'www.pajak.go.id', 'jdih.kemenkeu.go.id']);
  for (const s of GLOSSARY_SOURCES) {
    const url = new URL(s.url);
    assert.equal(url.protocol, 'https:');
    assert.ok(hosts.has(url.hostname));
    assert.equal(url.username + url.password, '');
    assert.ok(s.locator.length > 20);
    assert.ok(s.limitation.length > 40);
    assert.match(s.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
  }
});
test('definitions do not introduce numerical rates, thresholds, deadlines or calculations', () => {
  for (const t of GLOSSARY_TERMS) {
    assert.doesNotMatch([t.description, t.example, t.caution].join(' '), /\d|%/);
  }
});
test('default result is complete, alphabetic and does not reorder the original catalog', () => {
  const original = GLOSSARY_TERMS.map(t => t.id);
  const result = filterGlossary();
  assert.equal(result.length, GLOSSARY_TERMS.length);
  assert.deepEqual(result.map(t => t.term), result.map(t => t.term).sort((a, b) => a.localeCompare(b, 'id-ID')));
  assert.deepEqual(GLOSSARY_TERMS.map(t => t.id), original);
});
test('normalization supports accents, punctuation, case and bounded input', () => {
  assert.equal(normalizeGlossaryQuery('  É-BILLING   '), 'e billing');
  assert.equal(normalizeGlossaryQuery('A'.repeat(500)).length, 120);
  assert.equal(filterGlossary('é-BILLING')[0]?.id, 'kode-billing');
  assert.equal(filterGlossary('  nTpN  ')[0]?.id, 'ntpn');
  assert.equal(filterGlossary(' BPE ')[0]?.id, 'bpe');
  assert.equal(filterGlossary('PTKP')[0]?.id, 'ptkp');
});
test('both PKP meanings rank ahead of contextual mentions', () => {
  assert.deepEqual(new Set(filterGlossary('PKP').slice(0, 2).map(t => t.id)),
    new Set(['pengusaha-kena-pajak', 'penghasilan-kena-pajak']));
  for (const id of ['pengusaha-kena-pajak', 'penghasilan-kena-pajak']) {
    const t = glossaryTerm(id)!;
    assert.ok(t.caution + t.example);
    assert.ok(t.relatedIds.includes(id === 'pengusaha-kena-pajak' ? 'penghasilan-kena-pajak' : 'pengusaha-kena-pajak'));
  }
});
test('search finds aliases and multiword text regardless of token order', () => {
  for (const q of ['omset', 'peredaran bruto', 'bruto penjualan']) {
    assert.ok(filterGlossary(q).some(t => t.id === 'omzet'), q);
  }
  assert.equal(filterGlossary('bukti lapor')[0]?.id, 'bpe');
  assert.equal(filterGlossary('koreksi fiskal')[0]?.id, 'rekonsiliasi-fiskal');
  assert.ok(filterGlossary('neraca akrual').some(t => t.id === 'pembukuan'));
});
test('category and search intersect, category totals cover the catalog exactly', () => {
  let total = 0;
  for (const c of GLOSSARY_CATEGORIES) {
    const result = filterGlossary('', c.id);
    assert.ok(result.length > 0);
    assert.ok(result.every(t => t.category === c.id));
    total += result.length;
    assert.ok(filterGlossary('pajak', c.id).every(t => t.category === c.id));
  }
  assert.equal(total, GLOSSARY_TERMS.length);
  assert.equal(filterGlossary('NTPN', 'pembayaran')[0]?.id, 'ntpn');
  assert.equal(filterGlossary('PTKP', 'pembayaran').length, 0);
  assert.equal(filterGlossary('', 'unknown').length, GLOSSARY_TERMS.length);
});
test('no results, blank queries, punctuation and unknown deep links are safe', () => {
  assert.equal(filterGlossary('istilahyangbelumadaxyz').length, 0);
  assert.equal(filterGlossary('   ').length, GLOSSARY_TERMS.length);
  assert.equal(filterGlossary('[]()***').length, GLOSSARY_TERMS.length);
  assert.equal(glossaryTerm(null), null);
  assert.equal(glossaryTerm('__proto__'), null);
  assert.equal(glossaryTerm('tidak-ada'), null);
});
test('all AI links are bounded drafts, not submission endpoints', () => {
  for (const term of GLOSSARY_TERMS) {
    const url = new URL(glossaryQuestionHref(term), 'https://example.test');
    assert.equal(url.pathname, '/konsultasi');
    assert.deepEqual([...url.searchParams.keys()], ['pertanyaan']);
    const question = url.searchParams.get('pertanyaan')!;
    assert.ok(question.includes(term.term));
    assert.ok(question.length >= 5 && question.length <= 2000);
    assert.ok(question.includes('keterbatasan'));
  }
});
test('term URLs round-trip, including characters that could otherwise inject query parameters', () => {
  for (const id of [...GLOSSARY_TERMS.map(t => t.id), 'omzet&x=1#test']) {
    const url = new URL(glossaryTermHref(id), 'https://example.test');
    assert.equal(url.pathname, '/glosarium');
    assert.deepEqual([...url.searchParams.keys()], ['istilah']);
    assert.equal(url.searchParams.get('istilah'), id);
    assert.equal(url.hash, '');
  }
});
