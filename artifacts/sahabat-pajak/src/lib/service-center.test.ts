import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StoreProvider, useStore } from './store';
import { buildRestore, parseBackup, restoreSnapshot } from './backup';
import {
  assertServiceRooms, consultationHref, deleteServiceRoom, MAX_SERVICE_ROOMS, ROOM_STEP_IDS,
  saveServiceRoom, SERVICE_TOPICS, setServiceRoomStep, type ServiceRoom,
} from './service-center';

const room = (id = 'room'): ServiceRoom => ({ id, title: 'Persiapan anonim', topic: 'spt', period: '2026', checked: ['pahami'] });
const base = () => ({ profile: { businessName: '', businessType: 'orang-pribadi' as const },
  obligations: [], payments: [], transactions: [], tradeBills: [], chat: [],
  learningCompleted: ['profil-usaha'], sptProgress: { 'op:2025': { documents: true } }, serviceRooms: [room()] });

test('all five clinics have static, unsent consultation drafts and in-app guides', () => {
  assert.equal(SERVICE_TOPICS.length, 5);
  assert.equal(new Set(SERVICE_TOPICS.map(t => t.id)).size, 5);
  for (const topic of SERVICE_TOPICS) {
    const link = new URL(consultationHref(topic.id), 'https://test.invalid');
    assert.equal(link.pathname, '/konsultasi');
    assert.deepEqual([...link.searchParams.keys()], ['pertanyaan']);
    assert.equal(link.searchParams.get('pertanyaan'), topic.question);
    assert.ok(topic.question.length >= 5 && topic.question.length <= 2000);
    assert.ok(topic.guides.every(g => /^\/(belajar|transaksi|laba-rugi|pustaka|glosarium|pembayaran|kewajiban|sp2dk)$/.test(g.href)));
    assert.deepEqual(Object.keys(topic.steps), [...ROOM_STEP_IDS]);
  }
});
test('room validation rejects invalid scopes, duplicated IDs/checks, oversize and malformed data', () => {
  for (const value of [null, {}, [room(), room()], [{ ...room(), title: '' }], [{ ...room(), period: '2026-13' }],
    [{ ...room(), period: '2026-2' }], [{ ...room(), period: '1899' }], [{ ...room(), topic: 'foreign' }],
    [{ ...room(), checked: ['pahami', 'pahami'] }], [{ ...room(), checked: ['filed'] }],
    [{ ...room(), title: 'x'.repeat(81) }], [{ ...room(), title: '\u0000secret' }],
    Array.from({ length: MAX_SERVICE_ROOMS + 1 }, (_, i) => room(String(i)))]) {
    assert.throws(() => assertServiceRooms(value));
  }
  assert.doesNotThrow(() => assertServiceRooms([{ ...room(), period: '2026-11' }]));
});
test('title edits preserve checks, but changing the period or topic resets the scope', () => {
  const original = [room()];
  const edited = saveServiceRoom(original, { ...room(), title: ' Nama baru ' }, true);
  assert.equal(edited[0].title, 'Nama baru');
  assert.deepEqual(edited[0].checked, ['pahami']);
  assert.deepEqual(saveServiceRoom(edited, { ...room(), period: '2025' }, true)[0].checked, []);
  assert.deepEqual(saveServiceRoom(edited, { ...room(), topic: 'sp2dk' }, true)[0].checked, []);
  assert.deepEqual(original, [room()]);
});
test('steps are idempotent and isolated; stale mutations do not recreate deleted rooms', () => {
  const rooms = [room(), room('other')];
  const checked = setServiceRoomStep(rooms, 'room', 'siapkan', true);
  assert.deepEqual(checked[1], rooms[1]);
  assert.deepEqual(setServiceRoomStep(checked, 'room', 'siapkan', true), checked);
  assert.deepEqual(setServiceRoomStep(checked, 'room', 'siapkan', false), rooms);
  assert.deepEqual(deleteServiceRoom(checked, 'room'), [room('other')]);
  assert.throws(() => setServiceRoomStep([], 'room', 'pahami', true));
  assert.throws(() => saveServiceRoom([], room(), true));
  assert.throws(() => deleteServiceRoom([], 'room'));
  assert.deepEqual(rooms, [room(), room('other')]);
});
test('backups preserve absent room sections, merge local-first, strip unknown data, and replace explicitly', () => {
  const current = base();
  const { serviceRooms: _, ...older } = current;
  const oldBackup = parseBackup(JSON.stringify(older));
  for (const mode of ['merge', 'replace'] as const) {
    assert.deepEqual(buildRestore(current, oldBackup, mode).serviceRooms, current.serviceRooms);
  }
  const incoming = parseBackup(JSON.stringify({ ...older, serviceRooms: [
    { ...room(), title: 'Incoming collision', secret: 'not imported' }, room('new'),
  ] }));
  assert.equal('secret' in incoming.serviceRooms![0], false);
  const merged = buildRestore(current, incoming, 'merge');
  assert.deepEqual(merged.serviceRooms, [room(), room('new')]);
  assert.deepEqual(buildRestore(merged, incoming, 'merge'), merged);
  assert.deepEqual(buildRestore(current, { ...oldBackup, serviceRooms: [] }, 'replace').serviceRooms, []);
  assert.throws(() => parseBackup(JSON.stringify({ ...older, serviceRooms: [{ ...room(), checked: ['filed'] }] })));
  assert.notEqual(restoreSnapshot(current), restoreSnapshot({ ...current, serviceRooms: [] }));
});

function harness(initial: unknown = base()) {
  let raw = JSON.stringify(initial), blocked = false;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => raw,
    setItem: (_key: string, value: string) => { if (blocked) throw new DOMException('blocked', 'SecurityError'); raw = value; },
  } });
  return {
    read: () => JSON.parse(raw),
    block: () => { blocked = true; },
    load: () => {
      let store!: ReturnType<typeof useStore>;
      function Capture() { store = useStore(); return null; }
      renderToString(React.createElement(StoreProvider, { children: React.createElement(Capture) }));
      return store;
    },
  };
}
test('real store mutations persist independently without altering other sections', () => {
  const h = harness(), before = h.read();
  h.load().savePreparationRoom({ title: 'Second room', topic: 'pembayaran', period: '2026-11' });
  const added = h.read().serviceRooms[0];
  assert.equal(added.title, 'Second room');
  h.load().setPreparationRoomStep(added.id, 'siapkan', true);
  assert.deepEqual(h.load().serviceRooms[0].checked, ['siapkan']);
  assert.deepEqual(h.load().serviceRooms[1], room());
  h.load().deletePreparationRoom(added.id);
  assert.deepEqual(h.read(), before);
  h.load().setPreparationRoomStep('room', 'tinjau', true);
  for (const field of ['profile', 'transactions', 'tradeBills', 'payments', 'obligations', 'chat', 'learningCompleted', 'sptProgress']) {
    assert.deepEqual(h.read()[field], before[field], field);
  }
});
test('blocked writes and damaged room snapshots never announce a successful mutation', () => {
  const h = harness(), before = h.read();
  h.block();
  assert.throws(() => h.load().savePreparationRoom({ title: 'Not saved', topic: 'umkm', period: '2026' }), /Penyimpanan/);
  assert.deepEqual(h.read(), before);
  const damaged = harness({ ...base(), serviceRooms: [{ ...room(), topic: 'invalid' }] });
  assert.ok(damaged.load().storageError);
  assert.throws(() => damaged.load().deletePreparationRoom('room'));
  assert.equal(damaged.read().serviceRooms[0].topic, 'invalid');
});
