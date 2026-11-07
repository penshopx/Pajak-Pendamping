# Penyaring makna jawaban konsultasi

## Urutan sebelum tampil

`POST /api/tax/consult` tetap hanya mengambil sumber yang diizinkan monitor.
Setelah generasi selesai, validasi sitasi lama memeriksa ID, format dan larangan
tautan. Setelah itu **setiap** calon jawaban bersumber melewati penyaring makna
wajib, bukan hanya evaluasi opt-in. Tidak ada streaming atau respons parsial.
Jawaban internal tentang status aplikasi dan penolakan karena sumber kosong
tidak memerlukan pemeriksaan klaim hukum.

Server membagi semua teks menjadi unit kalimat/baris yang berindeks. Penilai
terpisah harus memeriksa seluruh proposisi dalam setiap unit terhadap cuplikan
dan batas sumber. Server menolak unit yang hilang/berulang, penolakan dukungan,
kutipan rekaan, kutipan ke sumber yang tidak disitasi pada unit tersebut,
dan klaim bersitasi yang dilabeli nonfaktual. Bukti yang sekadar ada secara
tekstual belum membuktikan implikasi: penilaian makna tetap dilakukan model.
Klarifikasi, batas diri dan fakta internal aplikasi tidak perlu bukti hukum.

Semua sumber konteks diperiksa kembali sesudah penilaian: sumber yang ditahan
selama proses menggagalkan jawaban, termasuk sumber pendamping yang mungkin
mempengaruhi tafsir meskipun tidak dikutip. Tidak ada jalur override, persetujuan
baseline, perubahan kurasi, atau pengiriman ulang otomatis.

## Anggaran dan latensi

- Generasi: satu panggilan `gpt-5.4-mini`, batas 8.192 token keluaran,
  timeout 60 detik, retry SDK dinonaktifkan.
- Penilaian: maksimum satu panggilan model yang sama, batas 8.192 token
  keluaran, deadline tambahan 20 detik termasuk pemeriksaan akhir sumber.
  Deadline lokal membatalkan sinyal SDK; hasil terlambat tidak dapat ditampilkan.
- Input penilai (pesan instruksi/data dan skema keluaran) maksimum 64.000 byte UTF-8, calon
  jawaban maksimum 12.000 karakter dan 48 unit. Tidak ada pemotongan diam-diam:
  melewati anggaran berarti ditahan tanpa memanggil penilai.
- Maksimum dua panggilan AI per konsultasi, tanpa regenerasi/repair/escalation
  ke model mahal. Waktu provider nominal maksimum 80 detik; akses monitor,
  antrean jaringan dan serialisasi bukan jaminan SLA 80 detik.
- Batas route tetap 6 permintaan/menit/IP dan 4 konsultasi serentak per proses.
  Ini bukan kuota biaya global lintas replika.
- Batas biaya dinyatakan dalam jumlah panggilan, byte input dan token keluaran,
  bukan nominal rupiah/USD: tarif kredit penyedia dapat berubah. Batas byte
  bukan pengukuran token tepat. Timeout tidak menjamin biaya provider nol.
  Anggaran generasi tetap mengikuti batas request dan konteks kurasi yang ada.

## Kegagalan tertutup dan privasi

Error/timeout penilai, JSON rusak, keluaran terpotong, bukti tidak lengkap,
klaim salah/tidak didukung dan perubahan izin sumber semuanya menahan **seluruh**
calon jawaban, tanpa kartu sumber yang dapat memberi kesan pengesahan.
Respons menggunakan kontrak konsultasi yang sudah ada; UI menampilkan pesan
penahanan, batas AI, dan arahan verifikasi manusia. Kegagalan provider generasi
tetap memakai 503 tanpa calon jawaban. Tidak ada fallback ke jawaban yang belum
diperiksa atau ke sumber yang ditahan.

Log hanya kode keputusan dan durasi, bukan pertanyaan, jawaban, kutipan,
putusan mentah, atau error penyedia. Penilai menerima pertanyaan/riwayat yang
sama dan cuplikan; jangan memasukkan data wajib pajak nyata. Tidak ada antrean
yang menyimpan percakapan atau mengirimnya kepada manusia secara otomatis.

## Tinjauan manusia

Lulus berarti model tidak menemukan masalah dukungan dalam cuplikan, **bukan**
kebenaran hukum, persetujuan DJP, atau penetapan kasus. Model generasi dan
penilai bisa membuat kesalahan berkorelasi, melewatkan klaim implisit, atau
salah memberi label nonfaktual. Kutipan tepat dan cakupan unit bukan bukti
bahwa semua proposisi telah dipahami dengan benar.

Pengguna diarahkan memeriksa dokumen asli dan meminta bantuan KPP/DJP atau
profesional berwenang, khususnya tenggat/tindak lanjut surat; aplikasi tidak
menawarkan pemesanan konsultan atau mengirim tanggapan resmi.

Pengelola harus meninjau contoh **rekaan** yang benar dan salah beserta cuplikan,
versi model, false positive/negative, dan durasi sebelum mengubah kebijakan.
Jika ditemukan jawaban keliru yang lolos, tahan sumber terkait lewat proses
operator yang ada, buat regresi rekaan, lalu perbaiki penyaring; jangan
melonggarkan dukungan hanya untuk meluluskan tes. Persetujuan baseline sumber
tetap proses manusia tersendiri dalam `TAX-SOURCE-MONITOR.md`.

## Verifikasi

- `pnpm --filter @workspace/api-server run test:tax`: tes enforcement offline,
  termasuk semua kasus buruk SP2DK ber-ID sah dari `tax-sp2dk-cases.ts`,
  hasil tidak lengkap, batas biaya, timeout dan sumber ditahan saat penilaian.
  Putusan mock menguji penahanan, **bukan** akurasi semantik model.
- `pnpm --filter @workspace/api-server run tax:gate-calibrate`: dry run.
- Tambahkan `-- --live` untuk 7 sampel SP2DK rekaan (3 benar, 4 salah), satu
  panggilan per sampel, concurrency 1, tanpa retry; memakai kredit AI.
  CLI memakai snapshot kurasi terisolasi, tidak mengubah izin sumber nyata.
  `unavailable`/`budget` bukan bukti model mengenali klaim salah dan membuat
  kalibrasi gagal. Hasil dicetak sebagai kode dan durasi tanpa teks percakapan.

Kalibrasi ini menguji penilai produksi, melengkapi evaluator opt-in yang
memiliki rubrik skenario. Sekalipun seluruh sampel lulus, belum ada bukti
akurasi seluruh kategori, versi model berikutnya atau kasus nyata.

### Hasil percobaan 7 November 2026

Pada percobaan terakhir terhadap tujuh sampel, empat jawaban salah ditahan,
satu dari tiga jawaban rujukan benar lolos, dan dua jawaban benar juga ditahan
(false positive). Durasi penilaian berkisar 1,9–3,9 detik; bukan SLA atau estimasi
biaya nominal. Karena itu perintah kalibrasi **keluar dengan kode 1**, bukan
dinyatakan lulus. Percobaan sebelumnya juga menunjukkan variasi jawaban benar
mana yang ditahan: hasil satu putaran tidak stabil.

Penilai pernah mencampurkan asumsi dalam pertanyaan dengan teks unit jawaban,
menilai fakta internal aplikasi sebagai klaim hukum, menghilangkan unit,
dan mengarang kutipan yang mirip. Pemisahan konteks dari jawaban, cakupan
berindeks dan enum kutipan persis membatasi masalah format/bukti, tetapi
tidak menghilangkan false positive semantik. Penyaring tetap aktif secara
konservatif; tidak ada pengecualian agar sampel lolos dan baseline sumber
tidak disetujui. Pengguna dapat lebih sering menerima pesan penahanan.
Jangan menyatakan penilai sudah terkalibrasi atau andal untuk seluruh topik.

Untuk diagnosis khusus data rekaan, `--case sp2dk-not-closed
--diagnose-fixtures` mencetak input dan putusan fixture. Opsi ini hanya ada di
CLI dataset tetap, tidak tersedia pada endpoint konsultasi, dan tidak boleh
diterapkan ke percakapan nyata.
