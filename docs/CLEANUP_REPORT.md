# Laporan Audit & Pembersihan Kode Luvira (Pre-2.0 Cleanup)

Dokumen ini memuat audit lengkap terhadap seluruh item di codebase Luvira, pembagian tindakan ke dalam **Kategori A** (langsung dikerjakan) dan **Kategori B** (menunggu persetujuan tertulis Wann di Checkpoint 1), serta laporan khusus mengenai Midtrans, ongkir mock, duplikasi logika harga, role check, keamanan rahasia, dan audit kecepatan gambar.

---

## 1. Tabel Master Audit dan Pembersihan Kode

| No | Item | Lokasi | Status | Kategori | Tindakan | Alasan & Dampak |
|---|---|---|---|---|---|---|
| 1 | File script testing & dump di root (`check_db.js`, `check_db2.js`, `create_promo.js`, `dump.js`, `test_referer.js`, `db_out.json`, `db_out2.json`) | Root direktori | Tidak dipakai / debug | **A** | **Hapus** | File scratch/debug manual yang tidak sengaja ter-commit. Tidak dipakai oleh aplikasi sama sekali. |
| 2 | File scratch sisa (`scratch/fix-admin.js`) | `scratch/` | Tidak dipakai / debug | **A** | **Hapus** | Script manipulasi teks admin lawas yang sudah selesai dipakai. |
| 3 | Aset SVG default template Next.js (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`) | `public/` | Tidak dipakai | **A** | **Hapus** | Aset bawaan `create-next-app` yang tidak digunakan di storefront maupun admin. |
| 4 | Aset SVG brand tidak terpakai (`public/brand/logo-clean.svg`) | `public/brand/` | Tidak dipakai | **A** | **Hapus** | Tidak direferensikan (komponen `BrandLogo.tsx` menggunakan `public/logo-luvira.png`). |
| 5 | Komponen `SandboxPaymentModal.tsx` | `components/checkout/SandboxPaymentModal.tsx` | Tidak dipakai | **A** | **Hapus** | Komponen simulasi pembayaran manual lokal lama (677 baris). Alur pembayaran saat ini telah menggunakan Midtrans Snap SDK dan konfirmasi transfer manual via WhatsApp/upload bukti. |
| 6 | Dependency `@aws-sdk/client-s3` | `package.json` | Tidak dipakai | **A** | **Hapus dari package.json** | Tidak pernah diimpor di file mana pun (upload gambar saat ini diproses secara lokal oleh Sharp ke `public/uploads/`). |
| 7 | Dependency `@vercel/kv` | `package.json` | Tidak dipakai | **A** | **Hapus dari package.json** | Sisa implementasi sebelum migrasi ke PostgreSQL/Prisma. Sudah 0 referensi impor. |
| 8 | File `.env.example` | Root direktori | Usang / Diabaikan git | **A** | **Perbarui & Unignore** | Berisi konfigurasi usang dan sebelumnya terabaikan oleh git (`.env*`). Diperbarui hanya dengan nama variabel aktif tanpa nilai rahasia. |
| 9 | Flag kendali `SHIPPING_MODE` pada endpoint mock ongkir | `app/api/shipping/route.ts` | Setengah jadi | **A** | **Tandai MOCK & Pasang Flag** | Memastikan ongkir mock ditandai dengan konstanta jelas dan dikendalikan flag `SHIPPING_MODE=mock|live` dengan default aman. |
| 10 | Console log debug berlebih pada komponen client storefront & checkout | `app/checkout/page.tsx`, `components/products/ProductCard.tsx` | Sisa debug | **A** | **Bersihkan** | Menghapus `console.log` sisa eksperimen di browser client agar console bersih dan performa optimal. |
| 11 | Endpoint Webhook Midtrans (`signature_key` & double-notification) | `app/api/midtrans/notification/route.ts` | Dipakai & Berjalan | **B** | **Perlu Konfirmasi** | Signature verification SHA-512 sudah aktif dan aman. Perlu konfirmasi penambahan guard agar notifikasi retry tidak menurunkan status order yang sudah `Lunas`. |
| 12 | Lokasi Penyimpanan Rekening Transfer Manual | `app/order/[id]/payment/page.tsx:64` | Dipakai (Hardcoded) | **B** | **Pertahankan / Perlu Konfirmasi** | Nomor rekening `BCA 1234567890 (Luvira)` saat ini ditulis langsung (hardcoded) di JSX halaman pembayaran. Di 2.0 akan dipindah ke tabel database `PaymentAccount`. |
| 13 | Field `isFreeShipping` pada model `PromoCode` | `prisma/schema.prisma` | Dipakai di skema & kalkulasi | **B** | **Pertahankan** | Field dipertahankan dengan default `false`. Jangan dibangun UI-nya di fase ini. |
| 14 | Endpoint mock ongkir `/api/shipping` menuju RajaOngkir | `app/api/shipping/route.ts` | Mock | **B** | **Pertahankan** | Integrasi RajaOngkir ditunda ke Luvira 2.0 sesuai arahan. Saat ini tetap menggunakan mock dengan flag aman. |
| 15 | Halaman & Tabel ChangeLog | `/admin/changelog`, `app/api/changelog/route.ts`, model `ChangeLog` | Setengah jadi | **B** | **Pertahankan** | Halaman dan API dipertahankan apa adanya tanpa disambungkan ke mutasi produk/konten. |
| 16 | Duplikasi logika kalkulasi harga, promo, dan PPN (Client vs Server) | `app/checkout/page.tsx` vs `app/api/orders/route.ts` | Duplikat & Gap Validasi | **B** | **Laporkan (Pertahankan di Fase 1)** | Client menghitung total bayar, server mempercayai payload client tanpa validasi ulang. Penyatuan logika di level API disiapkan untuk Luvira 2.0. |
| 17 | Pengecekan role (`admin` vs `owner`) dan restrukturisasi `proxy.ts` | `proxy.ts`, `lib/auth.ts`, `app/api/**` | Bentrok Next.js | **B** | **Perlu Konfirmasi** | `middleware.ts` sebelumnya di-rename jadi `proxy.ts` sehingga edge middleware Next.js tidak aktif. Direkomendasikan dikembalikan ke `middleware.ts`. |
| 18 | Variabel environment lama di `.env.local` | `.env.local` | Tidak dipakai / Sisa vendor | **B** | **Perlu Konfirmasi** | Terdapat 16 variabel sisa integrasi Vercel/Neon dan ImageKit lama di file `.env.local` lokal. |
| 19 | Skema database PostgreSQL ke MySQL Hostinger | `prisma/schema.prisma` | Siap Fase 2 | **B** | **Menunggu Checkpoint 2** | Penggantian provider `postgresql` ke `mysql`, penggantian `String[]` ke `Json`, dan penyesuaian tipe data. |

---

## 2. Pemeriksaan Khusus Temuan Wajib

### 2.1 Midtrans (`midtrans-client`, `app/api/midtrans`, route order)
- **Status Saat Ini**: `midtrans-client` terpasang (`^1.4.3`), folder `app/api/midtrans` ada (berisi `create-transaction`, `notification`, `order-status`), dan pembuatan Snap token terintegrasi di `app/api/orders/route.ts` serta dipanggil dari `app/checkout/page.tsx`.
- **Verifikasi Keamanan Webhook**:
  Endpoint `app/api/midtrans/notification/route.ts` memverifikasi `signature_key` menggunakan:
  $$\text{SHA512}(\text{order\_id} + \text{status\_code} + \text{gross\_amount} + \text{ServerKey})$$
  Jika signature tidak valid, request langsung ditolak dengan HTTP 403.
- **Proteksi Notifikasi Ganda (Idempotency)**:
  Saat notifikasi datang, status order diperbarui di DB via `prisma.order.update`. Namun belum ada pengecekan kondisi: jika status order di DB sudah `Lunas` / `settlement`, notifikasi pending/expire yang datang terlambat (misal karena retry queue Midtrans) tidak boleh membatalkan order yang sudah sah dibayar.
- **Penyimpanan Rekening Tujuan Transfer Manual**:
  **Ditemukan**: Info rekening transfer manual disimpan secara **hardcode** di JSX `app/order/[id]/payment/page.tsx` pada baris 64:
  ```tsx
  <span className="font-bold text-leaf-olive">BCA 1234567890 (Luvira)</span>
  ```
  Tidak ada data rekening di `.env` maupun tabel DB untuk transfer manual saat ini. Di Luvira 2.0 ini akan dipindahkan ke tabel `PaymentAccount`.

### 2.2 Field `isFreeShipping` di `PromoCode`
- Ditemukan di `prisma/schema.prisma`:
  ```prisma
  isFreeShipping   Boolean   @default(false)
  ```
- Ditemukan di kalkulasi `app/checkout/page.tsx`:
  ```tsx
  const shippingCost = promoData?.isFreeShipping ? 0 : (selectedShipping?.cost || 0);
  ```
- **Tindakan**: Field dipertahankan dengan nilai default `false`. Sesuai instruksi, form input dan UI untuk admin **tidak dibangun** pada fase ini dan dicatat sebagai keputusan terbuka untuk Wann.

### 2.3 Mock Ongkir `/api/shipping`
- File `app/api/shipping/route.ts` saat ini menyimulasikan 4 opsi kurir (JNE REG, JNE YES, Sicepat REG, Sicepat BEST) dengan delay 1500ms.
- **Tindakan**: Diberi penanda `MOCK_COURIER_RATES`, diberi komentar penjelasan tegas, dan ditambahkan kendali variabel:
  ```env
  SHIPPING_MODE=mock # 'mock' | 'live'
  ```
  Jika mode bukan `mock` (misal belum ada API RajaOngkir terpasang), sistem akan mengembalikan array kosong / error terproteksi sehingga ongkir tiruan tidak bocor ke pesanan riil tanpa disadari.

### 2.4 ChangeLog (`/admin/changelog` dan tabel `ChangeLog`)
- File halaman `app/dashboard/admin/changelog/page.tsx` dan endpoint `app/api/changelog/route.ts` serta model Prisma `ChangeLog` tersedia.
- **Status**: Masih setengah jadi. Tabel dan UI ada, namun mutasi produk di `app/api/products/[id]/route.ts` maupun perubahan teks di `app/api/content/route.ts` **belum memanggil** pencatatan log ke tabel ini.
- **Tindakan**: Tetap dipertahankan apa adanya, tidak disambungkan ke mutasi di fase ini agar tidak menimbulkan risiko regresi sebelum skema Luvira 2.0 matang.

### 2.5 Duplikasi Logika Harga, PPN, dan Promo (Client vs Server)
- **Lokasi Client**:
  - `app/checkout/page.tsx` (baris 130–189): menghitung `discountAmount` (tipe percentage vs fixed), `netPrice = max(0, basePrice - discountAmount)`, `ppnAmount = round(netPrice * 0.11)`, `shippingCost`, dan `finalPrice = netPrice + ppnAmount + shippingCost`.
- **Lokasi Server**:
  - `app/api/promos/validate/route.ts`: menghitung diskon dan memvalidasi `quota`, `usedCount`, `expiresAt`, `isActive`.
  - `app/api/orders/route.ts`: **TIDAK MENGHITUNG ULANG**. Nilai `totalPrice`, `ppnAmount`, dan `shippingCost` diambil langsung dari JSON kiriman client (`newOrder`).
  - `app/api/owner/analytics/route.ts`: menghitung omzet, laba kotor, PPN terutang, dan HPP berdasarkan data historis di database.
- **Dampak & Rekomendasi**: Ada gap keamanan (client-controlled price). Untuk Luvira 2.0, route pembuatan order wajib menghitung ulang subtotal dari harga produk di DB, validasi kuota promo dengan database lock, dan menghitung PPN di server sebelum snap token dibuat. Di Fase 1 ini logika hanya dilaporkan dan dipertahankan.

### 2.6 Pengecekan Role (`admin` vs `owner`)
Seluruh titik pengecekan role yang ada di codebase saat ini:
1. `lib/auth.ts`: fungsi `isOwner()` mengecek session token `session?.role === 'owner'`.
2. `proxy.ts`:
   - Baris 15: `session.role === 'owner'` diarahkan ke `/dashboard/owner`, selain itu ke `/dashboard/admin`.
   - Baris 38: proteksi `/dashboard/owner/*` jika `session.role !== 'owner'` dialihkan ke `/dashboard/admin`.
3. `app/api/auth/login/route.ts`: menerbitkan JWT session dengan klaim `{ id, username, role }` dan menentukan redirect URL sesuai role.
4. `app/api/products/route.ts` & `app/api/products/[id]/route.ts`: menyembunyikan field sensitif modal (`costPrice` dan `packingCost`) jika `!isOwner()`.
5. `app/api/owner/analytics/route.ts`: menolak akses (403) jika bukan `isOwner()`.
6. `app/api/upload/route.ts`: memanggil helper auth `isOwner()`.
7. `app/dashboard/owner/page.tsx`: server component gatekeeper yang memeriksa `isOwner()` dan melempar ke login jika tidak berhak.

### 2.7 Audit Rahasia di Repo
- Seluruh 14 commit di riwayat git telah diperiksa.
- File `.env` dan `.env.local` tidak pernah ter-commit ke git (terlindungi `.gitignore`).
- File `.env.local.example` yang sempat ter-commit hanya memuat string placeholder seperti `SB-Mid-server-XXXXXXXXXXXXXXXXXXXXXXXX` dan `DATABASE_URL=`.
- Tidak ditemukan kunci API, password database, atau JWT secret riil di dalam riwayat commit git.

---

## 3. Laporan Audit Kecepatan Gambar

### 3.1 Bagaimana Foto Produk Dilayani Sekarang
- **Di Database (`ColorVariant.imageUrl`)**:
  Seluruh 26 varian produk saat ini menyimpan URL publik ImageKit:
  `https://ik.imagekit.io/awan1177/luvira/products/...`
  Tidak ada satu pun varian di database yang mengarah ke domain R2 (`r2.dev`) saat ini.
- **Konfigurasi `next.config.ts`**:
  ```ts
  remotePatterns: [
    { protocol: 'https', hostname: 'ik.imagekit.io', pathname: '/**' },
    { protocol: 'https', hostname: 'pub-*.r2.dev', pathname: '/**' },
  ]
  ```
  Domain `pub-*.r2.dev` sudah terdaftar di whitelist Next.js Image, namun belum digunakan oleh URL produk di database.

### 3.2 Analisis Berkas Gambar Asli di `public/socks/`
- Terdapat **26 berkas foto** berformat `.webp` di folder `public/socks/`.
- **Total ukuran berkas**: **41.18 MB** (rata-rata 1.58 MB per gambar).
- **10 Berkas Terbesar**:
  1. `bsst5.webp`: 2.33 MB (2,383,741 bytes)
  2. `bsst3.webp`: 2.26 MB (2,318,528 bytes)
  3. `bsst8.webp`: 2.20 MB (2,250,491 bytes)
  4. `bsst2.webp`: 2.19 MB (2,239,953 bytes)
  5. `bsst6.webp`: 2.13 MB (2,181,029 bytes)
  6. `bsst4.webp`: 2.12 MB (2,171,825 bytes)
  7. `bsst1.webp`: 2.12 MB (2,166,907 bytes)
  8. `est5.webp`: 1.95 MB (1,995,796 bytes)
  9. `est4.webp`: 1.93 MB (1,978,246 bytes)
  10. `e2.webp`: 1.90 MB (1,940,937 bytes)
*(Sesuai instruksi aturan keselamatan, berkas foto di `public/socks/` tidak disentuh atau dihapus).*

### 3.3 Penggunaan `next/image` di Komponen
- Komponen `components/products/ProductCard.tsx` dan `components/products/ProductDetailModal.tsx` menggunakan komponen `<Image />` dari `next/image`, namun:
  - **TIDAK memiliki atribut `sizes`**: Tanpa atribut `sizes`, Next.js mengasumsikan gambar selebar `100vw` (seluruh lebar viewport layar), sehingga browser meminta file gambar resolusi sangat tinggi meskipun thumbnail kartu produk di HP lebarnya hanya ~160px.
  - **TIDAK memiliki atribut `priority`**: Foto produk teratas (Largest Contentful Paint / LCP) tidak ditandai `priority`, menyebabkan browser menunda pre-loading gambar.
  - **Memiliki fallback ke tag `<img>` biasa**: Saat error atau gambar eksternal, fallback ke tag `<img>` unoptimized yang memuat gambar mentah ukuran megabyte secara langsung tanpa kompresi.

### 3.4 Penyebab Paling Mungkin Loading Lambat
1. **Ukuran Berkas Sumber Sangat Besar (2MB+ per foto)**: Berkas gambar yang diunggah memiliki dimensi piksel kamera penuh tanpa proses resize resolusi display web (misal cukup max-width 800px).
2. **Absennya Atribut `sizes` pada `next/image`**: Menyebabkan server Next.js memproses dan mengirim varian resolusi terbesar ke perangkat mobile.
3. **Overhead On-Demand Optimization di Shared Hosting**: Di Hostinger Node.js (CPU terbatas), melakukan resize dan re-encoding on-the-fly untuk gambar 2MB+ saat cold traffic menghabiskan resource server secara signifikan.
4. **Belum Ada Custom Domain & CDN Caching Edge**: Jika menggunakan `r2.dev` bawaan Cloudflare, Cloudflare tidak mengaktifkan edge caching secara agresif untuk domain publik `r2.dev`. Diperlukan domain kustom (misal `cdn.luvira.id`) yang terhubung ke Cloudflare CDN dengan header `Cache-Control: public, max-age=31536000, immutable`.
