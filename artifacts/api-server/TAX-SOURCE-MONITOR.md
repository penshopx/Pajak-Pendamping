# Pemeriksaan dan tinjauan sumber pajak

Monitor berjalan saat API hidup: pemeriksaan saat startup dan setiap 15 menit
untuk URL yang belum diperiksa dalam 24 jam. Saat proses berhenti/tidur tidak ada
pemeriksaan; startup mengejar yang jatuh tempo. Setelah 48 jam tanpa pemeriksaan
sukses, cuplikan tidak boleh dipakai konsultasi. Untuk layanan tanpa proses yang
selalu hidup, jadwalkan perintah `check` dari penjadwal operasional.

## Mengoperasikan

Schema dev: `pnpm --filter @workspace/db run push`. Post-merge menjalankan perintah
ini juga. Jangan menjalankannya pada database produksi tanpa proses migrasi yang
disetujui. Monitor gagal tertutup bila tabel/DB tidak tersedia.

Dari root proyek:

```sh
pnpm --filter @workspace/api-server run tax:monitor check
pnpm --filter @workspace/api-server run tax:monitor queue
pnpm --filter @workspace/api-server run tax:monitor review \
  <resourceId> <observationId> <resourceDigest> approve "Nama peninjau" \
  "Naskah, locator, cakupan, perubahan, dan peralihan telah diperiksa; alasan keputusan..."
```

Ganti `approve` dengan `reject` untuk menolak. Kutip argumen catatan. `queue`
menampilkan semua entri, status, kelayakan konsultasi, cuplikan kurasi, versi,
locator, hubungan, tanggal pemeriksaan otomatis, tanggal tinjauan, dan bukti
pembanding persetujuan terakhir. Entri selain `approved` atau dengan
`consultationEligible: false` masih ditahan. Saat pertama dipasang **semua sumber
memerlukan baseline dan tinjauan**, bukan otomatis dianggap aman. Peninjau harus
membaca dokumen resmi sendiri, bukan hanya melihat hash. Identitas peninjau dan
catatan adalah audit operator lokal, bukan bukti sertifikasi profesi.

Persetujuan mensyaratkan observation sukses dalam 24 jam dan digest cuplikan
yang sama dengan antrean. Tinjauan berakhir setelah 90 hari. Hash isi, tautan
resmi di HTML, dan tujuan redirect harus tetap cocok. Perubahan/gangguan yang
sempat terjadi tetap menahan cuplikan walaupun kemudian sumber kembali sama;
perlu keputusan manusia baru. Sumber pendamping yang ditahan juga menahan
cuplikan yang bergantung padanya (termasuk siklus rujukan perubahan/peralihan).

Jika revisi cuplikan diperlukan, ubah kurasi lewat perubahan kode yang ditinjau,
pertahankan konteks historis dan ID stabil, lalu periksa dan setujui digest baru.
Tidak ada unduhan yang langsung mengubah `tax-excerpts.ts`/`tax-resources.ts`.
Cuplikan SP2DK `sp2dk-registered`, `sp2dk-unregistered`, `sp2dk-extension` dan
`sp2dk-followup` memakai naskah PMK 111/2025 pada halaman resmi DJP, dibaca
7 November 2026. Keempatnya satu paket wajib: jika satu ditahan, semuanya
ditahan. Penambahan kurasi ini tidak menyetujui baseline. Peninjau tetap harus
mencocokkan naskah, pasal, cakupan waktu, serta masing-masing digest sebelum
memutuskan. Jangan menyetujui otomatis agar konsultasi tersedia.
Observasi dan keputusan **ditambahkan**, tidak ditimpa; setiap keputusan menyimpan
snapshot cuplikan saat itu. Versi lama tetap ada di riwayat review dan Git.

## Batas deteksi

- URL hanya HTTPS pada pajak.go.id, www.pajak.go.id, jdih.kemenkeu.go.id;
  redirect keluar daftar ditolak. Batas 5 redirect, 25 detik, 30 MiB.
- PDF diperiksa magic header dan penutupnya; bukan bukti isi dapat diekstrak atau
  sah secara hukum. HTML gangguan/tantangan akses yang dikenali ditolak.
- Hash byte seluruh dokumen sensitif terhadap perubahan kosmetik. Perubahan
  tautan resmi HTML dihitung terpisah; JavaScript, tautan tanpa kutip, dan tautan
  yang tertanam dalam PDF tidak diekstrak. Peninjau memeriksa lampiran/rujukan.
- Halaman gangguan yang tidak dikenali bisa lolos pemeriksaan teknis; baseline
  tetap harus diperiksa manusia. Tidak ada klaim konsolidasi lengkap, pemantauan
  seluruh regulasi baru, atau kepastian aturan paling akhir. Aturan baru di URL
  lain yang tidak ditautkan sumber terpantau dapat terlewat.
- Hanya hash/metadata dan snapshot **cuplikan kurasi** disimpan; bukan salinan
  dokumen unduhan. Untuk arsip naskah utuh, gunakan penyimpanan dokumen terpisah
  dengan kebijakan retensi sebelum menambahkan fitur itu.
- Antrean adalah alat operator dengan akses shell/DB. Tidak ada endpoint
  persetujuan publik atau asumsi otorisasi admin dari browser.
- Pustaka tetap menampilkan versi kurasi historis. Label “dicek” di kartu pustaka
  berarti tanggal kurasi, bukan status monitor. Hanya konsultasi baru yang
  difilter; percakapan lama di browser tidak ditulis ulang.
