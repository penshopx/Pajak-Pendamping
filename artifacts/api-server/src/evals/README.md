# Evaluasi penafsiran pajak

Konsultasi produksi kini juga memakai penyaring makna wajib sebelum tampil.
Lihat `../TAX-ANSWER-GATE.md` untuk anggaran, kegagalan tertutup, hasil
kalibrasi (termasuk false positive yang belum terselesaikan), dan tinjauan
manusia. Evaluator di direktori ini tetap alat evaluasi terpisah, bukan
persetujuan baseline atau kepastian hukum.

Semua pertanyaan adalah rekaan tanpa nama, NPWP, NIK atau data wajib pajak nyata.
Kumpulan ini mencakup OP versus badan, penggabungan omzet suami-istri, peralihan
OP dan badan pada PP 20/2026, pekerjaan bebas, NPPN tanpa dasar tenggat,
sumber palsu (termasuk riwayat asisten), pertanyaan campuran, serta SP2DK:
pemicu waktu menurut status WP/saluran, kasus dengan fakta belum cukup,
syarat penerimaan pemberitahuan perpanjangan, dan draf/BPE bukan penutupan.

## Tes rutin: tanpa jaringan dan tanpa biaya AI

```sh
pnpm --filter @workspace/api-server run test:tax
```

Tes lama tetap dijalankan bersama evaluasi baru. Setiap kasus mempunyai rubrik,
jangkar cuplikan yang harus tersedia, jawaban rujukan bersyarat, dan contoh salah
yang **tetap memiliki ID sitasi sah**. Pemeriksaan ringan menguji proposisi
tertentu di kalimat yang sama dengan sumbernya, batas sumber, dan salah atribusi.
Pemeriksaan ini sengaja bukan pembuktian makna bahasa alami secara umum.
Tes penilai juga memastikan kutipan bukti benar-benar ada, klaim ada di jawaban,
seluruh indeks kriteria dinilai, dan keluaran rusak ditolak.

## Evaluasi AI langsung: harus dipilih secara eksplisit

```sh
# Tanpa --live: hanya informasi penggunaan, tidak mengimpor klien AI.
pnpm --filter @workspace/api-server run tax:eval

# Default: kasus NPPN, maksimum 2 permintaan.
pnpm --filter @workspace/api-server run tax:eval --live

# Satu kasus tertentu.
pnpm --filter @workspace/api-server run tax:eval --live --case transition-op

# Tiga kasus SP2DK, maksimum 6 permintaan.
pnpm --filter @workspace/api-server run tax:eval --live \
  --case sp2dk-general --case sp2dk-missing-facts --case sp2dk-not-closed --max-calls 6

# Daftar seluruh kasus tanpa menghubungi AI.
pnpm --filter @workspace/api-server run tax:eval --all

# Kalibrasi penilai dengan contoh benar dan salah, bukan generasi jawaban.
pnpm --filter @workspace/api-server run tax:eval --live --calibrate --case nppn-no-deadline
```

Generator menggunakan model dan **fungsi instruksi yang sama dengan konsultasi
HTTP**, dengan tanggal evaluasi dibekukan pada tanggal pemeriksaan corpus.
Riwayat sintetis ikut dikirim. Jawaban mentah harus lolos format/sitasi sebelum
dinilai; fallback server tidak boleh menyembunyikan jawaban yang gagal.
Penilai memeriksa semua klaim, subjek, syarat, tahun, negasi, angka, lokasi
pasal/versi, keterbatasan, dan penolakan instruksi palsu. Ia harus mengembalikan
penilaian setiap kriteria dan bukti kutipan per klaim. Server evaluasi memeriksa
ulang keberadaan teks bukti dalam cuplikan atau batas sumber yang disebut.
Penilai memakai JSON schema ketat dan membedakan klaim pajak dari klarifikasi,
penolakan, atau batas diri yang tidak membutuhkan bukti hukum.

Ini menggunakan Replit AI Integrations yang sudah tersedia; biayanya memakai
kredit AI Replit. Batas maksimum keras 16 permintaan per proses, satu kasus
default, serial, tanpa retry SDK maupun batch, maksimum 60.000 karakter input
dan 8.192 token keluaran per permintaan, timeout 90 detik. Batas ini membatasi
pemakaian, **bukan jaminan harga rupiah**. Jumlah token aktual dicatat.
Jumlah kasus kini melebihi kapasitas `--live --all` dalam batas keras tersebut;
pilih kelompok menggunakan `--case` berulang, maksimum delapan kasus per proses.
Penambahan SP2DK diverifikasi dengan tes offline; bukan klaim bahwa generasi
AI atau penilai semantik untuk tiga kasus baru sudah dikalibrasi langsung.
Tidak ada panggilan AI di tes rutin, jalur HTTP, atau startup yang ditambahkan
oleh evaluasi ini. Argumen teks pertanyaan bebas/file pengguna tidak didukung.

Laporan JSON ada di `generated-artifacts/tax-evals/`, diabaikan Git dan
deployment. Laporan generasi menyimpan jawaban, rubrik, snapshot cuplikan,
versi/locator/batas, penilaian dan alasan gagal; laporan kalibrasi menyimpan
penilaian contoh benar/salah. Model, tanggal dan pemakaian token dicatat.
Exit code bukan nol berarti ada kegagalan, termasuk keluaran AI/penilai yang
tidak lengkap. Error penyedia disamarkan, bukan dicetak bersama request atau
kredensial. Jangan memasukkan laporan berisi data pengguna ke repositori.

## Batas kesimpulan

Evaluasi memakai snapshot kurasi lokal, **bukan izin menggunakan sumber itu
di konsultasi nyata**. Ia tidak mengakses database pengguna, mengambil sumber
langsung, atau menyetujui baseline pemantauan. Konsultasi tetap memakai
`consultationSources()` dan menahan sumber yang belum disetujui.

Lulus tes offline berarti pemeriksaan regresi dan perangkat evaluasi bekerja,
bukan bukti AI selalu benar. Penilai AI dapat salah atau melewatkan klaim dan
bukan pengganti pembacaan manusia atas naskah hukum. Kegagalan generasi perlu
ditinjau bersama cuplikan dan aturan perubahan/peralihannya; jangan mengubah
rubrik sekadar agar hasil lulus. Perubahan corpus dapat menuntut peninjauan
jawaban rujukan dan jangkar bukti. Pemeriksaan semantik ini hanya evaluasi
opt-in, **belum menjadi penyaring makna jawaban pada runtime**.

## Hasil pemeriksaan awal — 6 November 2026

- Tes rutin: 48 lulus; tes pemantauan sumber: 10 lulus; typecheck workspace lulus.
- Evaluasi eksplorasi seluruh delapan jawaban memakai 16 panggilan
  (66.005 token input, 17.484 token output). Semua ditandai untuk ditinjau.
  Hasil ini **bukan delapan kesalahan hukum yang sudah terbukti**: sebagian
  besar tanda gagal berasal dari penilai yang salah memasukkan batas diri,
  menambah kriteria, atau tidak menyalin bukti secara persis.
- Jawaban OP/badan dan PT baru juga menunjukkan kemungkinan penjelasan yang
  terlalu ragu walaupun cuplikan memuat pembeda subjek/dasar; perlu peninjauan
  manusia, bukan pengubahan aturan pajak otomatis berdasarkan penilai.
- Kalibrasi NPPN pertama (2 panggilan) mengonfirmasi masalah positif palsu
  terhadap batas diri. Setelah skema dan kategori klaim diperbaiki, kalibrasi
  NPPN kedua (2 panggilan; 2.821 token input, 1.325 token output) lulus:
  jawaban rujukan diterima dan tenggat palsu dengan ID sah ditolak.
- Total pemeriksaan berbayar: 20 panggilan. Seluruh delapan jawaban tidak
  digenerasi/ dinilai ulang setelah perbaikan penilai untuk menghindari biaya
  tambahan. Karena itu belum ada klaim tingkat akurasi penuh model produksi
  atau kalibrasi semantik yang tervalidasi untuk seluruh kategori.
- Perubahan pencarian yang dipicu evaluasi: pertanyaan PPh final bercampur
  NPPN kini mempertahankan manual NPPN bila sumber itu memang diizinkan.
