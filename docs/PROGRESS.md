# LUVIRA 2.0: Pelacakan Kemajuan Proyek (PROGRESS.md)

| Fase | Deskripsi | Status | Commit / Tag | Gerbang Tes | Catatan & Placeholder |
|---|---|---|---|---|---|
| **0. Pre-2.0 Cleanup** | Pembersihan kode lama, inventaris, snapshot 9 tabel Neon | **DONE** | `pre-cleanup-backup`, `ffe837c` | lint, tsc, build hijau, 10/10 test pass | MySQL dibatalkan, PostgreSQL tetap |
| **1. Fondasi** | Skema 2.0, 5 Peran, RBAC `permissions.ts`, Auth, Audit Log, Seed, Isolasi Wilayah | **GREEN** | `phase-1-green` | `test:phase1` (172/172 PASS), tsc, lint, build hijau | Skema 2.0 migrasi & seed sukses di dev & test DB |
| **2. Sisi Pembeli** | Katalog, Alamat Bertingkat, Ongkir RajaOngkir (Adapter), Checkout, Midtrans & Manual, Tracking | **IN PROGRESS** | - | `test:phase2` (+ buyer E2E) | Mulai membangun adapter mock/live & UI pembeli |
| **3. Sisi Admin** | Dashboard Admin Pusat & Wilayah, Pesanan, Resi, Stok, Promo, Isolasi Wilayah | **PENDING** | - | `test:phase3` (+ admin E2E) | Siapkan demo seed & demo guide sebelum Fase 4 |
| **4. Dashboard Owner** | KPI, Laba Kotor, HPP historis OrderItem, Rekap, Cetak/Export PDF/Excel, Pengaturan | **PENDING** | - | `test:phase4` (+ owner E2E) | - |
| **5. Observabilitas** | Dashboard Developer, Health ping, Antrean macet, ErrorLog, Audit Log | **PENDING** | - | `test:phase5` (+ dev E2E) | - |
| **Testing Menyeluruh** | QA skeptis, uji keamanan, uji konkurensi, batas laju, laporan akhir | **PENDING** | - | `test:all` & `verify` | Menghasilkan `docs/TEST_REPORT.md` |

---

## Ringkasan Hasil Uji Fase 1
- **Gerbang `test:phase1`**:
  - `test:unit`: 6 berkas, 42 skenario (PASS)
    - `tests/unit/db-guard.test.ts`: Proteksi dev/test/prod host (6/6 PASS)
    - `tests/unit/permissions.test.ts`: Matriks wewenang 5 peran & masking HPP (17/17 PASS)
    - `tests/unit/auth.test.ts`: JWT session, lockout, inactive accounts (7/7 PASS)
    - `tests/unit/audit.test.ts`: Append-only audit logger (2/2 PASS)
    - `tests/unit/pricing.test.ts`: Kalkulasi harga & diskon server (7/7 PASS)
    - `tests/unit/midtrans-webhook.test.ts`: Signature & idempotency (3/3 PASS)
  - `test:rbac`: 1 berkas, 120 skenario endpoint x peran (120/120 PASS)
  - `test:integration`: 3 berkas, 10 skenario (PASS)
    - `tests/integration/region-isolation.test.ts`: Isolasi Admin Wilayah (5/5 PASS)
    - `tests/integration/cost-price-masking.test.ts`: Proteksi HPP ProductCost (3/3 PASS)
    - `tests/integration/account-deactivation.test.ts`: Penolakan akun nonaktif (2/2 PASS)
  - **Total Uji Fase 1**: 172 PASS, 0 FAIL.
  - **Kompilasi TypeScript (`tsc --noEmit`)**: 0 error.
  - **ESLint (`npm run lint`)**: 0 error.
  - **Next.js Production Build (`npm run build`)**: 30/30 rute sukses dibuat.

---

## Daftar Placeholder Aktif
- **Origin ID RajaOngkir Gudang Pusat**: ID `115` (Kota Depok, Jawa Barat).
- **Origin ID RajaOngkir Gudang Yogyakarta**: ID `501` (Kota Yogyakarta, DI Yogyakarta).
- **Alamat Gudang**: Placeholder alamat di Kota Depok & Kota Yogyakarta.
- **Berat Varian Default**: 35 gram per varian.
- **Kontak Toko**: Nomor WA placeholder `081234567890` & email `kontak@luvira.id`.
