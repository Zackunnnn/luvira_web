# Panduan Migrasi Database: Neon (PostgreSQL) ke Managed MySQL Hostinger

Dokumen ini adalah panduan teknis resmi migrasi database website Luvira dari PostgreSQL (Neon) ke Managed MySQL di Hostinger Business.

---

## 1. Ringkasan Perubahan Skema (`schema.prisma`)

| Aspek | PostgreSQL (Lama) | MySQL Hostinger (Baru) | Penjelasan Teknis |
|---|---|---|---|
| **Datasource Provider** | `provider = "postgresql"` | `provider = "mysql"` | Menggunakan driver MySQL bawaan Prisma. |
| **Field `Product.features`** | `String[]` (Postgres native array) | `Json` | MySQL tidak mendukung tipe array native. Format `Json` menyimpan array string secara native dan transparan di Next.js. |
| **Panjang Kolom ID & Unik** | `String @id @default(cuid())` / `@unique` | Ditambahkan `@db.VarChar(191)` | Menjamin batas panjang indeks aman untuk charset `utf8mb4` MySQL (max 767 bytes pada InnoDB lama / 3072 bytes). |
| **Kolom Teks Panjang** | `String @db.Text` | `String @db.Text` | Tetap menggunakan tipe `TEXT` MySQL untuk deskripsi produk, log perubahan, dan token Midtrans. |
| **Optimasi Indeks** | Belum terindeks | Ditambahkan `@@index([status])`, `@@index([createdAt])`, `@@index([promoCodeId])` pada tabel `Order` | Mempercepat query filtering pesanan dan agregasi analitik di dasbor Owner. |
| **Relasi OnDelete** | Implicit / default | Eksplisit `onDelete: Cascade` pada `OrderItem` dan `ColorVariant` | Mencegah foreign key constraint error saat mutasi data relasional. |

---

## 2. Variabel Lingkungan yang Perlu Diisi Wann di hPanel Hostinger

Masuk ke **hPanel Hostinger** > **Websites** > **Manage** > **Environment Variables** (atau file `.env` di Node.js dashboard):

| Nama Variabel | Contoh Nilai | Keterangan |
|---|---|---|
| `DATABASE_URL` | `mysql://u123456789_luvira:PasswordRahasia@127.0.0.1:3306/u123456789_luviradb?connection_limit=5` | Kredensial MySQL Hostinger. Tambahkan parameter `?connection_limit=5` untuk mencegah exhaustion connection pool di shared hosting. |
| `JWT_SECRET` | `string-acak-panjang-minimal-32-karakter-keamanan-tinggi` | Kunci rahasia untuk tanda tangan digital session cookie admin & owner. |
| `MIDTRANS_SERVER_KEY` | `Mid-server-xxxxxxxxxxxx` | Server Key dari Midtrans Dashboard Production / Sandbox. |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | `Mid-client-xxxxxxxxxxxx` | Client Key dari Midtrans Dashboard. |
| `NEXT_PUBLIC_MIDTRANS_ENV` | `production` (atau `sandbox`) | Menentukan apakah Snap popup menggunakan endpoint Live atau Sandbox. |
| `NEXT_PUBLIC_ADMIN_WA` | `6281234567890` | Nomor WhatsApp resmi Luvira untuk konfirmasi transfer manual. |
| `NEXT_PUBLIC_PPN_RATE` | `11` | Tarif PPN resmi (11%). |
| `SHIPPING_MODE` | `mock` | Mode kalkulasi ongkir (`mock` untuk simulasi saat ini, `live` jika RajaOngkir sudah dipasang). |
| `NODE_ENV` | `production` | Mode runtime aplikasi Next.js. |

---

## 3. Urutan Langkah Deployment & Migrasi Data di Hostinger

1. **Buat Database MySQL di hPanel**:
   - Masuk ke **hPanel** > **Databases** > **Management**.
   - Buat database baru (misal: `luviradb`), username, dan password yang kuat. Catat kredensialnya.
2. **Setup Environment Variables**:
   - Isi seluruh variabel di tabel Bagian 2 di menu Environment Variables aplikasi Node.js Hostinger.
3. **Eksekusi Build & Migrasi Skema**:
   - Di terminal Node.js Hostinger (atau melalui CI/CD GitHub action):
     ```bash
     npm install
     npx prisma generate
     npx prisma db push # Menerapkan skema MySQL ke database Hostinger yang baru
     ```
4. **Impor Data Awal dari Backup**:
   - Jalankan skrip impor yang sudah disiapkan:
     ```bash
     npx tsx scripts/import-mysql.ts
     ```
   - Skrip akan otomatis memuat 5 produk, 26 varian, 2 akun pengguna (admin & owner), 5 kode promo, 4 pesanan, dan konten landing page ke MySQL.
5. **Jalankan Aplikasi**:
   ```bash
   npm run build
   npm run start
   ```

---

## 4. Prosedur Rollback Cepat ke Neon (PostgreSQL)

Jika terjadi kendala teknis tak terduga pada MySQL Hostinger:

1. **Kembalikan `DATABASE_URL` ke Neon**:
   - Di hPanel / `.env`, kembalikan nilai `DATABASE_URL` menggunakan connection string Neon PostgreSQL yang tersimpan aman di `.env.local`:
     ```env
     DATABASE_URL="postgresql://neondb_owner:***@ep-holy-meadow-***-pooler.c-12.us-east-1.aws.neon.tech/neondb?sslmode=require"
     ```
2. **Kembalikan Provider di `prisma/schema.prisma`**:
   - Ubah `provider = "mysql"` kembali ke `provider = "postgresql"`.
   - Ubah `features Json` kembali ke `features String[]`.
3. **Regenerate Prisma Client**:
   ```bash
   npx prisma generate
   ```
4. **Restart Server**:
   ```bash
   npm run build && npm run start
   ```
   *Karena database Neon tidak pernah disentuh atau dihapus sama sekali, seluruh data toko akan langsung kembali aktif normal dalam hitungan menit.*
