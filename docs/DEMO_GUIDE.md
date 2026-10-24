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
