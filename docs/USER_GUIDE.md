# 📖 Panduan Pengguna Luvira 2.0 (User Guide)
> **Platform E-Commerce Kaus Kaki Modest & Syar'i Berbasis Multi-Region & Multi-Peran**  
> *Versi Rilis: 2.0.0 — Oktober 2026*

---

## 📌 Daftar Isi
1. [Ringkasan Platform & 5 Peran Akses](#1-ringkasan-platform--5-peran-akses)
2. [Kredensial Akun Pengujian & Live Demo](#2-kredensial-akun-pengujian--live-demo)
3. [Panduan Pembeli (Customer / Guest Checkout)](#3-panduan-pembeli-customer--guest-checkout)
4. [Panduan Admin Wilayah (Cabang Yogyakarta)](#4-panduan-admin-wilayah-cabang-yogyakarta)
5. [Panduan Admin Pusat (Depok)](#5-panduan-admin-pusat-depok)
6. [Panduan Owner (Executive Dashboard)](#6-panduan-owner-executive-dashboard)
7. [Panduan Developer (Observability Hub)](#7-panduan-developer-observability-hub)
8. [Aturan Keamanan & Bisnis Kunci](#8-aturan-keamanan--bisnis-kunci)
9. [Troubleshooting & Solusi Kendala Umum](#9-troubleshooting--solusi-kendala-umum)

---

## 1. Ringkasan Platform & 5 Peran Akses

Luvira 2.0 dibangun untuk melayani transaksi retail kaus kaki modest & syar'i di seluruh Indonesia dengan pembagian gudang multi-wilayah (Gudang Pusat Depok dan Gudang Wilayah Yogyakarta). Sistem secara otomatis mengarahkan pesanan ke gudang terdekat, menghitung ongkos kirim real-time (Komerce RajaOngkir), memfasilitasi pembayaran otomatis (Midtrans Snap) dan manual (Bank Jago Syariah & BSI), serta menyediakan dasbor terisolasi untuk 5 peran pengguna:

```
[Pembeli] --------> Belanja, Ongkir Otomatis, Lacak Resi & Nasihat Syar'i
   │
   ├── [Admin Wilayah] --> Verifikasi Bukti Bayar, Kirim Resi, Cek Stok Gudang Wilayah
   │
   ├── [Admin Pusat] ----> Harga Seragam, Stok Pusat, Promo Nasional, Kelola Admin Wilayah
   │
   ├── [Owner] ----------> Finansial (Omzet, HPP, Laba), Rekening Bank, Pengaturan Margin, Audit Log
   │
   └── [Developer] ------> Pemantauan Kesehatan (DB, Midtrans, RajaOngkir, ImageKit, Error Log)
```

---

## 2. Kredensial Akun Pengujian & Live Demo

Semua peran dapat diakses melalui portal login tunggal di URL:  
👉 **`http://localhost:3000/dashboard/login`** (atau domain produksi Anda)

| Peran | Email | Kata Sandi | Lingkup Wewenang |
|---|---|---|---|
| **Owner** | `owner@luvira.id` | `LuviraOwner2026!` | Akses finansial lengkap, HPP rahasia, pengaturan bisnis, rekening bank, audit trail |
| **Admin Pusat** | `admin.pusat@luvira.id` | `LuviraPusat2026!` | Kelola harga jual seragam, stok Pusat Depok, promo reseller, kelola admin wilayah |
| **Admin Wilayah (DIY)** | `admin.jogja@luvira.id` | `LuviraJogja2026!` | Kelola pesanan & stok wilayah Yogyakarta, promo kustom wilayah, resi pengiriman |
| **Developer** | `developer@luvira.id` | `LuviraDev2026!` | Cek status integrasi, kesehatan database, antrean bermasalah, log error sistem |
| **Pembeli (Buyer)** | *Tanpa Akun (Guest)* | *Tidak perlu login* | Membeli produk, melacak pesanan via Kode + 4 digit terakhir nomor WhatsApp |

---

## 3. Panduan Pembeli (Customer / Guest Checkout)

### 3.1 Sadar Lokasi & Katalog
1. Buka halaman utama: `http://localhost:3000`.
2. Di bagian atas halaman, klik **"Pilih Lokasi Pengiriman"** untuk menetapkan Provinsi dan Kota tujuan Anda (misal: *DI Yogyakarta - Kota Yogyakarta*).
3. Katalog produk akan menampilkan stok aktual yang tersedia di gudang penangan terdekat.

### 3.2 Menambah Produk ke Keranjang
1. Gulir ke bagian **Koleksi Produk**.
2. Pilih model kaus kaki (misal: *Classic Split Toe* atau *Ribbed Modest Series*).
3. Pilih varian warna yang diinginkan dan klik **+ Tambah ke Keranjang**.
4. Buka laci keranjang di sudut kanan atas untuk mengubah kuantitas atau melanjutkan ke **Checkout**.

### 3.3 Formulir Alamat Bertingkat & Cari Cepat
1. Masukkan Nama Penerima dan Nomor WhatsApp (otomatis dinormalisasi ke format internasional `628...`).
2. **Pencarian Alamat Cepat**: Ketik nama kelurahan atau kode pos di kolom *Cari Cepat* (misal: ketik `Pancoran Mas` atau `Caturtunggal`), sistem akan otomatis memilihkan Provinsi, Kota, Kecamatan, dan Kelurahan sekaligus.
3. Masukkan rincian jalan, nomor rumah, dan patokan untuk kurir.

### 3.4 Pilihan Kurir & Promo
1. Pilih kurir ekspedisi yang tersedia (JNE, SiCepat, atau J&T). Tarif dan estimasi waktu sampai (ETD) dihitung secara live via Komerce RajaOngkir API.
2. Jika memiliki kode promo (misal: `RESELLER2026` atau promo wilayah `JOGJAISTIMEWA`), masukkan pada kolom kupon dan tekan **Terapkan**. Sistem akan menghitung potongan harga dan PPN 11% secara transparan.

### 3.5 Pembayaran
Pilih metode pembayaran:
* **Midtrans Snap (Instan Otomatis)**: Klik **Bayar Sekarang**, popup Snap akan terbuka untuk pembayaran instan via QRIS, GoPay, ShopeePay, atau Virtual Account Bank (BCA, Mandiri, BRI, BNI). Setelah dibayar, status pesanan otomatis berubah menjadi `DIPROSES`.
* **Transfer Manual (2 Rekening Resmi)**: Pilih salah satu rekening resmi Luvira (Bank Jago Syariah atau Bank Syariah Indonesia / BSI). Selesaikan transfer sesuai nominal persis, lalu unggah foto/screenshot bukti transfer di halaman status pesanan.

### 3.6 Pelacakan Pesanan & Nasihat Syar'i
* **Lacak Pesanan**: Buka menu **Lacak Pesanan** (`/track`), masukkan Kode Invoice (contoh: `LVR-DEMO-KIRIM-1497`) dan 4 digit terakhir nomor WhatsApp (contoh: `1234`). Pelanggan dapat memantau linimasa progres pesanan dari verifikasi, pengemasan, hingga nomor resi kurir.
* **Nasihat Syar'i**: Buka menu **Nasihat Syar'i** (`/nasihat`) untuk membaca panduan menutup aurat kaki bagi muslimah serta tips merawat kaus kaki premium.

---

## 4. Panduan Admin Wilayah (Cabang Yogyakarta)

Admin Wilayah bertugas memastikan pesanan di wilayah operasionalnya tertangani dengan cepat tanpa bisa melihat atau mengganggu data wilayah lain.

1. **Login**: Masuk dengan akun `admin.jogja@luvira.id`.
2. **Isolasi Wilayah**: Perhatikan badge header di sudut kiri atas bertuliskan `Admin Wilayah - Yogyakarta (DIY)`. Semua data pesanan yang tampil otomatis difilter hanya untuk pelanggan di provinsi DI Yogyakarta.
3. **Verifikasi Bukti Transfer**:
   - Buka tab **Pesanan Masuk**.
   - Pada pesanan berstatus `MENUNGGU VERIFIKASI`, klik tombol **Cek Bukti**.
   - Periksa foto bukti transfer, nominal, dan bank tujuan.
   - Klik **Konfirmasi Pembayaran** untuk memindahkan pesanan ke status `DIPROSES`, atau **Tolak Bukti** dengan menyertakan alasan jelas.
4. **Input Resi Pengiriman**:
   - Pada pesanan berstatus `DIPROSES`, klik **Kirim Pesanan**.
   - Pilih nama kurir (misal: `JNE`) dan masukkan nomor resi paket (misal: `JNE9918273645`).
   - Status pesanan berubah menjadi `DIKIRIM` dan nomor resi langsung dapat dilacak oleh pembeli.
5. **Cek & Penyesuaian Stok Gudang**:
   - Buka tab **Stok Gudang** untuk melihat stok fisik, stok dipesan (*reserved*), dan stok tersedia.
   - Klik **Sesuaikan Stok** bila ada barang masuk atau rusak. Wajib mengisi kolom alasan mutasi demi kejelasan audit trail.
6. **Promo Wilayah**:
   - Buka tab **Kode Promo** untuk membuat voucher promosi khusus warga DIY.
   - Sistem membatasi diskon maksimal 50% untuk mencegah kerugian margin operasional.
7. **Menulis Nasihat Syar'i**:
   - Buka tab **Nasihat Syar'i** untuk menulis artikel panduan syar'i karya tim wilayah yang akan tayang di portal publik.

---

## 5. Panduan Admin Pusat (Depok)

Admin Pusat mengendalikan operasional pusat dan memiliki wewenang mengelola harga serta admin wilayah.

1. **Login**: Masuk dengan akun `admin.pusat@luvira.id`.
2. **Kelola Harga Jual Seragam**:
   - Buka tab **Katalog & Harga**.
   - Ubah harga jual produk. Perubahan ini berlaku serentak di seluruh Indonesia.
   - *Penting*: HPP (Harga Modal Produk) dikunci dan disembunyikan secara permanen dari layar ini untuk menjaga kerahasiaan bisnis.
3. **Kelola Stok Gudang Pusat**:
   - Buka tab **Stok Gudang** untuk memantau inventaris gudang pusat Depok.
4. **Kelola Promo Reseller Nasional**:
   - Buka tab **Kode Promo** untuk membuat promo skala nasional untuk mitra reseller Luvira.
5. **Kelola Akun Admin Wilayah**:
   - Buka tab **Kelola Admin Wilayah**.
   - Admin Pusat dapat mendaftarkan akun Admin Wilayah baru atau menonaktifkan akun yang sudah tidak bertugas.
6. **Kelola CMS & Copywriting**:
   - Buka tab **Copywriting CMS** untuk memperbarui teks promo banner atau headline situs utama.

---

## 6. Panduan Owner (Executive Dashboard)

Owner memegang hak akses tertinggi atas finansial, data rahasia HPP, rekening bank, dan seluruh kebijakan bisnis.

URL Khusus: 👉 **`http://localhost:3000/dashboard/owner`**

### 6.1 Tab Finansial & HPP (Eksklusif Owner)
* **4 Kartu KPI Utama**:
  1. **Omzet Penjualan (Kotor)**: Total nilai pesanan sukses terkonfirmasi.
  2. **Total HPP (Modal & Packing)**: Total biaya pokok penjualan produk (*Hanya Owner & Developer yang memiliki akses ke angka ini*).
  3. **Laba Bersih (Net Profit)**: Keuntungan bersih riil setelah dikurangi HPP dan biaya packing.
  4. **PPN 11% (Titipan Pajak)**: Akumulasi dana pajak pertambahan nilai yang siap disetor.
* **Riwayat Transaksi & Breakdown Laba**: Tabel rincian invoice lengkap dengan kalkulasi laba per transaksi.
* **Ekspor Laporan (CSV)**: Klik tombol **Ekspor Laporan (CSV)** untuk mengunduh rekap penjualan ke format spreadsheet.

### 6.2 Tab Rekening Bank Transfer
* Melihat daftar rekening pembayaran resmi Luvira:
  - **Bank Jago Syariah**: `509366156008` (a.n. Muhammad Naufal Ammr Dzakwan)
  - **Bank Syariah Indonesia (BSI)**: `7239477938` (a.n. Muhammad Naufal Ammr Dzakwan)
* Owner dapat menonaktifkan atau mengaktifkan rekening kapan saja melalui tombol toggle tanpa mengubah kode program.

### 6.3 Tab Pengaturan Bisnis & Proteksi Margin
* **Tarif PPN (%)**: Default 11% (bisa disesuaikan bila ada kebijakan pajak baru).
* **Batas Maksimum Diskon Promo (%)**: Default 50% untuk mencegah promosi yang membahayakan keuntungan.
* **Ambang Batas Stok Menipis (Pcs)**: Default 10 pcs untuk memicu peringatan stok merah.
* **Kurir Ekspedisi yang Diaktifkan**: Centang atau hapus centang kurir (JNE, SiCepat, J&T, POS, TIKI).

### 6.4 Tab Audit Trail Sistem
* Menampilkan catatan aktivitas transaksi, mutasi stok, pembuatan promo, dan perubahan pengaturan secara permanen (*append-only*).

### 6.5 Tab Semua Akun Admin
* Memantau dan mengontrol seluruh staf Admin Pusat maupun Admin Wilayah, termasuk riwayat waktu terakhir login.

---

## 7. Panduan Developer (Observability Hub)

URL Khusus: 👉 **`http://localhost:3000/dashboard/developer`**

Dirancang khusus untuk tim teknis memantau kestabilan infrastruktur:
1. **Kesehatan Infrastruktur**:
   - **Database (PostgreSQL / Neon)**: Status ping dan latensi koneksi (normal: 300–600 ms).
   - **RajaOngkir Komerce**: Status pengiriman live vs mock fallback.
   - **Midtrans**: Status koneksi Payment Gateway production vs sandbox.
   - **Image Storage**: Status ImageKit CDN vs local-stub.
2. **Antrean Bermasalah**:
   - Memantau pesanan yang menunggu verifikasi lebih dari 24 jam.
   - Memantau pesanan tanpa nomor resi setelah diproses.
3. **Catatan Error Log**:
   - Memeriksa jejak error sistem dengan filter per rute API untuk memudahkan investigasi masalah teknis.

---

## 8. Aturan Keamanan & Bisnis Kunci

1. **Server Always Wins (Server Selalu Menang)**: Semua perhitungan harga produk, diskon kupon, PPN 11%, ongkos kirim, dan reservasi stok dihitung ulang secara mutlak di backend server. Data dari browser pelanggan tidak pernah dipercaya begitu saja.
2. **Kerahasiaan HPP**: Harga pokok modal produk disimpan pada tabel terpisah `ProductCost` dan tidak pernah disertakan dalam respons API publik maupun API Admin Wilayah/Pusat.
3. **Reservasi Stok Atomik**: Saat pesanan dibuat, stok langsung dipesan (*reserved*) dalam satu transaksi database untuk mencegah penjualan melebihi kapasitas (*anti-overselling*). Jika pesanan batal atau kedaluwarsa setelah 24 jam, stok otomatis dikembalikan.
4. **Fallback Stok Wilayah (Asumsi A6)**: Bila pelanggan di Yogyakarta memesan produk yang stoknya habis di Gudang Jogja, sistem secara otomatis mengalihkan penanganan pesanan ke Gudang Pusat Depok.

---

## 9. Troubleshooting & Solusi Kendala Umum

| Kendala | Penyebab Umum | Solusi |
|---|---|---|
| Akun admin/owner terkunci (*Locked Out*) | Memasukkan kata sandi salah sebanyak 5 kali berturut-turut | Akun terkunci otomatis selama 15 menit untuk keamanan. Tunggu masa tunggu berakhir, atau minta Developer/Owner membuka blokir via database. |
| Kuota panggilan RajaOngkir habis | Batas harian paket Komerce tercapai | Sistem otomatis beralih ke tarif deterministik lokal. Transaksi pembeli tidak akan terhenti. Hubungi tim Komerce untuk penambahan kuota. |
| Popup Midtrans Snap tidak muncul | Pembeli memilih metode Transfer Manual atau browser memblokir popup | Pastikan memilih opsi Midtrans Snap di checkout. Jika menggunakan peramban dengan proteksi ketat, klik URL redirect yang tersedia di halaman order. |
| Bukti transfer ditolak admin | Foto buram, nominal tidak sesuai, atau salah rekening | Pembeli dapat mengunggah ulang bukti transfer yang benar melalui halaman `/order/[kode]/status` sebelum batas waktu 24 jam berakhir. |

---
*© 2026 Luvira Indonesia. Hak Cipta Dilindungi Undang-Undang.*
