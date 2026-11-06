/** Navigation and self-assessment, not a tax assessment or a duplicate legal library. */
export interface LearningStep {
  id: string;
  title: string;
  duration: string;
  purpose: string;
  takeaways: string[];
  practice: string[];
  selfCheck: string[];
  actions: { label: string; href: string }[];
  library: { label: string; href: string };
  question: string;
}
export const LEARNING_STEPS: LearningStep[] = [
  {
    id: 'profil-usaha', title: 'Kenali profil dan kewajiban usaha', duration: '5–10 menit',
    purpose: 'Mulai dari kondisi usaha Anda, bukan langsung memilih tarif.',
    takeaways: [
      'Sebutan UMKM saja belum cukup untuk menentukan seluruh kewajiban. Bedakan usaha orang pribadi dengan badan, lalu periksa kondisi yang relevan.',
      'Siapkan informasi umum: bentuk usaha, tahun pajak, kegiatan usaha, omzet, keberadaan karyawan, dan status PKP bila ada. Jangan menebak status yang belum Anda ketahui.',
      'Profil di Sahabat Pajak hanya catatan lokal. Mengubahnya tidak mendaftarkan NPWP atau memperbarui data DJP.',
    ],
    practice: ['Isi bentuk wajib pajak di Pengaturan.', 'Tulis hal yang belum Anda ketahui untuk ditanyakan sebelum menentukan kewajiban.'],
    selfCheck: ['Saya bisa menyebutkan apakah usaha dicatat sebagai orang pribadi atau badan.', 'Saya tahu informasi apa yang masih perlu dikonfirmasi, tanpa memasukkan NIK, NPWP, atau kredensial ke chat.'],
    actions: [{ label: 'Periksa profil usaha', href: '/pengaturan' }, { label: 'Lihat catatan kewajiban', href: '/kewajiban' }],
    library: { label: 'Baca rujukan registrasi', href: '/pustaka?category=Registrasi' },
    question: 'Informasi umum apa yang perlu disiapkan UMKM orang pribadi dan badan untuk memeriksa kewajiban pajaknya? Bedakan kedua kelompok dan sebutkan hal yang belum dapat ditentukan tanpa tahun pajak serta kondisi usaha. Jangan meminta NIK, NPWP, atau kata sandi.',
  },
  {
    id: 'dasar-skema', title: 'Pahami jenis penghasilan dan skema pajak', duration: '10–15 menit',
    purpose: 'Belajar mengajukan pertanyaan yang tepat sebelum memakai skema atau fasilitas pajak.',
    takeaways: [
      'Kenali istilah objek pajak, bukan objek pajak, final, dan nonfinal. Istilah ini membantu membaca sumber, bukan alasan mengelompokkan transaksi tanpa pemeriksaan.',
      'Jangan menganggap semua UMKM otomatis memakai skema yang sama. Jenis penghasilan, bentuk usaha, tahun pajak, dan ketentuan peralihan dapat memengaruhi penilaian.',
      'Tarif atau contoh hitung dari iklan bukan dasar hukum. Baca sumber resmi beserta perubahan dan cakupannya; tanyakan bila bukti belum cukup.',
    ],
    practice: ['Buka rujukan regulasi di Pustaka dan perhatikan jenis serta batas cakupan sumber.', 'Siapkan pertanyaan tentang skema yang sesuai kondisi Anda, tanpa langsung menetapkan pajak terutang.'],
    selfCheck: ['Saya tidak menyamakan laba usaha, omzet, dan pajak terutang.', 'Saya tahu bahwa kelayakan fasilitas harus diperiksa, bukan disimpulkan hanya dari label UMKM.'],
    actions: [{ label: 'Buka pustaka regulasi', href: '/pustaka?category=Regulasi' }],
    library: { label: 'Telusuri sumber regulasi', href: '/pustaka?category=Regulasi' },
    question: 'Jelaskan perbedaan objek pajak, bukan objek pajak, penghasilan final, dan nonfinal untuk pembelajaran UMKM. Informasi dan sumber resmi apa yang perlu diperiksa sebelum menentukan skema? Jangan menetapkan tarif atau kelayakan kasus saya tanpa data dan bukti yang cukup.',
  },
  {
    id: 'akses-coretax', title: 'Siapkan akses Coretax dan otorisasi', duration: '10–15 menit',
    purpose: 'Temukan panduan akses yang cocok dengan kondisi akun, tanpa menyerahkan kredensial.',
    takeaways: [
      'Panduan akses bisa berbeda menurut kondisi pendaftaran dan akun sebelumnya. Gunakan pilihan kondisi pada panduan Akses Coretax & KODJP.',
      'Untuk badan, periksa penanggung jawab dan peran akses yang sesuai. Jangan menganggap akses akun pribadi otomatis memberi kewenangan bertindak untuk badan.',
      'Sahabat Pajak tidak masuk ke akun DJP Anda. Kata sandi, kode verifikasi, dan kode otorisasi tetap berada pada saluran resmi serta pihak yang berwenang.',
    ],
    practice: ['Buka panduan akses dan pilih kondisi akun yang benar.', 'Baca rujukan asli sebelum melakukan langkah di Coretax; catat pertanyaan bila kondisi Anda tidak tercakup.'],
    selfCheck: ['Saya tahu panduan kondisi akun mana yang perlu diikuti.', 'Saya memahami bahwa memiliki akun, memiliki peran akses, dan memperoleh otorisasi bukan hal yang selalu sama.'],
    actions: [{ label: 'Buka panduan akses Coretax', href: '/pustaka?guide=akses' }],
    library: { label: 'Rujukan akses dan otorisasi', href: '/pustaka?guide=akses&q=Coretax' },
    question: 'Bagaimana memilih panduan akses Coretax berdasarkan kondisi akun sebelumnya? Bedakan akses orang pribadi, penanggung jawab/peran badan, dan Kode Otorisasi DJP. Jelaskan batas sumber yang tersedia dan jangan meminta kredensial.',
  },
  {
    id: 'catatan-usaha', title: 'Rapikan catatan usaha dan tagihan', duration: '10–15 menit',
    purpose: 'Bangun kebiasaan pencatatan sebelum menyiapkan angka untuk pelaporan.',
    takeaways: [
      'Pisahkan pendapatan/beban dari setoran modal, prive, dan pinjaman. Tidak semua kas masuk adalah pendapatan atau kas keluar adalah beban.',
      'Rekap aplikasi adalah rekap manajemen kas dengan HPP nonkas manual, bukan pembukuan akrual lengkap atau laba fiskal. Pembelian persediaan tidak otomatis sama dengan HPP.',
      'Tagihan piutang/utang belum dibayar tidak otomatis masuk laba rugi sederhana. Jika pembayaran sudah ada di Transaksi, tautkan transaksi itu agar kas tidak dihitung dua kali.',
    ],
    practice: ['Periksa kategori pada satu catatan usaha milik Anda, atau amati keadaan kosong tanpa memasukkan data fiktif sebagai data nyata.', 'Cocokkan pembayaran tagihan dengan transaksi kas yang mendukungnya, lalu unduh cadangan bila sudah berisi data.'],
    selfCheck: ['Saya bisa membedakan pembayaran, pembelian stok, dan penyesuaian HPP nonkas.', 'Saya memahami bahwa angka rekap belum otomatis menjadi dasar hitung pajak.'],
    actions: [{ label: 'Buka transaksi usaha', href: '/transaksi' }, { label: 'Lihat piutang dan utang', href: '/piutang-utang' }, { label: 'Baca rekap laba rugi', href: '/laba-rugi' }],
    library: { label: 'Rujukan persiapan pelaporan', href: '/pustaka?guide=spt' },
    question: 'Data pembukuan apa yang perlu dipersiapkan UMKM untuk pelaporan pajak? Bedakan kebutuhan catatan orang pribadi dan badan. Jelaskan keterbatasan rekap kas sederhana; jangan menyamakannya dengan laporan fiskal atau menetapkan pajak dari rekap itu saja.',
  },
  {
    id: 'bayar-bukti', title: 'Pahami pembayaran dan simpan bukti', duration: '5–10 menit',
    purpose: 'Bedakan persiapan pembayaran, transaksi pembayaran, dan pencatatan buktinya.',
    takeaways: [
      'Pelajari panduan pembayaran yang sudah ada dan periksa ketentuan yang sesuai jenis serta periode pajak Anda. Jangan menetapkan tenggat dari contoh atau artikel promosi.',
      'Kode billing bukan bukti pembayaran. Periksa bukti penerimaan yang relevan pada saluran resmi; catatan di Sahabat Pajak bukan verifikasi DJP.',
      'Aplikasi tidak membuat billing resmi atau mengirim uang. Pembayaran pajak dilakukan melalui saluran resmi, kemudian dicatat secara manual di aplikasi.',
    ],
    practice: ['Buka panduan pada menu Pembayaran sebelum melakukan tindakan di saluran resmi.', 'Jika sudah membayar, cocokkan jenis pajak, periode, tanggal, nominal, dan bukti; jangan mencatat percobaan pembayaran sebagai pembayaran berhasil.'],
    selfCheck: ['Saya dapat membedakan kode billing dan bukti penerimaan pembayaran.', 'Saya tahu bahwa pembayaran dan pelaporan SPT perlu diperiksa secara terpisah.'],
    actions: [{ label: 'Buka panduan pembayaran', href: '/pembayaran' }, { label: 'Periksa catatan kewajiban', href: '/kewajiban' }],
    library: { label: 'Baca sumber pembayaran', href: '/pustaka?category=Pembayaran' },
    question: 'Apa perbedaan kode billing, bukti pembayaran dengan NTPN, dan catatan pembayaran lokal? Jelaskan alur umum pembayaran Coretax beserta keterbatasan sumber. Jangan membuat kode billing atau menyatakan pembayaran saya sudah diverifikasi DJP.',
  },
  {
    id: 'persiapan-spt', title: 'Siapkan pelaporan dan periksa bukti penerimaan', duration: '10–15 menit',
    purpose: 'Gunakan panduan SPT yang sesuai tanpa menyamakan checklist belajar dengan laporan terkirim.',
    takeaways: [
      'Pilih panduan SPT orang pribadi atau badan sesuai kondisi. Periksa tahun pajak, akhir tahun buku, dan sumber ketentuan yang relevan.',
      'Siapkan data serta dokumen pendukung dan tinjau angka sebelum mengirim di saluran resmi. Rekap aplikasi tidak otomatis mengisi atau mengirim SPT.',
      'Bukti Penerimaan Elektronik (BPE) berkaitan dengan penerimaan pelaporan; bukti pembayaran memiliki fungsi berbeda. Menandai pelajaran selesai tidak membuktikan keduanya telah diperoleh.',
    ],
    practice: ['Buka panduan pelaporan SPT di Pustaka, lalu pilih jalur yang sesuai.', 'Susun daftar hal yang masih perlu diperiksa dan pastikan bukti penerimaan pelaporan tersimpan setelah benar-benar melapor.'],
    selfCheck: ['Saya tahu perbedaan persiapan SPT, pembayaran, dan penerimaan pelaporan.', 'Saya akan memeriksa ketentuan serta sumber terkini sebelum mengambil keputusan penting.'],
    actions: [{ label: 'Buka panduan pelaporan SPT', href: '/pustaka?guide=spt' }, { label: 'Periksa kewajiban tercatat', href: '/kewajiban' }],
    library: { label: 'Rujukan pelaporan SPT', href: '/pustaka?guide=spt&category=Pelaporan+SPT' },
    question: 'Saya sedang belajar mempersiapkan SPT Tahunan UMKM. Bedakan alur orang pribadi dan badan, dokumen yang perlu diperiksa, pembayaran, serta BPE. Jangan menetapkan tenggat aktual atau kelayakan skema tanpa mengetahui tahun pajak, akhir tahun buku, kondisi usaha, dan sumber yang memadai.',
  },
];
export function validateLearningCompleted(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 100
    && value.every(id => typeof id === 'string' && /^[a-z0-9-]{1,64}$/.test(id))
    && new Set(value).size === value.length;
}
export function learningSummary(completed: string[]) {
  const done = LEARNING_STEPS.filter(step => completed.includes(step.id)).length;
  const next = LEARNING_STEPS.find(step => !completed.includes(step.id)) ?? null;
  return { done, total: LEARNING_STEPS.length, percent: Math.round(done / LEARNING_STEPS.length * 100), next };
}
export function updateLearningCompleted(completed: string[], id: string, done: boolean) {
  if (!validateLearningCompleted(completed) || !LEARNING_STEPS.some(step => step.id === id)) {
    throw new Error('Tahap belajar tidak valid. Muat ulang peta belajar.');
  }
  const next = done ? [...new Set([...completed, id])] : completed.filter(value => value !== id);
  if (!validateLearningCompleted(next)) throw new Error('Batas catatan progres belajar tercapai.');
  return next;
}
export function learningQuestionHref(step: LearningStep) {
  return `/konsultasi?pertanyaan=${encodeURIComponent(step.question)}`;
}
