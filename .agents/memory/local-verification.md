---
name: Tool verifikasi lokal
description: Bedakan CLI yang tidak diekspos pada PATH artefak dari dependensi yang benar-benar tidak terpasang.
---

CLI yang tidak ditemukan melalui `pnpm exec` di sebuah artefak tidak cukup menjadi alasan memasang dependensi pengujian baru.

**Why:** Pada workspace ini, server dan pemeriksaan tipe berjalan meski CLI transpiler tertentu tidak diekspos ke PATH artefak. Compiler terpasang transitif tetap dapat dipakai untuk pengujian lokal; menganggapnya tidak tersedia menyebabkan percobaan yang tidak perlu.

**How to apply:** Sebelum memilih runner pengujian ad-hoc, periksa perintah proyek dan tool yang benar-benar terpasang. Gunakan toolchain yang ada bila mencukupi, tanpa menambahkan paket hanya untuk menutup perbedaan PATH.

Pengujian render melalui tsx perlu transformasi JSX otomatis tersendiri bila konfigurasi aplikasi memakai `jsx: preserve`; konfigurasi Vite tidak otomatis berlaku pada runner Node.

**Why:** Aplikasi dapat berjalan normal melalui Vite sementara tes render gagal dengan `React is not defined`. Menambah impor React ke semua komponen hanya menutupi perbedaan runner.

**How to apply:** Pakai konfigurasi tes yang mewarisi konfigurasi aplikasi dan mengubah JSX ke `react-jsx`. Untuk render komponen bertautan Wouter, gunakan Router dengan lokasi SSR, bukan global browser palsu.

Tes privasi navigasi harus membedakan permintaan aset halaman dari pengiriman data interaksi.

**Why:** Chromium dapat meminta favicon terlambat dan meminta font eksternal lagi saat muat ulang; melarang semua jaringan menghasilkan kegagalan palsu meskipun latihan sepenuhnya lokal.

**How to apply:** Izinkan hanya aset yang dikenal sebelum interaksi dengan URL tepat; tetap tolak pengiriman data dan permintaan dinamis yang tidak diharapkan, termasuk parameter URL yang berubah.
