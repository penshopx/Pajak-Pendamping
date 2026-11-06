---
name: Kompatibilitas pemulihan cadangan
description: Alasan mempertahankan bagian yang tidak tercantum dan mendahulukan catatan lokal saat menggabungkan cadangan.
---

Cadangan lama yang tidak memuat suatu bagian bukan permintaan untuk menghapus bagian tersebut, termasuk pada mode penggantian. Daftar kosong yang tercantum secara eksplisit berbeda dari bagian yang tidak ada. Riwayat chat bukan bagian cadangan usaha.

**Why:** Format cadangan berkembang seiring fitur baru. Menafsirkan bagian yang tidak ada sebagai daftar kosong dapat menghapus transaksi, hubungan tagihan, atau progres yang baru dibuat pengguna.

**How to apply:** Pertahankan pembedaan bagian absen dan bagian kosong pada migrasi serta perubahan format berikutnya; jangan menganggap cadangan memuat chat.

Penggabungan mendahulukan catatan lokal pada ID yang sama, bukan isi cadangan.

**Why:** Cadangan tidak memiliki waktu sunting yang dapat dipercaya untuk setiap catatan. Mengutamakan isi cadangan bisa memundurkan suntingan lokal tanpa diketahui pengguna.

**How to apply:** Jangan mengubah penggabungan menjadi penimpaan otomatis tanpa mekanisme konflik yang jelas. Untuk tagihan dan pembayaran, periksa kembali hubungan keuangan setelah penggabungan; konflik yang tidak konsisten harus ditolak, bukan menghasilkan kas ganda.
