# Software Requirements Specification (SRS)
**Project:** Luvira Store  
**Status:** Draft (Berdasarkan kondisi *codebase* per tanggal penulisan)  
**Sumber:** *Single Source of Truth* untuk implementasi masa depan.

---

## 1. Modul yang Terimplementasi

### 1.1 Modul Produk (Product & Catalog)
- **Deskripsi Fitur:**
  - Menampilkan katalog produk di halaman utama (Hero, Showcase) menggunakan data dari *database*.
  - Manajemen Produk (CRUD) di Dasbor Admin: Nama, Harga Jual, HPP (*costPrice*), Biaya Packing, Deskripsi, Fitur, dan Varian Warna.
  - Manajemen Stok *inline* per varian warna.
  - *Image upload* menggunakan layanan pihak ketiga (ImageKit) untuk gambar produk/varian.
- **Data Model (`schema.prisma`):** 
  - `Product`
  - `ColorVariant` (berelasi *one-to-many* dengan Product).
- **Business Rule:**
  - Harga pokok penjualan (`costPrice`) dan biaya kemasan (`packingCost`) dicatat di tabel `Product` untuk kalkulasi profitabilitas.
  - Jika stok *ColorVariant* habis (0), pembeli tidak dapat menambahkan ke keranjang.
  - Penghapusan *Product* akan menghapus seluruh *ColorVariant* terkait (*Cascade delete*).

### 1.2 Modul Pesanan (Order & Checkout)
- **Deskripsi Fitur:**
  - *Checkout* pesanan dengan data pelanggan (nama, nomor WA, alamat lengkap).
  - Alur pembelian manual (*Manual Transfer*) yang me-*redirect* pembeli ke WhatsApp Admin beserta ringkasan pesanan.
  - Sinkronisasi status pesanan dari Dasbor Admin (`menunggu_transfer`, `menunggu_verifikasi`, `dikonfirmasi`, `diproses`, `selesai`, `dibatalkan`).
- **Data Model (`schema.prisma`):**
  - `Order`
  - `OrderItem`
- **Business Rule:**
  - Pesanan baru akan memotong (mengurangi) stok varian produk secara langsung.
  - *Snapshotting*: HPP (`costEach`), biaya *packing* (`packingEach`), dan harga jual (`priceEach`) disalin ke `OrderItem` pada saat *checkout* agar perhitungan profit masa depan tidak berubah walau HPP diubah.

### 1.3 Modul Pembayaran (Payment)
- **Deskripsi Fitur:**
  - Halaman publik untuk mengunggah bukti transfer (`/order/[id]/payment`).
  - Unggahan file gambar menggunakan *ImageKit* dan URL-nya disimpan ke `paymentProofUrl`.
  - Tombol verifikasi instan di Dasbor Admin untuk menyetujui bukti transfer (mengubah status menjadi `dikonfirmasi`).
- **Data Model (`schema.prisma`):**
  - Terdapat pada `Order` (`paymentProofUrl`, `paymentDeadline`, `verifiedBy`, `verifiedAt`).

### 1.4 Modul Pengiriman (Shipping)
- **Deskripsi Fitur:**
  - Mengambil tarif ongkos kirim simulasi (*Mock API*) JNE dan SiCepat di `/api/shipping` saat pembeli mengetikkan alamat (minimal 5 karakter).
  - Pembeli harus memilih kurir sebelum bisa menekan tombol Konfirmasi.
- **Data Model (`schema.prisma`):**
  - Disimpan pada `Order` (`shippingCourier`, `shippingCost`).
- **Business Rule:**
  - Jika `shippingCost` tidak ada, pesanan tidak dapat diselesaikan.

### 1.5 Modul Kode Promo (Promo Code)
- **Deskripsi Fitur:**
  - API validasi kode promo saat *checkout* (`/api/promos/validate`).
  - Mengurangi total belanja sesuai tipe diskon (*percentage* atau *fixed*).
- **Data Model (`schema.prisma`):**
  - `PromoCode`
- **Business Rule:**
  - Kuota (*quota*) diuji terhadap jumlah pemakaian (*usedCount*).
  - Masa berlaku diuji terhadap *field* `expiresAt`.
  - Diskon hanya memotong harga produk (Subtotal), bukan ongkos kirim.
  - Terdapat perhitungan PPN otomatis sebesar **11%** dari Subtotal Bersih (setelah dipotong promo, sebelum ditambah ongkos kirim).

### 1.6 Modul Autentikasi & Hak Akses (Auth & Roles)
- **Deskripsi Fitur:**
  - Sistem otentikasi mandiri menggunakan JWT (*JSON Web Tokens*) via pustaka `jose`.
  - Penyimpanan sesi via *HTTP-Only Cookies* (`luvira_session`).
  - Halaman login terpisah di `/admin/login`.
- **Data Model (`schema.prisma`):**
  - `User` (`username`, `passwordHash`, `role`).
- **Business Rule:**
  - Akses `role = admin` hanya diizinkan untuk CMS produk dan manajemen *copywriting*.
  - Akses `role = owner` diizinkan masuk ke Dasbor Keuangan (`/dashboard/owner`).

### 1.7 Modul Dashboard Owner (Analytics)
- **Deskripsi Fitur:**
  - Agregasi data penjualan meliputi: Total Pesanan Sukses, Omzet Kotor (sesudah diskon), PPN Titipan, dan Estimasi Profit Bersih.
  - Ekspor seluruh laporan rekapitulasi penjualan ke format CSV.
  - *Low Stock Alert*: panel khusus peringatan stok.
- **Data Model:**
  - Bergantung pada agregasi `Order` dan `OrderItem`.
- **Business Rule:**
  - Filter periode (Sepanjang Waktu, Bulan Ini, Tahun Ini).
  - Produk masuk kategori *Low Stock Alert* jika stok berada di bawah ambang batas (contoh: < 10).
  - Hanya transaksi dengan status *dikonfirmasi*, *diproses*, dan *selesai* yang dihitung sebagai Omzet/Profit.

### 1.8 Modul ChangeLog (Audit Trail)
- **Deskripsi Fitur:**
  - Tabel dan API pencatatan perubahan data (siapa yang mengubah, nilai lama, nilai baru).
  - Ditampilkan di halaman `/admin/changelog` yang bisa diakses via tombol "Audit Trail".
- **Data Model (`schema.prisma`):**
  - `ChangeLog`

### 1.9 Modul Cron Job / Auto-Cancel
- **Deskripsi Fitur:**
  - *Endpoint* khusus `/api/cron/cancel-orders` yang akan membatalkan pesanan tertunggak.
- **Business Rule:**
  - Memerlukan otentikasi token via `Authorization: Bearer CRON_SECRET`.
  - Pesanan dengan status `menunggu_transfer` dan melampaui `paymentDeadline` diubah menjadi `dibatalkan`.
  - Stok produk pada `ColorVariant` otomatis dikembalikan (*restocked*) melalui *Prisma Transaction*.

---

## 2. Modul/Fitur Kandidat Dead Code
*(Terdapat di dalam *source code* namun sudah ditinggalkan/tidak sesuai dengan arah kebutuhan baru).*

1. **Midtrans Webhook (`app/api/midtrans/webhook/route.ts`)**
   - **Kondisi:** Ditemukan folder dan *file routing* untuk *webhook* Midtrans.
   - **Alasan:** Fitur Midtrans telah digantikan sepenuhnya dengan fitur Transfer Manual & Konfirmasi WA, sehingga API ini sudah usang dan dapat memicu celah pembaruan status jika terpapar publik.
2. **Skema Midtrans pada Prisma (`Order.paymentMethod` & `Order.midtransToken`)**
   - **Kondisi:** Terdapat struktur sisa pada tabel pesanan.
   - **Alasan:** Tidak pernah lagi diisi/diperbarui oleh alur *checkout* yang baru.

---

## 3. Orphan Files & Unused Scripts
*(File yang tidak terhubung dengan alur aplikasi utama saat ini).*

1. **`scripts/backfill-orders.ts`**
   - **Kondisi:** Merupakan *script* *one-off* untuk memindahkan data dari file `.json` lokal ke Postgres (Prisma) pada saat transisi Phase 0b.
   - **Alasan:** Jika migrasi sudah sukses dilakukan di tingkat *production*, file skrip ini bisa dihapus untuk merapikan *codebase*.
2. **Folder `/data/` (`defaultContent.ts`, `products.ts`)**
   - **Kondisi:** Meskipun masih menempel dan beberapa digunakan sebagai data mula (*fallback* atau *seed*), penggunaannya mulai tumpang tindih karena seluruh data aktual kini dilayani oleh *database* (Prisma). Bisa dipertahankan hanya untuk keperluan *unit testing* atau *database seeding*.
