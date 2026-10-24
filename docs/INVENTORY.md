# Inventaris Lengkap Codebase Luvira (Pre-2.0 Cleanup)

Dokumen ini disusun sebagai bagian dari **Fase 0 (Snapshot & Inventaris)** sebelum proses pembersihan kode dan persiapan migrasi database Luvira 2.0.

---

## 1. Snapshot Database Neon PostgreSQL (Pre-Cleanup)

Data telah diekspor ke folder lokal `backups/` (diabaikan oleh git) menggunakan script `scripts/export-neon.ts`:

| Model / Tabel | Jumlah Baris (Row Count) | File Backup | Status Ekspor |
|---|---|---|---|
| `Product` | 5 | `backups/Product.json` | OK |
| `ColorVariant` | 26 | `backups/ColorVariant.json` | OK |
| `SiteContent` | 1 | `backups/SiteContent.json` | OK |
| `ChangeLog` | 0 | `backups/ChangeLog.json` | OK |
| `User` | 2 | `backups/User.json` | OK |
| `Order` | 4 | `backups/Order.json` | OK |
| `OrderItem` | 4 | `backups/OrderItem.json` | OK |
| `PromoCode` | 5 | `backups/PromoCode.json` | OK |
| `Media` | 0 | `backups/Media.json` | OK |

---

## 2. Halaman Storefront & Dashboard (`app/**/page.tsx`)

| File Halaman | Route URL | Dipanggil / Dinavigasikan Oleh | Status & Keterangan |
|---|---|---|---|
| `app/page.tsx` | `/` | Browser direct URL, `BrandLogo.tsx`, `app/checkout/page.tsx` (tombol Kembali) | **Aktif** — Landing page utama (Katalog, Hero, Fitur, About, Footer) |
| `app/checkout/page.tsx` | `/checkout` | `components/cart/CartDrawer.tsx` (tombol Checkout) | **Aktif** — Alur pengisian form pembeli, kalkulasi diskon promo, PPN 11%, ongkir mock, dan pembayaran |
| `app/order/[id]/payment/page.tsx` | `/order/[id]/payment` | `app/checkout/page.tsx` (Midtrans callback & URL redirect) | **Aktif** — Halaman konfirmasi pembayaran dua langkah (instruksi rekening & upload bukti transfer manual) |
| `app/dashboard/page.tsx` | `/dashboard` | Direct URL, `proxy.ts` | **Aktif** — Halaman redirector / landing pintu masuk dashboard |
| `app/dashboard/login/page.tsx` | `/dashboard/login` | Direct URL, `proxy.ts`, `app/dashboard/page.tsx`, `app/dashboard/owner/page.tsx` | **Aktif** — Halaman login admin & owner |
| `app/dashboard/admin/page.tsx` | `/dashboard/admin` | `app/dashboard/login/page.tsx`, `proxy.ts` | **Aktif** — Dashboard CMS admin (kelola produk, stok, varian, promo, copywriting) |
| `app/dashboard/admin/changelog/page.tsx` | `/dashboard/admin/changelog` | `app/dashboard/admin/page.tsx` (link ChangeLog) | **Setengah Jadi** — UI ChangeLog ada, tabel ada di DB, belum terhubung ke mutasi produk/konten otomatis |
| `app/dashboard/owner/page.tsx` | `/dashboard/owner` | `app/dashboard/login/page.tsx`, `proxy.ts`, `lib/auth.ts` | **Aktif** — Dashboard owner (omzet, PPN, laba bersih, HPP, packing cost, kontrol stok) |

---

## 3. Route API (`app/api/**/route.ts`)

| Route API | Method | Dipanggil Oleh | Status & Keterangan |
|---|---|---|---|
| `app/api/auth/login/route.ts` | POST | `app/dashboard/login/page.tsx` | **Aktif** — Login JWT auth admin & owner |
| `app/api/auth/logout/route.ts` | POST | `app/dashboard/admin/page.tsx`, `app/dashboard/owner/OwnerDashboardClient.tsx` | **Aktif** — Logout & penghapusan session cookie |
| `app/api/products/route.ts` | GET, POST | `app/page.tsx`, `app/dashboard/admin/page.tsx` | **Aktif** — Ambil daftar produk (filter HPP bila bukan owner) & tambah produk baru |
| `app/api/products/[id]/route.ts` | PUT, DELETE | `app/dashboard/admin/page.tsx` | **Aktif** — Update produk/stok/harga & hapus produk |
| `app/api/orders/route.ts` | GET, POST, PUT | `app/checkout/page.tsx`, `app/dashboard/admin/page.tsx`, `app/order/[id]/payment/PaymentForm.tsx` | **Aktif** — Buat pesanan baru (DB + Snap token Midtrans), update status pesanan, dan upload bukti transfer |
| `app/api/owner/analytics/route.ts` | GET | `app/dashboard/owner/OwnerDashboardClient.tsx` | **Aktif** — Agregasi keuangan owner (omzet, PPN, laba bersih, HPP) |
| `app/api/promos/route.ts` | GET, POST | `app/dashboard/admin/page.tsx` | **Aktif** — Ambil list promo & buat promo baru |
| `app/api/promos/[id]/route.ts` | PUT, DELETE | `app/dashboard/admin/page.tsx` | **Aktif** — Update & hapus kode promo |
| `app/api/promos/validate/route.ts` | POST | `app/checkout/page.tsx` | **Aktif** — Validasi kode promo (kuota, expiry, isActive, tipe diskon) |
| `app/api/shipping/route.ts` | POST | `app/checkout/page.tsx` | **Mock** — Estimasi ongkir tiruan (JNE, Sicepat); belum ada flag `SHIPPING_MODE` |
| `app/api/upload/route.ts` | POST | `app/dashboard/admin/page.tsx`, `app/order/[id]/payment/PaymentForm.tsx` | **Aktif** — Upload & optimasi gambar via Sharp lokal ke `public/uploads/` serta simpan meta ke tabel `Media` |
| `app/api/content/route.ts` | GET, PUT | `app/dashboard/admin/page.tsx`, `app/page.tsx` | **Aktif** — Ambil dan simpan copywriting website di tabel `SiteContent` |
| `app/api/changelog/route.ts` | GET, POST, DELETE | `app/dashboard/admin/changelog/page.tsx` | **Setengah Jadi** — CRUD changelog manual, belum disambungkan ke mutasi produk/konten |
| `app/api/midtrans/create-transaction/route.ts` | POST | Internal testing / fallback | **Aktif/Duplikat** — Pembuatan token snap Midtrans (juga sudah ada di dalam `app/api/orders/route.ts`) |
| `app/api/midtrans/notification/route.ts` | POST | Server Midtrans Webhook (eksternal) | **Aktif** — Webhook penerima notifikasi pembayaran Midtrans, memverifikasi `signature_key` |
| `app/api/midtrans/order-status/[orderId]/route.ts` | GET | Polling status pembayaran Midtrans | **Aktif** — Membaca status notifikasi Midtrans |
| `app/api/cron/cancel-orders/route.ts` | GET | Scheduler Cron Eksternal | **Aktif** — Otomatis membatalkan pesanan transfer manual yang melewati batas `paymentDeadline` |

---

## 4. Komponen & Store Zustand

### Komponen (`components/**`)

| Komponen | Lokasi | Status | Dipakai Oleh | Keterangan |
|---|---|---|---|---|
| `BrandLogo` | `components/ui/BrandLogo.tsx` | **Dipakai** | 8 file (Header, Footer, Checkout, Admin, dll.) | Logo Luvira |
| `Button` | `components/ui/Button.tsx` | **Dipakai** | 8 file | Tombol reusable UI |
| `Input`, `Textarea` | `components/ui/Input.tsx` | **Dipakai** | 2 file (Checkout, Admin) | Input text & textarea reusable |
| `Badge` | `components/ui/Badge.tsx` | **Dipakai** | `ProductCard.tsx`, `ProductDetailModal.tsx` | Badge tag status/promo |
| `ProductCard` | `components/products/ProductCard.tsx` | **Dipakai** | `app/page.tsx` | Kartu produk di katalog |
| `ProductDetailModal` | `components/products/ProductDetailModal.tsx` | **Dipakai** | `components/products/ProductCard.tsx` | Modal detail produk & pemilihan varian |
| `ProductFilter` | `components/products/ProductFilter.tsx` | **Dipakai** | `app/page.tsx` | Filter tab produk (All, Emboss, Anti Slip, dll.) |
| `ColorSelector` | `components/products/ColorSelector.tsx` | **Dipakai** | `components/products/ProductCard.tsx` | Selector warna varian |
| `CartDrawer` | `components/cart/CartDrawer.tsx` | **Dipakai** | `app/page.tsx` | Drawer keranjang belanja |
| `DigitalReceiptModal`| `components/checkout/DigitalReceiptModal.tsx` | **Dipakai** | `app/dashboard/admin/page.tsx` | Modal invoice / kwitansi order di admin |
| `SandboxPaymentModal`| `components/checkout/SandboxPaymentModal.tsx`| **TIDAK DIPAKAI** | Tidak ada | Modal simulasi sandbox manual lama (677 baris), tidak lagi direferensikan |
| `HeroSection` | `components/sections/HeroSection.tsx` | **Dipakai** | `app/page.tsx` | Banner hero utama landing page |
| `AboutLuvira` | `components/sections/AboutLuvira.tsx` | **Dipakai** | `app/page.tsx` | Seksi 4 pilar brand Luvira |
| `FeatureHighlight` | `components/sections/FeatureHighlight.tsx` | **Dipakai** | `app/page.tsx` | Seksi keunggulan produk |
| `Footer` | `components/sections/Footer.tsx` | **Dipakai** | `app/page.tsx` | Footer website |
| `JsonLd` | `components/seo/JsonLd.tsx` | **Dipakai** | `app/layout.tsx` | Schema.org structured data untuk SEO |

### Zustand Stores (`store/**`)

| Store | Lokasi | Status | Dipakai Oleh | Keterangan |
|---|---|---|---|---|
| `useCartStore` | `store/useCartStore.ts` | **Dipakai** | 7 file (`app/page.tsx`, `checkout`, `CartDrawer`, `ProductCard`, dll.) | Keranjang belanja pembeli (localStorage) |
| `useContentStore` | `store/useContentStore.ts` | **Dipakai** | 6 file (`app/page.tsx`, `admin`, `AboutLuvira`, `HeroSection`, dll.) | Cache & state copywriting website |
| `useOrderStore` | `store/useOrderStore.ts` | **Dipakai** | `app/checkout/page.tsx`, `app/dashboard/admin/page.tsx` | Cache order di client |
| `useProductStore` | `store/useProductStore.ts` | **Dipakai** | 4 file (`app/page.tsx`, `admin`, `ProductFilter`, `HeroSection`) | Cache produk di client |
| `usePromoStore` | `store/usePromoStore.ts` | **Dipakai** | `app/dashboard/admin/page.tsx` | State manajemen promo di dashboard admin |

---

## 5. Model dan Field Prisma (`prisma/schema.prisma`)

| Model | Field | Tipe | Status di Kode | Keterangan |
|---|---|---|---|---|
| **Product** | `id` | String | **Dipakai** | ID produk |
| | `name`, `model`, `price`, `originalPrice` | String/Int | **Dipakai** | Data katalog produk |
| | `rating`, `reviewsCount`, `badge`, `description` | Float/Int/String | **Dipakai** | Detail produk & review |
| | `features` | String[] | **Dipakai** | Array fitur (PostgreSQL native; perlu konversi di MySQL) |
| | `createdAt`, `updatedAt` | DateTime | **Dipakai** | Timestamp |
| | `costPrice`, `packingCost` | Int | **Dipakai** | HPP & biaya kemasan (financial owner) |
| | `variants` | ColorVariant[] | **Dipakai** | Relasi ke ColorVariant |
| **ColorVariant** | `id`, `productId`, `name`, `hex`, `imageUrl`, `stock` | String/Int | **Dipakai** | Varian warna & stok produk |
| **SiteContent** | `id`, `hero`, `about`, `features`, `microcopy`, `updatedAt` | String/Json/DateTime | **Dipakai** | Copywriting landing page |
| **ChangeLog** | `id`, `entityType`, `entityId`, `fieldName`, `oldValue`, `newValue`, `changedBy`, `createdAt` | String/DateTime | **Dipakai** | Riwayat perubahan data (belum terhubung ke mutasi) |
| **User** | `id`, `username`, `passwordHash`, `role`, `createdAt` | String/DateTime | **Dipakai** | Akun admin & owner |
| **Order** | `id`, `customerName`, `customerPhone`, `customerAddress`, `status` | String | **Dipakai** | Data utama pesanan |
| | `promoCodeId`, `shippingCourier`, `shippingCost`, `ppnAmount` | String/Int | **Dipakai** | Breakdown biaya & promo |
| | `paymentProofUrl`, `paymentDeadline`, `verifiedBy`, `verifiedAt` | String/DateTime | **Dipakai** | Verifikasi transfer manual |
| | `paymentMethod`, `midtransToken`, `createdAt` | String/DateTime | **Dipakai** | Pembayaran Midtrans & waktu |
| | `items` | OrderItem[] | **Dipakai** | Relasi ke OrderItem |
| **OrderItem** | `id`, `orderId`, `productId`, `variantId`, `quantity`, `priceEach`, `costEach`, `packingEach` | String/Int | **Dipakai** | Detail item order & HPP historikal |
| **PromoCode** | `id`, `code`, `discountType`, `discountValue`, `quota`, `usedCount`, `expiresAt`, `isActive` | String/Int/DateTime/Boolean | **Dipakai** | Konfigurasi promo |
| | `resellerName`, `resellerWaNumber`, `commissionType`, `commissionValue` | String/Int | **Dipakai** | Afiliasi / reseller |
| | `isFreeShipping` | Boolean | **Dipakai (Schema & Order Calc)** | Diskon gratis ongkir (default: false, belum ada UI) |
| | `isFreeTax` | Boolean | **Dipakai (Schema & Order Calc)** | Diskon bebas PPN |
| **Media** | `id`, `originalName`, `fileName`, `mimeType`, `size`, `width`, `height`, `originalPath`, `optimizedPath`, `thumbnailPath`, `createdAt` | String/Int/DateTime | **Dipakai** | Metadata gambar upload |

---

## 6. Dependency `package.json`

| Dependency | Versi | Status | Keterangan & Tindakan |
|---|---|---|---|
| `@prisma/client` | `^5.22.0` | **Dipakai** | ORM Database |
| `next` | `^16.3.4` | **Dipakai** | Next.js Framework |
| `react` | `19.2.8` | **Dipakai** | Core React |
| `react-dom` | `19.2.8` | **Dipakai** | Core React DOM |
| `bcryptjs` | `^3.0.3` | **Dipakai** | Hash password admin/owner |
| `jose` | `^6.2.12` | **Dipakai** | JWT auth session token |
| `midtrans-client` | `^1.4.3` | **Dipakai** | SDK resmi Midtrans payment gateway |
| `sharp` | `^0.35.5` | **Dipakai** | Kompresi & WebP generator di `/api/upload` |
| `lucide-react` | `^1.31.0` | **Dipakai** | UI icon library |
| `zustand` | `^5.0.15` | **Dipakai** | State management client |
| `clsx` | `^2.1.1` | **Dipakai** | Class name helper |
| `tailwind-merge` | `^3.6.0` | **Dipakai** | Tailwind class merger |
| `@aws-sdk/client-s3` | `^3.1128.0` | **TIDAK DIPAKAI** | Sisa eksperimen S3/R2 (upload saat ini memakai Sharp lokal). Siap dicabut di Kategori A. |
| `@vercel/kv` | `^3.0.0` | **TIDAK DIPAKAI** | Sisa implementasi Vercel KV lama sebelum migrasi Prisma. Siap dicabut di Kategori A. |
| **DevDependencies** | | | |
| `prisma` | `^5.22.0` | **Dipakai** | Prisma CLI |
| `typescript` | `^5` | **Dipakai** | TypeScript compiler |
| `@types/node`, `@types/react`, `@types/react-dom`, `@types/bcryptjs`, `@types/sharp` | berbagai | **Dipakai** | Tipe TypeScript |
| `eslint`, `eslint-config-next` | `^9` / `16.3.0`| **Dipakai** | Linter |
| `tailwindcss`, `@tailwindcss/postcss` | `^4` | **Dipakai** | Styling CSS |
| `tsx` | `^4.23.13` | **Dipakai** | TypeScript script executor (seed & export) |

---

## 7. Variabel Lingkungan (`.env*`)

| Variabel | Status | Keterangan & Lokasi Penggunaan |
|---|---|---|
| `DATABASE_URL` | **Dipakai** | String koneksi database PostgreSQL Neon (akan diganti MySQL Hostinger) |
| `JWT_SECRET` | **Dipakai** | Kunci rahasia untuk sign JWT session di `lib/auth.ts` |
| `MIDTRANS_SERVER_KEY` | **Dipakai** | Server key Midtrans (webhook verifier & snap transaction creator) |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | **Dipakai** | Client key Midtrans untuk frontend Snap JS SDK |
| `NEXT_PUBLIC_MIDTRANS_ENV` | **Dipakai** | Mode Midtrans: `sandbox` atau `production` |
| `NEXT_PUBLIC_ADMIN_WA` | **Dipakai** | Nomor WhatsApp admin untuk checkout & konfirmasi pesanan |
| `NEXT_PUBLIC_PPN_RATE` | **Dipakai** | Tarif PPN (default 11%) di checkout |
| `DATABASE_NEON_*`, `DATABASE_PG*`, `DATABASE_POSTGRES_*` | **TIDAK DIPAKAI** | 16 variabel bawaan auto-injected dari Neon Vercel integration di `.env.local` |
| `VERCEL_OIDC_TOKEN` | **TIDAK DIPAKAI** | Token auto-injected dari Vercel CLI |
| `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT` | **TIDAK DIPAKAI** | Variabel peninggalan ImageKit lama di `.env.local` (upload saat ini lokal Sharp) |
| `NEXT_PUBLIC_PAYMENT_MODE` | **TIDAK DIPAKAI** | Flag lama untuk toggle SandboxPaymentModal |

---

## 8. Kode Mati & File Debug Sisa di Root

| File | Status | Keterangan |
|---|---|---|
| `check_db.js` | **Tidak terpakai / Debug** | Script testing koneksi Prisma produk |
| `check_db2.js` | **Tidak terpakai / Debug** | Script testing koneksi Prisma produk |
| `create_promo.js` | **Tidak terpakai / Debug** | Script manual pembuat kode promo awal |
| `db_out.json` | **Tidak terpakai / Debug** | Output dump JSON dari `check_db.js` |
| `db_out2.json` | **Tidak terpakai / Debug** | Output dump JSON dari `check_db2.js` |
| `dump.js` | **Tidak terpakai / Debug** | Script dump data produk |
| `test_referer.js` | **Tidak terpakai / Debug** | Script test request header referer |
| `scratch/fix-admin.js` | **Tidak terpakai / Debug** | Script modifikasi teks admin lama |
| `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` | **Tidak terpakai** | Asset bawaan template create-next-app |
| `public/brand/logo-clean.svg` | **Tidak terpakai** | Asset SVG tidak terpakai (aplikasi memakai `/logo-luvira.png`) |

---

## 9. Ringkasan Kode: `TODO`, `FIXME`, `console.log`, Komentar

- **`TODO`**: 0 temuan.
- **`FIXME`**: 0 temuan.
- **`console.log` / `console.error`**: 73 titik panggilan (terdistribusi di handler API routes, lib auth, webhook, upload, dan script).
- **Blok komentar > 10 baris**: 6 blok (seluruhnya merupakan dokumentasi header teknis pada modul Midtrans `app/api/midtrans/*` dan `lib/midtrans.ts`).
- **Blok kode mati yang dikomentari**: 0 blok terdeteksi di komponen/halaman.
