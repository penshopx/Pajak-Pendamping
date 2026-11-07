/** Fixed, reviewed educational content. Never infer tax liability from an answer. */
export interface QuizSource {
  id: string;
  title: string;
  url: string;
  scope: string;
}
export interface QuizQuestion {
  id: string;
  stepId: string;
  prompt: string;
  options: { id: string; label: string; reason: string }[];
  correctId: string;
  explanation: string;
  guide: { label: string; href: string };
  basis: 'app' | 'official';
  sourceIds: string[];
}

// Read on 2026-11-06. The original regulation and example guide are used only
// for terminology, not as consolidated law or instructions for every taxpayer.
export const QUIZ_SOURCES: QuizSource[] = [
  {
    id: 'billing', title: 'DJP — Pembayaran',
    url: 'https://pajak.go.id/reformdjp/coretax-pembayaran/',
    scope: 'Bagian pembuatan kode billing membedakan billing aktif yang belum dibayar. Halaman pengenalan sistem memperingatkan informasi dapat berubah; tidak digunakan untuk masa aktif, tenggat, atau prosedur terkini.',
  },
  {
    id: 'bpn', title: 'JDIH Kemenkeu — PMK 81/2024',
    url: 'https://jdih.kemenkeu.go.id/api/download/637047be-3dba-4347-aba1-98fa7fd5ab3f/2024pmkeuangan081.pdf',
    scope: 'Pasal 1 angka 105 dan 156: pengertian BPN dan NTPN. Naskah asal memiliki perubahan; hanya rujukan istilah, bukan konfirmasi status hukum terkini atau pemeriksaan bukti pengguna.',
  },
  {
    id: 'bpe', title: 'DJP — Panduan SPT Tahunan orang pribadi, versi 20251218',
    url: 'https://pajak.go.id/sites/default/files/2025-12/SPT%20Tahunan%20WP%20OP%20PBT%20%28omzet%20kurang%204%2C8M%29%202025.pdf#page=75',
    scope: 'Bagian akhir “SPT Dilaporkan” menampilkan akses Bukti Penerimaan Elektronik. Contoh WP orang pribadi penghasilan bruto tertentu; hanya pengenalan fungsi BPE, bukan alur baku semua UMKM.',
  },
];

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'modal', stepId: 'catatan-usaha', basis: 'app', sourceIds: [],
    prompt: 'Dalam rekap Sahabat Pajak, pemilik menyetor uang pribadi sebagai tambahan modal usaha, bukan hasil penjualan. Kategori mana yang sesuai?',
    options: [
      { id: 'penjualan', label: 'Pendapatan penjualan', reason: 'Uang ini berasal dari pemilik sebagai modal, bukan pembayaran pelanggan atas penjualan.' },
      { id: 'modal', label: 'Setoran modal', reason: 'Asal dan tujuan uangnya adalah penambahan modal oleh pemilik.' },
      { id: 'pinjaman', label: 'Penerimaan pinjaman', reason: 'Skenario menyebut setoran modal, bukan uang pinjaman yang harus dikembalikan.' },
    ],
    correctId: 'modal',
    explanation: 'Dalam rekap manajemen aplikasi, setoran modal menambah kas tetapi tidak dimasukkan ke pendapatan usaha. Kategori lokal ini bukan penetapan objek pajak atau perlakuan fiskal transaksi Anda.',
    guide: { label: 'Baca batas rekap laba rugi', href: '/laba-rugi' },
  },
  {
    id: 'tautkan-piutang', stepId: 'catatan-usaha', basis: 'app', sourceIds: [],
    prompt: 'Pembayaran pelanggan sudah dicatat satu kali di Transaksi. Saat mencocokkannya ke piutang di Sahabat Pajak, apa yang sebaiknya dilakukan?',
    options: [
      { id: 'baru', label: 'Buat transaksi pemasukan baru untuk uang yang sama', reason: 'Mencatat penerimaan yang sama lagi akan menggandakan kas masuk.' },
      { id: 'tautkan', label: 'Tautkan transaksi lama yang sesuai', reason: 'Penautan menggunakan catatan kas yang sudah ada, bukan membuat penerimaan kedua.' },
      { id: 'abaikan', label: 'Biarkan tanpa dicocokkan karena kas sudah masuk', reason: 'Kas sudah tercatat, tetapi hubungan pembayaran dengan tagihan masih perlu dicocokkan.' },
    ],
    correctId: 'tautkan',
    explanation: 'Periksa arah kas, nominal, dan transaksi pendukung sebelum menautkan transaksi yang tersedia. Penautan tagihan di aplikasi tidak menambah kas lagi dan bukan verifikasi pembayaran pajak.',
    guide: { label: 'Buka panduan piutang dan utang', href: '/piutang-utang' },
  },
  {
    id: 'tautkan-utang', stepId: 'catatan-usaha', basis: 'app', sourceIds: [],
    prompt: 'Pembayaran utang pemasok sudah dicatat di Transaksi sebagai kas keluar. Bagaimana menghubungkannya dengan tagihan utang tanpa mencatat kas keluar dua kali?',
    options: [
      { id: 'masuk', label: 'Tautkan transaksi kas masuk pelanggan', reason: 'Kas masuk pelanggan tidak mewakili pembayaran utang kepada pemasok.' },
      { id: 'baru', label: 'Catat kas keluar yang sama sekali lagi', reason: 'Pencatatan kedua untuk pembayaran yang sama menggandakan kas keluar.' },
      { id: 'tautkan', label: 'Tautkan transaksi kas keluar lama yang sesuai', reason: 'Transaksi itu sudah mewakili pembayaran kepada pemasok.' },
    ],
    correctId: 'tautkan',
    explanation: 'Gunakan transaksi lama yang cocok dan tersedia untuk ditautkan. Dalam aplikasi, penautan mencocokkan tagihan dengan kas yang sudah dicatat; bukan pembayaran baru. Latihan ini tidak menyunting tagihan atau transaksi.',
    guide: { label: 'Buka panduan piutang dan utang', href: '/piutang-utang' },
  },
  {
    id: 'billing', stepId: 'bayar-bukti', basis: 'official', sourceIds: ['billing', 'bpe'],
    prompt: 'Anda baru membuat kode billing dan belum melakukan pembayaran. Apa yang dapat disimpulkan?',
    options: [
      { id: 'lunas', label: 'Pajak sudah dibayar karena kode sudah terbit', reason: 'Kode billing dapat berstatus belum dibayar; terbitnya kode bukan bukti pembayaran.' },
      { id: 'siap', label: 'Kode untuk proses pembayaran tersedia, belum menjadi bukti pembayaran', reason: 'Pembuatan kode dan pelaksanaan pembayaran adalah hal berbeda.' },
      { id: 'lapor', label: 'SPT sudah diterima karena kode sudah terbit', reason: 'Kode untuk pembayaran tidak menunjukkan penerimaan pelaporan SPT.' },
    ],
    correctId: 'siap',
    explanation: 'Halaman pembayaran DJP menjelaskan adanya kode billing aktif yang belum dibayar. Jadi, kode billing saja tidak membuktikan pembayaran. Periksa bukti pembayaran dan hasil pelaporan secara terpisah di saluran resmi.',
    guide: { label: 'Baca panduan pembayaran', href: '/pembayaran' },
  },
  {
    id: 'bukti-bayar', stepId: 'bayar-bukti', basis: 'official', sourceIds: ['bpn', 'billing'],
    prompt: 'Dokumen mana yang berkaitan dengan bukti penerimaan pembayaran/penyetoran ke kas negara, bukan sekadar persiapan membayar?',
    options: [
      { id: 'bpn', label: 'Bukti Penerimaan Negara (BPN) yang mencantumkan NTPN', reason: 'BPN dan NTPN berkaitan dengan transaksi penerimaan negara dan bukti pembayaran/penyetoran.' },
      { id: 'billing', label: 'Kode billing yang baru dibuat', reason: 'Kode billing saja belum merupakan dokumen bukti penerimaan pembayaran.' },
      { id: 'lokal', label: 'Centang “sudah dicatat” di Sahabat Pajak', reason: 'Centang lokal hanya catatan aplikasi, bukan bukti yang diterbitkan saluran resmi.' },
    ],
    correctId: 'bpn',
    explanation: 'Definisi BPN dalam naskah PMK 81/2024 menyebut dokumen penerimaan negara yang mencantumkan NTPN; NTPN didefinisikan sebagai nomor unik tanda bukti pembayaran/penyetoran ke kas negara.',
    guide: { label: 'Baca panduan bukti pembayaran', href: '/pembayaran' },
  },
  {
    id: 'bpe', stepId: 'persiapan-spt', basis: 'official', sourceIds: ['bpe', 'billing'],
    prompt: 'Bukti Penerimaan Elektronik (BPE) pada bagian “SPT Dilaporkan” dalam panduan DJP berkaitan dengan apa?',
    options: [
      { id: 'billing', label: 'Pembuatan kode billing', reason: 'Kode billing berkaitan dengan proses pembayaran, bukan bukti penerimaan pelaporan.' },
      { id: 'belajar', label: 'Tanda selesai belajar di aplikasi', reason: 'Tanda belajar mandiri tidak menerbitkan BPE dan tidak mengirim SPT.' },
      { id: 'lapor', label: 'Penerimaan pelaporan SPT', reason: 'Panduan menampilkan akses BPE pada bagian SPT yang telah dilaporkan.' },
    ],
    correctId: 'lapor',
    explanation: 'Panduan DJP menempatkan akses BPE pada bagian “SPT Dilaporkan”. Fungsi bukti penerimaan pelaporan ini berbeda dari kode billing dan bukti pembayaran. Periksa BPE di saluran resmi, bukan dari hasil latihan.',
    guide: { label: 'Baca panduan pelaporan SPT', href: '/pustaka?guide=spt' },
  },
];

export type QuizAttempt = { selectedId: string; submitted: boolean };
export const emptyQuizAttempt = (): QuizAttempt => ({ selectedId: '', submitted: false });
export type QuizAction = { type: 'select'; optionId: string } | { type: 'submit' } | { type: 'retry' };

/** Pure per-question state: no store, persistence, network, or financial side effects. */
export function updateQuizAttempt(question: QuizQuestion, attempt: QuizAttempt, action: QuizAction): QuizAttempt {
  if (action.type === 'retry') return emptyQuizAttempt();
  if (attempt.submitted) return attempt;
  if (action.type === 'select') {
    if (!question.options.some(option => option.id === action.optionId)) throw new Error('Pilihan latihan tidak valid.');
    return { selectedId: action.optionId, submitted: false };
  }
  if (!question.options.some(option => option.id === attempt.selectedId)) throw new Error('Pilih satu jawaban terlebih dahulu.');
  return { ...attempt, submitted: true };
}

export function quizFeedback(question: QuizQuestion, attempt: QuizAttempt) {
  if (!attempt.submitted) return null;
  const selected = question.options.find(option => option.id === attempt.selectedId);
  const correct = question.options.find(option => option.id === question.correctId);
  if (!selected || !correct) throw new Error('Pemetaan jawaban latihan tidak valid.');
  return { correct: selected.id === correct.id, reason: selected.reason, correctLabel: correct.label, explanation: question.explanation };
}
