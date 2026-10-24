# LUVIRA 2.0: Pelacakan Kemajuan Proyek (PROGRESS.md)

| Fase | Deskripsi | Status | Commit / Tag | Gerbang Tes | Catatan & Placeholder |
|---|---|---|---|---|---|
| **0. Pre-2.0 Cleanup** | Pembersihan kode lama, inventaris, snapshot 9 tabel Neon | **DONE** | `pre-cleanup-backup`, `ffe837c` | lint, tsc, build hijau, 10/10 test pass | MySQL dibatalkan, PostgreSQL tetap |
| **1. Fondasi** | Skema 2.0, 5 Peran, RBAC `permissions.ts`, Auth, Audit Log, Seed, Isolasi Wilayah | **GREEN** | `phase-1-green` | `test:phase1` (172/172 PASS), tsc, lint, build hijau | Skema 2.0 migrasi & seed sukses di dev & test DB |
| **2. Sisi Pembeli** | Katalog, Alamat Bertingkat, Ongkir RajaOngkir (Adapter), Checkout, Midtrans & Manual, Tracking | **GREEN** | `phase-2-green` | `test:phase2` (194/194 PASS), tsc, lint, build (36/36) | Alamat cascading, anti-oversell 30 request, Midtrans mock & 2 rekening asli |
| **3. Sisi Admin** | Dashboard Admin Pusat & Wilayah, Pesanan, Resi, Stok, Promo, Isolasi Wilayah, Demo Seed & Guide | **GREEN** | `phase-3-green` | `test:phase3` (211/211 PASS), tsc, lint, build (50/50) | Demo seed & Panduan Demo bisnis siap |
| **4. Dashboard Owner** | KPI, Laba Kotor, HPP historis OrderItem, Rekap, Cetak/Export CSV/Excel, Pengaturan, Manajemen Admin | **GREEN** | `phase-4-green`, `6c3315c` | `test:phase4` (227/227 PASS), tsc, lint, build (57/57) | HPP historis snapshot, isolasi wewenang owner |
| **5. Observabilitas** | Dashboard Developer, Health ping, Antrean macet, ErrorLog, Audit Log, RBAC Developer Guard | **GREEN** | `phase-5-green`, `be0333e` | `test:phase5` (237/237 PASS), tsc, lint, build (56/56) | Developer read-only observabilitas, penolakan mutasi bisnis 403 |
| **Testing Menyeluruh** | QA skeptis, uji keamanan, uji konkurensi, batas laju, laporan akhir | **DONE** | - | `verify` & `comprehensive-qa` (244/244 PASS) | `docs/TEST_REPORT.md` terbit, rekomendasi GO |

---

## Ringkasan Hasil Testing Menyeluruh (244 PASS / 0 FAIL)
- **Status Akhir**: Semua gerbang Fase 1 sampai 5 lolos verifikasi kumulatif dan pengujian skeptis tanpa satu pun kegagalan.
- **Rincian Eksekusi Test**:
  - `test:unit`: 11 berkas (61/61 PASS)
  - `test:rbac`: 1 berkas, 24 endpoint x 5 peran + unauthenticated (120/120 PASS)
  - `test:integration`: 10 berkas (37/37 PASS), termasuk `tests/integration/comprehensive-qa.test.ts` (7/7 PASS)
  - `test:e2e:buyer`: 10 berkas (11/11 PASS)
  - `test:e2e:admin`: 2 berkas (5/5 PASS)
  - `test:e2e:owner`: 2 berkas (5/5 PASS)
  - `test:e2e:developer`: 1 berkas (5/5 PASS)
  - **TOTAL: 244 PASS / 0 FAIL**
- **Dokumentasi Hasil**: Lengkap di `docs/TEST_REPORT.md`.
- **Rekomendasi Go/No-Go**: **GO** (Siap demo dan masuk ke tahap pengerasan Fase 6).

## Ringkasan Hasil Uji Fase 5: Observabilitas Developer (237 PASS / 0 FAIL)
- **Gerbang `test:phase5` (Kumulatif)**:
  - `test:unit` (11 berkas, 61/61 PASS)
  - `test:rbac` (1 berkas, 120/120 PASS)
  - `test:integration` (9 berkas, 30/30 PASS):
    - `tests/integration/developer-health.test.ts` (5/5 PASS):
      1. Health check endpoint merespons status database, storage, dan integrasi eksternal
      2. Problem queues mendeteksi pesanan macet (status MENUNGGU_VERIFIKASI > 24 jam)
      3. Problem queues mendeteksi selisih stok reserved terhadap pesanan aktif (stockMismatches)
      4. Pencatatan log error server berfungsi dengan rate limiting in-memory (max 30 error / 60 detik)
      5. Developer ditolak (403 Forbidden) saat mencoba memutasi status pesanan bisnis
    - 8 integration test lainnya tetap 100% PASS (25/25 PASS).
  - `test:e2e:buyer` (10 berkas, 11/11 PASS): E2E-01..07, E2E-13..15
  - `test:e2e:admin` (2 berkas, 5/5 PASS): E2E-08, E2E-09
  - `test:e2e:owner` (2 berkas, 5/5 PASS): E2E-10, E2E-11
  - `test:e2e:developer` (1 berkas, 5/5 PASS):
    - `tests/e2e/developer/e2e-12-observability.spec.ts` (5/5 PASS):
      1. Developer berhasil mengakses health check, latensi DB, status storage, dan webhook
      2. Developer berhasil melihat daftar antrean bermasalah dan error log server
      3. Developer ditolak (403 Forbidden) saat mencoba mengubah status pesanan bisnis (order:manage)
      4. Developer ditolak (403 Forbidden) saat mencoba mengubah HPP / cost prices (cost_price:manage)
      5. Pengguna publik / tanpa token ditolak (401 Unauthorized) saat mengakses endpoint developer
- **Kompilasi TypeScript (`tsc --noEmit`)**: 0 error.
- **ESLint (`npm run lint`)**: 0 error (62 warnings terisolasi).
- **Next.js Production Build (`npm run build`)**: 56/56 rute sukses dikompilasi (termasuk 4 rute `/api/developer/*` dan `/dashboard/developer`).
- **Isolasi Mutlak Hak Akses**: Developer terbukti secara otomatis ditolak ketika mencoba melakukan mutasi data bisnis (stok, pesanan, HPP, harga jual seragam).

---

## Ringkasan Hasil Uji Fase 4: Dashboard Owner (227 PASS / 0 FAIL)
- **Gerbang `test:phase4` (Kumulatif)**:
  - `test:unit` (11 berkas, 61/61 PASS):
    - `tests/unit/owner-reports.test.ts` (5/5 PASS): Kalkulasi Omzet kotor/bersih, PPN 11%, Ongkir, HPP historis dari snapshot `OrderItem` (`costEach` + `packingEach`), Laba Kotor, AOV, Margin laba, dan generator CSV/Excel terhadap fixture manual hitung.
    - 10 unit test lainnya dari fase 1-3 tetap 100% PASS (56/56 PASS).
  - `test:rbac` (1 berkas, 120/120 PASS).
  - `test:integration` (8 berkas, 25/25 PASS):
    - `tests/integration/owner-actions.test.ts` (6/6 PASS):
      1. Owner berhasil mengakses dan memperbarui pengaturan sistem global
      2. Owner berhasil membaca dan memperbarui harga modal (HPP)
      3. Owner dilarang ikut campur mengubah status pesanan secara langsung (order:manage ditolak)
      4. Admin Pusat ditolak (403) saat mencoba mengakses pengaturan sistem owner
      5. Admin Pusat ditolak (403) saat mencoba mengakses dan mengubah HPP
      6. Admin Pusat ditolak (403) saat mencoba mengekspor laporan keuangan owner
    - 7 integration test lainnya tetap 100% PASS (19/19 PASS).
  - `test:e2e:buyer` (10 berkas, 11/11 PASS): E2E-01..07, E2E-13..15
  - `test:e2e:admin` (2 berkas, 5/5 PASS): E2E-08, E2E-09
  - `test:e2e:owner` (2 berkas, 5/5 PASS):
    - `tests/e2e/owner/e2e-10-admin-management.spec.ts` (3 tests, PASS):
      1. Owner menambahkan akun Admin Wilayah baru dengan validasi wewenang
      2. Owner menonaktifkan akun admin operasional
      3. Owner menambah cakupan provinsi baru ke wilayah cabang
    - `tests/e2e/owner/e2e-11-report-export.spec.ts` (2 tests, PASS):
      1. Owner berhasil mengunduh file ekspor laporan keuangan format CSV dengan header Content-Disposition
      2. Pengguna tanpa hak akses (Admin Wilayah, Admin Pusat, Publik) ditolak (403/401) saat mengakses laporan keuangan Owner
- **Kompilasi TypeScript (`tsc --noEmit`)**: 0 error.
- **Next.js Production Build (`npm run build`)**: 57/57 rute sukses dikompilasi (termasuk 8 rute `/api/owner/*`).
- **Penanganan Ketahanan**: Pembuatan kode pesanan (`orderCode`) diperkuat dengan pengecekan keunikan database (loop 20 percobaan) untuk mencegah duplikasi kode pesanan akibat Birthday Paradox.


## Ringkasan Hasil Uji Fase 3: Sisi Admin (211 PASS / 0 FAIL)
- **Gerbang `test:phase3` (Kumulatif)**:
  - `test:unit` (10 berkas, 56/56 PASS):
    - `tests/unit/image-storage.test.ts` (5/5 PASS): Adapter ImageKit & local-stub, resize Sharp max 2000px, WebP q80, batasan 5MB & tipe MIME
    - `tests/unit/db-guard.test.ts` (6/6 PASS)
    - `tests/unit/pricing.test.ts` (7/7 PASS)
    - `tests/unit/whatsapp.test.ts` (4/4 PASS)
    - `tests/unit/midtrans-webhook.test.ts` (3/3 PASS)
    - `tests/unit/permissions.test.ts` (17/17 PASS)
    - `tests/unit/audit.test.ts` (2/2 PASS)
    - `tests/unit/auth.test.ts` (7/7 PASS)
    - `tests/unit/shipping-rajaongkir.test.ts` (3/3 PASS)
    - `tests/unit/order-routing.test.ts` (2/2 PASS)
  - `test:rbac` (1 berkas, 120/120 PASS):
    - `tests/rbac/matrix.test.ts` (120/120 PASS)
  - `test:integration` (7 berkas, 19/19 PASS):
    - `tests/integration/admin-notification.test.ts` (2/2 PASS): Notifikasi bukti transfer & pesanan terisolasi antar-wilayah
    - `tests/integration/admin-actions.test.ts` (5/5 PASS): Penolakan Admin Wilayah terhadap cabang lain (403), validasi resi wajib sebelum DIKIRIM (400), proteksi batas diskon promo regional (400)
    - `tests/integration/cost-price-masking.test.ts` (3/3 PASS)
    - `tests/integration/region-isolation.test.ts` (5/5 PASS)
    - `tests/integration/account-deactivation.test.ts` (2/2 PASS)
    - `tests/integration/order-expiry.test.ts` (1/1 PASS)
    - `tests/integration/stock-concurrency.test.ts` (1/1 PASS)
  - `test:e2e:buyer` (10 berkas, 11/11 PASS): E2E-01..07, E2E-13..15
  - `test:e2e:admin` (2 berkas, 5/5 PASS):
    - `tests/e2e/admin/e2e-08-price-uniformity.spec.ts` (PASS): Perubahan harga jual seragam di semua wilayah
    - `tests/e2e/admin/e2e-09-admin-isolation.spec.ts` (4 tests, PASS):
      1. Admin Wilayah Yogyakarta ditolak (403) saat mengakses detail pesanan Pusat
      2. Daftar pesanan Admin Wilayah secara otomatis memfilter HANYA pesanan wilayahnya
      3. Admin Wilayah ditolak (403) saat mencoba mengubah harga jual seragam
      4. Respons API produk untuk Admin tidak pernah membocorkan harga modal (HPP)
- **Kompilasi TypeScript (`tsc --noEmit`)**: 0 error.
- **ESLint (`npm run lint`)**: 0 error.
- **Next.js Production Build (`npm run build`)**: 50/50 rute sukses dibuat.
- **Demo Siap Demo**:
  - `npm run demo:seed`: Mengisi data demo realistis & mencetak kredensial 4 peran acak sekali pakai.
  - `docs/DEMO_GUIDE.md`: Skenario demo berbahasa bisnis langkah demi langkah untuk Pak Dimas & Wann.

---

## Ringkasan Hasil Uji Fase 2: Sisi Pembeli (194 PASS / 0 FAIL)
- **Gerbang `test:phase2` (Kumulatif)**:
  - `test:unit` (9 berkas, 51/51 PASS):
    - `tests/unit/db-guard.test.ts` (6/6 PASS)
    - `tests/unit/pricing.test.ts` (7/7 PASS)
    - `tests/unit/whatsapp.test.ts` (4/4 PASS)
    - `tests/unit/midtrans-webhook.test.ts` (3/3 PASS)
    - `tests/unit/permissions.test.ts` (17/17 PASS)
    - `tests/unit/audit.test.ts` (2/2 PASS)
    - `tests/unit/auth.test.ts` (7/7 PASS)
    - `tests/unit/shipping-rajaongkir.test.ts` (3/3 PASS)
    - `tests/unit/order-routing.test.ts` (2/2 PASS)
  - `test:rbac` (1 berkas, 120/120 PASS):
    - `tests/rbac/matrix.test.ts` (120/120 PASS)
  - `test:integration` (5 berkas, 12/12 PASS):
    - `tests/integration/cost-price-masking.test.ts` (3/3 PASS)
    - `tests/integration/region-isolation.test.ts` (5/5 PASS)
    - `tests/integration/account-deactivation.test.ts` (2/2 PASS)
    - `tests/integration/order-expiry.test.ts` (1/1 PASS): Cron job melepas reserved stock dan promo quota
    - `tests/integration/stock-concurrency.test.ts` (1/1 PASS): Uji 30 request konkuren memperebutkan 5 stok fisik terakhir (tepat 5 berhasil, 25 ditolak anti-oversell)
  - `test:e2e:buyer` (10 berkas, 11/11 PASS):
    - `e2e-01-checkout-midtrans.spec.ts` (PASS): Checkout sampai settlement otomatis Midtrans
    - `e2e-02-manual-transfer.spec.ts` (PASS): Transfer 2 rekening asli (BSI & Jago Syariah) -> unggah bukti
    - `e2e-03-proof-reupload.spec.ts` (PASS): Unggah ulang bukti transfer baru
    - `e2e-04-region-routing.spec.ts` (PASS): DIY -> Yogyakarta, Non-DIY -> Pusat
    - `e2e-05-stock-fallback.spec.ts` (PASS): Stok Jogja habis -> otomatis fallback ke Pusat
    - `e2e-06-promo-validation.spec.ts` (PASS): Validasi promo reseller & wilayah
    - `e2e-07-order-expiration.spec.ts` (PASS): Order tidak dibayar 24 jam kedaluwarsa & stok dilepas
    - `e2e-13-address-combobox.spec.ts` (2 tests, PASS): Form cascading & quick search autocomplete 400ms
    - `e2e-14-shipping-fallback.spec.ts` (PASS): Graceful handling error RajaOngkir tanpa crash
    - `e2e-15-order-tracking.spec.ts` (PASS): Lacak pesanan via kode pesanan + 4 digit terakhir nomor WA
- **Kompilasi TypeScript (`tsc --noEmit`)**: 0 error.
- **ESLint (`npm run lint`)**: 0 error.
- **Next.js Production Build (`npm run build`)**: 36/36 rute sukses dibuat.

---

## Daftar Placeholder Aktif
- **Origin ID RajaOngkir Gudang Pusat**: ID `115` (Kota Depok, Jawa Barat).
- **Origin ID RajaOngkir Gudang Yogyakarta**: ID `501` (Kota Yogyakarta, DI Yogyakarta).
- **Alamat Gudang**: Placeholder alamat di Kota Depok & Kota Yogyakarta.
- **Berat Varian Default**: 35 gram per varian (dapat diubah admin per varian).
- **Kontak Toko**: Nomor WA placeholder `081234567890` & email `kontak@luvira.id`.
