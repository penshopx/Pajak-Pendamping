---
name: Tool verifikasi lokal
description: Bedakan CLI yang tidak diekspos pada PATH artefak dari dependensi yang benar-benar tidak terpasang.
---

CLI yang tidak ditemukan melalui `pnpm exec` di sebuah artefak tidak cukup menjadi alasan memasang dependensi pengujian baru.

**Why:** Pada workspace ini, server dan pemeriksaan tipe berjalan meski CLI transpiler tertentu tidak diekspos ke PATH artefak. Compiler terpasang transitif tetap dapat dipakai untuk pengujian lokal; menganggapnya tidak tersedia menyebabkan percobaan yang tidak perlu.

**How to apply:** Sebelum memilih runner pengujian ad-hoc, periksa perintah proyek dan tool yang benar-benar terpasang. Gunakan toolchain yang ada bila mencukupi, tanpa menambahkan paket hanya untuk menutup perbedaan PATH.
