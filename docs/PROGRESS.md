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
| **FT-0: Reseller & Skema** | Peran ke-6 (RESELLER), RBAC 6 Peran, Skema COD/Promo Uji/Outbox/Sheets, API Kelola Reseller | **GREEN** | `ft-0-green` | `test:unit` (78/78), `test:rbac` (217/217), `test:integration` (49/49) | tsc, lint, build hijau (59 rute) |
| **FT-1: Fonnte WhatsApp** | Gateway WhatsApp Fonnte, Antrean WaOutbox, Cron Dispatch, Consent Checkout, Template | **GREEN** | `ft-1-green` | Unit adapter (15/15), Queue (8/8), E2E Buyer | tsc, lint, build hijau (61 rute) |
| **FT-2: COD Admin/Reseller** | Pesanan Manual COD (Ongkir 0 dipaksa), Alur Serah Terima -> Kas Diterima, Laporan Pendapatan | **GREEN** | `ft-2-green` | Pricing unit (3/3), COD integration (11/11), E2E Admin/Reseller (5/5) | Asumsi F1-F3, F7 terpenuhi |
| **FT-3: Promo Uji & Kurir Wilayah** | Kontrol Kurir per Wilayah (Admin Pusat), Promo kind=TESTING (Owner only), Bypass Midtrans, QR Simulasi & Bayar Cepat, Reset Data Uji | **GREEN** | `ft-3-green` | `test-promos` (8/8), `region-couriers` (7/7), E2E Screenshot (4/4) | Asumsi F5 |
| **FT-4: Dashboard Reseller** | /dashboard/reseller mobile-first, 4 State, Pesanan Disamarkan (F4), Promo Saya, Buat COD, Dual Promo Slots | **GREEN** | `ft-4-green` | Unit masking (10/10), Dual promo integration (6/6), Reseller isolation (20/20), E2E Reseller (3/3) | Asumsi F4, F7 terpenuhi |
| **FT-5: Google Sheets** | Ekspor & Cermin 1-Arah Google Sheets, Scope Global/Region/Reseller, Tombol Sync & UI | **GREEN** | `ft-5-green` | `test:unit` (11/11), `test:integration` (5/5), E2E UI (2/2) | Asumsi F6 |
| **FT-6: Laporan WhatsApp** | Berlangganan Laporan WA, Cron Digest Harian/Mingguan, Tokenized Short-Lived Link (15m) | **GREEN** | `ft-6-green` | `test:unit` (10/10), `test:integration` (4/4), `test:e2e` (2/2) | Asumsi F4, F5, F9 |

---


## Ringkasan Eksekusi FT-6: Laporan Terjadwal ke WhatsApp (Green)
- **Status Akhir**: Selesai dan Lolos Semua Gerbang FT-6.
- **Rincian Implementasi**:
  1. **Model Langganan Laporan (`ReportSubscription`)**:
     - Pengaturan frekuensi (`RINGKAS_HARIAN`, `MINGGUAN`, `BULANAN`), jam pengiriman WIB (`timeOfDay`), hari dalam seminggu (`dayOfWeek`), dan hari dalam sebulan (`dayOfMonth`).
     - Normalisasi nomor target WhatsApp otomatis dengan awalan `62...`.
  2. **Isolasi Data Ketat di Tingkat Server (`lib/reports/wa-report-generator.ts`)**:
     - **Asumsi F5**: Pesanan uji (`isTest: true`) mutlak dikeluarkan dari seluruh laporan keuangan, pesanan, dan rekap produk.
     - **Owner**: Ringkasan omzet kotor, omzet bersih, HPP total, laba kotor, rincian pesanan per metode bayar (termasuk COD selesai vs COD pending kas), top 3 produk terlaris, dan kuota Fonnte harian.
     - **Admin Wilayah**: Ringkasan operasional wilayah (selesai, diproses, dikirim, pending bayar, pending COD kas, stok menipis), **MUTLAK TANPA HPP & LABA KOTOR**.
     - **Reseller (Asumsi F4)**: Ringkasan pemakaian kode promo dan pesanan COD buatannya sendiri, **MUTLAK TANPA HPP, TANPA STOK GUDANG, DAN IDENTITAS PELANGGAN DISAMARKAN (`B*** S***`, `••••1234`)**.
  3. **Penanganan Lampiran Bertoken Singkat 15 Menit (Asumsi F9)**:
     - Token kriptografis berumur 15 menit (`lib/reports/report-token.ts`) disajikan streaming via `/api/reports/dl/[token]`.
     - Tautan otomatis invalid/hangus setelah satu kali unduh atau setelah 15 menit berlalu.
  4. **Mesin Penjadwalan & Idempotensi Cron (`lib/reports/report-scheduler.ts` & `/api/cron/reports`)**:
     - Route `/api/cron/reports` dilindungi `CRON_SECRET`, dipanggil berkala (hPanel Cron Jobs tiap 10 menit).
     - Menghitung waktu jatuh tempo di zona waktu WIB (`Asia/Jakarta`).
     - Kunci idempoten harian/mingguan/bulanan (`SUB_<id>_<periodKey>`) memastikan tidak ada pengiriman ganda pada periode yang sama.
  5. **Antarmuka Pengguna (`components/reports/WaReportSubscriptionCard.tsx`)**:
     - Tampilan kartu elegan bertema hijau tua Luvira (`#14532d`) terintegrasi pada:
       - Dashboard Owner (`/dashboard/owner` Tab Finansial & HPP).
       - Dashboard Admin (`/dashboard/admin` Tab Google Spreadsheet & Laporan).
       - Dashboard Reseller (`/dashboard/reseller` Modal Laporan WhatsApp Pribadi).
     - Tombol "Kirim Sekarang" untuk pengujian instan ke nomor WhatsApp pengguna.
- **Hasil Pengujian & Verifikasi**:
  - Unit Tests: `tests/unit/wa-reports-scheduler.test.ts` (10/10 PASS).
  - Integration Tests: `tests/integration/wa-reports-integration.test.ts` (4/4 PASS).
  - Playwright E2E: `tests/e2e/reports/e2e-wa-reports.spec.ts` (2/2 PASS).
  - Bukti Visual Screenshot Tersimpan:
    1. `screenshot_wa_report_subscription_owner.png`
    2. `screenshot_wa_report_reseller_modal.png`
  - Pemeriksaan Kode: `tsc --noEmit` (0 error), `npm run lint` (0 error).

---

## Ringkasan Eksekusi FT-5: Integrasi Cermin Satu Arah Google Sheets (Green)
- **Status Akhir**: Selesai dan Lolos Semua Gerbang FT-5.
- **Rincian Implementasi**:
  1. **Adapter Google Sheets Resmi & Mock Store (`lib/integrations/sheets.ts`)**:
     - Mode `SHEETS_MODE=mock|google` menggunakan pustaka `googleapis` v4 dengan JWT Service Account.
     - Penanganan karakter `\n` pada `GOOGLE_PRIVATE_KEY` lingkungan server secara aman.
     - Ekstraksi ID spreadsheet otomatis dari format tautan maupun ID mentah alfanumerik.
     - Mode mock in-memory untuk memastikan tes berjalan 100% deterministik tanpa kredensial live.
  2. **Pembangun Data Tab Terisolasi di SERVER (`lib/integrations/sheets-builder.ts`)**:
     - **Asumsi F5**: Pesanan uji (`isTest: true`) mutlak dikeluarkan dari semua tab lembar kerja.
     - **Format Waktu WIB**: Baris 1 seluruh tab memuat `Terakhir disinkronkan: <waktu WIB>` untuk kepastian kesegaran data.
     - **Data Masking (Asumsi F4)**: Seluruh nama pelanggan disamarkan menjadi `B*** S***` dan nomor telepon menjadi `••••1234`.
     - **Cakupan GLOBAL (Owner)**: 6 tab lengkap (`Ringkasan Bisnis`, `Daftar Pesanan`, `Penjualan Per Produk`, `Kontribusi Wilayah`, `Promo dan Reseller`, `Stok Gudang`) memuat data HPP, kemasan, dan laba kotor.
     - **Cakupan REGION (Admin Wilayah)**: 2 tab (`Pesanan <Wilayah>`, `Stok <Wilayah>`), MUTLAK TANPA HPP/modal/laba kotor dan terisolasi pada wilayah gudangnya.
     - **Cakupan RESELLER**: 2 tab (`Ringkasan Reseller`, `Pesanan Saya`), MUTLAK TANPA HPP, TANPA stok gudang, dan TANPA alamat detail pelanggan.
  3. **Prinsip Cermin Satu Arah & Idempotensi (Asumsi F6)**:
     - Proses sinkronisasi melakukan pembersihan rentang tab (`values.clear`) sebelum penulisan batch (`values.batchUpdate`), memastikan tidak ada duplikasi data atau baris ganda saat sinkronisasi ulang.
  4. **API Endpoints & Cron Scheduler**:
     - `GET /api/sheets/connection`: Mengambil status koneksi berdasarkan peran dan mengembalikan email Service Account.
     - `POST /api/sheets/connect`: Memvalidasi tautan, menguji akses Editor Service Account, meng-upsert data koneksi di DB dev, dan menjalankan sinkronisasi perdana secara otomatis.
     - `POST /api/sheets/sync`: Menjalankan sinkronisasi manual saat tombol diklik.
     - `POST /api/sheets/disconnect`: Memutuskan sambungan lembar kerja dan mencatat audit trail.
     - `GET / POST /api/cron/sheets-sync`: Dilindungi `CRON_SECRET`, memproses semua koneksi dengan status `autoSync: true` secara terjadwal.
  5. **Antarmuka Pengguna (`components/reports/GoogleSheetsCard.tsx`)**:
     - Kartu responsif bertema dark green `#14532d` yang menampilkan:
       - Badge email Service Account dengan tombol salin 1-klik dan panduan pemberian izin Editor.
       - Banner peringatan cermin satu arah (peringatan penimpaan tab).
       - Input tautan Google Sheets & saklar sinkronisasi otomatis harian.
       - Status badge `Terhubung & Sinkron`, timestamp sinkronisasi terakhir, tautan langsung lembar kerja, dan tombol "Sinkronkan Sekarang".
     - Terintegrasi di:
       - Dashboard Owner (`/dashboard/owner` Tab Finansial & HPP).
       - Dashboard Admin (`/dashboard/admin` Tab Google Spreadsheet).
       - Dashboard Reseller (`/dashboard/reseller` Modal Cermin Spreadsheet Pribadi).
- **Hasil Pengujian & Verifikasi**:
  - Unit Tests: `tests/unit/sheets-builder.test.ts` (11/11 PASS).
  - Integration Tests: `tests/integration/sheets-integration.test.ts` (5/5 PASS).
  - Playwright E2E: `tests/e2e/sheets/e2e-sheets-sync.spec.ts` (2/2 PASS).
  - Bukti Visual Screenshot Tersimpan:
    1. `screenshot_sheets_connection_owner.png`
    2. `screenshot_sheets_connection_reseller.png`
  - Pemeriksaan Kode: `tsc --noEmit` (0 error), `npm run lint` (0 error), `npm run build` (18 halaman statis & 50 dynamic API routes hijau).

---


## Ringkasan Eksekusi Dual Promo Slots & FT-4: Dashboard Reseller (Green)
- **Status Akhir**: Selesai dan Lolos Semua Gerbang FT-4 & Dual Promo Slots.
- **Rincian Implementasi Dual Promo Code Slots (Slot 1 & Slot 2)**:
  1. **Skema Database & Prisma**:
     - Kolom baru pada model `Order`: `secondPromoCodeId String?` dan relasi bernama `secondPromoCode PromoCode? @relation("OrderSecondaryPromoCode")`, indeks `@@index([secondPromoCodeId])`.
     - Relasi `PromoCode`: relasi ganda `orders Order[] @relation("OrderPrimaryPromoCode")` dan `secondaryOrders Order[] @relation("OrderSecondaryPromoCode")`.
     - Sinkronisasi dev DB via `prisma db push` aman tanpa menyentuh database produksi.
  2. **Engine Kalkulasi Harga Server (Server-Side Pricing Engine)**:
     - `lib/pricing.ts`: Fungsi murni `calculatePricingPure` dan `calculateOrderPricing` kini menerima `promo` (Slot 1: Reseller / Utama) dan `secondPromo` (Slot 2: Voucher Tambahan).
     - Menghitung diskon gabungan (`discountAmount = promo1 + promo2`), batas cap maksimum tidak boleh melebihi subtotal produk, dan menggabungkan fasilitas `isFreeShipping` serta `isFreeTax` jika salah satu atau kedua promo menyediakannya.
     - Anti-duplikasi di level server: kode promo yang identik di kedua slot otomatis disaring dan ditolak.
  3. **Alur Pembuatan Pesanan & Tracking Kuota**:
     - `lib/orders/order-routing.ts` & `lib/orders/manual-cod.ts`: Menerima `secondPromoCode`, memvalidasi tanggal kedaluwarsa, kuota, dan izin wilayah masing-masing slot.
     - Transaksi database atomik menambah `usedCount` (+1) untuk kedua kode promo yang diterapkan.
     - Jika pesanan dibatalkan atau kedaluwarsa (`app/api/admin/orders/[id]/status`, `app/api/cron/expire-orders`, `app/api/midtrans/notification`), kuota (`usedCount`) kedua kode promo dikembalikan (-1) secara otomatis.
  4. **Formulir Pesanan Manual COD**:
     - `CreateManualOrderForm.tsx` dilengkapi input Slot 1 ("Kode Promo Utama / Reseller") dan Slot 2 ("Kode Promo Tambahan / Voucher Diskon").
     - Validasi real-time dan kalkulasi gabungan instan sebelum submit.
  5. **Laporan & Analitik Owner**:
     - `lib/reports/owner-reports.ts`, `app/api/owner/reports`, `app/api/owner/analytics`: Menyertakan `secondPromoCode` dan menampilkan kode gabungan (cth: `PROMO-A + PROMO-B`).
     - Fungsi `calculatePromoUsage` menghitung pemakaian kedua promo secara proporsional.

- **Rincian Implementasi FT-4: Dashboard Reseller (`/dashboard/reseller`)**:
  1. **Engine Privasi & Data Masking (Asumsi F4)** (`lib/reseller/masking.ts`):
     - Nama pelanggan disamarkan menjadi format `B*** S***` (`maskCustomerName`).
     - Nomor WhatsApp hanya menampilkan 4 digit terakhir diawali peluru `••••1234` (`maskPhoneNumber`).
     - Sanitasi mendalam (`sanitizeOrderForReseller`): menghapus street address, RT/RW, dan postal code (hanya menyisakan kota/provinsi).
     - Penghapusan mutlak data HPP (`costPrice`, `costEach`, `packingEach`, dan relasi modal varian) sehingga tidak ada kebocoran rahasia bisnis ke reseller.
  2. **API Endpoint Reseller**:
     - `GET /api/reseller/analytics`: Filter periode (Hari Ini, 7 Hari, 30 Hari, Bulan Ini, Kustom), omzet kotor, omzet bersih, total diskon yang dihasilkan kodenya, dan tren penjualan harian. Pesanan uji (`isTest: true`) mutlak dikeluarkan (Asumsi F5).
     - `GET /api/reseller/orders`: Daftar pesanan yang menggunakan kode promo reseller tersebut atau pesanan manual COD buatannya sendiri, dengan masking privasi penuh dan tanpa HPP.
     - `GET /api/reseller/promos`: Daftar kode promo yang ditautkan ke reseller (hanya-baca) beserta sisa kuota dan status aktif.
     - `GET / PUT /api/reseller/profile`: Menampilkan profil, memperbarui nomor WhatsApp dengan normalisasi `62...`, serta tombol kirim pesan uji coba WhatsApp verifikasi (`enqueueWhatsAppNotification`).
     - `POST /api/auth/change-password`: Penggantian kata sandi mandiri secara aman.
  3. **Otorisasi Server Ketat**:
     - Reseller mencoba mengakses pesanan reseller lain -> HTTP 403 Forbidden.
     - Reseller mencoba memanggil `/api/admin/stock` -> HTTP 403 Forbidden.
     - Reseller mencoba memanggil `/api/owner/cost-prices` -> HTTP 403 Forbidden.
  4. **Notifikasi Otomatis**:
     - Saat pesanan dengan kode promo reseller berstatus `SELESAI`, notifikasi in-app otomatis dikirim ke reseller (`Notification`) dan pesan WhatsApp otomatis dikirim jika nomor HP reseller terdaftar.
  5. **Antarmuka Mobile-First (`components/reseller/ResellerDashboardClient.tsx`)**:
     - 4 State UI: Loading, Error (dengan tombol muat ulang), Empty (dengan CTA buat COD), dan Populated data.
     - Filter periode interaktif dan kartu ringkasan kinerjanya.
     - Grafik batang tren harian responsif.
     - Daftar "Kode Promo Saya" dengan visual progress bar pemakaian kuota.
     - Tabel / card "Pesanan Saya" dengan badge status dan nama pelanggan tersamar.
     - Tombol Aksi Cepat: Buat COD (`/dashboard/reseller/orders/manual`), Unduh Data (FT-5 placeholder), Laporan WA (FT-6 placeholder), dan Profil & Sandi.

- **Hasil Pengujian & Verifikasi**:
  - Unit Masking: `tests/unit/reseller-masking.test.ts` (10/10 PASS).
  - Integrasi Dual Promo: `tests/integration/dual-promos.test.ts` (6/6 PASS).
  - Integrasi Isolasi & Otorisasi Reseller: `tests/integration/reseller-dashboard.test.ts` (8/8 PASS) & `reseller-isolation.test.ts` (12/12 PASS).
  - Playwright E2E Visual: `tests/e2e/reseller/e2e-reseller-dashboard.spec.ts` (3/3 PASS).
  - Bukti Visual Screenshot Tersimpan:
    1. `screenshot_reseller_dashboard_desktop.png`
    2. `screenshot_reseller_dashboard_mobile.png`
    3. `screenshot_reseller_manual_cod_dual_promo.png`
  - Pemeriksaan Kode: `tsc --noEmit` (0 error), `npm run lint` (0 error), `npm run build` (18 halaman statis & 45 dynamic API routes hijau).

---

## Ringkasan Eksekusi FT-3: Kontrol Kurir per Wilayah & Kode Promo Uji (Green)
- **Status Akhir**: Selesai dan Lolos Semua Gerbang FT-3.
- **Rincian Implementasi**:
  1. **Kontrol Kurir Ekspedisi per Wilayah Gudang (Admin Pusat)**:
     - Penambahan kolom `activeCouriers String[] @default(["jne", "sicepat", "jnt"])` pada model `Region`.
     - Sinkronisasi dev DB via `prisma db push` aman tanpa menyentuh database produksi.
     - API `PUT /api/admin/locations`: Admin Pusat dapat mengaktifkan / menonaktifkan kurir (J&T, JNE, SiCepat) per wilayah secara dinamis dengan validasi minimal 1 kurir aktif dan audit log lengkap.
     - API Ongkir `/api/shipping/calculate`: Memfilter opsi tarif ongkir secara presisi berdasarkan `handlingRegion.activeCouriers`. Contoh: jika gudang penangan di Yogyakarta hanya mengaktifkan J&T, pembeli di checkout hanya melihat opsi layanan J&T (JNE & SiCepat otomatis disaring).
     - UI Tab "Wilayah & Kurir" (`LocationsTab.tsx`) pada Dashboard Admin Pusat (`/dashboard/admin`) dengan tombol toggle interaktif, badge status kurir aktif, dan feedback instan.
  2. **Kode Promo Uji (Testing Promo & Bypass Midtrans)**:
     - `PromoCode.kind === 'TESTING'`: Khusus dibuat oleh Owner (`promo:test_manage`) dengan masa berlaku maksimal 7 hari dan kuota pemakaian maksimal 20 (Asumsi F5).
     - Dikontrol oleh pengaturan sistem `testPromoEnabled` (dapat diaktifkan/dinonaktifkan Owner).
     - Checkout dengan promo uji secara otomatis menetapkan `isTest: true` dan `paymentMethod: 'TEST_SIMULATION'`.
     - Server sepenuhnya melewati (bypass) pemanggilan Midtrans Snap, sehingga tidak akan pernah gagal karena penolakan nilai 0 atau gateway error.
     - Endpoint pembayaran mengembalikan `simulationQrPayload: 'LUVIRA-UJI:<orderCode>'`.
  3. **Halaman Pembayaran Simulasi & QR**:
     - Halaman `/order/[id]/payment` menampilkan banner khusus `[MODE PENGUJIAN]`.
     - Kode QR SVG dinamis dengan payload `LUVIRA-UJI:<orderCode>`.
     - Tombol "Simulasikan Bayar Sukses" memanggil `POST /api/test/orders/[id]/simulate-payment`, mengubah status ke `DIPROSES` dan mencatat OrderStatusLog.
  4. **Pembersihan & Isolasi Laporan Keuangan**:
     - Laporan penjualan (`/api/owner/reports` & export CSV/Excel) secara mutlak mengecualikan pesanan bertanda `isTest: true` (Asumsi F5).
     - Dashboard Owner menampilkan badge `[UJI]` pada tabel transaksi terbaru.
     - Tombol "Reset Data Uji" memanggil `POST /api/owner/test-orders/reset` (`test_orders:reset`), melepaskan reserved stock pesanan uji dan menghapus seluruh data uji coba tanpa menyentuh pesanan riil.
  5. **Pengujian & Bukti Visual Lolos 100%**:
     - Unit & integrasi kurir wilayah: `tests/integration/region-couriers.test.ts` (7/7 PASS).
     - Unit & integrasi promo uji & bypass Midtrans: `tests/integration/test-promos.test.ts` (8/8 PASS).
     - Playwright E2E visual showcase: `tests/e2e/screenshot-ft3-couriers.spec.ts` (4/4 PASS).
     - Screenshot tersimpan di Artifact Directory:
       1. `screenshot_admin_courier_control.png` (Admin Pusat kontrol kurir per wilayah)
       2. `screenshot_checkout_courier_restricted.png` (Checkout pembeli hanya menampilkan kurir aktif J&T)
       3. `screenshot_payment_test_simulation.png` (Halaman pembayaran QR simulasi & tombol bayar sukses)
       4. `screenshot_owner_test_orders.png` (Dashboard Owner dengan badge `[UJI]` & tombol Reset Data Uji)
     - Verifikasi kode: `tsc --noEmit` (0 error), `npm run lint` (0 error), `npm run build` (63 rute sukses dikompilasi).

---

## Ringkasan Eksekusi FT-2: COD untuk Admin dan Reseller (Green)
- **Status Akhir**: Selesai dan Lolos Semua Gerbang FT-2.
- **Rincian Implementasi**:
  1. **Perbaikan Masalah Kode Promo**: Memperbaiki diskon persentase dan maxDiscountAmount pada `lib/pricing.ts`, `lib/orders/order-routing.ts`, dan checkout publik. Casing jenis diskon dinormalisasi (case-insensitive `percentage` / `PERCENTAGE`). Unit testing harga & promo 8/8 PASS.
  2. **Engine Pesanan Manual COD** (`lib/orders/manual-cod.ts`):
     - Memaksa `shippingCost = 0` secara mutlak di sisi server tanpa memanggil RajaOngkir (Asumsi F1).
     - Resolusi wilayah pemenuhan: Admin Wilayah mengikuti wilayahnya; Reseller mengikuti wilayah akunnya (jika null, default ke Gudang Pusat per Asumsi F7).
     - Reservasi stok atomik saat pesanan dibuat dan pelepasan stok (`StockMovementType.RELEASE`) jika pesanan dibatalkan.
     - Generator kode pesanan anti-tabrakan: `LVR-COD-YYYYMMDD-XXXX`.
     - Notifikasi WhatsApp otomatis ke Admin Wilayah penangan saat pesanan COD dibuat.
  3. **Penolakan Mutlak COD di Checkout Publik**:
     - `POST /api/orders` publik menolak `paymentMethod === 'COD'` dengan HTTP 403 Forbidden. COD hanya dapat dibuat via Pesanan Manual.
  4. **State Machine & Alur Otorisasi COD** (`app/api/admin/orders/[id]/status/route.ts`):
     - Menunggu Serah Terima -> Diserahkan (bisa ditandai Reseller atau Admin).
     - Diserahkan -> Selesai / Uang Diterima: Reseller MUTLAK DITOLAK (HTTP 403). Hanya Admin Wilayah penangan yang memiliki wewenang menandai kas diterima dan menyelesaikan pesanan (Asumsi F3).
     - Admin wilayah lain MUTLAK DITOLAK (HTTP 403) jika mencoba menyelesaikan COD di luar wilayahnya.
     - Saat uang diterima & status selesai: stok fisik riil dipotong (`StockMovementType.OUT`), `codCashConfirmedAt` dan `codCashConfirmedBy` dicatat.
  5. **Laporan Pendapatan Owner & Observabilitas**:
     - Pendapatan COD hanya dihitung setelah status `SELESAI` (Asumsi F2 pada `app/api/owner/analytics/route.ts`).
     - Metrik pemisah "COD belum diselesaikan" (`pendingCodRevenue` & `pendingCodOrders`) ditampilkan terpisah di analitik Owner.
     - Antrean pesanan COD menggantung (> 7 hari) dipantau pada Developer Queues (`/api/developer/queues`).
  6. **UI Pesanan Manual**:
     - Formulir `CreateManualOrderForm.tsx` untuk Admin (`/dashboard/admin/orders/manual`) dan Reseller (`/dashboard/reseller/orders/manual`) menampilkan ringkasan "Ongkir: Rp 0 (COD, serah langsung)".
  7. **Pengujian Lolos 100%**:
     - Unit pricing COD: `tests/unit/pricing-cod.test.ts` (3/3 PASS).
     - Unit pricing & promo: `tests/unit/pricing.test.ts` (8/8 PASS).
     - Integrasi izin & penolakan: `tests/integration/cod-api-permissions.test.ts` (3/3 PASS).
     - Integrasi alur stok & pembatalan: `tests/integration/cod-manual-orders.test.ts` (8/8 PASS).
     - E2E Admin/Reseller alur lengkap COD: `tests/e2e/admin/e2e-17-cod-manual-orders.spec.ts` (5/5 PASS).
     - Verifikasi kode: `tsc --noEmit` (0 error), `npm run lint` (0 error), `npm run build` (63 rute sukses dikompilasi).

---

## Ringkasan Eksekusi FT-1: Integrasi Gateway WhatsApp Fonnte (Green)
- **Status Akhir**: Selesai dan Lolos Semua Gerbang FT-1.
- **Rincian Implementasi**:
  1. Adapter WhatsApp `lib/notify/whatsapp.ts` mendukung 3 mode (`mock`, `log`, `fonnte`). Mode fonnte mematuhi spesifikasi resmi: POST ke `https://api.fonnte.com/send` dengan Authorization token langsung tanpa "Bearer", normalisasi nomor `62...`, parameter delay bertipe string, pengecekan status perangkat (`checkFonnteDeviceStatus`), serta pemetaan galat ramah Bahasa Indonesia yang membedakan galat sementara (retryable) dan permanen.
  2. Modul Antrean `WaOutbox` (`lib/notify/queue.ts`) dilengkapi proteksi kunci idempoten (`idempotencyKey`) untuk mencegah pengiriman ganda, penegakan jeda minimal `FONNTE_MIN_INTERVAL_MS`, batas harian `FONNTE_DAILY_CAP`, dan mekanisme retry bertahap (maksimal 3 percobaan).
  3. Template pesan Bahasa Indonesia terstandarisasi (`lib/notify/templates.ts`) dengan kode pesanan dan tautan pelacakan. Pesanan uji (`isTest`) otomatis diawali awalan `[UJI]`. Tersedia template laporan penjualan lengkap harian (`salesReportDigest`).
  4. Penegakan persetujuan pembeli (`waConsent`): Kotak centang "Kirim update pesanan lewat WhatsApp" ditambahkan di formulir checkout publik (`app/checkout/page.tsx`) dan disimpan di tabel pesanan. Server MENOLAK mengirim WhatsApp ke pembeli jika `waConsent === false` (`lib/notify/order-events.ts`).
  5. Route Cron Dispatcher `/api/cron/wa-dispatch` dilindungi `CRON_SECRET`.
  6. Endpoint Pengaturan & Monitoring Owner `/api/owner/settings/wa` (status perangkat, metrik antrean, kirim pesan uji, coba ulang manual).
  7. Observabilitas antrean ditambahkan pada Developer Queues `/api/developer/queues` (indikator backlog, kegagalan beruntun, waktu sukses terakhir).
  8. Rute Webhook `/api/webhooks/fonnte` dengan verifikasi rahasia URL/header.
  9. Desain tabel laporan penjualan Owner diubah menjadi warna hijau tua (#14532d) sesuai permintaan pengguna.
  10. Pengujian Lolos 100%:
      - Unit adapter `tests/unit/fonnte-adapter.test.ts` (15/15 PASS)
      - Integrasi antrean `tests/integration/wa-queue.test.ts` (8/8 PASS)
      - E2E pembeli `tests/e2e/buyer/e2e-16-wa-consent.spec.ts`
      - `tsc --noEmit` (0 error), `npm run lint` (0 error), `npm run build` (61 rute sukses dikompilasi).

---

## Ringkasan Eksekusi FT-0: Peran Reseller, Izin, dan Skema (Green)
- **Status Akhir**: Selesai dan Lolos Semua Gerbang FT-0.
- **Rincian Implementasi**:
  1. Peran `RESELLER` ditambahkan sebagai peran ke-6 pada Prisma schema, middleware proxy, dan `lib/permissions.ts`.
  2. Matriks RBAC diperluas mencakup 6 peran + publik/unauthenticated (total 217 pengujian otomatis di `tests/rbac/matrix.test.ts`, 100% PASS).
  3. Skema dev diperbarui: penambahan relasi `resellerPromos`, enum `PromoKind`, field COD (`codHandedOverAt/By`, `codCashConfirmedAt/By`, `codNote`), field isolasi `createdByUserId`, `createdByRole`, model `WaOutbox`, `ReportSubscription`, `SheetConnection`.
  4. API Endpoint Kelola Reseller (`POST/GET/PUT /api/admin/resellers`) dan Penautan Promo (`POST /api/admin/promos/assign-reseller`) selesai dilengkapi audit log dan proteksi isolasi A2 (Admin Pusat dilarang menyentuh Owner/Developer/Admin Pusat lain).
  5. Helper penyamaran data pelanggan (`maskCustomerData` dan `maskOrderForReseller`) ditambahkan untuk privasi Reseller (F4).
  6. Tes integrasi `tests/integration/reseller-isolation.test.ts` (12/12 PASS).
  7. `tsc --noEmit` (0 error), `npm run lint` (0 error), `npm run build` (59 rute berhasil dikompilasi).

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
