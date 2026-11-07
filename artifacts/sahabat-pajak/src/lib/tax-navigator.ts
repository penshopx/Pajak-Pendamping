/** Local discovery of existing app features, not an assessment of tax obligations. */
export const MAX_NAVIGATOR_QUERY = 300;
export interface TaxAction {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly reason: string;
  readonly href: string;
  readonly keywords: readonly string[];
}
export interface NavigatorMatch {
  action: TaxAction;
  matchedTerms: string[];
}
export interface NavigatorResult {
  status: 'idle' | 'matched' | 'unmatched' | 'too-long';
  matches: NavigatorMatch[];
}
export const NAVIGATOR_ACTIONS: readonly TaxAction[] = [
  {
    id: 'transaksi', title: 'Catat transaksi usaha', href: '/transaksi',
    description: 'Catat pemasukan, pengeluaran, dan penyesuaian HPP manual.',
    reason: 'Kebutuhan ini berkaitan dengan pencatatan arus kas usaha.',
    keywords: ['transaksi', 'pemasukan', 'pengeluaran', 'pendapatan', 'omzet', 'penjualan', 'biaya', 'pembukuan', 'buku kas', 'catat uang', 'kas'],
  },
  {
    id: 'laba-rugi', title: 'Lihat rekap laba rugi', href: '/laba-rugi',
    description: 'Tinjau rekap manajemen dari catatan usaha, bukan penetapan pajak terutang.',
    reason: 'Kebutuhan ini berkaitan dengan hasil usaha dan rekap keuangan.',
    keywords: ['laba rugi', 'laba', 'rugi', 'untung', 'profit', 'rekap usaha', 'rekap keuangan', 'laporan keuangan', 'hpp', 'margin'],
  },
  {
    id: 'piutang-utang', title: 'Kelola piutang dan utang', href: '/piutang-utang',
    description: 'Catat tagihan usaha dan hubungkan pelunasannya dengan transaksi kas.',
    reason: 'Kebutuhan ini berkaitan dengan tagihan pelanggan atau pemasok.',
    keywords: ['piutang', 'utang', 'hutang', 'tagihan', 'pelunasan', 'belum dibayar', 'pelanggan belum bayar', 'pemasok'],
  },
  {
    id: 'pembayaran', title: 'Panduan dan catatan pembayaran pajak', href: '/pembayaran',
    description: 'Baca panduan billing dan catat pembayaran; aplikasi tidak menerima setoran atau memverifikasi pelunasan.',
    reason: 'Kebutuhan ini berkaitan dengan pembayaran atau bukti setor pajak.',
    keywords: ['bayar pajak', 'pembayaran', 'setor', 'setoran', 'billing', 'bpn', 'ntpn', 'ebilling', 'e billing', 'deposit pajak'],
  },
  {
    id: 'kewajiban', title: 'Atur catatan kewajiban', href: '/kewajiban',
    description: 'Catat kewajiban serta tenggat yang Anda periksa sendiri dari informasi resmi.',
    reason: 'Kebutuhan ini berkaitan dengan pencatatan jadwal dan tindak lanjut.',
    keywords: ['kewajiban', 'tenggat', 'jatuh tempo', 'deadline', 'jadwal pajak', 'pengingat', 'tandai selesai'],
  },
  {
    id: 'spt', title: 'Panduan persiapan SPT', href: '/pustaka?guide=spt',
    description: 'Buka panduan SPT orang pribadi atau badan dan checklist persiapannya; bukan pengiriman SPT.',
    reason: 'Kebutuhan ini berkaitan dengan persiapan pelaporan dan pemeriksaan bukti penerimaan.',
    keywords: ['spt', 'lapor pajak', 'pelaporan', 'laporan pajak', 'tahunan', 'bpe', 'bukti penerimaan elektronik'],
  },
  {
    id: 'coretax', title: 'Panduan akses Coretax', href: '/pustaka?guide=akses',
    description: 'Pilih panduan akses dan otorisasi sesuai kondisi akun tanpa membagikan kredensial.',
    reason: 'Kebutuhan ini berkaitan dengan akses akun atau otorisasi Coretax.',
    keywords: ['coretax', 'aktivasi', 'aktifkan akun', 'lupa sandi', 'lupa kata sandi', 'lupa password', 'djp online', 'otorisasi', 'sertifikat digital', 'kodjp', 'akses akun', 'login'],
  },
  {
    id: 'sp2dk', title: 'Persiapan menghadapi SP2DK', href: '/sp2dk',
    description: 'Susun persiapan anonim dan pertanyaan klarifikasi; konfirmasikan langkah serta waktu ke KPP.',
    reason: 'Kebutuhan ini berkaitan dengan persiapan klarifikasi surat, bukan pengiriman tanggapan resmi.',
    keywords: ['sp2dk', 'klarifikasi', 'surat pajak', 'surat dari kpp', 'surat dari djp', 'surat permintaan penjelasan'],
  },
  {
    id: 'belajar', title: 'Peta belajar dan latihan pajak', href: '/belajar',
    description: 'Pelajari konsep serta alur kerja UMKM dan coba latihan pemahaman.',
    reason: 'Kebutuhan ini berkaitan dengan belajar sebelum menggunakan panduan atau pencatatan.',
    keywords: ['belajar', 'pemula', 'baru mulai', 'mulai usaha', 'dasar pajak', 'edukasi', 'latihan', 'kuis', 'quiz'],
  },
  {
    id: 'glosarium', title: 'Cari arti istilah pajak', href: '/glosarium',
    description: 'Temukan penjelasan istilah dan kaitannya dengan panduan aplikasi.',
    reason: 'Kebutuhan ini berkaitan dengan memahami istilah, bukan menghitung pajak.',
    keywords: ['istilah', 'arti', 'kepanjangan', 'glosarium', 'definisi', 'pengertian', 'apa itu', 'pph', 'ppn', 'npwp', 'pkp', 'nppn'],
  },
  {
    id: 'pustaka', title: 'Telusuri rujukan resmi', href: '/pustaka',
    description: 'Baca panduan dan rujukan dengan memperhatikan jenis sumber serta batas cakupannya.',
    reason: 'Kebutuhan ini berkaitan dengan mencari rujukan, bukan membeli layanan atau memverifikasi izin.',
    keywords: ['rujukan', 'sumber resmi', 'panduan', 'manual', 'regulasi', 'peraturan', 'dasar hukum', 'konsultan', 'pjap'],
  },
  {
    id: 'konsultasi', title: 'Konsultasi AI bersumber', href: '/konsultasi',
    description: 'Susun pertanyaan sendiri untuk asisten edukasi. Jawaban dapat ditahan bila sumber belum cukup.',
    reason: 'Kebutuhan ini memerlukan pertanyaan lanjutan; Navigator tidak menentukan tarif atau kewajiban Anda.',
    keywords: ['konsultasi', 'bertanya', 'tanya', 'tarif', 'hitung pajak', 'berapa pajak', 'pajak terutang', 'pph 21', 'pph badan'],
  },
  {
    id: 'cadangan', title: 'Cadangkan catatan lokal', href: '/pengaturan',
    description: 'Ekspor atau pulihkan cadangan JSON melalui Pengaturan. Simpan berkas cadangan Anda dengan aman.',
    reason: 'Kebutuhan ini berkaitan dengan pengelolaan catatan lokal, bukan sinkronisasi awan.',
    keywords: ['cadangan', 'cadangkan', 'backup', 'ekspor', 'export', 'pulihkan', 'pemulihan', 'restore', 'pindah perangkat', 'pengaturan'],
  },
];

export const NAVIGATOR_EXAMPLES = [
  { label: 'Catat transaksi', query: 'Catat pemasukan dan pengeluaran' },
  { label: 'Lihat laba rugi', query: 'Lihat rekap laba rugi' },
  { label: 'Tagihan belum dibayar', query: 'Tagihan pelanggan belum dibayar' },
  { label: 'Bayar pajak', query: 'Bayar pajak dan periksa billing' },
  { label: 'Siapkan SPT', query: 'Siapkan SPT Tahunan' },
  { label: 'Akses Coretax', query: 'Akses akun Coretax' },
  { label: 'Menerima SP2DK', query: 'Menerima SP2DK' },
  { label: 'Belajar pajak', query: 'Belajar pajak untuk pemula' },
] as const;

const forms = new Map([
  ['membayar', 'bayar'], ['menyetor', 'setor'], ['mencatat', 'catat'],
  ['pencatatan', 'catat'], ['melaporkan', 'lapor'], ['menghitung', 'hitung'],
]);
function normalize(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).map(word => forms.get(word) ?? word).join(' ');
}

/** Never reads storage, calls AI, forwards the query, or constructs a URL from input. */
export function findTaxActions(query: string): NavigatorResult {
  if (query.length > MAX_NAVIGATOR_QUERY) return { status: 'too-long', matches: [] };
  if (!query.trim()) return { status: 'idle', matches: [] };
  const input = ` ${normalize(query)} `;
  const ranked = NAVIGATOR_ACTIONS.map((action, index) => {
    const terms = new Map(action.keywords.map(term => [normalize(term), term]));
    const found = [...terms].filter(([term]) => input.includes(` ${term} `));
    return {
      action, index, matchedTerms: found.map(([, label]) => label),
      score: found.reduce((sum, [term]) => sum + term.split(' ').length ** 2, 0),
    };
  }).filter(match => match.score > 0).sort((a, b) => b.score - a.score || a.index - b.index);
  return {
    status: ranked.length ? 'matched' : 'unmatched',
    matches: ranked.slice(0, 4).map(({ action, matchedTerms }) => ({ action, matchedTerms })),
  };
}
