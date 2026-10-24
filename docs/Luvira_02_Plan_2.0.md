# LUVIRA 2.0: Rencana Lengkap

> **Cara pakai:** simpan file ini di repo sebagai `docs/LUVIRA_2_PLAN.md`. Semua prompt Antigravity (file `Luvira_03_Prompts_Antigravity.md`) memerintahkan agent membaca file ini lebih dulu, jadi dokumen ini adalah **satu-satunya sumber kebenaran**. Kalau ada keputusan berubah, ubah di sini dulu, baru jalankan prompt.
>
> Status: draf 24 Okt 2026. Bagian 3 berisi asumsi yang belum dikonfirmasi.

---

## 1. Tujuan dan prinsip

**Tujuan:** website Luvira yang benar-benar dipakai untuk berjualan: semua fitur per peran berjalan, UI/UX nyaman terutama di HP, alur dari pilih produk sampai paket diterima lancar dan tidak error, dan semuanya bisa diperiksa serta dilaporkan oleh owner.

**Prinsip kerja:**
1. **Satu sumber aturan hak akses.** Semua izin didefinisikan di satu berkas (`lib/permissions.ts`) dan dites otomatis. Tidak ada pengecekan role yang tersebar acak.
2. **Server selalu menang.** Harga, PPN, diskon, ongkir, dan stok dihitung ulang di server. Angka dari browser tidak pernah dipercaya.
3. **Semua perubahan penting tercatat** (audit log): siapa, kapan, apa yang berubah.
4. **Bangun per tahap, uji per tahap.** Tidak lanjut ke tahap berikutnya sebelum tahap sekarang lolos *Definition of Done* (DoD).
5. **Mobile-first.** Mayoritas pembeli membuka lewat HP.

---

## 2. Keputusan final

| # | Topik | Keputusan | Sumber |
|---|---|---|---|
| 1 | Tech stack | Tetap Next.js (App Router), TypeScript, Tailwind, Prisma | Wann |
| 2 | Database | **MySQL bawaan Hostinger** (Managed MySQL), Prisma provider `mysql` | Wann |
| 3 | Hosting | Hostinger Business (Node.js, deploy dari GitHub) | Wann |
| 4 | Peran | Pembeli, Admin Pusat, Admin Wilayah, Owner, Developer | Pak Dimas |
| 5 | Wilayah awal | Pusat + 1 Admin Wilayah (Yogyakarta) | Pak Dimas |
| 6 | Stok | Dipisah per wilayah (tiap admin punya stok sendiri) | Wann |
| 7 | Penentuan admin terdekat | Berdasarkan wilayah alamat tujuan (provinsi/kota), bukan GPS. Jika stok di wilayah itu habis, pesanan diarahkan ke Pusat | Pak Dimas |
| 8 | Harga jual | Seragam di semua wilayah. Hanya Admin Pusat dan Owner yang menentukan | Wann + Pak Dimas |
| 9 | Peran Owner | Hanya melihat katalog dan pesanan (perubahan oleh Admin), tetapi boleh membuat kode promo, kelola akun admin, dan cetak laporan | Pak Dimas + Wann |
| 10 | Kode promo | Reseller (nasional): dibuat Owner atau Admin Pusat. Promo kustom wilayah: bisa dibuat Admin Wilayah untuk wilayahnya | Pak Dimas + Wann |
| 11 | Pelacakan pesanan | Status + nomor resi yang diisi admin (belum integrasi tracking kurir) | Pak Dimas |
| 12 | Pembayaran | **Midtrans** (tetap) + **transfer manual** ke 2 rekening Luvira dengan unggah bukti | Wann |
| 13 | Ongkir | **RajaOngkir API V2 (Komerce)**, API key sudah ada | Wann |
| 14 | Input alamat | Dropdown/combobox bertingkat sampai kelurahan, ditambah kolom jalan, gang, nomor rumah, seperti e-commerce pada umumnya | Wann |
| 15 | Notifikasi | Admin mendapat notifikasi saat ada pesanan masuk | Pak Dimas |
| 16 | Penyimpanan file | Gambar produk di Cloudflare R2, bukti transfer di ImageKit (tetap) | Wann |
| 17 | Lokasi Pusat | Kota Depok (kecamatan/kelurahan gudang menyusul untuk titik asal ongkir) | Wann |
| 18 | Berat varian | Default 35 gram per varian, bisa diubah per varian oleh Admin Pusat | Wann |
| 19 | Data produk dan foto | Produk yang ada dimigrasi ke skema 2.0 (bukan dibuang); foto baru diunggah lewat dashboard Admin Pusat setelah Fase 3 (lihat bagian 7) | Rekomendasi, menunggu OK Wann |

**Rekening transfer manual (data awal, disimpan di tabel database yang bisa diubah Owner, bukan ditulis di kode):**

| Bank | Nomor | Atas nama |
|---|---|---|
| Jago Syariah | 509366156008 | Muhammad Naufal Ammr Dzakwan |
| BSI | 7239477938 | Muhammad Naufal Ammr Dzakwan |

> Nomor BSI sudah dikoreksi Wann (ditambah digit akhir 8, jadi 10 digit). Nomor ini ditampilkan ke pembeli, jadi tetap periksa sekali lagi sebelum peluncuran.

---

## 3. Asumsi yang belum dikonfirmasi

Agent harus mengikuti asumsi ini **kecuali** Wann mengubahnya. Tandai dengan jelas di kode bila berdampak besar.

| # | Asumsi | Dampak bila salah |
|---|---|---|
| A1 | Admin Pusat bisa **melihat** (bukan mengelola) pesanan semua wilayah, dan mengelola pesanan Pusat | Filter data Admin Pusat |
| A2 | Admin Pusat hanya boleh membuat/menonaktifkan akun **Admin Wilayah**, tidak menyentuh akun Owner, Developer, atau sesama Admin Pusat | Aturan di modul pengguna |
| A3 | Nasihat bersifat global (tampil untuk semua pembeli). Admin Wilayah hanya mengelola nasihat **miliknya**, Admin Pusat mengelola semua | Skema `Advice` |
| A4 | Promo wilayah hanya berlaku untuk pesanan yang diarahkan ke wilayah itu, dan ada **batas diskon maksimum** yang diatur Owner agar margin aman | Validasi promo |
| A5 | Stok **dipesan (reserve)** saat pesanan dibuat dan dilepas jika kedaluwarsa/batal. Batas bayar: 24 jam (Midtrans dan transfer manual) | Tabel stok, job kedaluwarsa |
| A6 | Jika satu item saja habis di wilayah terdekat, **seluruh pesanan** dialihkan ke Pusat (tidak dipecah). Jika Pusat juga kurang, item ditandai "stok habis" untuk lokasi itu | Routing pesanan |
| A7 | Pembeli **tanpa akun** (guest checkout). Melacak pesanan dengan kode pesanan + 4 digit terakhir nomor WhatsApp | Halaman tracking |
| A8 | Traffic owner memakai **penghitung bawaan sederhana** (jumlah kunjungan harian per halaman, tanpa data pribadi), karena Hostinger bersama tidak cocok untuk menjalankan Plausible/Umami sendiri | Dashboard traffic |
| A9 | Notifikasi pesanan baru: **lonceng + badge di dashboard** (polling berkala) dan **email** lewat SMTP Hostinger. Tombol WhatsApp "klik untuk chat" opsional. WhatsApp Business API otomatis tidak dipakai (berbayar) | Modul notifikasi |
| A10 | Wilayah awal: provinsi DI Yogyakarta dilayani Admin Wilayah Yogyakarta, **semua lainnya** dilayani Pusat. Cakupan bisa diubah Owner/Admin Pusat | Tabel cakupan |
| A11 | Developer boleh **melihat** semua data (termasuk harga modal) untuk pemeriksaan, tetapi tidak mengubah data bisnis. Setiap aksesnya tercatat | Izin Developer |
| A12 | Tarif PPN 11% dihitung **dari net** seperti logika yang sudah berjalan, disimpan sebagai pengaturan (`ppnRate`) | Perhitungan harga |

**Data yang Wann perlu siapkan sebelum Fase 2:**
- Pusat sudah ditetapkan di **Kota Depok**. Masih perlu **kecamatan/kelurahan** gudang Pusat, dan alamat lengkap (sampai kecamatan/kelurahan) gudang **Yogyakarta**: dipakai sebagai titik asal ongkir.
- Berat varian: default **35 gram**, bisa diedit per varian. Berat kemasan tambahan (jika ada) diatur di Setting, default 0.
- Nomor WhatsApp dan email kontak tiap wilayah.
- API key RajaOngkir, kunci Midtrans (sandbox dan production), kredensial SMTP Hostinger. **Semua lewat environment variable, jangan masuk git.**
- Daftar kurir yang mau ditawarkan (ikuti kode kurir yang didukung dokumentasi RajaOngkir).

---

## 4. Peran dan hak akses (final)

Keterangan: **Bisa** = melakukan sendiri · **Kelola** = lihat dan ubah · **Lihat** = hanya lihat · **—** = tidak ada akses. "(wilayahnya)" = dibatasi ke data wilayah akun itu.

### Belanja dan pesanan

| Fitur | Pembeli | Admin Pusat | Admin Wilayah | Owner | Developer |
|---|---|---|---|---|---|
| Lihat katalog, harga, stok sesuai lokasi | Bisa | Bisa | Bisa | Bisa | Bisa |
| Baca nasihat | Bisa | Bisa | Bisa | Bisa | Bisa |
| Pilih alamat, pesan, bayar | Bisa | — | — | — | — |
| Lacak pesanan sendiri | Bisa | — | — | — | — |
| Proses pesanan (cek bayar, status, resi) | — | Kelola (Pusat); Lihat (wilayah lain) | Kelola (wilayahnya) | Lihat (semua) | Lihat |

### Katalog, stok, harga

| Fitur | Pembeli | Admin Pusat | Admin Wilayah | Owner | Developer |
|---|---|---|---|---|---|
| Atur katalog produk (nama, foto, varian) | — | Kelola | — | Lihat | Lihat |
| Atur harga jual (seragam) | — | Kelola | Lihat | Kelola | Lihat |
| Harga modal | — | — | — | Kelola | Lihat |
| Atur stok | — | Kelola (Pusat) | Kelola (wilayahnya) | Lihat (semua) | Lihat |

### Konten, wilayah, promo

| Fitur | Pembeli | Admin Pusat | Admin Wilayah | Owner | Developer |
|---|---|---|---|---|---|
| Nasihat (tulis, ubah, hapus) | — | Kelola (semua) | Kelola (miliknya) | Lihat | Lihat |
| Lokasi, profil, kontak toko | — | Kelola (semua wilayah) | Kelola (wilayahnya) | Lihat | Lihat |
| Cakupan wilayah layanan | — | Kelola | — | Kelola | Lihat |
| Promo reseller (nasional) | — | Kelola | Lihat | Kelola | Lihat |
| Promo kustom wilayah | — | Kelola | Kelola (wilayahnya) | Kelola | Lihat |
| Rekap pemakaian promo | — | Lihat | Lihat (wilayahnya) | Lihat | Lihat |

### Pengguna, laporan, sistem

| Fitur | Pembeli | Admin Pusat | Admin Wilayah | Owner | Developer |
|---|---|---|---|---|---|
| Kelola akun admin | — | Kelola (hanya Admin Wilayah) | — | Kelola (semua admin) | — |
| Profil dan sandi sendiri | — | Kelola | Kelola | Kelola | Kelola |
| Metode bayar dan rekening transfer | — | Lihat | — | Kelola | Lihat |
| Pengaturan (PPN, daftar kurir, batas promo) | — | — | — | Kelola | Lihat |
| Dashboard traffic, penjualan, stok, rekap | — | — | — | Lihat | Lihat |
| Cetak/unduh laporan (PDF, Excel) | — | — | — | Bisa | — |
| Riwayat perubahan (audit log) | — | — | — | Lihat | Lihat |
| Cek kesehatan modul dan database | — | — | — | — | Kelola |
| Catatan error sistem | — | — | — | — | Lihat |

**Aturan lintas peran (wajib ditegakkan di server):**
- Admin Wilayah **hanya** melihat dan mengubah data wilayahnya. Pembatasan dilakukan di query (`where regionId = ...`), bukan hanya di tampilan.
- Admin tidak pernah menerima harga modal atau laba dari API (kolom dipisah di tabel tersendiri dan tidak di-`select` untuk peran selain Owner/Developer).
- Developer tidak punya izin tulis ke data bisnis (produk, harga, stok, pesanan, promo, pengguna).
- Akun yang dinonaktifkan tidak bisa login, riwayatnya tetap utuh.
- Setiap perubahan pada harga, stok, promo, pengguna, status pesanan, dan pengaturan masuk **audit log** yang tidak bisa diubah/dihapus dari aplikasi.

---

## 5. Alur utama

### 5.1 Lokasi dan alamat pembeli
1. Saat pertama membuka katalog, pembeli diminta memilih **lokasi pengiriman** (provinsi dan kota). Tanpa memilih, katalog tampil dengan stok Pusat dan penanda "ketersediaan tergantung lokasi".
2. Di checkout, form alamat memakai **combobox bertingkat** yang bisa dicari:
   **Provinsi → Kota/Kabupaten → Kecamatan → Kelurahan/Desa**, kode pos terisi otomatis, lalu kolom bebas: **Nama jalan, Gang/Blok, Nomor rumah, RT/RW, Patokan untuk kurir**.
   Ditambah kotak **"Cari cepat"** (ketik kelurahan atau kode pos, hasil memilih semua tingkat sekaligus).
3. Data wilayah diambil dari RajaOngkir (lihat 8.1), di-cache agar hemat kuota harian.
4. Alamat disimpan sebagai **snapshot** di pesanan (tidak berubah walau data wilayah berubah). Di browser pembeli, alamat terakhir disimpan lokal agar pesanan berikutnya cepat.

### 5.2 Routing pesanan ke admin terdekat
1. Dari provinsi/kota alamat → cari wilayah layanan lewat tabel cakupan (A10). Tidak ketemu → Pusat.
2. Cek stok semua item di wilayah itu (stok tersedia = qty − reserved). Kurang → seluruh pesanan ke Pusat (A6).
3. Titik asal ongkir = lokasi wilayah yang menangani pesanan.
4. Pesanan dibuat dengan `regionId` tujuan dan stok langsung di-*reserve* dalam satu transaksi database (update bersyarat, anti-balapan).
5. Admin wilayah itu menerima notifikasi (A9).

### 5.3 Pembayaran
**Midtrans (Snap):**
- Server membuat transaksi Snap. `order_id` = kode pesanan. Total (`gross_amount`) harus sama dengan jumlah baris item, termasuk baris ongkir, PPN, dan diskon.
- Webhook `/api/payments/midtrans/notification`: **verifikasi `signature_key`**, tangani notifikasi ganda (idempoten), petakan status (`settlement`, `capture`, `pending`, `deny`, `cancel`, `expire`) ke status pesanan, dan konfirmasi ulang lewat API status transaksi sebelum menandai lunas.
- Lunas via webhook → langsung `diproses`, tanpa verifikasi manual.

**Transfer manual (2 rekening):**
- Pembeli memilih bank, melihat nomor rekening, nama pemilik, dan **nominal persis**, lalu mengunggah bukti (jpg/png/pdf, ukuran dibatasi) → status `menunggu_verifikasi`.
- Admin wilayah yang menangani memeriksa dan menekan **Konfirmasi** atau **Tolak (dengan alasan)**. Ditolak → pembeli bisa unggah ulang selama belum kedaluwarsa.
- Rekening diambil dari tabel `PaymentAccount` (aktif/nonaktif), bukan dari kode.

**Kedaluwarsa:** pesanan yang tidak dibayar dalam 24 jam → `kedaluwarsa`, stok dilepas. Dijalankan job terjadwal (lihat 14).

### 5.4 Status pesanan
`menunggu_pembayaran` → (`menunggu_verifikasi` untuk transfer manual) → `diproses` → `dikirim` (wajib isi nomor resi + kurir) → `selesai`. Cabang: `dibatalkan`, `kedaluwarsa`.
Setiap perpindahan status dicatat (siapa, kapan) dan hanya boleh mengikuti transisi yang sah (state machine di satu tempat).

### 5.5 Promo
- **Reseller (nasional)** dan **kustom wilayah**: tipe diskon persen atau nominal, batas diskon maksimum, kuota, tanggal mulai/berakhir, minimal belanja, status aktif.
- Divalidasi di server saat checkout dan saat pesanan dibuat (kuota dipotong atomik). `isFreeShipping` tetap ada di skema, **belum diaktifkan** di UI sampai ada keputusan.
- Rekap pemakaian per kode (jumlah, total diskon, total omzet) bisa dilihat sesuai hak akses.

### 5.6 Ongkir
Server memanggil RajaOngkir dengan asal = wilayah penangan, tujuan = ID kelurahan/kecamatan pembeli, berat total (gram), dan kurir terpilih. Hasil (layanan, tarif, estimasi hari) ditampilkan sebagai pilihan. Tarif yang dipilih dihitung ulang di server saat pesanan dibuat.

---

## 6. Arsitektur dan stack

| Lapisan | Pilihan |
|---|---|
| Framework | Next.js (App Router), TypeScript ketat |
| Styling/UI | Tailwind + komponen aksesibel (mis. shadcn/ui), tema desain terpusat (token warna, tipografi, jarak) |
| State sisi klien | Zustand (keranjang, lokasi), data server lewat Server Components/route handlers |
| Validasi | Zod di semua input (form dan API) |
| ORM/DB | Prisma + MySQL (Hostinger) |
| Auth | Email + sandi (hash argon2/bcrypt), sesi JWT di cookie `httpOnly`, `SameSite=Lax`, kedaluwarsa wajar |
| Otorisasi | `lib/permissions.ts` sebagai matriks tunggal + helper `can(user, permission, resource)` |
| File | R2 (gambar produk), ImageKit (bukti transfer) |
| Email | SMTP Hostinger |
| Grafik/laporan | Recharts; PDF lewat halaman cetak/`pdf-lib`; Excel lewat `exceljs` |
| Test | Vitest (unit/integrasi), Playwright (E2E) |

Struktur folder disarankan: `app/(buyer)`, `app/(admin)`, `app/(owner)`, `app/(developer)`, `app/api/*`, `lib/{permissions,pricing,orders,stock,promo,shipping,payments,audit}`, `prisma/`, `docs/`, `tests/`.

---

## 7. Model data (ringkas, MySQL)

Nama bersifat panduan; agent boleh menyesuaikan selama kebutuhan terpenuhi dan dijelaskan di `docs/DB_SCHEMA.md`.

| Tabel | Isi penting |
|---|---|
| `User` | email, passwordHash, role (`ADMIN_PUSAT`, `ADMIN_WILAYAH`, `OWNER`, `DEVELOPER`), `regionId` (null untuk Owner/Developer), isActive, lastLoginAt |
| `Region` | nama, tipe (`PUSAT`/`WILAYAH`), alamat lengkap, kontak WA/email, `originId` RajaOngkir, isActive |
| `RegionCoverage` | regionId ↔ provinsi/kota yang dilayani |
| `Product`, `ProductVariant` | nama, deskripsi, foto, warna/model, SKU, `weightGram` (default 35, bisa diedit per varian), harga jual (seragam), isActive |
| `ProductCost` | **terpisah**: harga modal per varian (hanya Owner/Developer yang boleh di-select) |
| `Stock` | variantId, regionId, qty, reserved; unik (variantId, regionId) |
| `StockMovement` | riwayat perubahan stok (alasan, pelaku) |
| `Order` | kode, regionId, status, metode bayar, snapshot alamat, subtotal, diskon, ongkir, PPN, total, kurir, layanan, resi, kode promo, ref Midtrans, expiresAt |
| `OrderItem` | snapshot nama, harga jual, harga modal saat transaksi, qty |
| `OrderStatusLog` | perpindahan status |
| `Payment` | orderId, metode, bank tujuan, nominal, buktiURL, status verifikasi, verifiedBy, alasan tolak |
| `PaymentAccount` | bank, nomor, atas nama, isActive |
| `PromoCode` | kode, tipe (`RESELLER`/`WILAYAH`), regionId?, jenis & nilai diskon, batas maksimum, kuota, terpakai, periode, `isFreeShipping` (default false), createdBy |
| `Advice` | judul, isi, penulis, status terbit |
| `Setting` | `ppnRate`, daftar kurir aktif, batas diskon promo, dsb. |
| `Notification` | untuk siapa, jenis, tautan, dibaca/belum |
| `AuditLog` | pelaku, peran, aksi, entitas, sebelum/sesudah (JSON), waktu (append-only) |
| `ErrorLog` | pesan, jejak ringkas, rute, waktu (dibatasi ukuran dan retensi) |
| `DailyTraffic` | tanggal, path, jumlah kunjungan, perkiraan pengunjung unik |
| `ShippingCache` | cache wilayah dan tarif dengan TTL |

**Catatan khusus MySQL:** tidak ada tipe array native, `String` unik pakai `VarChar` yang aman untuk utf8mb4, uang pakai `Decimal` dengan presisi eksplisit, dan pencarian tidak peka huruf besar-kecil bergantung collation (jangan pakai `mode: 'insensitive'`).

### Data produk dan foto (keputusan)

- **Data produk yang sudah ada** (nama, varian/warna, harga jual, harga modal, deskripsi) **dimigrasi** ke skema 2.0 pada Prompt 01 dan Fase 1, bukan dibuang. Jika Wann menyatakan data itu hanya dummy, diganti seed baru.
- **Struktur final:** `Product` → `ProductVariant` (warna/model, SKU, berat default 35 g) → `Stock` per wilayah. Harga jual seragam di produk/varian, harga modal di `ProductCost` yang terpisah.
- **Foto tidak disimpan di database**, hanya URL/kunci berkas yang menunjuk ke R2. File lama di R2 tidak disentuh migrasi, jadi tetap tampil selama URL-nya ikut termigrasi.
- **Unggah ulang foto lewat dashboard Admin Pusat (Fase 3)**, bukan manual ke R2 sekarang, supaya berkas tercatat di produk yang benar dan tidak ada berkas yatim. Sampai saat itu, halaman pembeli (Fase 2) memakai foto lama atau placeholder.
- **Persiapan foto (boleh dikerjakan dari sekarang, di komputer):** penamaan kode + nomor yang dipakai sekarang (mis. `as1.webp`, `bsst3.webp`) boleh dipertahankan, dengan pemetaan kode ke produk/varian dicatat di `docs/PHOTO_MAP.md` (untuk unggahan lewat dashboard nanti, nama berkas ditentukan sistem), rasio 1:1 (atau 4:5), sisi panjang sekitar 1200 px, JPG/WebP di bawah ±500 KB, latar bersih dan konsisten, 3 sampai 5 foto per varian termasuk satu foto detail bahan.

---

## 8. Integrasi eksternal

### 8.1 RajaOngkir API V2 (Komerce)
- Base URL: `https://rajaongkir.komerce.id/api/v1/`, header `key: <API_KEY>`. Kunci hanya dipakai **di server**; browser memanggil route internal kita.
- Dua cara data wilayah, pakai keduanya:
  - **Bertingkat** untuk dropdown: provinsi → kota (per provinsi) → kecamatan (per kota) → kelurahan (per kecamatan).
  - **Pencarian langsung** (`destination/domestic-destination?search=...`) untuk "Cari cepat" dan untuk mendapatkan ID titik asal. Beri jeda (*debounce*) minimal 400 ms dan minimal 3 karakter.
- Hitung ongkir: `POST calculate/domestic-cost` (form-urlencoded) dengan `origin`, `destination`, `weight` (gram), `courier` (kode kurir), dan `price` (`lowest`/`highest`) sesuai dokumentasi.
- **Kuota:** akun memiliki batas panggilan harian sesuai paket (Starter/Pro). Maka: cache daftar wilayah di database/ISR (berumur panjang), cache tarif per kombinasi asal-tujuan-berat-kurir dengan TTL pendek, dan tampilkan pesan ramah bila kuota habis atau API gagal (jangan crash, tawarkan coba lagi atau hubungi admin via WhatsApp).
- Konfirmasi detail terbaru (nama kolom, kode kurir, batas kuota) langsung ke dokumentasi resmi di rajaongkir.com/docs saat implementasi.

### 8.2 Midtrans
Snap + webhook seperti bagian 5.3. Dua set kunci (sandbox untuk pengujian, production untuk live) lewat env, dengan satu variabel penentu mode. Uji pembayaran di sandbox sebelum live.

### 8.3 R2 dan ImageKit
Tetap. Validasi tipe dan ukuran file di server, nama file diacak, tidak percaya ekstensi dari klien. Bukti transfer hanya bisa dilihat admin wilayah terkait, Owner, dan Developer.

**Kecepatan gambar produk (keputusan):**
- Foto produk **tidak boleh** dilayani dari alamat bawaan `r2.dev` (tanpa cache CDN, hanya untuk uji). Pasang **domain kustom** pada bucket R2 (mis. subdomain gambar milik domain Luvira) agar lewat CDN Cloudflare, dan kirim header `Cache-Control: public, max-age=31536000, immutable` saat unggah.
- Saat Admin Pusat mengunggah foto, server membuat beberapa ukuran WebP (mis. 400, 800, 1200 px) dan menyimpan semuanya, supaya halaman memuat ukuran yang pas tanpa mengandalkan optimasi gambar di server Hostinger yang terbatas.
- Kolom foto di database menyimpan URL/jalur generik, sehingga bisa menunjuk ke `/socks/...` (berkas lokal di `public/`) selama pengembangan dan staging, lalu ke domain CDN R2 untuk produksi. Folder `public/socks` bukan penyimpanan akhir: unggahan dari dashboard tidak bisa menulis ke folder aplikasi di hosting, dan setiap ganti foto akan butuh deploy ulang.
- Jika setelah perbaikan di atas masih lambat, alternatif yang disiapkan: pindahkan foto produk ke ImageKit (sudah ada di stack), yang memang CDN gambar dengan pengubahan ukuran otomatis. Putuskan setelah diukur.

### 8.4 Notifikasi
Pesanan baru, bukti transfer baru, dan stok menipis (ambang diatur Owner) → baris di tabel `Notification` + email. Dashboard admin polling ringan (mis. tiap 30 detik) untuk badge lonceng.

---

## 9. Standar UI/UX

- **Mobile-first** (rancang mulai 360 px), lalu tablet dan desktop. Target tap minimal 44 px.
- **Satu sistem desain**: token warna/tipografi/jarak, satu set komponen. Ambil warna dan logo dari aset brand yang sudah ada di repo; bila belum ada, ajukan 2 opsi sederhana ke Wann sebelum membangun.
- **Setiap layar punya empat keadaan**: memuat (skeleton), kosong (dengan ajakan tindakan), error (dengan tombol coba lagi), dan sukses.
- **Bahasa Indonesia** yang ramah dan konsisten; format rupiah `Rp 12.500`; tanggal `24 Okt 2026`; nomor WhatsApp dinormalisasi ke format `62…`.
- **Form:** validasi langsung di tiap kolom, pesan error spesifik, tidak menghapus isian saat gagal, autofill dan tipe input yang benar (`tel`, `email`).
- **Checkout** bertahap dan jelas: Keranjang → Alamat dan kontak → Pengiriman → Pembayaran → Konfirmasi. Ringkasan total selalu terlihat (bar bawah di HP). Tidak ada total yang "melompat" tanpa penjelasan.
- **Combobox alamat**: bisa diketik untuk mencari, bisa dipakai dengan keyboard, tingkat berikutnya otomatis terkunci sampai tingkat sebelumnya dipilih, dan menampilkan keadaan memuat per tingkat.
- **Dashboard admin/owner:** tabel dengan cari, filter, urut, dan paginasi; dialog konfirmasi untuk aksi merusak; toast untuk hasil aksi; badge status berwarna dengan teks (tidak hanya warna).
- **Aksesibilitas:** kontras memenuhi WCAG AA, fokus terlihat, label pada semua kolom, alt text pada gambar produk.
- **Performa:** gambar lewat `next/image` dengan ukuran responsif, target Lighthouse mobile ≥ 90 untuk halaman katalog dan produk, halaman admin tidak memuat pustaka berat di rute publik.
- **SEO dan berbagi:** metadata per halaman, Open Graph untuk produk, `sitemap.xml`, `robots.txt`.
- **Bantuan:** tombol WhatsApp bantuan di halaman publik dan di halaman status pesanan.

---

## 10. Keamanan

- Semua input divalidasi dengan Zod di server; query lewat Prisma (tanpa string SQL manual kecuali terparameter).
- Otorisasi di **setiap** route handler dan server action lewat `can(...)`; tidak ada rute admin yang hanya "disembunyikan" di UI.
- Pembatasan laju (rate limit) untuk login, pembuatan pesanan, pelacakan pesanan, dan pencarian alamat. Karena tidak ada Redis di hosting bersama, pakai penyimpanan di database atau memori proses yang cukup untuk skala awal.
- Kata sandi di-hash, kebijakan sandi minimal, percobaan login gagal dibatasi, sesi bisa dicabut saat akun dinonaktifkan.
- Header keamanan (CSP yang masuk akal, `X-Content-Type-Options`, `Referrer-Policy`), HTTPS wajib.
- Rahasia hanya di environment variable; tidak ada kunci di klien atau git. Rotasi kunci jika pernah ter-commit.
- Unggahan file dibatasi tipe/ukuran, dipindai ekstensi dan MIME.
- Webhook Midtrans diverifikasi tanda tangannya; endpoint job terjadwal dilindungi token rahasia.

---

## 11. Observabilitas dan Dashboard Developer

Dashboard Developer menampilkan, dalam satu layar:
- **Kesehatan:** ping database, versi migrasi terakhir, status koneksi R2 dan ImageKit, kunci RajaOngkir dan Midtrans terpasang (tanpa menampilkan nilainya) beserta mode sandbox/production.
- **Integrasi:** waktu notifikasi Midtrans terakhir diterima, hasil uji ringan RajaOngkir, perkiraan pemakaian kuota harian.
- **Antrean bermasalah:** pesanan `menunggu_verifikasi` lebih dari 24 jam, pesanan `diproses` lebih dari N hari tanpa resi, pesanan kedaluwarsa tetapi stoknya belum terlepas (seharusnya nol), notifikasi gagal terkirim.
- **Error terbaru** dari `ErrorLog` dengan penyaringan per rute.
- **Audit log** dengan filter pelaku, entitas, dan tanggal.

---

## 12. Tahapan, hasil, dan Definition of Done

| Fase | Isi | DoD (harus lolos sebelum lanjut) |
|---|---|---|
| **0. Cleaning** | Prompt 01: bersihkan kode lama, pindah ke MySQL, build bersih | Build dan lint hijau; data termigrasi; hasil di `CLEANUP_REPORT.md` disetujui Wann |
| **1. Fondasi** | Skema 2.0, wilayah, 5 peran, `permissions.ts`, auth, audit log, seed | Tes matriks hak akses lulus 100%; login semua peran jalan; skema terdokumentasi |
| **2. Sisi pembeli** | Katalog sadar lokasi, alamat bertingkat, keranjang, ongkir RajaOngkir, checkout, Midtrans, transfer manual, tracking, nasihat | Pesanan end-to-end sukses di sandbox untuk kedua metode bayar; semua keadaan UI (kosong/error/memuat) ada |
| **3. Sisi admin** | Katalog dan harga (Pusat), stok per wilayah, proses pesanan dan resi, verifikasi bukti, nasihat, promo, lokasi/profil, notifikasi | Admin Wilayah terbukti tidak bisa melihat/mengubah data wilayah lain; notifikasi pesanan baru sampai |
| **4. Dashboard Owner** | Traffic, penjualan, stok, rekap, kelola admin dan cakupan, pengaturan, cetak laporan | Angka dashboard cocok dengan hitung manual dari data uji; PDF dan Excel terunduh benar |
| **5. Dashboard Developer** | Kesehatan modul, antrean bermasalah, error log, audit log | Semua indikator bereaksi benar saat sengaja dirusak di lingkungan uji |
| **6. Pengerasan dan peluncuran** | Performa, keamanan, backup, UAT dengan Pak Dimas, cutover ke produksi | Semua tes otomatis hijau; checklist UAT ditandatangani; rencana rollback tertulis |

---

## 13. Strategi pengujian

**Prinsip:** yang paling berisiko (uang, stok, hak akses) dites paling ketat dan otomatis.

1. **Unit (Vitest):** perhitungan harga (subtotal, diskon, PPN 11% dari net, ongkir, total, pembulatan), validasi promo (kedaluwarsa, kuota, batas diskon, minimal belanja, cakupan wilayah), state machine pesanan, normalisasi nomor WhatsApp, mapping status Midtrans.
2. **Matriks hak akses (otomatis):** tes yang dibangkitkan dari `permissions.ts` dan menembak **setiap** endpoint dengan **setiap** peran (dan tanpa login), memastikan hasil izin/tolak sesuai tabel bagian 4, termasuk pembatasan wilayah (Admin Wilayah A tidak bisa membaca/mengubah data wilayah B, Admin tidak pernah menerima harga modal).
3. **Integrasi (database uji MySQL):** pembuatan pesanan dengan stok pas-pasan dan permintaan bersamaan (tidak boleh oversell), kedaluwarsa melepas stok, webhook Midtrans ganda tidak menggandakan efek, pembatalan mengembalikan kuota promo.
4. **E2E (Playwright), minimal skenario ini:**
   - E2E-01 pembeli belanja dari katalog sampai bayar Midtrans (sandbox) → admin melihat pesanan `diproses`
   - E2E-02 pembeli bayar transfer manual → unggah bukti → admin konfirmasi → admin isi resi → pembeli melacak
   - E2E-03 bukti ditolak → pembeli unggah ulang → dikonfirmasi
   - E2E-04 alamat DIY → pesanan ke Admin Yogyakarta; alamat luar DIY → ke Pusat
   - E2E-05 stok Yogyakarta habis → pesanan dialihkan ke Pusat
   - E2E-06 kode promo reseller dan promo wilayah (valid, kedaluwarsa, kuota habis, di luar wilayah)
   - E2E-07 pesanan tidak dibayar 24 jam → kedaluwarsa dan stok kembali
   - E2E-08 Admin Pusat ubah harga → harga berubah di semua wilayah
   - E2E-09 Admin Wilayah mencoba membuka data/rute wilayah lain → ditolak
   - E2E-10 Owner membuat akun Admin Wilayah, menetapkan cakupan, menonaktifkan akun → akun tak bisa login
   - E2E-11 Owner cetak laporan bulanan, angka cocok dengan data uji
   - E2E-12 Developer membuka dashboard kesehatan; tidak bisa mengubah data bisnis
   - E2E-13 form alamat: cascading combobox, "Cari cepat", validasi kolom jalan/nomor
   - E2E-14 RajaOngkir gagal/kuota habis → pesan ramah, checkout tidak crash
   - E2E-15 lacak pesanan dengan kode + 4 digit WA (benar dan salah)
5. **Kontrak integrasi:** RajaOngkir dan Midtrans dimock di CI; tambah **smoke test manual** terjadwal terhadap RajaOngkir asli dan Midtrans sandbox sebelum rilis.
6. **Non-fungsional:** Lighthouse mobile untuk katalog/produk/checkout, uji beban ringan (mis. 50 pengguna bersamaan di alur checkout) untuk memastikan batas koneksi MySQL hosting tidak jebol, uji tampilan pada lebar 360, 390, 768, 1280.
7. **UAT bersama Pak Dimas:** checklist berbahasa bisnis per peran, dijalankan di lingkungan staging, hasilnya dicatat.

**Aturan lolos:** semua tes otomatis hijau, tidak ada bug berkeparahan tinggi (uang, stok, akses, tidak bisa checkout) yang terbuka, dan tidak ada error baru di `ErrorLog` selama uji.

---

## 14. Deployment dan operasional (Hostinger)

- Deploy dari GitHub ke Hostinger Node.js; branch `main` = produksi, `staging` = uji. Env var diisi di hPanel, tidak di repo.
- Build harus menjalankan `prisma generate`; migrasi produksi dengan `prisma migrate deploy` (langkah eksplisit, bukan otomatis tanpa pengawasan).
- Batasi koneksi Prisma (`connection_limit` kecil) karena hosting bersama punya batas koneksi database.
- **Job terjadwal** (kedaluwarsa pesanan tiap 5–10 menit, pembersihan log berkala, ringkasan harian) lewat Cron Jobs di hPanel yang memanggil route internal dengan token rahasia. Pastikan fitur Cron tersedia di paket yang dipakai.
- **Backup:** aktifkan backup Hostinger, tambah ekspor database berkala yang disimpan di luar hosting (mis. bucket R2 terpisah), dan latih satu kali proses *restore* sebelum peluncuran.
- **Peluncuran:** staging → UAT → jadwal cutover di jam sepi → pantau `ErrorLog` dan dashboard Developer 48 jam pertama → rencana rollback siap (kembali ke versi sebelumnya; Neon dipertahankan sampai Wann menyatakan aman).

---

## 15. Risiko utama

| Risiko | Penanganan |
|---|---|
| Kuota harian RajaOngkir habis | Cache wilayah dan tarif, pesan ramah, pantau di dashboard Developer, pertimbangkan paket Pro bila trafik naik |
| Selisih total antara Midtrans dan pesanan | Satu fungsi hitung di server, baris item Midtrans dibangkitkan dari fungsi yang sama, tes unit khusus |
| Oversell stok | Update stok bersyarat dalam transaksi, tes konkurensi |
| Hosting bersama kewalahan | Batasi koneksi dan query berat, cache, uji beban ringan, siapkan jalur naik ke VPS bila perlu |
| Kebocoran harga modal | Tabel terpisah + tes matriks hak akses khusus kolom sensitif |
| Salah nomor rekening di situs | Rekening dari tabel yang diatur Owner, ditampilkan konsisten, diperiksa sebelum peluncuran |
| Cakupan wilayah salah (pesanan ke admin yang keliru) | Tabel cakupan bisa diubah Owner/Admin Pusat, tes E2E-04/05, laporan pesanan per wilayah |
| Perubahan requirement di tengah jalan | Semua keputusan di dokumen ini; ubah dokumen dulu, baru kode |
