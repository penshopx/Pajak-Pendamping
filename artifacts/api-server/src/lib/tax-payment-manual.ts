export const paymentManualUrl = "https://www.pajak.go.id/sites/default/files/2025-01/Buku%20Manual%20Coretax%202024%20-%20Seri%20Pembayaran.pdf";

// Page numbers verified against the PDF's physical and printed page numbering.
// Only these selected sections have been analyzed, not the entire manual.
export function paymentManualSections(checkedAt: string) {
  const section = (id: string, title: string, pages: string, start: number, excerpt: string) => ({
    id, title, category: "Pembayaran",
    description: `Ringkasan bagian yang telah dibaca: halaman ${pages}, edisi 29 November 2024. Bukan jaminan prosedur terkini.`,
    url: `${paymentManualUrl}#page=${start}`,
    publisher: "Direktorat Jenderal Pajak",
    sourceType: "Manual — bagian dianalisis",
    checkedAt,
    excerpt: `Buku Manual Coretax — Pembayaran, edisi 20241129, hlm. ${pages}.\n${excerpt}\nBatasan versi: halaman 3 manual menyatakan informasi dapat berubah mengikuti ketentuan dan pengembangan aplikasi. Cocokkan langkah, masa aktif, dan opsi yang tersedia pada portal resmi saat digunakan. Ringkasan manual bukan penentuan kewajiban, tarif atau jatuh tempo pajak.`,
  });
  return [
    section("payment-manual-billing", "Panduan: membuat kode billing mandiri", "23–25", 23,
      "1. Dalam versi manual ini, layanan mandiri digunakan untuk pembayaran selain SPT dan tagihan/ketetapan; jangan gunakan alur ini untuk semua jenis pembayaran.\n2. Pada portal resmi Coretax, pilih Pembayaran → Layanan Mandiri Kode Billing (hlm. 23).\n3. Periksa identitas wajib pajak di portal dan tekan Lanjut (hlm. 24).\n4. Pilih KAP–KJS serta Periode dan Tahun Pajak (hlm. 24).\n5. Isi mata uang, nilai pembayaran, dan keterangan bila dibutuhkan; periksa kembali lalu tekan Unduh Kode Billing (hlm. 25).\nManual menyebut masa aktif billing sampai tujuh hari sejak dibuat dan perlu membuat ulang bila sudah kedaluwarsa. Ini keterangan edisi 2024, bukan jaminan masa aktif billing saat ini; ikuti masa aktif pada billing yang diterbitkan portal. Unduhan billing belum membuktikan pajak sudah dibayar."),
    section("payment-manual-bills", "Panduan: billing atas tagihan atau ketetapan", "30–31", 30,
      "1. Untuk tagihan/ketetapan kurang bayar, manual mengarahkan ke Pembayaran → Pembuatan Kode Billing atas Tagihan Pajak (hlm. 30).\n2. Pilih tunggakan yang akan dibayar, lalu isi nominal; menurut manual, nominal tidak boleh melebihi nilai tunggakan dan dapat dipilih lebih dari satu tunggakan (hlm. 31).\n3. Manual menampilkan opsi Bayar dengan Pemindahbukuan Deposit Pajak bila memiliki deposit; bila tidak, pilihan Buat Kode Billing. Ketersediaan dan kecukupan deposit harus diperiksa di portal resmi, bukan diasumsikan dari catatan aplikasi.\n4. Jika memilih Buat Kode Billing, manual menjelaskan kode diunduh otomatis. Bayar melalui kanal resmi sebelum masa aktif billing berakhir. Pembuatan billing bukan pelunasan."),
    section("payment-manual-active", "Panduan: melihat kode billing yang belum dibayar", "33–35", 33,
      "1. Pilih Pembayaran → Daftar Kode Billing Belum Dibayar (hlm. 33).\n2. Manual menjelaskan daftar ini untuk billing yang telah dibuat, masih aktif, dan belum dibayar; jangan menganggapnya sebagai daftar seluruh utang pajak.\n3. Aksi Lihat menampilkan detail dan unduhan/cetak PDF; Email mengirim billing ke alamat surel terdaftar (hlm. 34–35).\n4. Aksi Bayar mengarahkan ke situs internet bank persepsi yang terhubung dengan Coretax (hlm. 35). Tidak ada dasar dari manual lama ini untuk menjamin daftar bank atau tombol tertentu masih tersedia saat ini.\nMasa aktif billing tidak sama dengan tanggal jatuh tempo kewajiban pajak."),
    section("payment-manual-evidence", "Memahami kode billing, NTPN, dan bukti pemindahbukuan", "9–10", 9,
      "Hlm. 9 menjelaskan pembuatan kode billing diikuti pembayaran melalui kanal collecting agents. Untuk alur pembayaran tersebut, validasi DJPb berupa Nomor Transaksi Penerimaan Negara (NTPN) menjadi penanda pembayaran yang sah; nomor billing sendiri bukan NTPN dan bukan bukti pelunasan.\nUntuk SPT kurang bayar, manual menyebut pilihan membuat billing atau mengambil deposit bila saldo mencukupi (hlm. 9). Jika menggunakan deposit, sistem memeriksa saldo dan memindahbukukan bila cukup; Bukti Pemindahbukuan menjadi bukti pembayaran (hlm. 10).\nJangan menyamakan bukti pemindahbukuan dengan kode billing atau mengklaim semua alur pembayaran harus menghasilkan NTPN baru."),
  ];
}
