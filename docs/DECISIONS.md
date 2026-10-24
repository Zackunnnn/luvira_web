# LUVIRA 2.0: Dokumen Keputusan Arsitektur dan Teknis (DECISIONS.md)

Dokumen ini mencatat keputusan-keputusan teknis, penyelarasan antar dokumen, serta asumsi yang diambil selama pembangunan Luvira 2.0 secara otonom.

---

## D-01: Tetap Menggunakan PostgreSQL (Pembatalan Migrasi MySQL)
- **Konteks**: Awalnya ada rencana migrasi ke MySQL untuk Hostinger Business. Namun Hostinger tidak menyediakan Managed MySQL standalone yang terpisah untuk skenario ini, hanya Supabase & MongoDB Atlas.
- **Keputusan**: Database tetap PostgreSQL (`provider = "postgresql"` di Prisma).
- **Alasan**: Sesuai perubahan di `docs/LUVIRA_2_PLAN.md` bagian 2 butir 2 oleh Wann (24 Okt 2026).
- **Lokasi Terkait**: `prisma/schema.prisma`, `.env`.

---

## D-02: Isolasi Lingkungan Database (Dev vs Test vs Prod)
- **Konteks**: Larangan keras menyentuh database produksi Neon `main` (`ep-holy-meadow-*`).
- **Keputusan**:
  - `DATABASE_URL`: Mengarah ke Neon Dev (`ep-aged-pond-*`).
  - `DATABASE_URL_TEST`: Mengarah ke Neon Test (`ep-jolly-mode-*`).
  - Dibuat pengaman otomatis di `lib/db-guard.ts` yang menolak migrasi, seed, atau reset jika mendeteksi host produksi atau jika test DB sama dengan dev DB.
- **Alasan**: Menjaga data produksi tidak pernah tersentuh secara tidak sengaja oleh proses dev maupun automasi tes.

---

## D-03: Adapter Eksternal dengan Mock/Deterministic Mode
- **Konteks**: Seluruh tes dan proses pengembangan harus bisa berjalan 100% tanpa internet / tanpa kredensial asli pihak ketiga.
- **Keputusan**:
  - `SHIPPING_MODE=mock|live`: Default `mock`. Menghasilkan tarif ongkir deterministik berdasarkan origin, destination, berat, dan kurir (JNE, POS, TIKI, SiCepat, J&T).
  - `MIDTRANS_MODE=mock|sandbox|production`: Default `mock`. Menghasilkan token Snap simulasi dan verifikasi signature SHA512 yang tepat sehingga webhook dapat diuji secara idempoten.
  - `EMAIL_MODE=log|smtp`: Default `log`. Menulis konten notifikasi email ke logger/memory tanpa membutuhkan server SMTP sungguhan saat dev/test.
  - `IMAGE_STORAGE_MODE=local-stub|imagekit`: Default `local-stub` di test, `imagekit` jika kredensial tersedia.
- **Alasan**: Memastikan gate testing kumulatif stabil, cepat, dan tidak flaky.

---

## D-04: Penanganan Placeholder Data Wilayah & Asal Ongkir
- **Konteks**: Alamat detail dan Origin ID RajaOngkir untuk Gudang Pusat (Kota Depok) dan Gudang Yogyakarta belum difinalkan oleh pemilik usaha.
- **Keputusan**:
  - Ditetapkan placeholder yang jelas di seed dan database:
    - Pusat: Origin ID `115` (Kota Depok, Jawa Barat), Alamat `[PLACEHOLDER] Jl. Margonda Raya No. 100, Beji, Kota Depok`.
    - Yogyakarta: Origin ID `501` (Kota Yogyakarta, DI Yogyakarta), Alamat `[PLACEHOLDER] Jl. Malioboro No. 45, Danurejan, Kota Yogyakarta`.
  - Diberikan tanda visual `[PLACEHOLDER]` di dashboard admin dan owner sehingga mudah diidentifikasi dan diubah sewaktu-waktu.
- **Dapat Diubah di**: Dashboard Admin / Dashboard Owner pada menu Pengaturan Lokasi Toko.

---

## D-05: Struktur Hak Akses dan Perlindungan Data Sensitif
- **Konteks**: Tabel bagian 4 plan mendefinisikan pembagian wewenang yang ketat untuk 5 peran: `BUYER`, `ADMIN_PUSAT`, `ADMIN_WILAYAH`, `OWNER`, `DEVELOPER`.
- **Keputusan**:
  - `lib/permissions.ts` adalah single source of truth untuk `can(user, permission, resource)`.
  - Data harga modal (`ProductCost`) dipisahkan ke model tersendiri di Prisma sehingga query Admin secara eksplisit tidak pernah men-select tabel ini.
  - Query pesanan dan stok untuk Admin Wilayah secara ketat diberi filter `where: { regionId: user.regionId }`.
