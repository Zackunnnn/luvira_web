Ini adalah referensi pertama dari PRD.md sebelum dirubah. Gunakan ini sebagai referensi jika terjadi masalah atau ketidaksesuaian pada PRD.md

## File `PRD.md` (Versi Terbaru v0.3.0)

```markdown
# PRD: Luvira Sock Brand E-Commerce & Admin Management

## 1. Overview
Luvira E-Commerce adalah web e-commerce berbasis *mobile-first* yang dirancang khusus untuk diletakkan di bio Instagram bisnis kaus kaki Luvira. Mengusung tagline **"Modest • Comfortable • Chic"**, platform ini berfungsi sebagai etalase digital interaktif bagi pelanggan (dengan checkout otomatis via WhatsApp) serta menyediakan **Dashboard Admin CMS** khusus pengelola toko untuk manajemen produk, foto, harga, dan stok secara *real-time*.

## 2. Masalah
- **Conversion Drop-off**: Pembeli dari Instagram enggan melakukan tanya-jawab manual dari nol via WA untuk mengecek varian warna, harga, dan ketersediaan stok.
- **Keterbatasan Update Manual**: Pemilik toko kesulitan mengubah harga promo, menambah foto varian baru, atau memperbarui stok jika data di-hardcode dalam kode web.
- **Informasi Pesanan Tercecer**: CS sering menerima pesan WA tanpa detail alamat atau varian barang yang jelas.

## 3. Target User
- **Pelanggan / Buyer (Mobile View)**: Pengguna Instagram yang mencari kaus kaki jempol (*split toe*) dan kasual. Tanpa perlu login (*Guest Checkout*).
- **Admin Toko / Owner (Desktop & Mobile View)**: Pengelola Luvira yang membutuhkan akses terproteksi ke Dashboard Admin untuk upload foto, ubah deskripsi, atur harga, dan update stok varian.

## 4. Fitur (MVP)

### A. Fitur Public / Buyer Page
1. **Hero & Brand Header**: Logo Luvira, nilai utama (*Modest • Comfortable • Chic*), dan banner promo.
2. **Showcase 4 Model Utama Produk**:
   - **Emboss Split Toe**: Varian jempol dengan tekstur/motif timbul.
   - **Black Sole Split Toe**: Varian jempol dengan telapak hitam (anti kotor).
   - **Anti Slip Split Toe**: Varian jempol dengan grip anti licin di bagian bawah.
   - **Classic**: Varian kaus kaki polos/klasik standar.
3. **Selector Varian Warna & Live Stock**: Pilihan warna interaktif yang menampilkan ketersediaan stok aktual.
4. **Highlight Fitur & Material**: Modul visual penjelas keunggulan produk.
5. **Interactive Cart Drawer**: Keranjang belanja sementara (tambah, kurangi kuantitas, hapus barang).
6. **Integrated WA Checkout Form**: Form data pembeli yang mengompilasi pesanan ke WhatsApp Admin terformat rapi.

### B. Fitur Dashboard Admin (Protected Route)
1. **Admin Authentication / Login**: Halaman login terenkripsi khusus admin (`/admin/login`).
2. **Product Management (CRUD)**:
   - **Tambah / Edit Produk**: Form input nama produk, kategori model, deskripsi, dan fitur.
   - **Varian & Stock Manager**: Pengaturan harga dasar, harga diskon, serta kuantitas stok per varian warna.
   - **Image Uploader**: Upload foto produk langsung dari HP/Laptop ke Cloud Storage.
   - **Toggle Active/Draft Status**: Menonaktifkan produk yang sedang habis/tidak dijual tanpa menghapusnya dari database.

## 5. Di Luar Scope (Sengaja Tidak Dibuat Dulu)
- Registrasi/Login untuk Pelanggan (Pelanggan tetap *Guest*).
- Automatic Payment Gateway (Tetap menggunakan WhatsApp Direct Checkout).
- Fitur Laporan Keuangan / Analitik Penjualan Kompleks.

## 6. User Flow

### Flow Pembeli
1. User mengklik link di bio Instagram Luvira $\rightarrow$ Masuk ke Landing Page.
2. User memilih model kaus kaki & varian warna $\rightarrow$ Cek ketersediaan stok.
3. User menambah produk ke Keranjang $\rightarrow$ Klik **"Lanjut ke Checkout"**.
4. User mengisi Form Data Diri (Nama, No. HP, Alamat Lengkap).
5. User mengklik **"Kirim Pesanan via WhatsApp"** $\rightarrow$ Pesan terformat otomatis dikirim ke WA Admin.

### Flow Admin
1. Admin membuka URL `/admin` $\rightarrow$ Di-redirect ke `/admin/login` jika belum terautentikasi.
2. Admin memasukkan email/username & password.
3. Masuk ke Dashboard Admin:
   - Klik **"Tambah Produk Baru"** atau **"Edit Produk"**.
   - Upload foto produk via form uploader.
   - Atur stok untuk masing-masing varian warna (*e.g.*, Emboss Split Toe - Dusty Rose: 50 pcs).
   - Klik **"Simpan Perubahan"**.
4. Data produk dan stok di halaman publik otomatis ter-update secara *real-time*.

---

## 7. Tech Stack
- **Frontend (Public & Admin)**: Next.js (App Router), React, Tailwind CSS, Lucide React (Dioptimalkan oleh Gemini).
- **Backend & API**: Next.js Route Handlers / Server Actions (Dioptimalkan oleh Claude).
- **Database & Auth**: Supabase / PostgreSQL (DB) + Supabase Auth / NextAuth.js (Auth Admin).
- **File / Image Storage**: Supabase Storage / Cloudinary / Vercel Blob.
- **State Management**: Zustand / React Context.
- **Deployment**: Vercel.

## 8. Cara Menjalankan
1. Clone repository project:
   ```bash
   git clone [https://github.com/luvira/luvira-web.git](https://github.com/luvira/luvira-web.git)
   cd luvira-web

```

2. Install dependencies:
```bash
npm install

```


3. Buat file `.env.local`:
```env
NEXT_PUBLIC_WA_NUMBER="628xxxxxxxxxx"
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="[https://your-supabase-url.supabase.co](https://your-supabase-url.supabase.co)"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
NEXTAUTH_SECRET="your-super-secret-key"

```


4. Jalankan database migration:
```bash
npx prisma db push

```


5. Jalankan server lokal:
```bash
npm run dev

```



## 9. Struktur Folder

```text
/luvira-web
├── /app
│   ├── /admin            → Protected Admin Dashboard Routes
│   │   ├── /login        → Halaman Login Admin
│   │   ├── /products     → List & Form Edit/Tambah Produk
│   │   └── page.tsx      → Admin Main Dashboard
│   ├── /api
│   │   ├── /admin        → API Endpoints CRUD & Upload (Claude)
│   │   └── /products     → Public API Endpoints Produk
│   ├── /checkout         → Halaman Checkout WA
│   ├── layout.tsx        → Root Layout & Navigation
│   └── page.tsx          → Public Landing Page (Catalog & Features)
├── /components
│   ├── /admin            → Admin UI (ProductForm, ImageUploader, StockTable)
│   ├── /ui               → Reusable UI (Button, Input, Modal, Badge)
│   ├── /sections         → Hero, ProductGrid, FeaturesHighlight
│   └── /products         → ProductCard, ColorSelector, ProductDetailModal
├── /lib
│   ├── prisma.ts         → Prisma DB Client
│   ├── supabase.ts       → Supabase Storage & Auth Client
│   └── whatsapp.ts       → WA Text Link Formatter
├── /prisma
│   └── schema.prisma     → Database Schema Definition
└── public/               → Static Assets & Logo Luvira

```

## 10. Database Schema (Prisma / PostgreSQL)

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String   // Hashed Password Admin
  name      String
  role      Role     @default(ADMIN)
  createdAt DateTime @default(now())
}

enum Role {
  ADMIN
}

model Product {
  id          String           @id @default(uuid())
  name        String           // e.g., "Luvira Emboss Split Toe"
  slug        String           @unique
  modelType   ModelType
  description String           @db.Text
  features    String[]         // e.g., ["Breatable", "Anti Dirt"]
  isActive    Boolean          @default(true)
  variants    ProductVariant[]
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
}

enum ModelType {
  EMBOSS_SPLIT_TOE
  BLACK_SOLE_SPLIT_TOE
  ANTI_SLIP_SPLIT_TOE
  CLASSIC
}

model ProductVariant {
  id         String   @id @default(uuid())
  productId  String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  colorName  String   // e.g., "Dusty Rose"
  hexCode    String   // e.g., "#D78A7E"
  price      Int      // Rp 35.000
  stock      Int      @default(0)
  imageUrl   String   // URL foto dari Supabase/Cloudinary Storage
  sku        String?  @unique
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

```

## 11. API Endpoints

| Method | Endpoint | Access | Fungsi |
| --- | --- | --- | --- |
| GET | `/api/products` | Public | Mengambil daftar produk aktif beserta varian & stok |
| GET | `/api/products/[slug]` | Public | Mengambil detail 1 produk |
| POST | `/api/admin/login` | Public | Process autentikasi Admin |
| POST | `/api/admin/products` | Admin Only | Membuat produk baru + varian |
| PUT | `/api/admin/products/[id]` | Admin Only | Mengubah detail produk, harga, dan stok |
| DELETE | `/api/admin/products/[id]` | Admin Only | Hapus/Nonaktifkan produk |
| POST | `/api/admin/upload` | Admin Only | Upload foto produk ke Cloud Storage |

---

## 12. Keputusan Teknis Penting

* **Hybrid Architecture**: Tampilan publik menggunakan SSG/ISR (Server-Side Rendering dengan Cache) agar halaman katalog sangat cepat diakses dari HP, sementara Dashboard Admin menggunakan Dynamic Client Rendering dengan proteksi *Middleware*.
* **Cloud Image Storage**: Menggunakan Supabase Storage / Cloudinary agar Admin bisa langsung mengambil foto dari kamera HP atau galeri dan otomatis dikompresi sebelum disimpan.

---

## 13. Design System

### Warna (Extracted from Logo Luvira)

| Nama | Hex Code | Penggunaan |
| --- | --- | --- |
| Deep Forest Green | `#1E4D48` | Primary Brand, Navigation, Main Buttons, Headings |
| Leaf Olive Green | `#748E44` | Secondary Accent, Badges, Highlights |
| Dusty Coral Rose | `#D78A7E` | Active State, Special Promo Badges, CTA Highlights |
| Soft Warm Cream | `#FDFBF7` | Main Background, Card Backgrounds |
| Muted Charcoal | `#2D3748` | Body Text, Secondary Labels |

---

## 14. Instruksi untuk AI (Claude & Gemini di Antigravity)

### Konvensi Coding

* Wajib gunakan Next.js Middleware untuk memproteksi semua route di bawah `/admin` (kecuali `/admin/login`).
* Gunakan React Server Actions atau Route Handlers yang memvalidasi *session token* sebelum mengeksekusi fungsi upload/edit database.
* Tampilan Form Admin diatur agar tetap nyaman dibuka baik melalui Layar Laptop maupun Handphone Admin.

### Yang BOLEH diubah AI tanpa izin

* Penyesuaian layout form input Admin dan tabel manajemen stok agar efisien.
* Penambahan fungsi kompresi gambar otomatis di sisi client sebelum file diunggah.

### Yang TIDAK BOLEH diubah tanpa konfirmasi

* Struktur Skema Database (`schema.prisma`).
* Format output pesan WhatsApp di `/lib/whatsapp.ts`.

---

## 15. Tasks / Checklist Progress

### Setup & Foundation

* [ ] Initialize Next.js App Router dengan Tailwind CSS & Lucide Icons
* [ ] Setup Prisma Database Schema & Supabase Connection
* [ ] Setup Next.js Middleware untuk Route Protection `/admin`

### Admin Dashboard (CMS)

* [ ] Build Halaman Login Admin (`/admin/login`)
* [ ] Build Dashboard Main Page & Product List Table
* [ ] Build Product Form (Create/Edit Name, Description, Model Type, Features)
* [ ] Build Variant Manager (Color Picker, Price, Stock per color)
* [ ] Build Image Uploader Component (Drag & Drop / File Select to Cloud Storage)
* [ ] Build API Endpoints `/api/admin/*` dengan Middleware Auth

### Public Storefront

* [ ] Build Header dengan Logo Luvira & Tagline "Modest • Comfortable • Chic"
* [ ] Build Dynamic Product Grid & Color Selector (Integrasi Data dari DB)
* [ ] Build Feature Showcase Section
* [ ] Build Cart Drawer dengan LocalStorage Persistence
* [ ] Build Form Checkout & Integrated WhatsApp Link Generator

---

## 16. Changelog

### [0.3.0] - 2026-08-13

#### Added

* Penambahan Role **Admin** dan Dashboard CMS terproteksi (`/admin`).
* Integrasi Database PostgreSQL (Prisma ORM) & Cloud Storage untuk Upload Foto Produk.
* Pengelolaan CRUD Produk, Deskripsi, Harga, dan Stok Varian Warna secara dinamis.
* Integrasi Middleware Auth untuk mengamankan API Admin & Halaman Dashboard.

```

```