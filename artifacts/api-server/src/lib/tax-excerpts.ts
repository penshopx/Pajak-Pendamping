import type { TaxResource } from "@workspace/api-zod";

// Curated from the linked full texts, NOT a consolidated or exhaustive legal corpus.
// This date describes editorial review, never an automated fetch. The monitor
// retains observations/review snapshots separately and gates consultation use.
// Locator is either a legal article or a PDF page (1-based, including the cover).
export const taxCheckedAt = "2026-11-06";
const jdih = "https://jdih.kemenkeu.go.id/api/download/";
const djp = "https://www.pajak.go.id/sites/default/files/";
const pp20 = jdih + "d057ff82-50e7-4127-b66b-f704a36f071d/2026pp020.pdf";
const pp55 = jdih + "cab6ec99-3dbc-47c6-adbf-ea5f0f7117d6/55TAHUN2022PP.pdf";
const pmk81 = jdih + "637047be-3dba-4347-aba1-98fa7fd5ab3f/2024pmkeuangan081.pdf";
const legalLimit = "Cuplikan pasal terpilih, bukan naskah konsolidasi lengkap. Periksa tahun pajak, bentuk usaha, pengecualian dan aturan peralihan; bukan penetapan kewajiban otomatis.";
const manualLimit = "Petunjuk layar pada versi dokumen ini, bukan dasar tarif, tenggat atau kelayakan. Tampilan portal dapat berubah; jangan membagikan kredensial kepada aplikasi ini.";

function law(id: string, title: string, url: string, locator: string, version: string, excerpt: string, topics: string[], relatedIds: string[] = []): TaxResource {
  return { id, title, url, locator, version, excerpt, topics, relatedIds,
    category: "Regulasi", sourceType: "Naskah hukum", publisher: "JDIH Kementerian Keuangan",
    checkedAt: taxCheckedAt, verification: "excerpt", description: locator, limitations: legalLimit };
}

function manual(id: string, title: string, file: string, page: number, locator: string, version: string, excerpt: string, topics: string[]): TaxResource {
  return { id, title, url: djp + file + `#page=${page}`, locator, version, excerpt, topics,
    category: id === "payment-manual" ? "Pembayaran" : id === "roles" ? "Registrasi" : "Panduan Ringkas",
    sourceType: "Manual PDF", publisher: "Direktorat Jenderal Pajak", checkedAt: taxCheckedAt,
    verification: "excerpt", description: locator, limitations: manualLimit };
}

export const reviewedTaxExcerpts: TaxResource[] = [
  law("pp20-final", "PPh final UMKM — tarif dan pengecualian penghasilan", pp20 + "#page=3",
    "PP 20/2026 Pasal I angka 3 → PP 55/2022 Pasal 56 ayat (1)–(4); PDF hlm. 3–4",
    "PP 55/2022 sebagaimana diubah PP 20/2026 (berlaku 22 April 2026)",
    "Pasal 56 ayat (1): Atas penghasilan dari usaha yang diterima atau diperoleh Wajib Pajak dalam negeri yang memiliki peredaran bruto tertentu, dikenai Pajak Penghasilan yang bersifat final. Ayat (2): Tarif ... sebesar 0,5% (nol koma lima persen). Ayat (3) tidak memasukkan jasa pekerjaan bebas orang pribadi, penghasilan luar negeri yang pajaknya terutang/telah dibayar di luar negeri, penghasilan yang sudah dikenai PPh final tersendiri, dan penghasilan yang dikecualikan sebagai objek pajak. Ayat (4) meliputi tenaga ahli (termasuk konsultan, dokter, akuntan), seniman termasuk pembuat/pencipta konten daring, olahragawan, pengajar/pelatih, pengarang/penerjemah, agen iklan, pengelola proyek, perantara, penjaja barang, agen asuransi, serta distributor pemasaran berjenjang/penjualan langsung.",
    ["umkm", "pph", "final", "0,5", "0.5", "tarif", "freelance", "konsultan", "dokter", "influencer", "pekerjaan bebas"],
    ["pp20-criteria", "pp20-turnover", "pp20-transition", "pp55-base"]),
  law("pp20-criteria", "PPh final — siapa yang termasuk dan dikecualikan", pp20 + "#page=5",
    "PP 20/2026 Pasal I angka 4 → Pasal 57 ayat (1)–(5); PDF hlm. 5–6",
    "PP 55/2022 sebagaimana diubah PP 20/2026",
    "Pasal 57 ayat (1): Wajib Pajak orang pribadi; dan Wajib Pajak badan berbentuk perseroan perorangan yang didirikan oleh 1 (satu) orang dan koperasi, yang menerima atau memperoleh penghasilan dengan peredaran bruto tidak melebihi Rp4.800.000.000,00 dalam 1 Tahun Pajak. Ayat (2) mengecualikan: yang memilih tarif umum; perseroan perorangan yang didirikan orang pribadi berkeahlian khusus dengan jasa sejenis pekerjaan bebas; badan penerima fasilitas PPh yang disebut huruf c; bentuk usaha tetap; OP beserta seluruh perseroan perorangannya yang keseluruhan omzetnya telah melebihi Rp4,8 miliar; serta koperasi yang telah melewati 4 Tahun Pajak sejak terdaftar. Ayat (3): pilihan tarif umum wajib diberitahukan kepada DJP. Ayat (4): pihak pada ayat (2) huruf e dan f serta ayat (3), untuk Tahun Pajak berikutnya tidak dapat dikenai PPh final berdasarkan PP ini.",
    ["umkm", "badan", "perorangan", "koperasi", "kelayakan", "omzet", "4,8", "4.8", "memilih", "pph"],
    ["pp20-final", "pp20-turnover", "pp20-transition", "pp55-base"]),
  law("pp20-turnover", "PPh final — omzet gabungan dan suami-istri", pp20 + "#page=6",
    "PP 20/2026 Pasal I angka 5 → Pasal 58 ayat (1)–(3); PDF hlm. 6–8",
    "PP 55/2022 sebagaimana diubah PP 20/2026",
    "Pasal 58 ayat (1): peredaran bruto merupakan jumlah keseluruhan penghasilan usaha dan jasa pekerjaan bebas dalam satu tahun dari Tahun Pajak terakhir sebelum Tahun Pajak bersangkutan, baik nonfinal maupun final, termasuk dari luar negeri; nilainya sebelum dikurangi potongan penjualan, potongan tunai, dan/atau potongan sejenis. Ayat (2): untuk suami-istri dengan perjanjian pemisahan harta/penghasilan atau istri memilih kewajiban sendiri, batas omzet ditentukan berdasarkan penggabungan omzet suami dan istri. Ayat (3): jumlah pada Pasal 57 ayat (2) huruf e untuk suami-istri tersebut menggabungkan omzet suami-istri beserta seluruh perseroan perorangan yang mereka dirikan.",
    ["omzet", "bruto", "suami", "istri", "pasangan", "gabungan", "cabang", "diskon"],
    ["pp20-criteria", "pp20-transition"]),
  law("pp20-transition", "PPh final — penghapusan batas lama dan aturan peralihan", pp20 + "#page=8",
    "PP 20/2026 Pasal I angka 6; Pasal II angka 1 huruf a–g dan angka 2; PDF hlm. 8–11",
    "PP 20/2026, diundangkan 22 April 2026",
    "Pasal I angka 6: Pasal 59 dihapus. Pasal II angka 1: (a) OP yang batas finalnya berakhir 2024 dapat dikenai final untuk 2025 dan 2026; OP/perseroan perorangan yang batasnya berakhir 2025 dapat dikenai final untuk 2026, sepanjang memenuhi kriteria PP 55/2022. (b) Koperasi yang terdaftar sebelum PP ini berlaku dan jangka waktunya berakhir 2024–2029 dikenai final untuk 2025–2029 sepanjang memenuhi kriteria PP 55/2022. (c)–(d) surat keterangan pihak tersebut tetap berlaku dengan batas/kriteria yang disebut pasal. (e) CV, firma, PT selain perseroan perorangan dan BUMDes/BUMDes bersama yang jangka finalnya belum berakhir dapat melanjutkan sampai jangka itu berakhir sepanjang memenuhi kriteria PP 55/2022. (f) OP/perseroan perorangan pada Pasal 57 ayat (2) huruf b dan e yang sudah dikenai final berdasarkan PP 55/2022 dapat dikenai final sampai akhir 2026. (g) aturan pelaksanaan PP 55/2022 tetap berlaku sepanjang tidak bertentangan. Angka 2: PP ini berlaku pada tanggal diundangkan.",
    ["umkm", "pph", "final", "cv", "firma", "pt", "bumdes", "koperasi", "jangka", "2026", "2025", "2024", "tujuh", "7 tahun", "peralihan"],
    ["pp20-criteria", "pp20-final", "pp55-duration-old"]),
  law("pp55-duration-old", "Jangka waktu PPh final sebelum perubahan — konteks historis", pp55,
    "PP 55/2022 Pasal 59 ayat (1)–(2), naskah asal (DIHAPUS oleh PP 20/2026)",
    "Historis: PP 55/2022 sebelum 22 April 2026",
    "Pasal 59 ayat (1) naskah lama menyebut paling lama 7 Tahun Pajak bagi OP; 4 bagi koperasi, CV, firma, BUMDes/BUMDes bersama atau perseroan perorangan; 3 bagi PT. Ayat (2): untuk WP terdaftar setelah PP 55/2022 berlaku, dihitung sejak Tahun Pajak terdaftar; BUMDes/BUMDes bersama dan perseroan perorangan terdaftar sebelumnya dihitung sejak Tahun Pajak PP ini berlaku. PASAL INI SUDAH DIHAPUS. Jangan menggunakan batas 7/4/3 tahun sebagai aturan umum saat ini. Gunakan hanya untuk konteks historis/peralihan; perhitungan WP lama dapat memerlukan riwayat PP 23/2018 yang belum dicuplik.",
    ["jangka", "historis", "7 tahun", "4 tahun", "3 tahun"], ["pp20-transition"]),
  law("pp55-base", "PPh final OP — bagian omzet Rp500 juta dan dasar penghitungan", pp55,
    "PP 55/2022 Pasal 60 ayat (1)–(5), Pasal 61 ayat (1)–(2); dibaca bersama PP 20/2026",
    "PP 55/2022; Pasal 60–61 tidak diubah dalam PP 20/2026 yang diperiksa",
    "Pasal 60 ayat (1): peredaran bruto usaha setiap bulan merupakan dasar pengenaan PPh final. Ayat (2): Wajib Pajak orang pribadi ... atas bagian peredaran bruto dari usaha sampai dengan Rp500.000.000,00 dalam 1 Tahun Pajak tidak dikenai Pajak Penghasilan. Ayat (3): bagian itu dihitung kumulatif sejak Masa Pajak pertama dalam Tahun Pajak/bagian Tahun Pajak. Ayat (4): omzet sebelum potongan penjualan/tunai/sejenis. Ayat (5): pajak = tarif Pasal 56 ayat (2) dikali dasar bulanan untuk badan; untuk OP setelah memperhitungkan bagian pada ayat (2). Pasal 61: WP yang omzet tahun berjalan melampaui Rp4,8 miliar tetap dikenai tarif final sampai akhir tahun bersangkutan; tahun berikutnya tarif umum. Kriteria subjek dan peralihan harus diperiksa menurut PP 20/2026, bukan menganggap seluruh UMKM otomatis memenuhi.",
    ["umkm", "pph", "final", "500", "juta", "hitung", "perhitungan", "omzet", "bulanan", "kumulatif"], ["pp20-criteria", "pp20-transition", "pp20-final"]),
  law("pmk81-proof", "Pembayaran resmi — BPN, NTPN, bukan catatan aplikasi", pmk81,
    "PMK 81/2024 Pasal 101, Pasal 102 ayat (4) huruf a dan ayat (5), Pasal 107 ayat (1)–(2)",
    "PMK 81/2024; ditelusuri bersama PMK 11, 53, 54/2025 dan PMK 1/2026",
    "Pasal 101: Pembayaran dan penyetoran pajak dilakukan ke Kas Negara melalui layanan atau kanal pembayaran yang disediakan oleh Collecting Agent ... mengenai sistem penerimaan negara secara elektronik. Pasal 102 ayat (4) huruf a mencantumkan BPN atas pembayaran elektronik; ayat (5): SSP dan sarana administrasi lain berupa BPN dan SSPCP ... dinyatakan sah, dalam hal telah divalidasi dengan Nomor Transaksi Penerimaan Negara. Pasal 107: WP yang membayar/menyetor melalui sistem elektronik diberikan BPN; BPN berupa dokumen bukti pembayaran dari tempat pembayaran, termasuk format elektronik atau dokumen lain yang disamakan dengan BPN.",
    ["bayar", "pembayaran", "bukti", "bpn", "ntpn", "billing", "lunas", "catatan"], ["payment-manual", "pmk81-deposit"]),
  law("pmk81-deposit", "Deposit pajak — pengisian dan penggunaan", pmk81,
    "PMK 81/2024 Pasal 103 ayat (1)–(4)",
    "PMK 81/2024; ditelusuri bersama PMK 11, 53, 54/2025 dan PMK 1/2026",
    "Pasal 103 ayat (1): Wajib Pajak dapat ... menggunakan Deposit Pajak. Ayat (2): ... dilakukan melalui Pemindahbukuan. Ayat (3): pengisian dengan pembayaran elektronik, permohonan Pemindahbukuan, atau permohonan sisa kelebihan pembayaran/sisa imbalan bunga setelah diperhitungkan dengan Utang Pajak. Ayat (4): tanggal pengisian elektronik sesuai tanggal bayar pada BPN; pemindahbukuan sesuai tanggal bayar pada Bukti Pemindahbukuan; sisa kelebihan sesuai tanggal penerbitan SK Pengembalian Kelebihan Pembayaran Pajak.",
    ["deposit", "saldo", "pemindahbukuan", "pbk", "setoran"], ["pmk81-proof", "payment-manual"]),
  law("pmk11-changes", "Perubahan pertama PMK 81 — ruang lingkup PPN", jdih + "52955502-8733-4fdd-98ce-bb03c31cda0b/2025pmkeuangan11.pdf",
    "PMK 11/2025 Pasal 20 angka 1–4; Pasal 23",
    "PMK 11/2025, Pasal 20 kemudian diubah PMK 53/2025",
    "Pasal 20 mengubah Pasal 313 ayat (2)–(3), Pasal 324 ayat (2), Pasal 343 ayat (2), dan Pasal 354 ayat (2) PMK 81/2024. Pasal 23 menyatakan berlaku pada tanggal diundangkan. Ini bukan perubahan tarif PPh final UMKM atau bukti bahwa semua tarif PPN sama; Pasal 20 kemudian diubah PMK 53/2025.",
    ["pmk", "perubahan", "regulasi", "ppn"], ["pmk53-changes", "pmk54-changes", "pmk1-changes"]),
  law("pmk53-changes", "Perubahan kedua PMK 81 — koreksi dan penghapusan pasal PPN", jdih + "f5252d58-c4a6-45c3-87b7-cb3b6c3abbf9/2025pmkeuangan053.pdf",
    "PMK 53/2025 Pasal I → PMK 11/2025 Pasal 20; Pasal II",
    "PMK 53/2025, berlaku 1 Agustus 2025",
    "Pasal I mengganti Pasal 20 PMK 11/2025: mengubah Pasal 313 ayat (2)–(3) dan Pasal 324 ayat (2) PMK 81/2024; Pasal 343 dihapus; Pasal 354 dihapus. Pasal II: Peraturan Menteri ini mulai berlaku pada tanggal 1 Agustus 2025. Cuplikan ini hanya memetakan perubahan, tidak memuat rincian besaran PPN tiap transaksi.",
    ["pmk", "perubahan", "ppn", "regulasi"], ["pmk11-changes", "pmk54-changes", "pmk1-changes"]),
  law("pmk54-changes", "Perubahan ketiga PMK 81 — pasal yang dihapus", jdih + "454dde57-6a75-40ef-9afe-ff66077074db/2025pmkeuangan054.pdf",
    "PMK 54/2025 Pasal I angka 1–45; Pasal II",
    "PMK 54/2025, berlaku 1 Agustus 2025",
    "Pasal I angka 1 mengubah Pasal 1 angka 199–206 dan menambahkan angka 225–226. Angka 2–11 menghapus Bagian Kelima BAB VI dan Pasal 217–225. Angka 12–40 menghapus Bagian Keduapuluh BAB VI dan pasal 340, 341, 342, 344–353, 355–369. Angka 41–45 menghapus Pasal 465 huruf w, Pasal 467, Pasal 469 huruf l, Pasal 471, serta lampiran huruf OOO dan EEEE. Pasal II: berlaku 1 Agustus 2025. Pemetaan ini bukan pengganti analisis isi pasal lain atau dasar menghitung pajak.",
    ["pmk", "perubahan", "regulasi", "dihapus"], ["pmk11-changes", "pmk53-changes", "pmk1-changes"]),
  law("pmk1-changes", "Perubahan keempat PMK 81 — penggunaan nilai buku", jdih + "b5f99bff-f689-4e4f-ae3a-7c6a9a4cfe8a/2026pmkeuangan001.pdf",
    "PMK 1/2026 Pasal I angka 1–6; Pasal II angka 1–2",
    "PMK 1/2026, diundangkan 22 Januari 2026",
    "Pasal I mengubah Pasal 1 angka 135 dan 222, Pasal 392 ayat (7)–(8), Pasal 393 ayat (2), Pasal 394 ayat (4)–(5); menambah Pasal 405 ayat (6), dan Pasal 406A. Pasal 392 ayat (1)–(2) menyebut penggunaan nilai pasar atas pengalihan harta dalam penggabungan/peleburan/pemekaran/pengambilalihan usaha; nilai buku dapat digunakan setelah persetujuan DJP. Pasal II mengatur keputusan/permohonan nilai buku sebelum peraturan ini berlaku; angka 2 menyatakan berlaku pada tanggal diundangkan. Cuplikan ini tidak memuat semua persyaratan/restrukturisasi dan bukan perubahan tarif PPh final UMKM.",
    ["pmk", "perubahan", "regulasi", "nilai buku", "merger", "restrukturisasi"], ["pmk11-changes", "pmk53-changes", "pmk54-changes"]),
  manual("payment-manual", "Buku Manual Coretax — kode billing mandiri",
    "2025-01/Buku%20Manual%20Coretax%202024%20-%20Seri%20Pembayaran.pdf", 23,
    "PDF hlm. 23–25 (billing mandiri); hlm. 3 (peringatan versi)", "Edisi 20241129 (29 November 2024)",
    "Hlm. 23: Layanan Pembuatan Kode Billing Secara Mandiri untuk pembayaran selain dari SPT maupun Tagihan/Ketetapan; contoh setoran sendiri PPh final PP 55/2022 dan deposit. Pilih modul Pembayaran → Layanan Mandiri Kode Billing. Hlm. 24: tekan Lanjut; pilih KAP-KJS, Periode dan Tahun Pajak. Hlm. 25: isi mata uang, Nilai dan Keterangan jika dibutuhkan; tekan Unduh Kode Billing; billing berhasil akan terunduh otomatis. Hlm. 3 memperingatkan informasi dapat berubah mengikuti ketentuan dan pengembangan aplikasi. Pembuatan billing bukan bukti pajak sudah dibayar.",
    ["billing", "kap", "kjs", "kode", "pembayaran", "bayar", "setoran"]),
  manual("roles", "Akses WP badan — PIC, impersonate, drafter dan signer",
    "2025-01/Penanggung%20Jawab%2C%20Impersonate%20dan%20Penambahan%20Role%20Akses%20WP%20Badan%20%281%29.pdf", 7,
    "Hlm. cetak 1, 4–6 (PDF hlm. 4, 7–9; termasuk sampul)", "Versi 1.0 — 28 Januari 2025",
    "Hlm. cetak 1: PIC atau pihak dengan role tambahan masuk melalui akun OP lalu impersonate WP badan, bukan berbagi password badan. Hlm. 4: pastikan sudah menerima penugasan, buka dropdown akun kanan atas, pilih WP yang diwakili, periksa notifikasi sebagai wakil/kuasa/PIC TKU; kewenangan sesuai peran. Hlm. 5–6: pihak yang ditunjuk harus sudah terdaftar sebagai Pihak Terkait/Related Person; penanggung jawab melakukan impersonate badan → Wakil/Kuasa Saya → Tetapkan Role. Drafter mengisi/membuat dokumen; Signer menandatangani. Bila sedang login ketika role ditetapkan, logout lalu login kembali.",
    ["pic", "impersonate", "role", "akses", "badan", "drafter", "signer", "password", "kuasa"]),
  manual("nppn", "Panduan penyampaian pemberitahuan NPPN",
    "2025-03/Panduan%20Pemberitahuan%20Penggunaan%20NPPN.pdf", 10,
    "PDF hlm. 10–24 (termasuk sampul)", "Dokumen direktori Maret 2025; tidak tercantum nomor edisi",
    "Hlm. 10–14: Layanan Wajib Pajak → Layanan Administrasi → Buat Permohonan Layanan Administrasi → AS.04 Pemberitahuan Penggunaan NPPN dan Pembukuan Stelsel Kas → AS.04-01 Pemberitahuan Penggunaan NPPN → Simpan. Hlm. 15–21: Alur Kasus → isi data dan centang pernyataan → Simpan → Create PDF → isi formulir dokumen → Simpan → Sign dengan sertifikat elektronik (KO DJP) → Simpan → setelah notifikasi sukses, Submit. Hlm. 22–24: dokumen hasil penyampaian; status di Portal Saya → Profil Saya → Fasilitas Aktif; pastikan BPE pada Layanan Wajib Pajak → Layanan Administrasi → Daftar Fasilitas Saya. Manual ini tidak menetapkan siapa yang memenuhi syarat atau batas waktunya.",
    ["nppn", "norma", "neto", "pemberitahuan", "fasilitas", "bpe"]),
];
