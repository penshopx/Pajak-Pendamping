import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { AlertTriangle, ArrowUpRight, LifeBuoy, MessagesSquare, Pencil, Plus, ShieldAlert, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Confirm } from '@/components/confirm';
import { PageHeader, EmptyState, Notice } from '@/components/shell';
import { useStore } from '@/lib/store';
import { usePageTitle } from '@/lib/format';
import {
  SERVICE_TOPICS, ROOM_STEP_IDS, consultationHref, serviceTopic,
  type ServiceRoom, type ServiceTopicId, type RoomStepId,
} from '@/lib/service-center';
import '@/styles/service-center.css';

const DESC = 'Pusat Layanan Sahabat Pajak: konsultasi per topik dan ruang persiapan per periode yang tersimpan di peramban Anda. Bukan konfirmasi kepatuhan.';
const STEP_LABEL: Record<RoomStepId, string> = { pahami: 'Pahami', siapkan: 'Siapkan', tinjau: 'Tinjau', lanjutkan: 'Lanjutkan' };
const PERIOD_RE = /^(19\d{2}|20\d{2}|2100)(-(0[1-9]|1[0-2]))?$/;
const msg = (e: unknown) => e instanceof Error ? e.message : 'Perubahan gagal disimpan.';

function useMeta() {
  useEffect(() => {
    const set = (sel: string, attr: string, key: string, value: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(sel);
      const created = !el;
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
      const prev = el.content; el.content = value;
      return () => { if (created) el!.remove(); else el!.content = prev; };
    };
    const undo = [
      set('meta[name="description"]', 'name', 'description', DESC),
      set('meta[property="og:title"]', 'property', 'og:title', 'Pusat Layanan · Sahabat Pajak'),
      set('meta[property="og:description"]', 'property', 'og:description', DESC),
    ];
    return () => undo.forEach(fn => fn());
  }, []);
}

interface Draft { id?: string; title: string; topic: ServiceTopicId; period: string }

function RoomForm({ initial, original, onDone }: { initial: Draft; original?: ServiceRoom; onDone: () => void }) {
  const { savePreparationRoom } = useStore();
  const [d, setD] = useState<Draft>(initial);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { document.getElementById('room-title')?.focus(); }, []);
  const title = d.title.trim(), period = d.period.trim();
  const titleErr = !title ? 'Isi label ruang.' : d.title.length > 80 ? 'Maksimal 80 karakter.' : null;
  const periodErr = !PERIOD_RE.test(period) ? 'Gunakan YYYY atau YYYY-MM, tahun 1900–2100.' : null;
  const scopeChanged = !!original && (original.topic !== d.topic || original.period !== period);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (titleErr || periodErr) { setErr(titleErr ?? periodErr); return; }
    try { savePreparationRoom({ id: d.id, title, topic: d.topic, period }); onDone(); }
    catch (x) { setErr(msg(x)); }
  };
  return (
    <form onSubmit={submit} className="rise rounded-2xl border border-primary/40 bg-card p-4 sm:p-6" data-testid="form-room">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-bold text-white">{d.id ? 'Sunting ruang' : 'Ruang persiapan baru'}</h2>
        <Button type="button" variant="ghost" size="icon" onClick={onDone} aria-label="Tutup formulir" data-testid="button-close-form"><X className="h-4 w-4" /></Button>
      </div>
      <fieldset className="mt-4">
        <legend className="text-sm font-semibold text-white">Topik</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICE_TOPICS.map(t => (
            <button type="button" key={t.id} aria-pressed={d.topic === t.id} onClick={() => setD({ ...d, topic: t.id })}
              className="svc-topic press rounded-xl border border-input px-3 py-2.5 text-left text-sm font-semibold text-white" data-testid={`button-topic-${t.id}`}>
              {t.title}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="mt-4 grid gap-4 sm:grid-cols-[2fr_1fr]">
        <div>
          <Label htmlFor="room-title" className="text-white">Label anonim</Label>
          <Input id="room-title" value={d.title} maxLength={80} onChange={e => setD({ ...d, title: e.target.value })}
            placeholder="mis. Persiapan tahunan toko" className="mt-1.5" data-testid="input-room-title" aria-invalid={!!titleErr && !!d.title} />
          <p className="mt-1 text-xs text-muted-foreground"><span className="num">{d.title.length}</span>/80. Jangan tulis NPWP, NIK, kata sandi, OTP, atau isi dokumen asli.</p>
        </div>
        <div>
          <Label htmlFor="room-period" className="text-white">Periode</Label>
          <Input id="room-period" value={d.period} onChange={e => setD({ ...d, period: e.target.value })}
            placeholder="2024 atau 2024-03" inputMode="numeric" className="num mt-1.5" data-testid="input-room-period" aria-invalid={!!periodErr && !!d.period} />
          <p className="mt-1 text-xs text-muted-foreground">Hanya penanda; aplikasi tidak menghitung tenggat.</p>
        </div>
      </div>
      {scopeChanged && (
        <div className="mt-4"><Notice tone="warn" icon={AlertTriangle}>
          <b>Topik atau periode berubah.</b> Saat disimpan, semua centang di ruang ini dikosongkan karena langkahnya milik cakupan lama. Mengubah label saja tidak menghapus centang.
        </Notice></div>
      )}
      {err && <p role="alert" className="mt-4 rounded-lg border border-destructive/60 bg-destructive/15 px-3 py-2 text-sm text-white" data-testid="text-form-error">{err}</p>}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="submit" className="press font-semibold" data-testid="button-save-room">Simpan ruang</Button>
        <Button type="button" variant="outline" className="border-input" onClick={onDone} data-testid="button-cancel-room">Batal</Button>
      </div>
    </form>
  );
}

function RoomCard({ room, onEdit }: { room: ServiceRoom; onEdit: () => void }) {
  const { setPreparationRoomStep, deletePreparationRoom } = useStore();
  const [err, setErr] = useState<string | null>(null);
  const topic = serviceTopic(room.topic);
  const count = room.checked.length;
  const toggle = (step: RoomStepId, checked: boolean) => {
    try { setPreparationRoomStep(room.id, step, checked); setErr(null); } catch (x) { setErr(msg(x)); }
  };
  const remove = () => { try { deletePreparationRoom(room.id); } catch (x) { setErr(msg(x)); } };
  return (
    <article className="rise rounded-2xl border border-border bg-card p-4 sm:p-5" data-testid={`card-room-${room.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">{topic.title} · <span className="num">{room.period}</span></div>
          <h3 className="mt-1 break-words text-lg font-bold text-white" data-testid={`text-room-title-${room.id}`}>{room.title}</h3>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label={`Sunting ${room.title}`} data-testid={`button-edit-room-${room.id}`}><Pencil className="h-4 w-4" /></Button>
          <Confirm title="Hapus ruang persiapan?" confirmLabel="Hapus ruang"
            desc="Hanya ruang ini beserta centangnya yang dihapus. Transaksi, kewajiban, pembayaran, checklist SPT, dan catatan lain tidak berubah."
            onConfirm={remove}
            trigger={<Button variant="ghost" size="icon" aria-label={`Hapus ${room.title}`} data-testid={`button-delete-room-${room.id}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>} />
        </div>
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span data-testid={`text-room-count-${room.id}`}><span className="num text-white">{count}/4</span> langkah ditandai oleh Anda</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="svc-bar h-full bg-primary" style={{ transform: `scaleX(${count / 4})` }} />
        </div>
        {count === 4 && <p className="mt-2 text-xs text-muted-foreground">Semua langkah ditandai. Ini catatan pribadi, bukan bukti kewajiban terpenuhi, dibayar, atau dilaporkan.</p>}
      </div>
      <ul className="mt-4 grid gap-2">
        {ROOM_STEP_IDS.map(step => (
          <li key={step}>
            <label className="svc-step flex cursor-pointer gap-3 rounded-xl border border-border px-3 py-2.5 text-sm">
              <input type="checkbox" checked={room.checked.includes(step)} onChange={e => toggle(step, e.target.checked)} data-testid={`checkbox-${step}-${room.id}`} />
              <span><b className="text-white">{STEP_LABEL[step]}.</b> <span className="text-foreground/85">{topic.steps[step]}</span></span>
            </label>
          </li>
        ))}
      </ul>
      {room.topic === 'sp2dk' && (
        <div className="mt-3"><Notice tone="warn" icon={ShieldAlert}>Ruang ini bukan tempat menyimpan surat asli atau draf tanggapan. Segera hubungi KPP untuk konfirmasi langkah dan waktu; jangan menunggu semua langkah dicentang.</Notice></div>
      )}
      {err && <p role="alert" className="mt-3 rounded-lg border border-destructive/60 bg-destructive/15 px-3 py-2 text-sm text-white" data-testid={`text-room-error-${room.id}`}>{err}</p>}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {topic.guides.map(g => (
          <Link key={g.href + g.label} href={g.href} className="inline-flex items-center gap-1 font-semibold text-accent underline-offset-4 hover:underline" data-testid={`link-guide-${room.id}-${g.href.slice(1)}`}>{g.label}<ArrowUpRight className="h-3.5 w-3.5" /></Link>
        ))}
        <Link href={consultationHref(room.topic)} className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline" data-testid={`link-consult-${room.id}`}><MessagesSquare className="h-3.5 w-3.5" />Draf pertanyaan umum</Link>
      </div>
    </article>
  );
}

export default function Layanan() {
  usePageTitle('Pusat Layanan');
  useMeta();
  const { serviceRooms } = useStore();
  const [form, setForm] = useState<{ draft: Draft; original?: ServiceRoom } | null>(null);
  const [filter, setFilter] = useState<ServiceTopicId | 'all'>('all');
  const rooms = useMemo(() => filter === 'all' ? serviceRooms : serviceRooms.filter(r => r.topic === filter), [serviceRooms, filter]);
  const startNew = (topic: ServiceTopicId = 'umkm') => setForm({ draft: { title: '', topic, period: String(new Date().getFullYear()) } });
  return (
    <div className="service-center min-w-0">
      <PageHeader eyebrow="Pusat Layanan" title="Satu topik, satu ruang persiapan."
        desc="Pilih topik, baca panduan, lalu siapkan pertanyaan. Ruang tersimpan di peramban ini per topik dan periode, terpisah dari checklist SPT, kerangka SP2DK sesi, dan tanda belajar."
        actions={<Button className="press font-semibold" onClick={() => startNew()} data-testid="button-new-room"><Plus className="mr-1.5 h-4 w-4" />Ruang baru</Button>} />

      <Notice icon={ShieldAlert}>Konsultasi hanya menjawab dari sumber yang tersedia dan dapat menahan jawaban bila sumber belum cukup. Tautan konsultasi membuka draf yang bisa Anda sunting; tidak terkirim otomatis dan tidak memuat isi ruang Anda.</Notice>

      <section className="mt-8" aria-labelledby="h-topics">
        <h2 id="h-topics" className="text-xl font-bold text-white">Topik konsultasi</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICE_TOPICS.map(t => (
            <div key={t.id} className="svc-topic-card lift flex flex-col rounded-2xl border border-border bg-card/70 p-4" data-testid={`card-topic-${t.id}`}>
              <h3 className="font-bold text-white">{t.title}</h3>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{t.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="border-input" onClick={() => startNew(t.id)} data-testid={`button-room-topic-${t.id}`}><Plus className="mr-1 h-3.5 w-3.5" />Ruang</Button>
                <Button size="sm" variant="ghost" asChild><Link href={consultationHref(t.id)} data-testid={`link-ask-${t.id}`}>Draf pertanyaan</Link></Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="h-rooms">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="h-rooms" className="text-xl font-bold text-white">Ruang persiapan <span className="num text-muted-foreground">({serviceRooms.length})</span></h2>
          {serviceRooms.length > 0 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Saring topik">
              {(['all', ...SERVICE_TOPICS.map(t => t.id)] as const).map(id => (
                <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}
                  className="svc-topic press rounded-full border border-input px-3 py-1 text-xs font-semibold text-white" data-testid={`filter-${id}`}>
                  {id === 'all' ? 'Semua' : serviceTopic(id).title}
                </button>
              ))}
            </div>
          )}
        </div>
        {form && <div className="mt-4"><RoomForm key={form.draft.id ?? `new-${form.draft.topic}`} initial={form.draft} original={form.original} onDone={() => { setForm(null); setFilter('all'); }} /></div>}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {rooms.map(r => <RoomCard key={r.id} room={r} onEdit={() => setForm({ draft: { id: r.id, title: r.title, topic: r.topic, period: r.period }, original: r })} />)}
        </div>
        {serviceRooms.length === 0 && !form && (
          <EmptyState icon={LifeBuoy} title="Belum ada ruang persiapan" desc="Buat ruang untuk satu topik dan periode. Centang langkah yang sudah Anda kerjakan; tanda ini catatan pribadi, bukan konfirmasi kepatuhan."
            action={<Button className="press font-semibold" onClick={() => startNew()} data-testid="button-empty-new-room"><Plus className="mr-1.5 h-4 w-4" />Buat ruang pertama</Button>} />
        )}
        {serviceRooms.length > 0 && rooms.length === 0 && <p className="mt-4 text-sm text-muted-foreground">Tidak ada ruang untuk topik ini.</p>}
      </section>

      <p className="mt-10 text-xs leading-relaxed text-muted-foreground">Tidak ada unggah dokumen, sinkronisasi awan, pemesanan konsultan, atau pembayaran di sini. Data ruang ikut cadangan lokal melalui Pengaturan.</p>
    </div>
  );
}
