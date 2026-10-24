# LUVIRA 2.0: Matriks Pengujian (TEST_MATRIX.md)

Matriks ini memetakan setiap tes ke fase pengembangan, sisi pengguna (Pembeli, Admin, Owner, Developer), jenis tes, serta fitur terkait di dalam `docs/LUVIRA_2_PLAN.md`.

---

## 1. Pemetaan Pengujian per Fase

| ID Tes | Fase | Sisi | Jenis | Berkas Tes | Fitur Terkait di Plan |
|---|---|---|---|---|---|
| **UNIT-GUARD** | Fase 1 | Sistem | Unit | `tests/unit/db-guard.test.ts` | Aturan Keras Database (Dev, Test, Prod safety) |
| **UNIT-PERM** | Fase 1 | Semua Peran | Unit | `tests/unit/permissions.test.ts` | Bagian 4: Matriks izin 5 peran (`can(user, perm, resource)`) |
| **UNIT-AUDIT** | Fase 1 | Semua Peran | Unit | `tests/unit/audit.test.ts` | Bagian 4 & 7: Audit log append-only |
| **UNIT-AUTH** | Fase 1 | Semua Peran | Unit | `tests/unit/auth.test.ts` | Bagian 6: Password hash, JWT session, lockout, non-aktif |
| **RBAC-MATRIX** | Fase 1 | Semua Peran | RBAC | `tests/rbac/matrix.test.ts` | Bagian 4: Pengujian seluruh endpoint API terhadap 5 peran + unauthenticated |
| **INT-REGION** | Fase 1 | Admin Wilayah | Integrasi | `tests/integration/region-isolation.test.ts` | Bagian 4 & 5.2: Admin Wilayah A dilarang akses wilayah B |
| **INT-HPP** | Fase 1 | Admin | Integrasi | `tests/integration/cost-price-masking.test.ts` | Bagian 4: Kolom harga modal (`ProductCost`) dilarang bocor ke Admin/Publik |
| **INT-DEACT** | Fase 1 | Semua Peran | Integrasi | `tests/integration/account-deactivation.test.ts` | Bagian 4: Akun non-aktif ditolak login |
| **UNIT-PRICE** | Fase 2 | Pembeli | Unit | `tests/unit/pricing.test.ts` | Bagian 5.2 & 13: Subtotal, diskon, PPN 11% dari net, ongkir, koreksi manipulasi klien |
| **UNIT-MIDTRANS** | Fase 2 | Pembeli | Unit | `tests/unit/midtrans-webhook.test.ts` | Bagian 5.3: Signature verification, status mapping, idempotency |
| **UNIT-ROUTING** | Fase 2 | Pembeli | Unit | `tests/unit/order-routing.test.ts` | Bagian 5.2: Routing pesanan ke wilayah terdekat / fallback Pusat |
| **UNIT-WA** | Fase 2 | Pembeli | Unit | `tests/unit/whatsapp.test.ts` | Bagian 9 & 13: Normalisasi nomor WhatsApp (`62...`) |
| **INT-STOCK** | Fase 2 | Pembeli | Integrasi | `tests/integration/stock-concurrency.test.ts` | Bagian 5.2 & 13: Atomic reservation, anti-overselling |
| **INT-EXPIRY** | Fase 2 | Pembeli | Integrasi | `tests/integration/order-expiry.test.ts` | Bagian 5.3: Cron job pelepasan stok pesanan kedaluwarsa 24 jam |
| **E2E-01** | Fase 2 | Pembeli | E2E | `tests/e2e/buyer/e2e-01-checkout-midtrans.spec.ts` | Checkout katalog sampai Snap Midtrans mock -> status diproses |
| **E2E-02** | Fase 2 | Pembeli | E2E | `tests/e2e/buyer/e2e-02-manual-transfer.spec.ts` | Transfer manual 2 rekening asli -> unggah bukti |
| **E2E-03** | Fase 2 | Pembeli | E2E | `tests/e2e/buyer/e2e-03-proof-reupload.spec.ts` | Bukti ditolak admin -> pembeli unggah ulang |
| **E2E-04** | Fase 2 | Pembeli | E2E | `tests/e2e/buyer/e2e-04-region-routing.spec.ts` | Alamat DIY diarahkan ke Yogyakarta, luar DIY ke Pusat |
| **E2E-05** | Fase 2 | Pembeli | E2E | `tests/e2e/buyer/e2e-05-stock-fallback.spec.ts` | Stok regional habis -> otomatis dialihkan ke Pusat |
| **E2E-06** | Fase 2 | Pembeli | E2E | `tests/e2e/buyer/e2e-06-promo-validation.spec.ts` | Kode promo reseller & wilayah (valid, expired, limit, out of region) |
| **E2E-07** | Fase 2 | Pembeli | E2E | `tests/e2e/buyer/e2e-07-order-expiration.spec.ts` | Pesanan tidak dibayar 24 jam -> kedaluwarsa & stok dilepas |
| **E2E-13** | Fase 2 | Pembeli | E2E | `tests/e2e/buyer/e2e-13-address-combobox.spec.ts` | Cascading combobox alamat, cari cepat, validasi keyboard |
| **E2E-14** | Fase 2 | Pembeli | E2E | `tests/e2e/buyer/e2e-14-shipping-fallback.spec.ts` | Error/kuota habis RajaOngkir -> pesan ramah tanpa crash |
| **E2E-15** | Fase 2 | Pembeli | E2E | `tests/e2e/buyer/e2e-15-order-tracking.spec.ts` | Lacak pesanan via Order Code + 4 digit terakhir WhatsApp |
| **INT-NOTIF** | Fase 3 | Admin | Integrasi | `tests/integration/admin-notification.test.ts` | Bagian 8.4: Notifikasi pesanan baru masuk ke admin wilayah yang tepat |
| **E2E-08** | Fase 3 | Admin Pusat | E2E | `tests/e2e/admin/e2e-08-price-uniformity.spec.ts` | Admin Pusat ubah harga jual -> seragam di seluruh wilayah |
| **E2E-09** | Fase 3 | Admin Wil | E2E | `tests/e2e/admin/e2e-09-admin-isolation.spec.ts` | Admin Wilayah mencoba akses data wilayah lain -> ditolak 403 |
| **UNIT-OWNER** | Fase 4 | Owner | Unit | `tests/unit/owner-reports.test.ts` | Bagian 13: Agregasi KPI laba, HPP historis, PPN vs hitung manual fixture |
| **E2E-10** | Fase 4 | Owner | E2E | `tests/e2e/owner/e2e-10-admin-management.spec.ts` | Owner kelola admin wilayah, cakupan layanan, non-aktifkan akun |
| **E2E-11** | Fase 4 | Owner | E2E | `tests/e2e/owner/e2e-11-report-export.spec.ts` | Owner cetak/unduh laporan PDF dan Excel (.xlsx) |
| **INT-DEV** | Fase 5 | Developer | Integrasi | `tests/integration/developer-health.test.ts` | Bagian 11 & 13: Indikator bereaksi terhadap simulasi kerusakan sistem |
| **E2E-12** | Fase 5 | Developer | E2E | `tests/e2e/developer/e2e-12-observability.spec.ts` | Developer buka dashboard kesehatan; ditolak mengubah data bisnis |
| **INT-QA** | QA | Sistem | Integrasi | `tests/integration/comprehensive-qa.test.ts` | Anti-tampering, konsistensi matematis, upload security, webhook signature |

---

## 2. Gerbang Otomatis Kumulatif

1. **Fase 1 (Fondasi)**: `test:unit` (permissions, auth, audit, guard) + `test:rbac` + `test:integration` (region, hpp, deact).
2. **Fase 2 (Pembeli)**: Gerbang Fase 1 + `test:e2e:buyer` + unit pricing, routing, WA.
3. **Fase 3 (Admin)**: Gerbang Fase 2 + `test:e2e:admin` + integrasi notifikasi & isolasi.
4. **Fase 4 (Owner)**: Gerbang Fase 3 + `test:e2e:owner` + agregasi laporan manual fixture.
5. **Fase 5 (Developer)**: Gerbang Fase 4 + `test:e2e:developer` + indikator kesehatan kerusakan buatan.
6. **Testing Menyeluruh**: `test:all` & `verify` (lint, tsc, build, full suite).
