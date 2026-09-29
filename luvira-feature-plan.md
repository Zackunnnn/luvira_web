# Luvira — Feature Expansion Plan (v2, corrected post-audit)

> v1 dari file ini mengasumsikan seluruh app masih localStorage-only dan DB belum dipakai. Audit codebase (2026-09-16) menunjukkan `Product`, `ColorVariant`, `SiteContent` sudah live di Neon via Prisma, dan tabel `ChangeLog` sudah ada (belum dipakai). File ini menggantikan v1 — detail lengkap dan alasan di `PRD.md` Section 11 & `CHANGELOG.md` bagian `[Unreleased - Planned v2.0]`.

**Stack (dikonfirmasi via audit):** Next.js + TypeScript + Zustand (client cache) + Tailwind, DB Neon Postgres via **Prisma**, image storage Cloudflare R2, hosting Hostinger (Node.js app, confirmed jalan), payment: manual transfer (Midtrans di-drop), dev di Antigravity IDE (Claude Opus / Gemini).

---

## 0. Urutan Eksekusi (Phase) — Revisi

| Phase | Fitur | Status / Kenapa urutannya begini |
|---|---|---|
| **0a** | 🔴 Proteksi `/admin` (auth) | **URGENT, independen dari semua phase lain** — saat ini `/admin` terbuka tanpa proteksi di production DB |
| 0b | Tabel `User` (role) + migrasi `Order`/`OrderItem` dari `data/orders.json` ke Prisma + hapus route Midtrans | Fondasi sisa yang belum ke-DB |
| 12 | Role-based auth penuh (admin vs owner) di `/dashboard/owner/*` | Upgrade dari password tunggal (0a) ke login per-user |
| 13 | Checkout: ongkir aggregator + PPN + promo code + WA redirect + manual transfer + dual konfirmasi | Dampak langsung ke buyer/revenue |
| 14 | Auto-cancel order & stock release (cron) | Butuh `Order.paymentDeadline` dari Phase 0b |
| 15 | Dashboard Owner (sales, tax, cost, profit, packing, stock report) | Butuh Order table (0b) & checkout (13) jalan dulu |
| 16 | Auto shipping label print | Nempel ke ongkir aggregator Phase 13 |
| 17 | Reseller spreadsheet sync + WA auto-notif | Independen, bisa paralel dengan 15/16 |
| 18 | Wire up `ChangeLog` (sudah ada!) untuk audit Pak Dimas + revert | Tidak perlu tabel baru, tinggal dipanggil |
| 19 | Brosur & training content page | Prioritas paling rendah |

---

## Phase 0a — Proteksi `/admin` (kerjakan sekarang, sebelum apapun)

**Prompt untuk Antigravity:**
> "Tambahkan authentication sederhana untuk melindungi route `/admin`: buat middleware Next.js yang cek session cookie sebelum render halaman admin, dengan login page basic (username/password) yang divalidasi terhadap tabel `User` baru di Prisma schema (`username`, `passwordHash` — hash dengan bcrypt, `role` default `'admin'`). Tambahkan model `User` ke `prisma/schema.prisma`, jalankan migration, dan buat seed script untuk membuat satu user awal. Setelah selesai, konfirmasi ke saya cara login-nya."

---

## Phase 0b — Tabel `User` lengkap + migrasi Order + hapus Midtrans

**Prompt:**
> "Setelah `User` model dari Phase 0a ada, tambahkan model `Order` dan `OrderItem` ke `prisma/schema.prisma` (field: customerName, customerPhone, customerAddress, status, promoCodeId, shippingCourier, shippingCost, ppnAmount, paymentProofUrl, paymentDeadline, verifiedBy, verifiedAt untuk Order; orderId, productId, variantId, quantity, priceEach untuk OrderItem — relasi one-to-many). Migrasikan `/api/orders` supaya baca/tulis ke tabel ini, bukan `data/orders.json` — termasuk script satu kali untuk backfill data lama dari file JSON ke tabel baru sebelum cutover. Hapus seluruh route `/api/midtrans/*` dan referensi `midtrans-client` karena payment gateway sudah tidak dipakai (manual transfer saja)."

---

## Phase 12 — Role-based auth (admin vs owner)

**Prompt:**
> "Upgrade sistem login dari Phase 0a menjadi role-aware: tambahkan middleware yang mengecek `User.role` dari session — kalau bukan `'owner'`, blokir akses ke `/dashboard/owner/*` dan redirect ke `/admin` biasa dengan pesan unauthorized. Buat helper `isOwner()` untuk server component. PENTING: field `costPrice` dan `packingCost` pada `Product` tidak boleh dikembalikan oleh `/api/products` kalau requester bukan owner — cek ini di level API handler, jangan cuma disembunyikan di UI."

---

## Phase 13 — Checkout: Ongkir + PPN + Promo + Manual Transfer

**3a. Ongkir aggregator**
> "Integrasikan [Biteship/RajaOngkir Pro/Komerce — pilih satu] API untuk cek ongkos kirim berdasarkan alamat tujuan buyer dan total berat produk di cart. Tampilkan pilihan kurir sebagai radio button di checkout. Simpan `shippingCourier` dan `shippingCost` ke tabel `Order`."

**3b. PPN**
> "Tambahkan baris 'PPN (11%)' di ringkasan checkout, dihitung dari subtotal setelah diskon promo, sebelum ongkir. Simpan ke `Order.ppnAmount`. Buat env var `NEXT_PUBLIC_PPN_RATE` biar mudah diubah."

**3c. Promo code**
> "Tambahkan model `PromoCode` ke Prisma schema (code, discountType, discountValue, resellerName, resellerWaNumber, commissionType, commissionValue, quota, usedCount, expiresAt, isActive). Tambahkan input kode promo di checkout, validasi `isActive`/`expiresAt`/`quota` vs `usedCount`. Increment `usedCount` dalam Prisma transaction saat order berhasil dibuat untuk hindari race condition."

**3d. Manual transfer + WA redirect**
> "Setelah kalkulasi total selesai, tampilkan nomor rekening tujuan (dari config) dengan tombol copy. Saat buyer klik 'Konfirmasi Pesanan', set `Order.status = 'menunggu_transfer'` dan `paymentDeadline = now() + 24 jam`, generate link `wa.me/[NOMOR_ADMIN]?text=[format: nama, produk, kode promo, total, order id]`."

**3e. Upload bukti + verifikasi ganda**
> "Buat halaman upload bukti transfer (gambar ke R2), update `Order.paymentProofUrl` dan `status = 'menunggu_verifikasi'`. Di admin dashboard, tombol 'Verifikasi Pembayaran' set `status = 'dikonfirmasi'`, `verifiedBy`, `verifiedAt`."

---

## Phase 14 — Auto-Cancel Order + Stock Release

**Prompt:**
> "Buat scheduled job (node-cron, jalan tiap 15 menit di Node app Hostinger — atau fallback external cron-job.org kalau app sleep saat idle) yang cari `Order` dengan `status = 'menunggu_transfer'` dan `paymentDeadline < now()`, set `status = 'dibatalkan'`, kembalikan stok `ColorVariant` terkait."

---

## Phase 15 — Dashboard Owner

**Prompt:**
> "Buat halaman `/dashboard/owner` (protected via isOwner() Phase 12) berisi: kartu ringkasan total penjualan/profit/pajak; filter periode bulanan/tahunan; tabel rekap transaksi dengan export CSV; stock control untuk produk di bawah threshold. Profit = revenue - (costPrice + packingCost) * qty per item. Gunakan query agregat Prisma (groupBy), jangan fetch semua row lalu hitung di client."

---

## Phase 16 — Auto Print Label

**Prompt:**
> "Setelah `Order.status = 'diproses'`, panggil endpoint label dari aggregator ongkir Phase 13 untuk generate PDF label. Tombol 'Cetak Label' di admin dashboard membuka PDF siap print ke thermal printer."

---

## Phase 17 — Reseller Spreadsheet Sync + WA Auto-Notif

**Prompt:**
> "Integrasikan Google Sheets API: tiap `Order` dengan `promoCodeId` yang punya `resellerName` berhasil `dikonfirmasi`, tambahkan baris ke spreadsheet (kode, reseller, order id, total, komisi dari `commissionType`/`commissionValue`). Kirim WA otomatis ke `resellerWaNumber` via Fonnte/Wablas dengan notifikasi order + estimasi komisi."

---

## Phase 18 — Wire Up `ChangeLog` (tabel sudah ada!)

**Prompt:**
> "Tabel `ChangeLog` sudah ada di `prisma/schema.prisma` (entityType, entityId, fieldName, oldValue, newValue, changedBy, createdAt) tapi belum dipanggil di mana pun. Tambahkan pemanggilan `prisma.changeLog.create()` setiap kali admin/Pak Dimas mengubah field di `Product`, `SiteContent`, atau `Order` lewat dashboard — catat field_name, old_value, new_value, user_id. Buat halaman `/dashboard/owner/audit-log` menampilkan histori ini dengan tombol 'Revert ke nilai ini' per baris yang menulis ulang `oldValue` ke field terkait."

---

## Phase 19 — Brosur & Training

**Prompt:**
> "Buat halaman statis `/resources` berisi daftar file brosur & materi training (PDF) yang bisa didownload, disimpan di R2. CRUD sederhana dari dashboard admin untuk upload/hapus."

---

## Catatan Risiko

- **Phase 0a paling urgent** — jangan mulai phase lain sebelum ini selesai, ini bukan soal urutan efisiensi tapi soal data production yang saat ini terbuka.
- **Hostinger Node app + cron**: cek apakah app sleep saat idle. Kalau iya, pakai external cron trigger sebagai fallback untuk Phase 14.
- **costPrice/packingCost security**: cek di setiap API response (bukan cuma UI) bahwa non-owner tidak bisa lihat.
- **Race condition promo code**: pakai Prisma transaction saat increment `usedCount`.
- **Backfill orders.json**: pastikan script backfill Phase 0b jalan dan diverifikasi sebelum file JSON lama dihapus/diabaikan.
