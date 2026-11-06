import type { TaxResource } from "@workspace/api-zod";
import { reviewedTaxExcerpts, taxCheckedAt } from "./tax-excerpts";
import { professionalResources } from "./tax-professional-resources";
import { paymentManualSections } from "./tax-payment-manual";
import { accessGuides } from "./tax-access-guides";
import { sptGuides } from "./tax-spt-guides";
// Unread entries stay explicitly directory/metadata-only.
const checkedAt = taxCheckedAt;
const hub = "https://www.pajak.go.id/id/coretax";
const pdf = "https://www.pajak.go.id/sites/default/files/";

function resource(id: string, title: string, category: string, description: string, url: string, sourceType: string, excerpt: string, publisher = "Direktorat Jenderal Pajak"): TaxResource {
  const verification = sourceType.includes("PDF") ? "directory" : sourceType === "Peraturan" ? "metadata" : "page";
  return { id, title, category, description, url, sourceType, excerpt, publisher, checkedAt, verification };
}

const directoryResources = [
  resource("coretax", "Mengenal Coretax DJP", "Panduan Ringkas", "Pusat informasi, panduan, dan pembaruan implementasi Coretax.", hub, "Portal resmi",
    "Coretax mengintegrasikan pendaftaran wajib pajak, pelaporan SPT, pembayaran, pemeriksaan dan penagihan. Portal resmi akses: https://coretaxdjp.pajak.go.id/. Halaman DJP mengingatkan bahwa informasi dapat berubah sesuai perkembangan ketentuan dan sistem."),
  resource("payment-guide", "Pembayaran pajak melalui Coretax", "Pembayaran", "Pengenalan kode billing, deposit pajak, dan penyesuaian pembayaran.", "https://pajak.go.id/reformdjp/coretax-pembayaran/", "Panduan resmi",
    "Halaman pengenalan pembayaran DJP menjelaskan pembuatan kode billing, pembayaran melalui bank persepsi, deposit pajak, dan permohonan penyesuaian pembayaran melalui portal. Deposit dapat menampung setoran untuk digunakan membayar kewajiban. Halaman menggunakan bahasa rancangan sistem dan memperingatkan informasi dapat berubah; detail layar dan prosedur terkini perlu dicek di portal resmi."),
  resource("payment-article", "Pembayaran dan penyetoran pajak di era Coretax", "Artikel", "Artikel penjelasan 3 Februari 2025; bukan naskah peraturan.", "https://www.pajak.go.id/id/artikel/pembayaran-dan-penyetoran-pajak-di-era-coretax", "Artikel opini",
    "Artikel oleh Fuad Wahyudi Anthonie, 3 Februari 2025, membahas pembayaran elektronik, deposit, dan pentingnya menyimpan Bukti Penerimaan Negara (BPN). Pastikan identitas dan data pajak benar dan simpan bukti pembayaran. Artikel menyebut PMK 81/2024, tetapi merupakan pendapat pribadi penulis, bukan sikap instansi, dan bukan naskah hukum terkini. Jangan gunakan artikel lama ini untuk memastikan tenggat atau tarif yang berlaku saat ini."),
  resource("pmk81", "PMK 81 Tahun 2024 dan riwayat perubahannya", "Regulasi", "Ketentuan perpajakan dalam rangka pelaksanaan sistem inti administrasi perpajakan. Baca bersama perubahannya.", "https://jdih.kemenkeu.go.id/dok/pmk-81-tahun-2024", "Peraturan",
    "Entri ini hanya metadata. Naskah PMK 81/2024 perlu dibaca bersama PMK 11/2025, PMK 53/2025, PMK 54/2025 dan PMK 1/2026. Cuplikan pasal terpilih tersedia pada entri naskah hukum tersendiri, bukan konsolidasi lengkap. Jangan menyimpulkan tarif atau tenggat dari judul.", "JDIH Kementerian Keuangan"),
  resource("pmk1", "PMK 1 Tahun 2026 — perubahan keempat PMK 81/2024", "Regulasi", "Rujukan perubahan Coretax yang tercantum dalam JDIH Kementerian Keuangan.", "https://jdih.kemenkeu.go.id/dok/pmk-1-tahun-2026/view", "Peraturan",
    "Metadata resmi JDIH: PMK 1 Tahun 2026 berjudul Perubahan Keempat atas PMK 81 Tahun 2024. Berlaku 22 Januari 2026; status halaman saat diperiksa: Berlaku. Entri ini hanya metadata; ringkasan naskah yang dibaca tersedia pada entri Perubahan keempat PMK 81 — penggunaan nilai buku. Jangan menafsirkan perubahan pasal berdasarkan judul atau mengklaim ini pasti perubahan paling akhir.", "JDIH Kementerian Keuangan"),
  resource("short-guide", "Buku Panduan Ringkas Coretax DJP", "Panduan Ringkas", "Panduan ringkas resmi dalam format PDF.", pdf + "2025-01/Panduan%20Ringkas%20Coretax%20DJP.pdf", "Manual PDF", "Terdaftar pada direktori resmi Coretax DJP sebagai Buku Panduan Ringkas Coretax DJP. Isi PDF belum dianalisis; buka dokumen asli untuk langkah rinci."),
  resource("activation", "Aktivasi akun Coretax DJP", "Registrasi", "Tautan leaflet sedang menampilkan pemeliharaan saat diperiksa. Gunakan ringkasan alternatif Coretaxpedia dalam pustaka.", pdf + "2025-06/Leaflet%20Aktivasi%20Akun%20pada%20Coretax%20DJP.pdf", "Leaflet PDF — akses terganggu", "Direktori Coretax DJP menyediakan tautan Leaflet Aktivasi Akun. Pada pemeriksaan 6 November 2026 unduhan tidak lengkap, lalu tautan menampilkan Under Maintenance; isi leaflet aktivasi belum dianalisis. Ini status saat diperiksa, bukan jaminan gangguan masih berlangsung. Gunakan sumber Coretaxpedia akses pertama kali dan cabang kondisi akun yang telah dibaca. Jangan mengklaim langkah berasal dari PDF aktivasi ini."),
  resource("roles", "Penanggung jawab dan akses wajib pajak badan", "Registrasi", "Panduan penanggung jawab, impersonate, dan penambahan role akses.", pdf + "2025-01/Penanggung%20Jawab%2C%20Impersonate%20dan%20Penambahan%20Role%20Akses%20WP%20Badan%20%281%29.pdf", "Manual PDF", "Direktori resmi menyediakan panduan Penanggung Jawab, Impersonate, dan Penambahan Role Akses Bagi Wajib Pajak Badan. Isi PDF belum dianalisis."),
  resource("payment-manual", "Buku Manual Coretax — Pembayaran", "Pembayaran", "Manual resmi seri pembayaran Coretax 2024.", pdf + "2025-01/Buku%20Manual%20Coretax%202024%20-%20Seri%20Pembayaran.pdf", "Manual PDF", "Terdaftar pada direktori Coretax DJP sebagai Buku Manual Coretax 2024 - Pembayaran. Isi PDF belum dianalisis; periksa kesesuaian versi dengan portal dan ketentuan berlaku."),
  resource("annual", "Pelaporan SPT Tahunan PPh Orang Pribadi", "Pelaporan SPT", "Manual pelaporan SPT Tahunan untuk orang pribadi.", pdf + "2024-09/Buku%20Manual%20Coretax%202024%20-%2015%20Pelaporan%20SPT%20Tahunan%20PPh%20OP_0.pdf", "Manual PDF", "Direktori resmi menyediakan Buku Manual Coretax 2024 - Pelaporan SPT Tahunan PPh OP. Isi PDF belum dianalisis. Penerapan pada UMKM bergantung pada bentuk dan kondisi wajib pajak."),
  resource("unifikasi", "Pelaporan SPT Masa Unifikasi", "Pelaporan SPT", "Manual resmi seri SPT Masa Unifikasi.", pdf + "2025-01/Buku%20Manual%20Coretax%202024%20-%20Seri%20SPT%20Masa%20Unifikasi.pdf", "Manual PDF", "Direktori Coretax menyediakan Buku Manual Coretax 2024 - Pelaporan SPT Masa Unifikasi. Isi PDF belum dianalisis."),
  resource("ppn", "Pelaporan SPT Masa PPN", "Pelaporan SPT", "Manual resmi pelaporan SPT Masa PPN.", pdf + "2025-04/Buku%20Manual%20SPT%20Masa%20PPN.pdf", "Manual PDF", "Direktori Coretax menyediakan Buku Manual Coretax 2024 - Pelaporan SPT Masa PPN. Isi PDF belum dianalisis."),
  resource("nppn", "Pemberitahuan penggunaan NPPN", "Panduan Ringkas", "Panduan pemberitahuan penggunaan Norma Penghitungan Penghasilan Neto.", pdf + "2025-03/Panduan%20Pemberitahuan%20Penggunaan%20NPPN.pdf", "Manual PDF", "Direktori resmi mencantumkan panduan pemberitahuan penggunaan NPPN. Kelayakan dan ketentuan penggunaannya tidak tersedia dalam cuplikan ini; jangan menyimpulkan semua UMKM bisa menggunakan NPPN."),
  resource("services", "Layanan wajib pajak", "Layanan", "Manual layanan perpajakan melalui Coretax.", pdf + "2024-09/Buku%20Manual%20Coretax%202024%20-%2019%20Layanan%20Wajib%20Pajak_1.pdf", "Manual PDF", "Direktori resmi Coretax menyediakan Buku Manual Coretax 2024 - Layanan WP. Isi PDF belum dianalisis."),
  resource("implementation-short", "Buku Panduan Singkat Implementasi Coretax bagi Wajib Pajak", "Panduan Ringkas", "Panduan singkat implementasi dalam direktori resmi DJP.", pdf + "2024-12/Buku%20Panduan%20Singkat%20Coretax%20v.1.pdf", "Manual PDF", "Terdaftar pada Seri Panduan Ringkas di halaman Coretax DJP yang diperiksa. Isi PDF belum dianalisis; gunakan naskah asli dan periksa kesesuaian versi."),
  resource("efaktur-faq", "Buku FAQ Aplikasi E-Faktur Client Desktop", "Panduan Ringkas", "FAQ resmi aplikasi E-Faktur Client Desktop.", pdf + "2025-02/FAQ%20Aplikasi%20E-Faktur%20Client%20Desktop.pdf", "Manual PDF", "Direktori Coretax DJP mencantumkan Buku FAQ Aplikasi E-Faktur Client Desktop. Isi PDF belum dianalisis; daftar ini tidak memastikan apakah mekanisme desktop sesuai untuk kasus pengguna saat ini."),
  resource("investment-report", "Buku Cara Lapor Realisasi Investasi pada Aplikasi Coretax", "Panduan Ringkas", "Rujukan pelaporan realisasi investasi pada Coretax.", pdf + "2025-03/Cara_Lapor_Realisasi_Investasi_pada_Aplikasi_Coretax.pdf", "Manual PDF", "Terdaftar dalam Seri Panduan Ringkas Coretax DJP. Isi PDF belum dianalisis; jangan menyimpulkan persyaratan fasilitas atau batas pelaporan dari judul."),
  resource("registration-resident", "Leaflet Pendaftaran Wajib Pajak Orang Pribadi Penduduk", "Registrasi", "Leaflet pendaftaran WP orang pribadi penduduk yang ditautkan DJP.", pdf + "2026-01/Leaflet%20Pendaftaran%20WP%20OP%20pada%20Coretax%20v20260105_0.pdf", "Leaflet PDF", "Halaman Coretax DJP menautkan Leaflet Pendaftaran WP OP Penduduk, dengan nama berkas v20260105. Isi PDF belum dianalisis; nama berkas bukan bukti semua prosedur tetap berlaku."),
  resource("kodjp", "Leaflet Panduan Memperoleh KODJP", "Registrasi", "Leaflet v202512 (Desember 2025), dua halaman PDF telah dibaca: permohonan dan validasi mandiri.", pdf + "2025-12/Leaflet%20Panduan%20Memperoleh%20KODJP%20v202512_0.pdf", "Leaflet PDF — dianalisis", "Leaflet versi v202512 berisi dua halaman lipat. Halaman PDF 2 menjelaskan pengertian dan permohonan KODJP; halaman PDF 1 memuat lanjutan penerbitan, validasi mandiri dan Kotak Masuk. Gunakan entri kodjp-guide-request dan kodjp-guide-validation untuk langkah terperinci. Nomor halaman mengikuti urutan fisik PDF, bukan urutan panel lipatan. Versi dokumen tidak menjamin kesesuaian tampilan portal saat ini."),
  resource("cbcr", "Panduan CbCR pada Coretax DJP", "Panduan Ringkas", "Rujukan khusus CbCR; tidak otomatis berlaku untuk seluruh UMKM.", pdf + "2025-07/Panduan%20CbCR%20pada%20Coretax%20DJP_0.pdf", "Manual PDF", "Direktori Coretax DJP mencantumkan Panduan CbCR. Isi PDF belum dianalisis; keberadaan panduan tidak berarti semua UMKM wajib melakukan CbCR."),
];

const accountSources = accessGuides(checkedAt);
const structuredAccessGuides: TaxResource[] = accountSources.map(r => ({
  ...r, verification: r.sourceType.startsWith("Leaflet") ? "excerpt" : "page",
  locator: r.description, version: r.excerpt.split("\n")[0],
  limitations: "Cocokkan kondisi akun dan pembaruan sumber; bukan bukti akun telah diaktifkan atau sertifikat telah divalidasi.",
  topics: r.id.startsWith("kodjp")
    ? ["kodjp", "otorisasi", "sertifikat", "passphrase"]
    : ["aktivasi", "akses", "akun", "npwp", "online", "pendaftaran"],
  relatedIds: accountSources.filter(s => s.id.startsWith("kodjp") === r.id.startsWith("kodjp")).map(s => s.id),
}));

// Keep existing IDs stable for library bookmarks and stored conversations.
export const taxResources: TaxResource[] = [
  ...directoryResources.filter(r => !reviewedTaxExcerpts.some(e => e.id === r.id)),
  ...professionalResources(checkedAt).map(r => ({ ...r, verification: "page" as const })),
  ...paymentManualSections(checkedAt).map(r => ({
    ...r, verification: "excerpt" as const, locator: r.description, version: "Edisi 20241129 — 29 November 2024",
    limitations: "Hanya bagian yang diringkas; cocokkan versi portal. Bukan dasar tarif, kelayakan atau jatuh tempo pajak.",
    topics: [...r.title.toLowerCase().split(/\W+/), "billing", "pembayaran"],
    relatedIds: ["pmk81-proof", "pmk81-deposit"],
  })),
  ...reviewedTaxExcerpts,
  ...structuredAccessGuides,
  ...sptGuides(checkedAt),
];

export const taxDisclaimer = "Informasi edukasi, bukan penetapan pajak atau pengganti nasihat konsultan. Sumber terbatas dan tidak diperbarui otomatis. Verifikasi ketentuan yang berlaku melalui DJP/KPP. Sahabat Pajak bukan layanan resmi DJP, tidak mengklaim izin praktik konsultan atau penunjukan sebagai PJAP.";
