export type ServiceTopicId = 'umkm' | 'coretax' | 'pembayaran' | 'spt' | 'sp2dk';
export const ROOM_STEP_IDS = ['pahami', 'siapkan', 'tinjau', 'lanjutkan'] as const;
export type RoomStepId = typeof ROOM_STEP_IDS[number];
export interface ServiceTopic {
  id: ServiceTopicId;
  title: string;
  description: string;
  question: string;
  guides: { label: string; href: string }[];
  steps: Record<RoomStepId, string>;
}
export interface ServiceRoom {
  id: string;
  title: string;
  topic: ServiceTopicId;
  period: string;
  checked: RoomStepId[];
}
export type ServiceRoomInput = Omit<ServiceRoom, 'id' | 'checked'>;
export const MAX_SERVICE_ROOMS = 100;
export const SERVICE_TOPICS: ServiceTopic[] = [
  {
    id: 'umkm', title: 'Usaha & pajak UMKM',
    description: 'Rapikan pencatatan dan kenali hal yang perlu ditanyakan tentang perpajakan usaha.',
    question: 'Saya pemilik UMKM. Apa yang perlu saya periksa tentang pencatatan usaha dan perpajakan? Jelaskan batas sumber dan informasi bentuk usaha serta tahun pajak yang masih diperlukan.',
    guides: [{ label: 'Peta belajar UMKM', href: '/belajar' }, { label: 'Transaksi usaha', href: '/transaksi' }, { label: 'Laba rugi manajemen', href: '/laba-rugi' }],
    steps: { pahami: 'Baca peta belajar dan bedakan pencatatan usaha dari penetapan pajak.',
      siapkan: 'Inventarisasi catatan transaksi dan tagihan untuk periode pilihan.',
      tinjau: 'Tinjau kategori transaksi serta catatan yang perlu diperiksa kembali.',
      lanjutkan: 'Susun pertanyaan tentang bentuk usaha, periode, dan ketentuan yang relevan.' },
  },
  {
    id: 'coretax', title: 'Akses Coretax',
    description: 'Temukan panduan akses akun dan otorisasi tanpa membagikan kredensial.',
    question: 'Bagaimana memilih panduan akses Coretax sesuai kondisi akun dan riwayat penggunaan DJP Online? Jelaskan informasi non-sensitif yang diperlukan dan batas versi sumber.',
    guides: [{ label: 'Panduan di pustaka', href: '/pustaka' }, { label: 'Istilah akun & otorisasi', href: '/glosarium' }],
    steps: { pahami: 'Baca panduan akses akun yang sesuai kondisi Anda.',
      siapkan: 'Catat pertanyaan tentang akses dan otorisasi tanpa menulis kredensial.',
      tinjau: 'Cocokkan panduan dengan versi portal resmi yang Anda lihat.',
      lanjutkan: 'Tentukan langkah konfirmasi ke kanal resmi bila panduan belum cukup.' },
  },
  {
    id: 'pembayaran', title: 'Pembayaran pajak',
    description: 'Hubungkan persiapan pembayaran, panduan billing, dan pencatatan bukti.',
    question: 'Bagaimana membedakan kode billing, pembayaran pajak, dan bukti BPN atau NTPN? Jelaskan alur yang didukung sumber, tanpa menganggap catatan aplikasi sebagai bukti pelunasan.',
    guides: [{ label: 'Panduan & catatan pembayaran', href: '/pembayaran' }, { label: 'Catatan kewajiban', href: '/kewajiban' }, { label: 'Glosarium bukti pajak', href: '/glosarium' }],
    steps: { pahami: 'Baca panduan dan bedakan billing dengan bukti pembayaran.',
      siapkan: 'Inventarisasi jenis pajak, periode, dan catatan pendukung di tempat Anda sendiri.',
      tinjau: 'Periksa ketentuan serta kecocokan data melalui kanal resmi sebelum bertindak.',
      lanjutkan: 'Tentukan tindak lanjut dan tempat pengarsipan bukti; centang ini bukan konfirmasi pelunasan.' },
  },
  {
    id: 'spt', title: 'Persiapan SPT',
    description: 'Pilih panduan sesuai wajib pajak dan susun langkah persiapan pelaporan.',
    question: 'Apa yang perlu disiapkan untuk SPT Tahunan orang pribadi dan badan? Bedakan panduan, persiapan, bukti bayar, serta BPE; tanyakan bentuk wajib pajak dan tahun sebelum menentukan ketentuan kasus.',
    guides: [{ label: 'Panduan SPT di pustaka', href: '/pustaka' }, { label: 'Catatan transaksi', href: '/transaksi' }, { label: 'Rekap manajemen', href: '/laba-rugi' }],
    steps: { pahami: 'Pilih panduan SPT sesuai orang pribadi atau badan.',
      siapkan: 'Inventarisasi catatan dan dokumen tahun pajak atau tahun buku yang relevan.',
      tinjau: 'Periksa kebutuhan akses, otorisasi, isian, dan lampiran lewat panduan serta portal resmi.',
      lanjutkan: 'Susun tindak lanjut pemeriksaan sendiri; tanda di ruang ini bukan bukti SPT dilaporkan.' },
  },
  {
    id: 'sp2dk', title: 'Persiapan SP2DK',
    description: 'Mulai dari panduan anonim dan pertanyaan klarifikasi, bukan pengakuan atau tanggapan resmi.',
    question: 'Apa langkah persiapan menghadapi SP2DK menurut sumber yang tersedia? Bedakan WP terdaftar dan belum terdaftar, pemicu waktu menurut saluran, serta pemberitahuan perpanjangan yang harus diterima KPP. Jangan menghitung tanggal kasus.',
    guides: [{ label: 'Panduan persiapan SP2DK', href: '/sp2dk' }, { label: 'Rujukan resmi', href: '/pustaka' }],
    steps: { pahami: 'Baca batas panduan SP2DK dan cara memeriksa asal surat secara aman.',
      siapkan: 'Inventarisasi kebutuhan persiapan secara anonim, tanpa menyalin surat atau identitas ke ruang ini.',
      tinjau: 'Tinjau hal yang perlu diklarifikasi, termasuk status WP dan saluran penyampaian.',
      lanjutkan: 'Segera konfirmasikan langkah serta waktu ke KPP; jangan menunggu seluruh persiapan dicentang.' },
  },
];

export function serviceTopic(id: ServiceTopicId): ServiceTopic {
  const topic = SERVICE_TOPICS.find(topic => topic.id === id);
  if (!topic) throw new Error('Topik layanan tidak valid.');
  return topic;
}
export function consultationHref(id: ServiceTopicId): string {
  return `/konsultasi?pertanyaan=${encodeURIComponent(serviceTopic(id).question)}`;
}
const validText = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value);
export function assertServiceRooms(value: unknown): asserts value is ServiceRoom[] {
  if (!Array.isArray(value) || value.length > MAX_SERVICE_ROOMS) throw new Error('Daftar ruang persiapan tidak valid atau melebihi 100 ruang.');
  const ids = new Set<string>();
  for (const room of value) {
    if (!room || typeof room !== 'object' || !validText(room.id, 120) || ids.has(room.id)
      || !validText(room.title, 80) || !SERVICE_TOPICS.some(topic => topic.id === room.topic)
      || typeof room.period !== 'string' || !/^(19\d{2}|20\d{2}|2100)(-(0[1-9]|1[0-2]))?$/.test(room.period)
      || !Array.isArray(room.checked) || new Set(room.checked).size !== room.checked.length
      || !room.checked.every((id: unknown) => ROOM_STEP_IDS.includes(id as RoomStepId))) {
      throw new Error('Ruang persiapan tidak valid. Gunakan label anonim, topik yang tersedia, dan periode YYYY atau YYYY-MM (1900–2100).');
    }
    ids.add(room.id);
  }
}
export function saveServiceRoom(rooms: ServiceRoom[], input: ServiceRoomInput & { id: string }, editing = false): ServiceRoom[] {
  assertServiceRooms(rooms);
  const previous = rooms.find(room => room.id === input.id);
  if (editing && !previous) throw new Error('Ruang sudah dihapus. Muat ulang daftar sebelum menyunting.');
  if (!editing && previous) throw new Error('ID ruang sudah digunakan.');
  const nextRoom: ServiceRoom = {
    id: input.id, title: input.title.trim(), topic: input.topic, period: input.period.trim(),
    checked: previous?.topic === input.topic && previous.period === input.period.trim() ? [...previous.checked] : [],
  };
  const next = previous ? rooms.map(room => room.id === input.id ? nextRoom : room) : [nextRoom, ...rooms];
  assertServiceRooms(next);
  return next;
}
export function setServiceRoomStep(rooms: ServiceRoom[], id: string, step: RoomStepId, checked: boolean): ServiceRoom[] {
  assertServiceRooms(rooms);
  if (!rooms.some(room => room.id === id)) throw new Error('Ruang sudah dihapus. Muat ulang daftar.');
  if (!ROOM_STEP_IDS.includes(step) || typeof checked !== 'boolean') throw new Error('Langkah persiapan tidak valid.');
  return rooms.map(room => room.id !== id ? room : { ...room,
    checked: checked ? [...new Set([...room.checked, step])] : room.checked.filter(item => item !== step),
  });
}
export function deleteServiceRoom(rooms: ServiceRoom[], id: string): ServiceRoom[] {
  assertServiceRooms(rooms);
  if (!rooms.some(room => room.id === id)) throw new Error('Ruang sudah dihapus. Muat ulang daftar.');
  return rooms.filter(room => room.id !== id);
}
