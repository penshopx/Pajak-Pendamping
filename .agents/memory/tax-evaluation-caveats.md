---
name: Penilai jawaban pajak
description: Batas kepercayaan pada evaluasi semantik AI dan pemisahan sumber uji dari sumber konsultasi.
---

Jangan memperlakukan kegagalan penilai AI sebagai kesalahan hukum yang sudah
terbukti. Kalibrasikan dengan jawaban benar dan salah yang dipahami manusia,
serta bedakan klaim hukum dari klarifikasi, penolakan dan pernyataan batas diri.

**Why:** Dalam evaluasi langsung, penilai pernah menandai pernyataan tidak bisa
memastikan tenggat sebagai klaim tanpa dasar, menuntut angka ilustrasi persis
ada dalam sumber, dan menambah kriteria sendiri. Hasil tersebut menghasilkan
positif palsu walau ID sitasinya sah.

**How to apply:** Periksa alasan gagal dan bukti aslinya; jangan melonggarkan
aturan hukum hanya supaya hasil lulus. Lulusnya perangkat tes offline atau
satu kalibrasi tidak membuktikan akurasi seluruh kategori maupun model.

Snapshot kurasi boleh digunakan untuk menguji penafsiran secara terisolasi,
tetapi hasilnya tidak memberi persetujuan baseline sumber konsultasi nyata.

**Why:** Evaluasi harus tetap bisa menguji penafsiran ketika sumber belum
disetujui untuk melayani pengguna; menyamakan keduanya melewati tinjauan manusia.

**How to apply:** Pertahankan pembatasan sumber konsultasi. Jangan menyetujui
baseline atau memakai data wajib pajak nyata demi menjalankan evaluasi.

Penilai dukungan dalam layanan harus gagal tertutup, meskipun akibatnya
jawaban benar ikut ditahan. Jangan menghapus pemeriksaan atau membuat
pengecualian jawaban demi meluluskan kalibrasi.

**Why:** Percobaan rekaan menunjukkan penilai dapat mencampurkan asumsi
pertanyaan dengan jawaban, menghilangkan unit, serta mengarang kutipan yang
mirip. Kelulusan jawaban benar juga bervariasi antarpercobaan; penolakan
semua contoh salah saja tidak cukup untuk menyatakan kalibrasi berhasil.

**How to apply:** Pisahkan teks yang dinilai dari konteks pertanyaan. Uji
kontrol positif dan negatif, laporkan false positive secara terbuka, dan
jangan menyebut hasil model sebagai tinjauan hukum manusia.
