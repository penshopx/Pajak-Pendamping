import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TaxNavigator from '../components/tax-navigator';
import {
  findTaxActions, MAX_NAVIGATOR_QUERY, NAVIGATOR_ACTIONS, NAVIGATOR_EXAMPLES,
} from './tax-navigator';

test('examples find their intended existing feature without inventing a recommendation', () => {
  const expected = ['transaksi', 'laba-rugi', 'piutang-utang', 'pembayaran', 'spt', 'coretax', 'sp2dk', 'belajar'];
  NAVIGATOR_EXAMPLES.forEach((example, i) => {
    const result = findTaxActions(example.query);
    assert.equal(result.status, 'matched');
    assert.equal(result.matches[0]?.action.id, expected[i], example.query);
  });
});
test('common Indonesian task descriptions and case/punctuation variations resolve predictably', () => {
  for (const [query, id] of [
    ['Saya ingin mencatat pemasukan dan pengeluaran usaha', 'transaksi'],
    ['Membayar pajak dengan e-BILLING', 'pembayaran'],
    ['Saya mau melaporkan SPT tahunan 2026', 'spt'],
    ['Bagaimana aktifkan akun?', 'coretax'],
    ['lupa password Coretax', 'coretax'],
    ['Apa itu NTPN?', 'glosarium'],
    ['Bayar hutang kepada pemasok', 'piutang-utang'],
    ['Menerima surat dari KPP', 'sp2dk'],
    ['Mau mencadangkan data: backup JSON', 'cadangan'],
  ]) {
    assert.equal(findTaxActions(query).matches[0]?.action.id, id, query);
  }
});
test('empty, unknown, partial-word and overlong input have explicit non-answer states', () => {
  for (const query of ['', ' \n\t ']) assert.deepEqual(findTaxActions(query), { status: 'idle', matches: [] });
  for (const query of ['???', 'asdfgh', '081111111111', 'constructor', '__proto__', 'xsp2dkx', 'pengartianxyz', 'pajak']) {
    assert.deepEqual(findTaxActions(query), { status: 'unmatched', matches: [] }, query);
  }
  assert.equal(findTaxActions('spt'.padEnd(MAX_NAVIGATOR_QUERY, ' ')).status, 'matched');
  assert.deepEqual(findTaxActions('spt'.padEnd(MAX_NAVIGATOR_QUERY + 1, ' ')), { status: 'too-long', matches: [] });
});
test('multiple needs return at most four stable matches, with only curated matching terms', () => {
  const query = 'catat pemasukan, lihat laba rugi, bayar pajak, siapkan spt dan belajar';
  const first = findTaxActions(query);
  assert.equal(first.matches.length, 4);
  assert.deepEqual(findTaxActions(query), first);
  for (const { action, matchedTerms } of first.matches) {
    assert.ok(matchedTerms.length);
    assert.ok(matchedTerms.every(term => action.keywords.includes(term)));
    assert.ok(action.description && action.reason);
  }
});
test('every catalogue keyword remains discoverable and IDs are unique', () => {
  assert.equal(new Set(NAVIGATOR_ACTIONS.map(action => action.id)).size, NAVIGATOR_ACTIONS.length);
  for (const action of NAVIGATOR_ACTIONS) {
    for (const keyword of action.keywords) {
      assert.ok(findTaxActions(keyword).matches.some(match => match.action.id === action.id), `${action.id}: ${keyword}`);
    }
  }
});
test('destinations exist, SPT/Coretax use their real guide parameters, no user text becomes a URL', () => {
  const routes = new Set([...readFileSync('artifacts/sahabat-pajak/src/App.tsx', 'utf8')
    .matchAll(/<Route path="([^"]+)"/g)].map(match => match[1]));
  for (const action of NAVIGATOR_ACTIONS) {
    const url = new URL(action.href, 'https://app.invalid');
    assert.equal(url.origin, 'https://app.invalid');
    assert.ok(routes.has(url.pathname), action.href);
    assert.equal(url.hash, '');
    assert.deepEqual([...url.searchParams.keys()], ['spt', 'coretax'].includes(action.id) ? ['guide'] : []);
  }
  assert.equal(NAVIGATOR_ACTIONS.find(a => a.id === 'spt')!.href, '/pustaka?guide=spt');
  assert.equal(NAVIGATOR_ACTIONS.find(a => a.id === 'coretax')!.href, '/pustaka?guide=akses');
  const malicious = findTaxActions('SPT https://other.invalid/?pertanyaan=private <script>alert(1)</script>');
  assert.equal(malicious.matches[0].action.href, '/pustaka?guide=spt');
});
test('search does not access storage or network, and never changes the catalogue', () => {
  const before = JSON.stringify(NAVIGATOR_ACTIONS);
  const storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const fetch = globalThis.fetch;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('No storage allowed'); } });
  globalThis.fetch = () => { throw new Error('No network allowed'); };
  try {
    for (const example of NAVIGATOR_EXAMPLES) assert.equal(findTaxActions(example.query).status, 'matched');
    assert.equal(JSON.stringify(NAVIGATOR_ACTIONS), before);
  } finally {
    globalThis.fetch = fetch;
    if (storage) Object.defineProperty(globalThis, 'localStorage', storage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
test('requests for tax calculations lead to bounded tools, never an amount or a personal tax determination', () => {
  const result = findTaxActions('Menghitung pajak terutang PPh 21, berapa tarif saya tahun 2026?');
  assert.equal(result.matches[0].action.id, 'konsultasi');
  assert.equal(result.matches[0].action.href, '/konsultasi');
  assert.match(result.matches[0].action.reason, /tidak menentukan/);
  assert.ok(result.matches.every(match => !/2026|Rp\s|%/.test(match.action.description + match.action.reason)));
});
test('initial UI has an associated input label, private transient search, examples, and a live result summary', () => {
  const html = renderToStaticMarkup(createElement(TaxNavigator));
  const input = html.match(/<input[^>]*data-testid="input-navigator-query"[^>]*>/)?.[0];
  assert.ok(input);
  const id = input.match(/\bid="([^"]+)"/)?.[1];
  assert.ok(id && html.includes(`for="${id}"`));
  assert.match(input, /autoComplete="off"/i);
  assert.match(html, /role="search"/);
  assert.match(html, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.equal([...html.matchAll(/data-testid="button-navigator-example-\d+"/g)].length, NAVIGATOR_EXAMPLES.length);
  assert.match(html, /data-testid="text-navigator-idle"/);
  assert.match(html, /tidak disimpan atau dikirim/);
  assert.match(html, /bukan penilaian kewajiban/);
  assert.doesNotMatch(html, /data-testid="list-navigator-results"/);
});
