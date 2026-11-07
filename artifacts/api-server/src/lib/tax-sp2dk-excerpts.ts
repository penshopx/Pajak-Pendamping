import type { TaxResource } from "@workspace/api-zod";

// Paraphrases of operative text published by DJP, not the opinion article.
// Editorial reading is NOT approval of a monitor baseline.
const url = "https://pajak.go.id/id/peraturan/pengawasan-kepatuhan-wajib-pajak";
const ids = ["sp2dk-registered", "sp2dk-unregistered", "sp2dk-extension", "sp2dk-followup"];
function section(id: string, title: string, locator: string, excerpt: string): TaxResource {
  return {
    id, title, url, locator, excerpt, description: locator,
    category: "Regulasi", sourceType: "Naskah hukum",
    publisher: "Direktorat Jenderal Pajak — naskah PMK Menteri Keuangan",
    checkedAt: "2026-11-07", verification: "excerpt",
    version: "PMK 111 Tahun 2025; ditetapkan 30 Desember 2025, diundangkan 31 Desember 2025 (BN 1254); Pasal 30 berlaku 1 Januari 2026",
    limitations: "Parafrasa bagian operatif terpilih pada halaman naskah DJP, bukan artikel opini, konsolidasi lengkap atau analisis seluruh lampiran. Surat/kejadian sebelum 1 Januari 2026 perlu peninjauan tersendiri. Tidak menghitung tanggal jatuh tempo atau hari libur, menetapkan kurang bayar, mengesahkan tanggapan, atau memastikan status perkara. Tanggal baca bukan persetujuan baseline pemantauan; penggunaan konsultasi tetap memerlukan tinjauan manusia.",
    topics: ["sp2dk", "permintaan penjelasan", "pengawasan", "tanggapan"],
    // A partial bundle must not silently erase the other WP branch or safeguards.
    relatedIds: ids.filter(other => other !== id),
  };
}

export const sp2dkExcerpts: TaxResource[] = [
  section(ids[0], "SP2DK — WP terdaftar: pemicu waktu dan tanggapan",
    "PMK 111/2025 Pasal 5 ayat (1)–(3), Pasal 6 ayat (1)–(4); Pasal 30",
    "Pasal 5: dalam pengawasan WP terdaftar DJP menerbitkan surat permintaan penjelasan atas data dan/atau keterangan. Saluran surat: akun WP, email terdaftar dalam sistem DJP, faksimile dengan bukti pengiriman, pos/ekspedisi/kurir dengan bukti pengiriman, dan/atau langsung kepada WP, wakil, kuasa, pegawai atau anggota keluarga dewasa; penyampaian langsung dibuatkan berita acara. Pasal 6 ayat (1): tanggapan berupa memenuhi kewajiban dan/atau menyampaikan penjelasan sesuai surat. Ayat (2): paling lama 14 hari sejak peristiwa yang lebih dahulu antara tanggal penerbitan bila melalui akun WP; tanggal pengiriman email terdaftar; tanggal bukti pengiriman faksimile; tanggal bukti pengiriman pos/ekspedisi/kurir; atau tanggal penyampaian langsung kepada pihak tersebut. Bukan selalu tanggal dibaca atau diterima sendiri. Ayat (3): penjelasan melalui akun bila sudah aktif dan saluran tersedia; pos/ekspedisi/kurir dengan bukti pengiriman ke KPP penerbit; langsung saat kunjungan; dan/atau langsung ke KPP penerbit, KP2KP di bawahnya atau video conference. Ayat (4): bila tidak menyetujui sebagian/seluruh data, penjelasan disertai bukti dan/atau dokumen pendukung. Pasal 30: berlaku 1 Januari 2026."),
  section(ids[1], "SP2DK — WP belum terdaftar: akun dan saluran berbeda",
    "PMK 111/2025 Pasal 15 ayat (1)–(4), Pasal 16 ayat (1)–(4); Pasal 30",
    "Pasal 15: pengawasan WP belum terdaftar mencakup pemenuhan sejak timbulnya kewajiban menurut ketentuan; surat disampaikan melalui akun WP, pos/ekspedisi/kurir dengan bukti pengiriman dan/atau langsung kepada WP, wakil, kuasa, pegawai atau keluarga dewasa; langsung dibuatkan berita acara. Pasal 16 ayat (1): tanggapan berupa memenuhi kewajiban dan/atau penjelasan sesuai surat. Ayat (2): paling lama 14 hari sejak peristiwa yang lebih dahulu antara tanggal penerbitan bila akun WP telah aktif; tanggal aktivasi akun bila akun WP belum aktif; tanggal bukti pengiriman pos/ekspedisi/kurir; atau tanggal penyampaian langsung kepada pihak tersebut. Aktivasi bukan alasan mengabaikan pemicu pos/langsung yang lebih dahulu. Jangan menyalin pemicu email/faksimile WP terdaftar ke cabang ini. Ayat (3): penjelasan dapat melalui akun bila sudah aktif dan saluran tersedia; email yang tertera dalam surat; pos/ekspedisi/kurir dengan bukti pengiriman ke KPP penerbit; langsung saat kunjungan; dan/atau ke KPP penerbit, KP2KP di bawahnya atau video conference. Email untuk tanggapan berbeda dari pemicu waktu penyampaian surat. Ayat (4): bila tidak menyetujui sebagian/seluruh data, sertakan bukti dan/atau dokumen pendukung. Pasal 30: berlaku 1 Januari 2026."),
  section(ids[2], "SP2DK — pemberitahuan perpanjangan harus diterima KPP",
    "PMK 111/2025 Pasal 6 ayat (5)–(8), Pasal 16 ayat (5)–(8)",
    "Kedua cabang WP: ayat (5) memperbolehkan perpanjangan paling lama 7 hari setelah jangka tanggapan berakhir dengan pemberitahuan perpanjangan tertulis kepada KPP penerbit. Ayat (6): pemberitahuan harus diterima KPP sebelum jangka tanggapan awal berakhir. Membuat draf atau hanya mengirim sebelum batas awal tidak membuktikan syarat penerimaan terpenuhi; tambahan waktu tidak otomatis. Ayat (7): melalui akun WP bila telah aktif dan saluran pemberitahuan tersedia; melalui pos/ekspedisi/kurir ke KPP penerbit; atau langsung ke KPP penerbit. Jangan menganggap semua saluran penjelasan (misalnya email) otomatis menjadi saluran pemberitahuan perpanjangan. Ayat (8): tanggapan boleh lebih dari sekali dengan tetap memperhatikan jangka awal atau perpanjangan."),
  section(ids[3], "SP2DK — penelitian dan tindak lanjut, bukan otomatis ditutup",
    "PMK 111/2025 Pasal 6 ayat (9)–(11), Pasal 7 ayat (6)–(7), Pasal 8 ayat (1)–(3), Pasal 16 ayat (10)–(12), Pasal 17 ayat (1)–(2)",
    "WP terdaftar: Pasal 6 ayat (9)–(10), DJP meneliti tanggapan dan membuat berita acara bila telah sesuai; ayat (11), dapat dilakukan pembahasan dengan undangan dan/atau kunjungan bila tanggapan tidak sesuai, ada data tambahan atau tidak ada tanggapan tepat waktu. Pasal 7 ayat (6)–(7): hasil pembahasan dibuatkan berita acara dan bila perlu ada pembahasan berikutnya. Pasal 8 ayat (1): hasil kegiatan dapat berupa usulan penutupan maupun tindak lanjut lain termasuk pemeriksaan; ayat (2)–(3): bila dilakukan penutupan, DJP menerbitkan dan menyampaikan surat pemberitahuan perkembangan pelaksanaan permintaan penjelasan. WP belum terdaftar: Pasal 16 ayat (10)–(12), DJP meneliti tanggapan; bila sesuai diterbitkan surat pemberitahuan hasil pengujian/Pengawasan; bila tidak sesuai atau tidak menanggapi tepat waktu dapat dilakukan kunjungan. Pasal 17 ayat (1)–(2): surat hasil pengujian/Pengawasan dapat memuat indikasi kewajiban yang masih harus dipenuhi. Jadi draf, tanggapan terkirim, bukti penerimaan atau BPE bukan bukti penjelasan disetujui maupun pengawasan ditutup; jangan menyamakan BPE SPT dengan bukti penerimaan tanggapan SP2DK."),
];
