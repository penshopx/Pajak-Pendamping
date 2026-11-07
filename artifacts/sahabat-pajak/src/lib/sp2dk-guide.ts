export const SP2DK_SOURCES = [
  { id: 'pmk111', title: 'PMK 111 Tahun 2025 — Pengawasan Kepatuhan Wajib Pajak',
    url: 'https://pajak.go.id/id/peraturan/pengawasan-kepatuhan-wajib-pajak',
    kind: 'Naskah peraturan pada situs DJP',
    locator: 'Pasal 5–8 (WP terdaftar), Pasal 15–16 (WP belum terdaftar), Pasal 30 (berlaku 1 Januari 2026).',
    limitation: 'Bagian yang diringkas, bukan analisis seluruh lampiran atau jaminan konsolidasi perubahan terbaru. Surat dan kejadian sebelum berlakunya aturan memerlukan peninjauan tersendiri.',
    reviewedAt: '2026-11-07' },
  { id: 'layanan', title: 'DJP — Surat Tanggapan atas SP2DK',
    url: 'https://pajak.go.id/panduan-layanan-pajak/konten/layanan-digital/2025/pengawasan/surat-wajib-pajak/surat-tanggapan-atas-surat-permintaan-penjelasan-data-dan-keterangan-%28sp2dk%29',
    kind: 'Panduan layanan berlabel 2025',
    locator: 'Informasi umum dan prosedur penyampaian melalui akun WP; bukti penerimaan setelah penyampaian.',
    limitation: 'Bukan penjelasan lengkap pemicu tenggat. Tombol akses pada halaman sumber mengarah ke intranet, bukan portal publik. Jangan menyalin alamat intranet atau menganggap menu versi ini pasti tersedia pada akun Anda.',
    reviewedAt: '2026-11-06' },
  { id: 'kontak', title: 'DJP — Direktori Unit Kerja',
    url: 'https://pajak.go.id/id/unit-kerja',
    kind: 'Direktori resmi',
    locator: 'Tautan daftar unit kerja dan wilayah administrasi untuk mencari kantor terkait.',
    limitation: 'Sarana mencari kontak resmi, bukan pemeriksa otomatis keaslian surat atau konfirmasi perkara pengguna.',
    reviewedAt: '2026-11-06' },
] as const;

export const SP2DK_TIME_NOTES = [
  'WP terdaftar: Pasal 6 ayat (2) mengatur paling lama 14 hari sejak peristiwa yang lebih dahulu sesuai saluran. Pemicu mencakup penerbitan melalui akun WP, pengiriman email terdaftar, bukti pengiriman faksimile/pos/ekspedisi/kurir, atau penyampaian langsung. Bukan selalu sejak surat dibaca atau diterima sendiri.',
  'WP belum terdaftar: Pasal 16 ayat (2) mengatur paling lama 14 hari sejak peristiwa yang lebih dahulu: penerbitan bila akun telah aktif, aktivasi akun bila belum aktif, bukti pengiriman pos/ekspedisi/kurir, atau penyampaian langsung. Aktivasi akun bukan alasan mengabaikan pemicu pos atau langsung yang lebih dahulu. Jangan menyalin pemicu email/faksimile WP terdaftar ke cabang ini.',
  'Perpanjangan bagi WP terdaftar maupun belum terdaftar: Pasal 6 ayat (5)–(7) dan Pasal 16 ayat (5)–(7) mengatur paling lama 7 hari setelah jangka tanggapan berakhir, dengan pemberitahuan tertulis yang harus diterima KPP sebelum jangka tanggapan awal berakhir. Bukan perpanjangan otomatis dan bukan cukup membuat draf atau mengirim pada menit terakhir.',
  'Aplikasi tidak menghitung tanggal jatuh tempo, hari libur, atau keabsahan pemberitahuan. Segera konfirmasikan status WP, semua saluran/tanggal penyampaian, aturan yang relevan, dan waktu tanggapan kepada KPP; jangan menunggu persiapan ini selesai.',
  'Jangan mengganti istilah “hari” dalam ketentuan ini menjadi “hari kerja” atau memakai rumus penambahan hari kerja. Ayat (8) memperbolehkan tanggapan lebih dari sekali dalam jangka yang ditentukan, bukan menambah 7 hari untuk setiap permohonan perpanjangan.',
] as const;

export const SP2DK_STEPS = [
  { id: 'asal-surat', title: 'Periksa asal surat dengan aman', sourceIds: ['kontak'],
    description: 'Cari kontak KPP secara terpisah melalui direktori DJP. Cocokkan penerbit, perihal, dan konteks surat dengan petugas resmi. Ini saran keamanan aplikasi, bukan hasil autentikasi surat.',
    tasks: ['Jangan mengandalkan logo, nomor telepon pada pesan, atau klaim pengirim saja.', 'Jangan membuka APK, membagikan OTP, kata sandi, passphrase, atau mentransfer dana ke rekening pribadi untuk “menutup” SP2DK.'],
    check: 'Saya sudah menyiapkan catatan konfirmasi asal surat melalui kontak resmi.' },
  { id: 'ruang-lingkup', title: 'Petakan hal yang diminta', sourceIds: ['pmk111'],
    description: 'SP2DK adalah permintaan penjelasan atas data dan/atau keterangan dalam pengawasan. Surat ini sendiri bukan penetapan otomatis bahwa ada pajak kurang bayar; tindak lanjut tetap bergantung pada penelitian DJP.',
    tasks: ['Baca tiap poin, periode/tahun pajak, serta status WP yang berkaitan.', 'Catat hal yang belum jelas untuk ditanyakan kepada KPP. Jangan otomatis menyetujui semua angka atau menyimpulkan bebas kewajiban.'],
    check: 'Saya sudah memetakan pokok permintaan dan periode yang perlu diperiksa.' },
  { id: 'waktu-saluran', title: 'Konfirmasi waktu dan saluran tanggapan', sourceIds: ['pmk111'],
    description: 'Batas waktu bergantung pada konteks WP dan kejadian penyampaian. Periksa catatan semua saluran, bukan hanya tanggal Anda membuka surat.',
    tasks: ['Baca catatan waktu di panduan ini, lalu konfirmasi penerapannya kepada KPP.', 'Jika membutuhkan tambahan waktu, tanyakan cara pemberitahuan dan pastikan persyaratan penerimaan oleh KPP terpenuhi sebelum jangka awal berakhir.'],
    check: 'Saya sudah mencatat hasil konfirmasi KPP tentang waktu dan saluran tanggapan.' },
  { id: 'data-pembanding', title: 'Siapkan dokumen yang relevan', sourceIds: ['pmk111'],
    description: 'Susun pembanding sesuai poin surat. Daftar berikut merupakan contoh persiapan, bukan kewajiban menyerahkan semua dokumen untuk setiap kasus.',
    tasks: ['Bila relevan: SPT dan bukti penerimaan, catatan transaksi/laporan keuangan, bukti potong, BPN/NTPN, faktur, kontrak, serta penjelasan selisih.', 'Periksa mutasi rekening atau dokumen pendukung lain hanya bila terkait; simpan dokumen asli di tempat aman, bukan di aplikasi ini.', 'Bedakan data yang sudah cocok, berbeda, belum ditemukan, dan masih memerlukan klarifikasi. Jangan mengarang bukti.'],
    check: 'Saya sudah membuat daftar dokumen pembanding yang relevan beserta kekurangannya.' },
  { id: 'kerangka-ditinjau', title: 'Susun penjelasan untuk ditinjau', sourceIds: ['pmk111'],
    description: 'Gunakan kerangka netral: pokok permintaan, fakta menurut catatan, dokumen pendukung, dan hal yang perlu dikonfirmasi. Bila tidak menyetujui data, siapkan bukti yang mendukung penjelasan.',
    tasks: ['Gunakan label anonim pada formulir; lengkapi identitas dan nomor surat pada dokumen kerja sendiri di luar aplikasi.', 'Tinjau kelengkapan, konsistensi angka, dasar penjelasan, dan kewenangan penandatangan. Minta bantuan konsultan berizin bila diperlukan.', 'Jangan membetulkan SPT atau membayar semata-mata karena aplikasi menghasilkan draf; periksa kondisi dan ketentuannya terlebih dahulu.'],
    check: 'Saya sudah menyiapkan kerangka untuk diperiksa sendiri atau bersama pendamping.' },
  { id: 'arsip-tindak-lanjut', title: 'Rencanakan penyampaian dan arsip', sourceIds: ['pmk111', 'layanan'],
    description: 'Sampaikan sendiri melalui saluran resmi yang sesuai. Pasal 6 dan Pasal 16 mensyaratkan kondisi akun/saluran tertentu; tidak semua kasus wajib memakai satu alur Coretax.',
    tasks: ['Konfirmasikan ketersediaan layanan akun WP atau saluran lain yang sesuai dengan KPP penerbit.', 'Simpan salinan tanggapan, daftar lampiran, serta bukti penyampaian/penerimaan sesuai saluran. Untuk layanan elektronik, periksa bukti penerimaan pada akun resmi.', 'Pantau permintaan lanjutan atau undangan. Bukti penerimaan tidak berarti penjelasan disetujui atau pengawasan ditutup.'],
    check: 'Saya sudah menyiapkan cara mengarsipkan bukti penyampaian dan memantau tindak lanjut.' },
] as const;

export const SP2DK_DRAFT_FIELDS = [
  { id: 'scope', label: 'Pokok permintaan dan periode', placeholder: 'Contoh anonim: poin A meminta penjelasan perbedaan data penjualan pada periode yang disebut dalam surat.' },
  { id: 'facts', label: 'Penjelasan faktual menurut catatan', placeholder: 'Uraikan fakta yang sudah diperiksa. Pisahkan bagian yang masih belum pasti; jangan mengisi kesimpulan otomatis.' },
  { id: 'evidence', label: 'Daftar label dokumen pendukung', placeholder: 'Contoh: Lampiran A — rekap penjualan; Lampiran B — pembanding transaksi. Jangan unggah atau menyalin data sensitif.' },
  { id: 'questions', label: 'Hal yang masih perlu dikonfirmasi', placeholder: 'Catat dokumen yang belum ada, perbedaan yang belum terjelaskan, dan pertanyaan bagi KPP atau konsultan.' },
] as const;
export type Sp2dkDraft = Record<typeof SP2DK_DRAFT_FIELDS[number]['id'], string>;
export const SP2DK_DRAFT_LIMIT = 1600;
export const emptySp2dkDraft = (): Sp2dkDraft => ({ scope: '', facts: '', evidence: '', questions: '' });
export const SP2DK_PRIVACY_NOTICE = 'Isian dan centang hanya sementara pada halaman ini; tidak disimpan otomatis atau dikirim ke server/AI. Keduanya hilang saat meninggalkan halaman atau memuat ulang. Unduh kerangka jika ingin menyimpannya. Jangan masukkan NIK/NPWP, nomor surat lengkap, identitas pihak lain, rekening, kredensial, atau salinan dokumen asli.';

export function buildSp2dkDraft(draft: Sp2dkDraft, checkedIds: readonly string[] = []) {
  for (const f of SP2DK_DRAFT_FIELDS) {
    if (typeof draft[f.id] !== 'string' || draft[f.id].length > SP2DK_DRAFT_LIMIT) {
      throw new Error(`Isian "${f.label}" harus berupa teks maksimal ${SP2DK_DRAFT_LIMIT} karakter.`);
    }
  }
  const body = SP2DK_DRAFT_FIELDS.map((f, i) => {
    const text = draft[f.id].replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
    return `${i + 1}. ${f.label.toUpperCase()}\n${text || '[Belum diisi — lengkapi dan tinjau sendiri]'}`;
  }).join('\n\n');
  const checks = SP2DK_STEPS.map(s => `[${checkedIds.includes(s.id) ? 'x' : ' '}] ${s.check}`).join('\n');
  return `DRAF PERSIAPAN TANGGAPAN SP2DK — BUKAN SURAT SIAP KIRIM
Disusun dengan alat bantu Sahabat Pajak. Bukan dokumen resmi DJP.
BELUM DIVERIFIKASI. Bukan penetapan pajak, bukan pengakuan atas angka dalam surat, bukan bukti penyampaian, dan bukan jaminan pengawasan ditutup.

Lengkapi sendiri DI LUAR APLIKASI:
[KPP penerbit dan tujuan penyampaian yang sudah dikonfirmasi]
[Identitas WP, rujukan nomor/tanggal surat, kedudukan dan kewenangan penandatangan]
Jangan mengirim dokumen ini sebelum semua placeholder dan isian ditinjau.

${body}

DAFTAR PERIKSA PERSIAPAN PRIBADI
Centang adalah pengakuan pengguna, bukan validasi KPP atau status perkara.
${checks}

CATATAN WAKTU — BUKAN PERHITUNGAN TENGGAT
${SP2DK_TIME_NOTES.join('\n\n')}

TINJAU SEBELUM MENYAMPAIKAN
Periksa kebenaran fakta, kelengkapan bukti, dasar penjelasan, identitas dan kewenangan penandatangan, waktu serta saluran resmi. Minta bantuan profesional bila perlu. Simpan bukti penerimaan dan pantau tindak lanjut; tidak ada pengiriman otomatis dari aplikasi.

RUJUKAN
${SP2DK_SOURCES.map(s => `${s.title}\n${s.url}\nBagian: ${s.locator}\nBatasan: ${s.limitation}\nTanggal kurasi: ${s.reviewedAt} — bukan persetujuan sumber untuk AI. Status kesiapan terbaru dapat dilihat di aplikasi.`).join('\n\n')}

File ini memuat isian yang Anda masukkan. Simpan dan bagikan secara hati-hati.
`;
}

export const SP2DK_AI_DRAFT_HREF = `/konsultasi?pertanyaan=${encodeURIComponent('Jelaskan tujuan SP2DK dan cara menyiapkan dokumen pembanding untuk UMKM. Gunakan sumber yang mendukung, bedakan WP terdaftar dan belum terdaftar, serta nyatakan keterbatasannya. Jangan menghitung tenggat atau menyimpulkan kewajiban kasus saya tanpa data yang cukup. Saya tidak membagikan identitas atau surat asli.')}`;
