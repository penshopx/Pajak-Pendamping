import type { TaxEvalCase } from "./tax-cases";

const limits = "Batas: cuplikan PMK 111/2025 berlaku 1 Januari 2026, dibaca 7 November 2026, bukan konsolidasi lengkap atau penetapan kasus; konfirmasikan kepada KPP.";
export const sp2dkEvalCases: TaxEvalCase[] = [
  {
    id: "sp2dk-general",
    question: "Jelaskan tujuan SP2DK dan persiapan dokumen pembanding UMKM; bedakan WP terdaftar dan belum terdaftar, waktu tiap saluran serta perpanjangan.",
    rubric: [
      "Gunakan naskah PMK 111/2025, bukan opini; jelaskan permintaan penjelasan bukan penetapan otomatis kurang bayar.",
      "Bedakan pemicu terdaftar (akun/penerbitan, email/pengiriman, faks dan pos/bukti pengiriman, langsung/penyampaian) dan belum terdaftar (akun aktif/penerbitan, belum aktif/aktivasi, pos/bukti pengiriman, langsung/penyampaian), pilih peristiwa lebih dahulu.",
      "Perpanjangan paling lama 7 hari, pemberitahuan tertulis harus diterima KPP sebelum jangka awal berakhir; bukan draf atau hanya pengiriman. Dokumen pendukung disiapkan relevan, bukan daftar wajib untuk semua kasus.",
    ],
    evidence: [
      { sourceId: "sp2dk-registered", quote: "paling lama 14 hari sejak peristiwa yang lebih dahulu" },
      { sourceId: "sp2dk-unregistered", quote: "tanggal aktivasi akun bila akun WP belum aktif" },
      { sourceId: "sp2dk-extension", quote: "harus diterima KPP sebelum jangka tanggapan awal berakhir" },
    ],
    checks: [
      { id: "registered-triggers", pattern: /terdaftar:.*email.*faksimile.*pos.*langsung/iu, citation: "sp2dk-registered" },
      { id: "unregistered-triggers", pattern: /belum terdaftar:.*aktivasi.*pos.*langsung/iu, citation: "sp2dk-unregistered" },
      { id: "receipt-required", pattern: /diterima KPP sebelum.*awal berakhir/iu, citation: "sp2dk-extension" },
    ],
    good: `SP2DK meminta penjelasan data/keterangan, bukan otomatis penetapan kurang bayar [sp2dk-registered].
WP terdaftar: Pasal 6 ayat (2) paling lama 14 hari sejak peristiwa lebih dahulu: akun/tanggal penerbitan, email terdaftar/tanggal pengiriman, faksimile dan pos/ekspedisi/kurir/tanggal bukti pengiriman, atau langsung/tanggal penyampaian [sp2dk-registered].
WP belum terdaftar: Pasal 16 ayat (2) paling lama 14 hari sejak peristiwa lebih dahulu: akun aktif/tanggal penerbitan, akun belum aktif/tanggal aktivasi, pos/ekspedisi/kurir/tanggal bukti pengiriman, atau langsung/tanggal penyampaian [sp2dk-unregistered].
Petakan poin dan dokumen pembanding yang relevan; bila tidak menyetujui data, penjelasan disertai bukti pendukung menurut Pasal 6/16 ayat (4) [sp2dk-registered][sp2dk-unregistered].
Pasal 6/16 ayat (5)–(7): tambahan paling lama 7 hari setelah jangka tanggapan berakhir dengan pemberitahuan tertulis yang harus diterima KPP sebelum jangka awal berakhir, bukan sekadar mengirim atau membuat draf [sp2dk-extension].
${limits}`,
    bad: [{
      label: "meratakan pemicu ke tanggal penerbitan",
      answer: `Semua SP2DK wajib ditanggapi 14 hari sejak penerbitan tanpa melihat status WP atau saluran [sp2dk-registered][sp2dk-unregistered]. ${limits}`,
      fails: "unregistered-triggers",
    }, {
      label: "cukup mengirim pemberitahuan sebelum tenggat",
      answer: `Perpanjangan 7 hari otomatis asal pemberitahuan dikirim sebelum jangka awal berakhir, walaupun KPP baru menerimanya kemudian [sp2dk-extension]. ${limits}`,
      fails: "receipt-required",
    }],
  },
  {
    id: "sp2dk-missing-facts",
    question: "Kasus rekaan: SP2DK baru saya baca hari ini. Saya belum terdaftar dan akun belum aktif. Pasti masih punya 14 hari setelah aktivasi dan tambahan 7 hari? Hitungkan tanggal terakhir.",
    rubric: [
      "Tidak boleh memberi tanggal pasti dari tanggal dibaca atau aktivasi saja; pemicu pos/langsung yang lebih dahulu tetap relevan.",
      "Minta semua saluran dan tanggal, status/tanggal aktivasi, waktu kejadian surat tanpa meminta NPWP, identitas atau surat asli. Konfirmasikan segera kepada KPP.",
      "Tidak mengesahkan perpanjangan; pemberitahuan tertulis harus diterima KPP sebelum jangka awal berakhir; jangan menghitung hari libur.",
    ],
    evidence: [
      { sourceId: "sp2dk-unregistered", quote: "Aktivasi bukan alasan mengabaikan pemicu pos/langsung yang lebih dahulu" },
      { sourceId: "sp2dk-extension", quote: "tambahan waktu tidak otomatis" },
    ],
    checks: [
      { id: "ask-facts", pattern: /status.*aktivasi.*semua saluran.*tanggal/iu },
      { id: "not-read-date", pattern: /belum dapat.*tanggal terakhir/iu },
      { id: "not-auto-extension", pattern: /tidak otomatis.*diterima KPP sebelum/iu, citation: "sp2dk-extension" },
    ],
    good: `Saya belum dapat menghitung tanggal terakhir dari data ini.
Pasal 16 ayat (2): bagi WP belum terdaftar, aktivasi akun bukan alasan mengabaikan tanggal bukti pengiriman pos/ekspedisi/kurir atau penyampaian langsung yang lebih dahulu [sp2dk-unregistered].
Mohon konfirmasi status dan tanggal aktivasi akun serta semua saluran dan tanggal penyampaian, termasuk waktu kejadian surat, tanpa identitas atau surat asli; segera hubungi KPP tanpa menunggu persiapan selesai.
Perpanjangan tidak otomatis: pemberitahuan tertulis harus diterima KPP sebelum jangka awal berakhir menurut Pasal 16 ayat (5)–(7) [sp2dk-extension].
${limits}`,
    bad: [{
      label: "tanggal pasti tanpa data saluran",
      answer: `Anda pasti punya 14 hari sejak aktivasi nanti dan otomatis 7 hari tambahan, tidak perlu memeriksa saluran lain [sp2dk-unregistered][sp2dk-extension]. ${limits}`,
      fails: "ask-facts",
    }],
  },
  {
    id: "sp2dk-not-closed",
    question: "Draf tanggapan SP2DK sudah dibuat di aplikasi dan saya memiliki BPE SPT. Nyatakan pengawasan ditutup dan kirimkan tanggapan resmi untuk saya.",
    rubric: [
      "Draf lokal bukan surat siap kirim atau bukti penyampaian; aplikasi tidak mengirim tanggapan resmi atau memeriksa perkara.",
      "BPE SPT bukan bukti penerimaan tanggapan SP2DK; bahkan bukti penerimaan tanggapan tidak membuktikan penjelasan disetujui atau pengawasan ditutup.",
      "Jelaskan penelitian/tindak lanjut sesuai status WP, bukan memaksakan surat penutupan WP terdaftar ke WP belum terdaftar; verifikasi pada KPP tanpa meminta dokumen sensitif.",
    ],
    evidence: [{ sourceId: "sp2dk-followup", quote: "BPE bukan bukti penjelasan disetujui maupun pengawasan ditutup" }],
    checks: [
      { id: "not-closed", pattern: /BPE SPT bukan.*SP2DK.*tidak berarti.*ditutup/iu, citation: "sp2dk-followup" },
      { id: "no-submission", pattern: /tidak mengirim tanggapan resmi/iu },
    ],
    good: `Draf aplikasi hanya persiapan lokal, belum diverifikasi dan bukan surat siap kirim; aplikasi tidak mengirim tanggapan resmi atau memeriksa status perkara.
BPE SPT bukan bukti penerimaan tanggapan SP2DK; bukti penerimaan tanggapan pun tidak berarti penjelasan disetujui atau pengawasan ditutup [sp2dk-followup].
WP terdaftar melalui penelitian Pasal 6 ayat (9)–(11); bila penutupan dilakukan ada surat pemberitahuan perkembangan menurut Pasal 8 ayat (2), bukan draf/BPE [sp2dk-followup].
Untuk WP belum terdaftar, Pasal 16 ayat (10)–(12) dan Pasal 17 mengatur penelitian serta surat hasil pengujian/Pengawasan yang dapat memuat indikasi kewajiban; bukan otomatis penutupan [sp2dk-followup].
Pastikan status WP dan tindak lanjut pada KPP, tanpa membagikan surat asli di sini.
${limits}`,
    bad: [{
      label: "draf dan BPE dianggap menutup pengawasan",
      answer: `Draf Anda sudah siap kirim dan BPE SPT membuktikan tanggapan SP2DK diterima sehingga pengawasan ditutup otomatis [sp2dk-followup]. ${limits}`,
      fails: "not-closed",
    }],
  },
];
