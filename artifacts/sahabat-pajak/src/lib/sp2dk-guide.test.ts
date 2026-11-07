import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SP2DK_SOURCES, SP2DK_STEPS, SP2DK_TIME_NOTES, SP2DK_DRAFT_FIELDS, SP2DK_DRAFT_LIMIT,
  SP2DK_PRIVACY_NOTICE, SP2DK_AI_DRAFT_HREF, emptySp2dkDraft, buildSp2dkDraft, type Sp2dkDraft,
} from './sp2dk-guide';

test('all preparation steps have unique IDs and real reference IDs', () => {
  const sourceIds = new Set<string>(SP2DK_SOURCES.map(s => s.id));
  assert.equal(sourceIds.size, SP2DK_SOURCES.length);
  assert.equal(new Set(SP2DK_STEPS.map(s => s.id)).size, SP2DK_STEPS.length);
  for (const s of SP2DK_STEPS) {
    assert.ok(s.title && s.description && s.check && s.tasks.length);
    for (const ref of s.sourceIds) assert.ok(sourceIds.has(ref));
  }
});
test('reference links are public official HTTPS pages, with scope and review date', () => {
  for (const s of SP2DK_SOURCES) {
    const url = new URL(s.url);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.hostname, 'pajak.go.id');
    assert.equal(url.username + url.password, '');
    assert.ok(!url.hostname.includes('intranet'));
    assert.ok(s.locator.length > 20 && s.limitation.length > 40);
    assert.match(s.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
  }
});
test('timing guidance preserves channel differences, unregistered WP and receipt of extension notice', () => {
  assert.ok(SP2DK_TIME_NOTES[0].includes('peristiwa yang lebih dahulu'));
  for (const word of ['akun WP', 'email', 'faksimile', 'pos', 'langsung']) assert.ok(SP2DK_TIME_NOTES[0].includes(word));
  assert.ok(SP2DK_TIME_NOTES[1].includes('aktivasi'));
  assert.ok(SP2DK_TIME_NOTES[2].includes('diterima KPP sebelum'));
  assert.ok(SP2DK_TIME_NOTES[2].includes('pemberitahuan tertulis'));
  assert.ok(SP2DK_TIME_NOTES[3].includes('tidak menghitung'));
});
test('empty outline is useful but explicitly incomplete and not ready for official submission', () => {
  const text = buildSp2dkDraft(emptySp2dkDraft());
  assert.ok(text.startsWith('DRAF PERSIAPAN TANGGAPAN SP2DK'));
  for (const marker of ['BUKAN SURAT SIAP KIRIM', 'BELUM DIVERIFIKASI', 'bukan pengakuan', 'bukan bukti penyampaian', 'bukan jaminan', 'DI LUAR APLIKASI']) assert.ok(text.includes(marker));
  assert.equal(text.split('[Belum diisi').length - 1, SP2DK_DRAFT_FIELDS.length);
  assert.doesNotMatch(text, /Saya menyetujui seluruh|SP2DK telah selesai|DJP telah menyetujui/i);
  assert.equal(text.match(/^\[ \]/gm)?.length, SP2DK_STEPS.length);
});
test('screen and exported notes do not silently adopt the uploaded timing calculator', () => {
  const notes = SP2DK_TIME_NOTES.join('\n');
  for (const phrase of [
    'WP terdaftar maupun belum terdaftar',
    'bukan alasan mengabaikan pemicu pos atau langsung',
    'hari kerja',
    'bukan menambah 7 hari untuk setiap permohonan',
  ]) assert.ok(notes.includes(phrase), phrase);
  const text = buildSp2dkDraft(emptySp2dkDraft());
  assert.ok(text.includes(SP2DK_TIME_NOTES[4]));
  assert.ok(text.includes(SP2DK_TIME_NOTES[1]));
});
test('typed facts, multiline Unicode and literal characters survive plaintext generation', () => {
  const draft: Sp2dkDraft = { scope: 'Poin A — periode contoh', facts: 'Baris satu\r\nBaris dua\rBaris tiga: “selisih belum jelas”', evidence: 'Lampiran A & B <contoh>', questions: 'Apa pembandingnya?' };
  const text = buildSp2dkDraft(draft);
  assert.ok(text.includes('Poin A — periode contoh'));
  assert.ok(text.includes('Baris satu\nBaris dua\nBaris tiga: “selisih belum jelas”'));
  assert.ok(text.includes('Lampiran A & B <contoh>'));
  assert.ok(text.includes('Apa pembandingnya?'));
});
test('each field is length-checked without silent truncation or mutation', () => {
  for (const f of SP2DK_DRAFT_FIELDS) {
    const atLimit = { ...emptySp2dkDraft(), [f.id]: 'x'.repeat(SP2DK_DRAFT_LIMIT) };
    assert.ok(buildSp2dkDraft(atLimit).includes('x'.repeat(SP2DK_DRAFT_LIMIT)));
    const tooLong = { ...atLimit, [f.id]: 'x'.repeat(SP2DK_DRAFT_LIMIT + 1) };
    assert.throws(() => buildSp2dkDraft(tooLong), /maksimal/);
    assert.equal(tooLong[f.id].length, SP2DK_DRAFT_LIMIT + 1);
    const notText = { ...emptySp2dkDraft(), [f.id]: 100 } as unknown as Sp2dkDraft;
    assert.throws(() => buildSp2dkDraft(notText), /harus berupa teks/);
  }
});
test('partial and whitespace-only input retains missing-field markers', () => {
  const text = buildSp2dkDraft({ ...emptySp2dkDraft(), scope: '  Poin A  ', facts: '   \n\t' });
  assert.ok(text.includes('\nPoin A\n'));
  assert.equal(text.split('[Belum diisi').length - 1, 3);
});
test('checklist changes affect only known steps, with no official completion claim', () => {
  const draft = emptySp2dkDraft();
  const original = JSON.stringify(draft);
  const checked = [SP2DK_STEPS[0].id, 'unknown-step', SP2DK_STEPS[0].id];
  const text = buildSp2dkDraft(draft, checked);
  assert.equal(text.match(/^\[x\]/gm)?.length, 1);
  assert.equal(text.match(/^\[ \]/gm)?.length, SP2DK_STEPS.length - 1);
  assert.ok(text.includes('pengakuan pengguna, bukan validasi KPP'));
  assert.equal(JSON.stringify(draft), original);
  assert.equal(checked.length, 3);
});
test('control characters are removed but normal line breaks are retained', () => {
  const text = buildSp2dkDraft({ ...emptySp2dkDraft(), facts: 'A\u0000B\u0007C\nD\tE' });
  assert.ok(text.includes('ABC\nD\tE'));
  assert.doesNotMatch(text, /[\u0000-\u0008]/);
});
test('export includes timing, references, limitations and private file warning', () => {
  const text = buildSp2dkDraft(emptySp2dkDraft(), SP2DK_STEPS.map(s => s.id));
  SP2DK_TIME_NOTES.forEach(n => assert.ok(text.includes(n)));
  SP2DK_SOURCES.forEach(s => {
    for (const v of [s.url, s.locator, s.limitation, s.reviewedAt]) assert.ok(text.includes(v));
  });
  assert.equal(text.match(/^\[x\]/gm)?.length, SP2DK_STEPS.length);
  assert.ok(text.includes('Simpan dan bagikan secara hati-hati'));
});
test('AI link is a generic draft and never includes typed response content', () => {
  const before = SP2DK_AI_DRAFT_HREF;
  buildSp2dkDraft({ ...emptySp2dkDraft(), facts: 'RAHASIA-LOKAL-XYZ' });
  const url = new URL(SP2DK_AI_DRAFT_HREF, 'https://example.test');
  assert.equal(url.pathname, '/konsultasi');
  assert.deepEqual([...url.searchParams.keys()], ['pertanyaan']);
  const q = url.searchParams.get('pertanyaan')!;
  assert.ok(q.length >= 5 && q.length <= 2000);
  assert.ok(q.includes('terdaftar dan belum terdaftar'));
  assert.ok(!q.includes('RAHASIA-LOKAL-XYZ'));
  assert.equal(SP2DK_AI_DRAFT_HREF, before);
});
test('temporary-state privacy and case-specific documentary scope are explicit', () => {
  for (const word of ['sementara', 'tidak disimpan otomatis', 'hilang', 'Unduh', 'NIK/NPWP']) assert.ok(SP2DK_PRIVACY_NOTICE.includes(word));
  const docStep = SP2DK_STEPS.find(s => s.id === 'data-pembanding')!;
  assert.ok(docStep.description.includes('bukan kewajiban menyerahkan semua'));
  assert.ok(SP2DK_STEPS.find(s => s.id === 'arsip-tindak-lanjut')!.tasks.some(t => t.includes('tidak berarti')));
});
