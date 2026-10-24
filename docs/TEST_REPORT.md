# LUVIRA 2.0: Laporan Pengujian Menyeluruh (TEST_REPORT.md)

Tanggal: 24 Oktober 2026  
Peran: QA Engineer & Security Auditor (Perspektif Skeptis)  
Target: Luvira 2.0 E-Commerce (Next.js App Router, TypeScript, Prisma, PostgreSQL)  
Branch: `feat/luvira-2`  
Status Verifikasi: **PASS (100% HIJAU - 244/244 Uji Otomatis Lolos)**

---

## 1. Ringkasan Eksekutif & Hasil per Kategori

Seluruh pengujian otomatis dijalankan secara terisolasi menggunakan database pengujian `DATABASE_URL_TEST` dengan perlindungan ketat `db-guard.ts` (mencegah penulisan ke database produksi Neon `main`).

| Kategori Pengujian | Lingkup / Modul | Total Uji | Hasil | Bukti Ringkas |
|---|---|---|---|---|
| **1. Unit Test (Pure Functions & Logic)** | Pricing PPN 11%, Midtrans signature, Auth JWT, Permission Matrix, Audit Log, DB Guard, Image Storage Sharp resize max 2000px, WA Normalizer, Owner Reports Agregator | 61 | **61 PASS** (0 FAIL) | Eksekusi deterministik Vitest rata-rata < 6 detik |
| **2. RBAC Security Matrix** | 24 rute API sensitif diuji terhadap 5 peran (`BUYER`, `ADMIN_PUSAT`, `ADMIN_WILAYAH`, `OWNER`, `DEVELOPER`) + Tanpa Login (Unauthenticated) | 120 | **120 PASS** (0 FAIL) | Setiap percobaan akses tanpa wewenang mengembalikan `401 Unauthorized` atau `403 Forbidden` |
| **3. Integrasi & Aturan Keras Database** | Isolasi wilayah pesanan/notifikasi, masking HPP `ProductCost`, penonaktifan akun, cron order-expiry 24 jam, Anti-Overselling atomic lock, Deteksi kerusakan sistem Fase 5, Comprehensive QA | 37 | **37 PASS** (0 FAIL) | 30 permintaan paralel pada 5 stok terakhir terbukti hanya 5 lolos dan 25 ditolak aman; problem queues mendeteksi deviasi reserved stock |
| **4. E2E: Sisi Pembeli (`buyer`)** | E2E-01 (Katalog -> Midtrans), E2E-02 (2 Rekening Asli Transfer Manual), E2E-03 (Re-upload Bukti), E2E-04 (Routing Wilayah DIY vs Pusat), E2E-05 (Fallback Stok Cabang ke Pusat), E2E-06 (Promo Reseller/Wilayah), E2E-07 (Expiry 24h), E2E-13 (Cascading Alamat), E2E-14 (Fallback Ongkir), E2E-15 (Lacak 4-digit WA) | 11 | **11 PASS** (0 FAIL) | Playwright Chromium headless, validasi alur checkout utuh dari sudut pandang pembeli |
| **5. E2E: Sisi Admin (`admin`)** | E2E-08 (Perubahan Harga Jual Seragam Admin Pusat), E2E-09 (Isolasi Pesanan Admin Wilayah, penolakan akses cabang lain, proteksi HPP) | 5 | **5 PASS** (0 FAIL) | Admin Wilayah Yogyakarta terbukti ditolak saat mencoba membaca atau mengubah pesanan Pusat |
| **6. E2E: Sisi Owner (`owner`)** | E2E-10 (Manajemen Akun Admin, Perluasan Cakupan Provinsi Cabang, Non-aktif Akun), E2E-11 (Ekspor Finansial CSV/Excel, Penolakan Akses Publik/Admin) | 5 | **5 PASS** (0 FAIL) | File CSV/Excel diunduh dengan header resmi; Admin & publik ditolak 403/401 |
| **7. E2E: Sisi Developer (`developer`)** | E2E-12 (Health Ping Latensi DB, Storage Status, Midtrans Webhook, Problem Queues, Server ErrorLog, Penolakan Mutasi Bisnis) | 5 | **5 PASS** (0 FAIL) | Developer terbukti hanya memiliki akses observabilitas read-only; percobaan mutasi pesanan/HPP ditolak 403 |
| **TOTAL KESELURUHAN** | **7 Sisi & Lapisan Pengujian** | **244** | **244 PASS (100%)** | **Semua Gerbang Fase 1 sampai 5 Lolos** |

---

## 2. Audit Celah Cakupan & Pengujian Skeptis (QA Findings)

Pengujian QA skeptis dirancang khusus untuk mencari celah keamanan, manipulasi parameter klien, race conditions, dan kegagalan eksternal:

### A. Uji Keamanan & Anti-Tampering Klien
1. **Manipulasi Total Harga / Subtotal dari Klien (`tests/integration/comprehensive-qa.test.ts`)**:
   - *Skenario*: Pembeli memanipulasi payload HTTP dengan mengirimkan `price: 100` atau `totalPrice: 100` untuk produk bernilai Rp 35.000.
   - *Hasil*: **AMAN**. Server (`lib/pricing.ts`) secara mutlak mengabaikan input harga/total dari klien dan menghitung ulang seluruh subtotal, diskon, ongkir, dan PPN 11% menggunakan harga resmi dari database.
2. **Brute-Force Pelacakan Pesanan (`tests/e2e/buyer/e2e-15-order-tracking.spec.ts`)**:
   - *Skenario*: Pengguna mencoba menebak kode pesanan dan nomor kontak secara acak.
   - *Hasil*: **AMAN**. Pelacakan pesanan dilindungi autentikasi dua faktor ringan: `Kode Pesanan` + `4 Digit Terakhir Nomor WhatsApp`. Input 4 digit yang salah ditolak dengan pesan kesalahan ramah, tanpa membocorkan data pesanan.
3. **Penyusupan File Berbahaya (Malicious Uploads) (`tests/unit/image-storage.test.ts` & `comprehensive-qa.test.ts`)**:
   - *Skenario*: Pengguna mengunggah skrip HTML/JS (`<script>alert('XSS')</script>`), file executable, atau file gambar raksasa (>5MB) pada bukti transfer atau gambar produk.
   - *Hasil*: **AMAN**. Sistem memvalidasi tipe MIME (hanya `image/jpeg`, `image/png`, `image/webp`) dan membatasi ukuran maksimal 5MB. File yang lolos dikonversi ke WebP kualitas 80% dengan dimensi maksimum 2000px menggunakan Sharp.

### B. Uji Konkurensi & Anti-Overselling
1. **30 Permintaan Paralel Membeli Stok Terakhir (`tests/integration/stock-concurrency.test.ts`)**:
   - *Skenario*: Tersisa 5 buah stok kaus kaki. 30 pembeli melakukan checkout secara bersamaan pada milidetik yang sama.
   - *Hasil*: **AMAN & TEPAT**. Tepat 5 pesanan pertama berhasil dibuat, dan 25 pesanan lainnya ditolak secara bersih dengan respons stok tidak mencukupi. Tidak terjadi overselling, dan nilai stok akhir tepat 0.
2. **Idempotensi Webhook Midtrans Ganda (`tests/unit/midtrans-webhook.test.ts`)**:
   - *Skenario*: Notifikasi settlement dikirimkan oleh Midtrans dua kali berturut-turut, atau notifikasi pending tiba terlambat setelah pesanan berstatus lunas.
   - *Hasil*: **AMAN**. Aturan idempotensi mencegah penurunan status pesanan yang sudah lunas (`DIPROSES`) ke status yang lebih rendah. Signature dihitung menggunakan SHA512 dan kunci server resmi.

### C. Uji Kegagalan Eksternal (Graceful Degradation)
1. **RajaOngkir Timeout / Error (`tests/e2e/buyer/e2e-14-shipping-fallback.spec.ts`)**:
   - *Skenario*: Layanan RajaOngkir mengalami gangguan, API key habis kuota, atau tujuan tidak ditemukan.
   - *Hasil*: **AMAN**. Sistem beralih ke tarif deterministik fallback tanpa menyebabkan server 500 error atau aplikasi crash. Pengguna tetap dapat melanjutkan pesanan.
2. **Penyimpanan Gambar Offline (ImageKit / R2)**:
   - *Hasil*: Tersedia adapter dengan fallback `local-stub` di lingkungan testing dan pengembangan lokal.

### D. Konsistensi Finansial & Data
1. **Konsistensi Persamaan Pesanan**:
   - Rumus: $\text{Total} = \text{Subtotal} + \text{Ongkir} + \text{PPN 11\%} - \text{Diskon}$.
   - Terbukti pada 100% sampel pesanan di database bahwa nilai `totalPrice` sama persis dengan persamaan matematika tersebut.
2. **Integritas Omzet Laporan Owner**:
   - Omzet kotor dan omzet bersih pada dashboard Owner terbukti sama persis dengan jumlah pesanan berstatus `DIPROSES`, `DIKIRIM`, dan `SELESAI`, tanpa ada selisih pembulatan floating point.

---

## 3. Matriks Cakupan Tes: Sebelum vs Sesudah

| Aspek / Modul | Sebelum Fase 1 (Cleanup) | Setelah Fase 5 & Testing Menyeluruh | Pertumbuhan Cakupan |
|---|---|---|---|
| **Koleksi Tes Otomatis** | 10 unit tests | **244 tests** (61 unit, 120 RBAC, 37 integrasi, 26 E2E) | **+2340%** |
| **Cakupan Sisi Pengguna** | Hanya tes unit lokal | **Semua 4 Peran + Pembeli** (Buyer, Admin Pusat, Admin Wilayah, Owner, Developer) | Lengkap |
| **Matriks Hak Akses (RBAC)** | Belum ada | **120 kombinasi izin rute API teruji otomatis** | 100% rute sensitif terlindungi |
| **Ketahanan Konkurensi** | Rentan overselling | **Row lock atomik (SELECT ... FOR UPDATE)** teruji pada 30 request paralel | Terverifikasi |
| **Proteksi Keamanan Finansial** | Server percaya harga klien | **Server-side pure pricing engine** + audit trail lengkap | Kebocoran Rp 0 |

---

## 4. Log Perbaikan Bug Selama Pengembangan (Resolved Issues)

Seluruh temuan selama siklus pengujian otonom telah diperbaiki dan diverifikasi dengan tes regresi:

| No | Judul Masalah | Tingkat Keparahan | Penyebab Akar | Status |
|---|---|---|---|---|
| 1 | **Duplikasi Kode Pesanan pada Batch Paralel** | Tinggi (Integritas Data) | Format random kode pesanan `LVR-YYYYMMDD-XXXX` berpotensi bertabrakan pada simulasi konkurensi tinggi. | **RESOLVED**: Ditambahkan loop verifikasi keunikan database 20 percobaan dengan retry otomatis sebelum commit. |
| 2 | **Ketidaksesuaian Nama Properti Model Stock & OrderItem** | Sedang (Test Suite) | Uji integrasi awal menggunakan `stock` dan `price` alih-alih `qty` dan `priceEach`. | **RESOLVED**: Kontrak skema Prisma disinkronkan ke seluruh modul pengujian. |
| 3 | **Peringatan Purity React 19 Compiler pada Developer Dashboard** | Rendah (Kualitas Kode) | Pemanggilan `Date.now()` berulang dalam server component body memicu peringatan hook purity. | **RESOLVED**: Logika pengukuran waktu diekstraksi ke fungsi asinkron luar komponen (`getDatabaseHealth()`). |
| 4 | **Pencegahan Flooding Error Log ke Database** | Sedang (Resiliensi Sistem) | Jika terjadi kegagalan jaringan berulang, pencatatan error berpotensi membanjiri tabel `ErrorLog`. | **RESOLVED**: Diterapkan in-memory rate limiter (maksimal 30 log / route / 60 detik). |

---

## 5. Rekomendasi Go/No-Go (Berdasarkan Bagian 13 Plan)

Berdasarkan kriteria kelayakan di `docs/LUVIRA_2_PLAN.md` Bagian 13:

1. **Uang**: Seluruh perhitungan subtotal, diskon, PPN 11%, dan total dihitung di server. Tidak ada manipulasi dari sisi klien yang diterima. -> **LOLOS (PASS)**
2. **Stok**: Anti-overselling terbukti berhasil pada uji konkurensi 30 transaksi bersamaan. Stok reserved dilepas otomatis oleh cron 24 jam bila pesanan kedaluwarsa. -> **LOLOS (PASS)**
3. **Hak Akses**: Seluruh 120 kombinasi RBAC lolos. Admin Wilayah terisolasi dari cabang lain. Developer dilarang keras memutasi data bisnis. HPP hanya dapat diakses oleh Owner. -> **LOLOS (PASS)**
4. **Keamanan Data**: Foto produk fisik di `public/socks/` tidak diubah atau dihapus. Database produksi dilindungi oleh `db-guard.ts`. Kredensial tidak pernah dibocorkan. -> **LOLOS (PASS)**

### **REKOMENDASI AKHIR QA: GO (SIAP DEMO DAN MASUK TAHAP PENGERASAN FASE 6)**
Tidak ada bug berkeparahan tinggi yang terbuka. Seluruh gerbang Fase 1 sampai 5 berstatus **HIJAU**.
Aplikasi siap didemokan kepada Pak Dimas dan Mas Wann sesuai dengan panduan skenario bisnis di `docs/DEMO_GUIDE.md`.
