---
name: Rekonsiliasi workflow setelah penggabungan
description: Status workflow gagal dapat menyembunyikan proses server lama yang masih mendengarkan.
---

Setelah penggabungan tugas, periksa proses yang benar-benar memiliki port sebelum membuat layanan pengganti atau mengulang restart.

**Why:** Beberapa rekonsiliasi di proyek ini menandai workflow API/web gagal karena EADDRINUSE, sementara proses server dari layanan yang sama masih hidup. Status workflow bukan bukti port kosong atau aplikasi mati.

**How to apply:** Cocokkan pemilik port, direktori kerja dan perintah proses dengan artifact terkait. Jika terbukti proses lama layanan itu, hentikan hanya proses tersebut, lalu restart workflow terkelola yang sama. Jangan menambah workflow duplikat atau mengganti port untuk menutupi benturan.

Daftar soket IPv6 di `/proc/net/tcp6` bersifat opsional pada sandbox ini.

**Why:** Berkas tersebut pernah tidak tersedia sementara server IPv4 masih aktif; menganggapnya wajib dapat menghentikan diagnosis sebelum pemilik port ditemukan.

**How to apply:** Pemeriksaan proses harus tetap dapat berjalan dengan daftar soket IPv4 saja bila daftar IPv6 tidak tersedia.
