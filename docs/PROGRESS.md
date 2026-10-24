# LUVIRA 2.0: Pelacakan Kemajuan Proyek (PROGRESS.md)

| Fase | Deskripsi | Status | Commit / Tag | Gerbang Tes | Catatan & Placeholder |
|---|---|---|---|---|---|
| **0. Pre-2.0 Cleanup** | Pembersihan kode lama, inventaris, snapshot 9 tabel Neon | **DONE** | `pre-cleanup-backup`, `ffe837c` | lint, tsc, build hijau, 10/10 test pass | MySQL dibatalkan, PostgreSQL tetap |
| **1. Fondasi** | Skema 2.0, 5 Peran, RBAC `permissions.ts`, Auth, Audit Log, Seed, Isolasi Wilayah | **GREEN** | `phase-1-green` | `test:phase1` (172/172 PASS), tsc, lint, build hijau | Skema 2.0 migrasi & seed sukses di dev & test DB |
| **2. Sisi Pembeli** | Katalog, Alamat Bertingkat, Ongkir RajaOngkir (Adapter), Checkout, Midtrans & Manual, Tracking | **GREEN** | `phase-2-green` | `test:phase2` (194/194 PASS), tsc, lint, build (36/36) | Alamat cascading, anti-oversell 30 request, Midtrans mock & 2 rekening asli |
| **3. Sisi Admin** | Dashboard Admin Pusat & Wilayah, Pesanan, Resi, Stok, Promo, Isolasi Wilayah | **IN PROGRESS** | - | `test:phase3` (+ admin E2E) | Siapkan demo seed & demo guide sebelum Fase 4 |
| **4. Dashboard Owner** | KPI, Laba Kotor, HPP historis OrderItem, Rekap, Cetak/Export PDF/Excel, Pengaturan | **PENDING** | - | `test:phase4` (+ owner E2E) | - |
| **5. Observabilitas** | Dashboard Developer, Health ping, Antrean macet, ErrorLog, Audit Log | **PENDING** | - | `test:phase5` (+ dev E2E) | - |
| **Testing Menyeluruh** | QA skeptis, uji keamanan, uji konkurensi, batas laju, laporan akhir | **PENDING** | - | `test:all` & `verify` | Menghasilkan `docs/TEST_REPORT.md` |

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
