# Panduan Demo Luvira 2.0 (DEMO_GUIDE.md)

Dokumen ini disusun dalam bahasa bisnis untuk memandu jalannya presentasi demo **Luvira 2.0** kepada pemilik usaha (**Pak Dimas & Mas Wann**). Setiap skenario dilengkapi dengan konteks bisnis, peran yang digunakan, dan langkah klik konkret di antarmuka website.

---

## Persiapan Awal Demo

1. Pastikan server dev berjalan:
   ```bash
   npm run dev
   ```
2. Jalankan seed data demo realistis di terminal:
   ```bash
   npm run demo:seed
   ```
   *Terminal akan mencetak tabel akun demo lengkap dengan email dan kata sandi acak sekali pakai untuk 4 peran.*
3. Buka browser di [http://localhost:3000](http://localhost:3000).

---

## Skenario 1: Pengalaman Pembeli (Belanja, Cek Ongkir Cerdas & Lacak Pesanan)

**Nilai Bisnis**: Pembeli mendapatkan pengalaman belanja yang cepat, bebas hambatan (*frictionless*), ongkir otomatis akurat sesuai lokasi gudang terdekat, dan kemudahan melacak paket tanpa perlu login yang rumit.

### Alur Demonstrasi:
1. **Memilih Lokasi Cabang**:
   - Di halaman utama (Hero section), perhatikan bar lokasi: *"Mengirim dari: Pusat (Kota Depok)"*.
   - Klik tombol **"Ubah Lokasi"**.
   - Pilih Provinsi: **DI Yogyakarta**, Kota: **Kota Yogyakarta**.
   - Perhatikan ketersediaan stok produk langsung menyesuaikan dengan stok riil di gudang Yogyakarta.

2. **Belanja & Form Alamat Cepat**:
   - Pilih produk **Emboss Split Toe**, pilih varian warna, lalu klik **"Beli Sekarang"**.
   - Di halaman Checkout [http://localhost:3000/checkout](http://localhost:3000/checkout):
     - Masukkan Nama: `Siti Rahma` dan WhatsApp: `085712345678`.
     - Gunakan fitur **"Cari Cepat"**: ketik `Malioboro` atau `Sosromenduran`.
     - Sistem otomatis mengisi Provinsi (DI Yogyakarta), Kota (Yogyakarta), Kecamatan (Gedong Tengen), Kelurahan, dan Kode Pos (55271) dalam sekali klik!

3. **Routing Pengiriman Regional**:
   - Sistem mendeteksi tujuan berada di wilayah DIY.
   - Pilihan kurir (JNE / SiCepat / J&T) langsung menghitung ongkos kirim hemat dari titik asal gudang Yogyakarta, bukan dari Depok!

4. **Metode Pembayaran**:
   - Tunjukkan dua pilihan resmi:
     - **Transfer Manual**: Menampilkan 2 rekening resmi Luvira (**Bank Jago Syariah** dan **BSI**) a.n. Muhammad Naufal Ammr Dzakwan.
     - **Pembayaran Otomatis**: Midtrans Snap (QRIS, GoPay, ShopeePay, Virtual Account).

5. **Pelacakan Pesanan Terproteksi**:
   - Buka halaman lacak pesanan: [http://localhost:3000/track](http://localhost:3000/track).
   - Masukkan Kode Pesanan: `LVR-DEMO-KIRIM-...` (dari seed demo).
   - Masukkan 4 Digit Terakhir WhatsApp: `1234`.
   - Klik **"Lacak Pesanan"**.
   - Sistem menampilkan timeline status pengiriman, kurir JNE, dan nomor resi asli yang terhubung ke kurir.

---

## Skenario 2: Admin Wilayah Yogyakarta (Operasional Harian & Isolasi Wilayah)

**Nilai Bisnis**: Admin Cabang Yogyakarta dapat fokus mengurus pesanan dan stok di wilayahnya, tanpa risiko keliru mengubah pesanan cabang Pusat atau melihat data rahasia cabang lain.

### Alur Demonstrasi:
1. **Login sebagai Admin Wilayah**:
   - Buka [http://localhost:3000/dashboard/login](http://localhost:3000/dashboard/login).
   - Masukkan email: `admin.jogja@luvira.id` dan kata sandi dari terminal.
   - Masuk ke dashboard admin.

2. **Isolasi Wilayah**:
   - Perhatikan label di header: *"Admin Wilayah - Yogyakarta (DIY)"*.
   - Pada tab **Pesanan**, daftar pesanan HANYA menampilkan pesanan tujuan DIY/Yogyakarta. Pesanan cabang Pusat Depok tersembunyi sepenuhnya demi kepatuhan data.

3. **Memproses Pesanan & Input Resi**:
   - Klik pesanan berstatus **"DIPROSES"**.
   - Klik tombol **"Kirim Pesanan"**.
   - Tunjukkan validasi proteksi bisnis: sistem menolak jika nomor resi belum diisi.
   - Masukkan Kurir: `JNE` dan Nomor Resi: `JNE9918273645`.
   - Klik **"Konfirmasi Pengiriman"** -> Status berubah menjadi **DIKIRIM**, stok riil di gudang Yogyakarta berkurang otomatis, dan pembeli langsung bisa melacak resi tersebut.

4. **Kontrol Stok Gudang Yogyakarta**:
   - Buka tab **Stok**.
   - Admin Wilayah dapat melihat sisa stok fisik, stok yang ter-reserve pesanan aktif, dan peringatan stok menipis jika di bawah ambang batas (10 pasang).
   - Admin dapat menambah stok saat kiriman dari produsen tiba, lengkap dengan catatan mutasi alasan penambahan.

5. **Kode Promo Khusus Yogyakarta**:
   - Buka tab **Kode Promo**.
   - Admin Wilayah dapat membuat kode promo diskon khusus cabang DIY (misal `JOGJABERKAH`).
   - Tunjukkan proteksi batas diskon: jika Admin Wilayah mencoba mengisi diskon 60% (melebihi batas maksimal 50%), sistem menolak dengan pesan peringatan yang ramah.

---

## Skenario 3: Admin Pusat (Pengelolaan Produk, Verifikasi Bukti Bayar & Akun)

**Nilai Bisnis**: Admin Pusat memegang kendali atas katalog kaus kaki, penetapan harga jual seragam di seluruh Indonesia, pengelolaan foto ImageKit, verifikasi transfer rekening resmi, dan pembuatan akun Admin Cabang.

### Alur Demonstrasi:
1. **Login sebagai Admin Pusat**:
   - Masuk dengan `admin.pusat@luvira.id`.
   - Header menampilkan: *"Admin Pusat (Depok)"*.

2. **Verifikasi Bukti Transfer Manual**:
   - Perhatikan lonceng notifikasi di pojok kanan atas berdering dengan badge merah: *"Bukti Transfer Baru #LVR-DEMO-VERIF..."*.
   - Klik notifikasi -> langsung membuka detail pesanan yang menunggu verifikasi.
   - Admin Pusat dapat melihat gambar bukti transfer pembeli dengan jelas.
   - Klik **"Verifikasi & Terima Pembayaran"** -> Status langsung berubah menjadi **DIPROSES**.

3. **Penetapan Harga Jual Seragam**:
   - Buka tab **Katalog Produk**.
   - Klik edit harga pada varian kaus kaki.
   - Ubah harga jual: harga baru ini langsung berlaku secara **seragam** baik untuk pembeli yang dilayani gudang Pusat maupun gudang Yogyakarta.
   - Tunjukkan proteksi kerahasiaan: kolom **Harga Modal (HPP)** sama sekali tidak tampil di layar Admin Pusat (hanya Owner yang berhak melihat HPP).

4. **Kelola Akun Admin Wilayah**:
   - Buka tab **Kelola Admin**.
   - Admin Pusat dapat menambah admin cabang baru (misal untuk rencana cabang Surabaya atau Bandung), mengatur status aktif/nonaktif, dan mereset kata sandi cabang.
   - Sistem mengunci agar Admin Pusat tidak bisa mengubah akun Owner atau Developer.

---

## Skenario 4: Pembuktian Anti-Overselling & Fallback Stok Cerdas

**Nilai Bisnis**: Menghindari kekecewaan pembeli akibat membeli barang yang stoknya habis (*oversold*), sekaligus memaksimalkan omzet dengan otomatis mengalihkan pesanan ke gudang Pusat saat stok cabang habis.

### Alur Demonstrasi:
1. Pada seed demo, varian pertama di Yogyakarta sengaja diatur **0 pasang**, sementara di Pusat ada **50 pasang**.
2. Pembeli di Yogyakarta memesan varian tersebut.
3. Sistem secara otomatis mendeteksi:
   - *"Stok di gudang Yogyakarta habis -> otomatis dialihkan ke gudang Pusat (Depok) agar pesanan tetap dapat diproses."*
4. Pesanan berhasil dibuat tanpa error, dan pengiriman ditangani oleh gudang Pusat.


---

## Skenario 5: Reseller Mitra (Dashboard Mobile-First, Dual Promo, & COD)

**Nilai Bisnis**: Mitra reseller Luvira dapat memantau efektivitas penjualan dari kode promonya secara mandiri dari smartphone, membuat pesanan COD langsung di depan pelanggan dengan ongkir Rp 0, dan memanfaatkan 2 slot kode promo sekaligus tanpa bisa membocorkan HPP bisnis.

### Alur Demonstrasi:
1. **Login Akun Reseller**:
   - Buka `http://localhost:3000/login`.
   - Masukkan Email: `reseller.demo@luvira.id` dan kata sandi dari terminal `npm run demo:seed`.
   - Sistem langsung mengarahkan ke dashboard khusus: `http://localhost:3000/dashboard/reseller`.
2. **Pemantauan Kinerja & Privasi Pelanggan**:
   - Perhatikan 4 kartu ringkasan: Total Pesanan Masuk, Omzet Penjualan Bersih, Total Diskon Diberikan, dan Kode Promo Aktif.
   - Pada tabel pesanan: nama pelanggan disamarkan menjadi `H*** S***` dan nomor WhatsApp `••••0011`. Reseller **sama sekali tidak melihat modal HPP Luvira**.
3. **Pembuatan Pesanan COD Manual dengan Dual Promo Slots**:
   - Klik tombol **"Buat Pesanan COD"**.
   - Masukkan Nama Pelanggan: `Dewi Lestari` dan No. WhatsApp: `081298765432`.
   - Pilih Produk & Varian (cth: 2 pasang Kaos Kaki).
   - Masukkan **Slot 1 (Kode Reseller)**: `RESELLER2026` (diskon 10%).
   - Masukkan **Slot 2 (Kode Tambahan)**: Promo diskon ekstra.
   - Ringkasan kalkulasi server otomatis menampilkan diskon gabungan dan **Ongkir: Rp 0 (COD Serah Langsung)**.
   - Klik **"Simpan & Buat Pesanan COD"**.
4. **Tandai Barang Diserahkan**:
   - Pada baris pesanan COD baru, klik tombol **"Tandai Diserahkan"**.
   - Status pesanan berpindah menjadi diserahkan, siap dikonfirmasi uang kasnya oleh Admin Wilayah.

---

## Skenario 6: Admin Wilayah & Kontrol Kurir Ekspedisi

**Nilai Bisnis**: Admin Cabang dapat mengontrol kurir ekspedisi apa saja yang aktif di dekat titik gudangnya (mis. hanya mengaktifkan J&T bila gudang dekat agen J&T), serta menyelesaikan pembayaran tunai COD.

### Alur Demonstrasi:
1. **Login Admin Wilayah**:
   - Buka `http://localhost:3000/dashboard/admin`.
2. **Menyelesaikan Kas Pesanan COD**:
   - Buka tab pesanan COD yang menunggu penyelesaian kas.
   - Admin melihat nama reseller pembuat dan catatan serah terima.
   - Klik tombol hijau **"Konfirmasi Uang Diterima & Selesai"**.
   - Pendapatan COD resmi tercatat masuk ke omzet Luvira (Asumsi F2).
3. **Kontrol Kurir Ekspedisi (Admin Pusat)**:
   - Login sebagai `admin.pusat@luvira.id`.
   - Buka tab Wilayah Layanan -> pilih Wilayah Yogyakarta.
   - Matikan saklar kurir SiCepat / TIKI, sisakan hanya JNE & J&T.
   - Saat pembeli checkout ke alamat Yogyakarta, hanya kurir aktif yang tampil di daftar pilihan!

---

## Skenario 7: Owner Simulasi Promo Uji Coba (Bypass Midtrans)

**Nilai Bisnis**: Owner dan tim pengembang dapat menguji seluruh alur checkout, cetak invoice, dan routing gudang secara realistis di website tanpa memanggil gateway Midtrans dan tanpa perlu mentransfer uang sungguhan.

### Alur Demonstrasi:
1. **Login Akun Owner**:
   - Masuk sebagai `owner@luvira.id`.
   - Buka menu Kode Promo -> Promo Uji Sistem (`kind=TESTING`).
   - Kode promo `TESTPROMO` aktif dengan batas kuota 20 kali pemakaian.
2. **Belanja dengan Kode Uji**:
   - Buka katalog toko sebagai pembeli, pilih produk, dan buka checkout.
   - Masukkan kode promo: `TESTPROMO`.
   - Sistem menampilkan banner indikator: *"Mode Simulasi Uji Coba Aktif"*.
   - Tombol bayar langsung mengarahkan ke halaman QR Simulasi & Bayar Cepat Coba tanpa token Midtrans live.
   - Klik **"Simulasikan Pembayaran Berhasil"** -> Pesanan langsung berstatus diproses!
3. **Isolasi Laporan & Reset Data Uji**:
   - Buka Dashboard Owner: pesanan berlabel `[UJI]` **mutlak tidak masuk ke omzet resmi atau laba kotor**.
   - Tersedia tombol **"Reset Data Uji"** di dashboard Owner untuk membersihkan seluruh transaksi testing dengan 1-klik.

---

## Skenario 8: Preview Laporan Penjualan Resmi, Google Sheets & WhatsApp

**Nilai Bisnis**: Owner memiliki pratinjau laporan cetak bergaya elegan dengan palet warna hijau tua resmi Luvira sebelum diunduh, cermin spreadsheet satu arah yang selalu mutakhir, dan laporan otomatis yang mendarat di WhatsApp setiap pagi.

### Alur Demonstrasi:
1. **Preview Laporan Penjualan Harian (Hijau Tua)**:
   - Di Dashboard Owner (`/dashboard/owner`), klik tombol **"Preview Laporan Harian"**.
   - Modal dokumen resmi Luvira terbuka dengan tabel kolom lengkap:
     - No, Tanggal, No. Invoice, Produk, Qty, Harga Satuan, Diskon, Total, Metode Bayar.
     - Baris **TOTAL** tebal dengan warna hijau tua Luvira (`#14532d`).
   - Tersedia tombol **"Cetak / PDF"** yang siap cetak ramah kertas serta tombol **"Unduh CSV"**.
2. **Integrasi Cermin Satu Arah Google Sheets (FT-5)**:
   - Di kartu Google Sheets, salin email Service Account Luvira ke Google Spreadsheet tujuan dengan akses Editor.
   - Tempel URL spreadsheet lalu klik **"Hubungkan Lembar Kerja"**.
   - Klik tombol **"Sinkronkan Sekarang"**: Sistem membuat 6 tab terstruktur (Ringkasan Bisnis, Daftar Pesanan, dsb.) lengkap dengan timestamp kesegaran data WIB.
3. **Laporan Terjadwal ke WhatsApp (FT-6)**:
   - Di kartu Berlangganan Laporan WhatsApp, atur frekuensi (Harian/Mingguan), jam WIB (cth: 08:00), dan nomor WhatsApp.
   - Klik tombol **"Kirim Sekarang"**: Ringkasan omzet, laba kotor, dan tautan unduh CSV instan (token 15 menit) langsung masuk ke antrean WhatsApp!
