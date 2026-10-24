# LUVIRA 2.0: Prompt Antigravity per Fase

> **Urutan:** Prompt 01 (Cleaning, file terpisah) → Fase 1 → 2 → 3 → 4 → 5 → Testing menyeluruh → Fase 6.
> **Syarat awal:** Prompt 01 sudah selesai dan disetujui, dan file `Luvira_02_Plan_2.0.md` sudah disalin ke repo sebagai `docs/LUVIRA_2_PLAN.md`.
> **Cara pakai:** satu prompt = satu sesi Antigravity. Tempel blok **"BLOK UMUM"** di bawah di awal **setiap** prompt, lalu prompt fase yang dituju. Jangan lanjut ke fase berikutnya sebelum DoD fase sekarang lolos dan Wann menyetujui.

---

## BLOK UMUM (tempel di awal setiap prompt fase)

```
Kamu adalah senior full-stack engineer (Next.js App Router, TypeScript, Prisma, PostgreSQL) yang membangun Luvira 2.0, website e-commerce kaus kaki yang akan dipakai sungguhan.

WAJIB sebelum mulai:
1. Baca SELURUH `docs/LUVIRA_2_PLAN.md`. Itu satu-satunya sumber kebenaran. Jika prompt ini bertentangan dengan dokumen itu, hentikan dan tanyakan ke Wann, jangan menebak.
2. Baca juga `docs/CLEANUP_REPORT.md` dan `docs/DB_MIGRATION.md` bila ada.

Aturan kerja:
- Bahasa komunikasi dan teks antarmuka: Indonesia. Nama kode (variabel, file, commit): Inggris.
- Kerjakan di branch `feat/<nama-fase>`. Jangan push atau merge ke branch yang dipakai Hostinger untuk auto-deploy tanpa persetujuan tertulis Wann.
- Commit kecil dengan pesan jelas. Satu commit = satu perubahan logis.
- Rahasia (kunci API, DATABASE_URL, JWT secret, kunci Midtrans/RajaOngkir) hanya lewat environment variable. Perbarui `.env.example` tanpa nilai asli. Jangan pernah mencetak atau meng-commit rahasia.
- Database: pengembangan dan pengujian memakai database PostgreSQL TERPISAH (cabang/database Neon baru atau PostgreSQL lokal). JANGAN menjalankan migrasi, seed, atau skrip penulisan pada database produksi saat ini. Migrasi ke produksi hanya di Fase 6 dengan persetujuan tertulis Wann.
- Ikuti asumsi A1 sampai A12 di bagian 3 plan kecuali Wann mengubahnya. Jika sebuah keputusan produk belum tercakup di plan, ambil pilihan paling aman dan sederhana, catat di `docs/DECISIONS.md`, lalu lanjut. Hanya berhenti untuk bertanya bila jawabannya akan mengubah arsitektur atau menyangkut uang.
- Jangan menambah fitur di luar fase ini. Jangan merombak yang sudah lolos fase sebelumnya kecuali untuk memperbaiki bug.
- Semua perhitungan uang, stok, dan hak akses dilakukan DI SERVER. Setiap route handler dan server action wajib memeriksa izin lewat `can(...)` dari `lib/permissions.ts`.
- Setiap fitur wajib punya keadaan: memuat, kosong, error (dengan tombol coba lagi), dan sukses. Teks error dalam bahasa Indonesia yang ramah.
- Tulis tes bersamaan dengan kodenya (bukan di akhir). Fase dianggap selesai hanya jika Definition of Done fase itu terpenuhi dan terbukti dengan output nyata (hasil perintah, tangkapan layar, atau log uji), bukan klaim.
- Di akhir, serahkan: ringkasan perubahan, daftar file penting, hasil tes (PASS/FAIL), daftar masalah terbuka, dan pertanyaan untuk Wann bila ada. Jangan menyatakan "selesai" bila ada tes merah.
```

---

## FASE 1: Fondasi (skema 2.0, peran, auth, audit)

```
FASE 1: FONDASI

Tujuan: membangun fondasi data dan keamanan untuk 5 peran, wilayah, dan stok per wilayah. Belum ada UI pembeli/admin lengkap; fokus pada skema, auth, otorisasi, audit, seed, dan tes.

Kerjakan:
1. Skema Prisma (PostgreSQL) sesuai bagian 7 plan: User (5 peran, regionId), Region, RegionCoverage, Product, ProductVariant, ProductCost (terpisah), Stock, StockMovement, Order, OrderItem, OrderStatusLog, Payment, PaymentAccount, PromoCode (tipe RESELLER/WILAYAH, isFreeShipping default false), Advice, Setting, Notification, AuditLog, ErrorLog, DailyTraffic, ShippingCache. Pertahankan data dan perilaku yang sudah ada dari fase cleaning (produk, varian, URL foto ImageKit apa adanya, promo, PPN) lewat migrasi yang aman, jangan hilangkan data. Tambahkan index dan constraint unik yang masuk akal (kode pesanan, kode promo, stok per variant-wilayah). Dokumentasikan di `docs/DB_SCHEMA.md` dengan diagram relasi sederhana (mermaid).
2. Seed (`prisma/seed.ts`): wilayah Pusat (Kota Depok) dan Yogyakarta; cakupan (DIY → Yogyakarta, lainnya → Pusat); akun contoh untuk SETIAP peran dengan sandi acak yang dicetak sekali ke terminal lokal (bukan disimpan di repo); produk dan stok contoh (berat default 35 gram per varian); dua rekening transfer dari bagian 2 plan; Setting awal (ppnRate 11, batas diskon promo, daftar kurir). Seed hanya untuk pengembangan/staging; sediakan perintah terpisah untuk membuat akun Owner pertama di produksi. Sediakan juga skrip `prisma/scripts/map-local-photos.ts` yang mencocokkan produk/varian dengan berkas di `public/socks`. Penamaan berkas yang dipakai Wann adalah **kode huruf + nomor urut** (mis. `as1`, `bsst3`, `est4`, `e2`, format `.webp`), BUKAN `<produk>-<warna>-<n>`. Susun usulan pemetaan kode → produk/varian dari data produk yang ada (nama, slug, SKU, warna) dan tulis di `docs/PHOTO_MAP.md` untuk dikonfirmasi Wann. Kode yang tidak bisa dipastikan ditandai dan ditanyakan, jangan ditebak. Setelah dikonfirmasi, isi URL lokal `/socks/<nama-berkas>` (nomor terkecil = foto utama, kecuali Wann menyebut lain) dan laporkan berkas yang tidak terpakai. URL ImageKit lama jangan dihapus: simpan di kolom cadangan `legacyImageUrl`. Jangan menghapus atau mengubah berkas di `public/socks`.
3. Auth: login email+sandi, hash argon2 atau bcrypt, sesi JWT di cookie httpOnly SameSite=Lax, logout, ganti sandi, batas percobaan login, akun nonaktif tidak bisa login. Middleware melindungi grup rute `(admin)`, `(owner)`, `(developer)`.
4. Otorisasi: `lib/permissions.ts` berisi matriks izin PERSIS seperti tabel bagian 4 plan (bentuk data, bukan if-else tersebar), plus helper `can(user, permission, resource?)` yang memahami pembatasan wilayah. Sediakan helper kueri yang otomatis menambah filter wilayah untuk Admin Wilayah. Kolom harga modal tidak boleh ikut ter-select untuk peran selain Owner/Developer.
5. Audit log: helper `audit(actor, action, entity, before, after)` yang dipakai di semua mutasi penting. Tidak ada rute atau fungsi untuk mengubah/menghapus AuditLog.
6. Halaman minimal: login, halaman "tidak punya akses", dan satu halaman dashboard kosong per peran yang menampilkan nama dan peran (untuk membuktikan routing peran).
7. Tes:
   - unit: `can()` untuk semua kombinasi peran × izin × (wilayah sendiri/lain)
   - matriks otomatis: bangkitkan dari `permissions.ts`, tembak setiap endpoint yang ada dengan setiap peran dan tanpa login, bandingkan dengan harapan
   - integrasi: Admin Wilayah A tidak bisa membaca/mengubah data wilayah B; Admin tidak menerima harga modal
   - akun nonaktif ditolak; audit log tercatat saat mutasi

Definition of Done:
- `npm run lint`, `tsc --noEmit`, `npm run build`, semua tes hijau
- tes matriks hak akses lulus 100%
- login berfungsi untuk kelima peran di lingkungan lokal dengan PostgreSQL
- `docs/DB_SCHEMA.md` dan `docs/DECISIONS.md` ada
- .env.example lengkap
```

---

## FASE 2: Sisi pembeli

```
FASE 2: SISI PEMBELI

Tujuan: pembeli bisa melihat katalog, memilih lokasi/alamat detail, menghitung ongkir, membayar (Midtrans atau transfer manual), dan melacak pesanan, dengan UI/UX yang nyaman di HP.

Sebelum mulai: buka dokumentasi resmi RajaOngkir (rajaongkir.com/docs) dan Midtrans, konfirmasi nama endpoint, parameter, kode kurir, dan format respons TERBARU. Jika berbeda dari plan, ikuti dokumentasi resmi dan catat di `docs/DECISIONS.md`.

Kerjakan:
1. Sistem desain: token warna/tipografi/jarak terpusat dan set komponen konsisten (tombol, input, combobox, kartu, badge, toast, skeleton, dialog). Ambil identitas dari aset brand di repo; jika belum ada, buat dua opsi sederhana dan tunggu pilihan Wann sebelum menerapkannya luas. Mobile-first mulai 360 px.
2. Katalog dan detail produk: daftar, filter sederhana, galeri, pilihan varian, harga, ketersediaan stok sesuai lokasi yang dipilih (default stok Pusat dengan penanda "tergantung lokasi"), SEO (metadata, OG, sitemap). Foto produk dimuat dari kolom URL generik: berkas lokal `/socks/...` untuk pengembangan/staging, atau URL ImageKit untuk produksi. Pakai `next/image` dengan loader transformasi ImageKit (lebar sesuai `sizes`, format otomatis, kualitas ±80) dan `sizes` yang benar dan `priority` hanya untuk gambar di atas lipatan, dan pastikan tidak ada gambar yang dimuat lebih besar dari kebutuhan tampilannya.
3. Halaman nasihat: daftar dan detail.
4. Pilih lokasi: modal/bar lokasi (provinsi, kota) yang tersimpan; mengubah lokasi memperbarui ketersediaan stok.
5. Layanan RajaOngkir (server saja, kunci tidak pernah ke browser):
   - route internal untuk provinsi, kota, kecamatan, kelurahan, dan pencarian langsung
   - cache wilayah berumur panjang dan cache tarif TTL pendek di `ShippingCache`
   - hitung ongkir (asal = wilayah penangan, tujuan = ID kelurahan/kecamatan, berat total gram, kurir pilihan)
   - tangani gagal/kuota habis dengan pesan ramah, jangan crash, checkout tetap bisa dicoba ulang
6. Form alamat: combobox bertingkat yang bisa dicari (Provinsi → Kota/Kabupaten → Kecamatan → Kelurahan/Desa), kode pos otomatis, kotak "Cari cepat" (debounce 400 ms, minimal 3 karakter) yang mengisi semua tingkat, plus kolom nama jalan, gang/blok, nomor rumah, RT/RW, patokan kurir, nama penerima, nomor WhatsApp (normalisasi ke 62…). Dapat dipakai penuh dengan keyboard. Simpan alamat terakhir di browser.
7. Keranjang dan checkout bertahap: Keranjang → Alamat dan kontak → Pengiriman → Pembayaran → Konfirmasi. Ringkasan total selalu terlihat (bar bawah di HP). Kode promo dengan validasi server.
8. Routing pesanan sesuai bagian 5.2 plan: cari wilayah dari cakupan, cek stok, fallback ke Pusat, reserve stok secara atomik dalam satu transaksi (update bersyarat), asal ongkir dari wilayah penangan. Satu fungsi `lib/pricing` menghitung subtotal, diskon, PPN, ongkir, total; dipakai bersama oleh pembuatan pesanan dan baris item Midtrans.
9. Pembayaran:
   - Midtrans Snap: token dibuat di server, gross_amount = jumlah baris item (termasuk ongkir, PPN, diskon), webhook dengan verifikasi `signature_key`, idempoten, konfirmasi ulang lewat API status transaksi, pemetaan status sesuai bagian 5.3
   - Transfer manual: pilih bank dari tabel PaymentAccount, tampilkan nomor, atas nama, nominal persis, unggah bukti (tipe/ukuran divalidasi, simpan ke ImageKit), status `menunggu_verifikasi`
   - kedaluwarsa 24 jam: route job `/api/cron/expire-orders` yang dilindungi token rahasia, melepas stok dan kuota promo
10. Halaman tracking pesanan: masukkan kode pesanan + 4 digit terakhir WhatsApp; tampilkan status, ringkasan, kurir dan nomor resi bila ada, tombol bantuan WhatsApp. Ada pembatasan laju.
11. Halaman sukses/gagal pembayaran, email konfirmasi pesanan (SMTP), dan notifikasi ke admin wilayah (baris Notification + email).
12. Penghitung traffic sederhana (beacon ke `/api/track`, agregat harian, saring bot, tanpa data pribadi).

Tes (tulis bersamaan):
- unit: pricing, promo, normalisasi WA, pemetaan status Midtrans, state machine pesanan
- integrasi: pembuatan pesanan dengan stok pas-pasan + permintaan bersamaan (tidak boleh oversell), webhook ganda tidak menggandakan efek, kedaluwarsa melepas stok dan kuota promo, RajaOngkir di-mock
- E2E Playwright: E2E-01, 02, 03, 04, 05, 06, 07, 13, 14, 15 dari bagian 13 plan

Definition of Done:
- semua tes fase ini hijau; lint, tsc, build lolos
- pesanan lengkap berhasil di sandbox Midtrans dan lewat transfer manual (sertakan bukti)
- tampilan diperiksa di lebar 360, 390, 768, 1280 tanpa elemen terpotong
- semua layar punya keadaan memuat/kosong/error/sukses
- tidak ada kunci rahasia di bundle klien (buktikan dengan pemeriksaan hasil build)
```

---

## FASE 3: Sisi admin (Admin Pusat dan Admin Wilayah)

```
FASE 3: SISI ADMIN

Tujuan: Admin Pusat dan Admin Wilayah dapat mengelola pekerjaan hariannya sesuai hak akses bagian 4 plan, tanpa bisa menyentuh data di luar wewenangnya.

Kerjakan (UI harus nyaman di HP dan desktop):
1. Kerangka dashboard admin: navigasi sesuai peran, lonceng notifikasi dengan badge (polling ~30 detik), ringkasan pesanan yang butuh tindakan.
2. Pesanan: daftar dengan cari/filter (status, tanggal, metode bayar), detail pesanan, verifikasi bukti transfer (Konfirmasi / Tolak dengan alasan), ubah status mengikuti state machine, isi kurir dan nomor resi (wajib sebelum `dikirim`), catat riwayat status. Admin Wilayah hanya melihat pesanan wilayahnya; Admin Pusat mengelola Pusat dan hanya melihat wilayah lain.
3. Katalog (Admin Pusat): tambah/ubah produk dan varian, unggah foto ke ImageKit, berat gram per varian (default 35, bisa diedit), aktif/nonaktif, serta ganti/unggah ulang foto dengan pratinjau, urutan foto, dan foto utama. Foto lama di ImageKit tidak boleh dihapus otomatis saat diganti kecuali Admin Pusat mengonfirmasi. Pipeline unggah: validasi tipe/ukuran di server, resize sisi panjang maksimum ±2000 px sebelum dikirim, unggah ke ImageKit (BUKAN ke `public/uploads/`, yang tidak permanen di hosting), simpan URL ImageKit di database, dan tampilkan lewat loader transformasi ImageKit. Harga jual seragam hanya bisa diubah Admin Pusat (dan Owner di fase 4). Tidak ada akses ke harga modal.
4. Stok: tiap admin mengatur stok wilayahnya; ada riwayat perubahan (StockMovement) dan peringatan stok menipis.
5. Nasihat: tulis, ubah, hapus, terbitkan/draf. Admin Wilayah hanya miliknya; Admin Pusat semua (asumsi A3).
6. Lokasi, profil, dan kontak toko: Admin Wilayah wilayahnya; Admin Pusat semua wilayah. Termasuk titik asal RajaOngkir (pilih lewat pencarian, simpan ID).
7. Promo: Admin Pusat membuat promo reseller (nasional) dan wilayah; Admin Wilayah membuat promo kustom hanya untuk wilayahnya, dengan batas diskon maksimum dari Setting (asumsi A4). Validasi kuota, periode, minimal belanja. Rekap pemakaian per kode.
8. Kelola akun (Admin Pusat): tambah/nonaktifkan Admin Wilayah dan tetapkan wilayah, tidak boleh menyentuh akun Owner, Developer, atau Admin Pusat lain (asumsi A2).
9. Semua mutasi memanggil `audit(...)`. Semua aksi merusak memakai dialog konfirmasi.

Tes:
- unit/integrasi: setiap server action admin menolak peran/wilayah yang tidak berhak; mutasi menulis audit log; promo wilayah ditolak jika melebihi batas atau di luar wilayah
- matriks hak akses diperbarui otomatis untuk semua endpoint baru
- E2E Playwright: E2E-02, 03, 08, 09 (dan pastikan E2E fase 2 masih hijau)

Definition of Done:
- semua tes hijau, termasuk regresi fase 1 dan 2
- terbukti: Admin Wilayah Yogyakarta tidak dapat membaca/mengubah pesanan, stok, atau promo wilayah lain (sertakan hasil tes)
- terbukti: respons API untuk peran admin tidak pernah memuat harga modal
- notifikasi pesanan baru muncul di dashboard admin yang tepat dan terkirim via email
- semua layar punya keadaan memuat/kosong/error/sukses
```

---

## FASE 4: Dashboard Owner

```
FASE 4: DASHBOARD OWNER

Tujuan: Owner dapat memantau seluruh bisnis, mengelola admin dan pengaturan, dan mencetak laporan yang angkanya benar.

Kerjakan:
1. Dashboard ringkas: traffic (kunjungan harian/mingguan, halaman teratas), penjualan (omzet, jumlah pesanan, rata-rata nilai pesanan), stok per wilayah dan stok menipis, pesanan per status, perbandingan antar wilayah. Filter periode dan wilayah.
2. Rekap bulanan dan tahunan: penjualan, diskon, ongkir, PPN, harga modal, laba kotor, produk terlaris, pemakaian promo (reseller dan wilayah). Perhitungan harga modal memakai snapshot di OrderItem, bukan harga modal saat ini.
3. Cetak/unduh laporan: tampilan cetak yang rapi, PDF, dan Excel (.xlsx). Judul, periode, wilayah, tanggal cetak, dan nama pencetak ada di setiap laporan.
4. Kelola admin: tambah/nonaktifkan semua jenis akun admin, tetapkan wilayah, atur ulang sandi. Kelola wilayah dan cakupan layanan (provinsi/kota → wilayah).
5. Pengaturan: ppnRate, daftar kurir aktif, batas diskon promo, ambang stok menipis, rekening transfer (aktif/nonaktif, tambah, ubah).
6. Harga: Owner dapat mengubah harga jual (seragam) dan mengelola harga modal. Owner juga dapat membuat promo reseller dan wilayah.
7. Riwayat perubahan (audit log) dengan filter pelaku, entitas, tanggal.
8. Owner tetap hanya melihat katalog dan pesanan (perubahan lewat Admin), sesuai keputusan di plan.

Tes:
- unit: seluruh agregasi laporan terhadap data uji yang dihitung manual (sertakan fixture dan hasil harapan)
- integrasi: Owner tidak bisa mengubah produk/pesanan; Admin Pusat tidak bisa membuka halaman pengaturan Owner
- E2E Playwright: E2E-10, 11

Definition of Done:
- angka dashboard dan laporan cocok dengan hitung manual dari data uji (tunjukkan perbandingan)
- PDF dan Excel terunduh, isinya benar, dan terbaca rapi
- semua tes hijau, termasuk regresi fase 1 sampai 3
```

---

## FASE 5: Dashboard Developer

```
FASE 5: DASHBOARD DEVELOPER

Tujuan: Developer dapat memeriksa kesehatan seluruh modul dan database dalam satu tempat, tanpa kemampuan mengubah data bisnis.

Kerjakan sesuai bagian 11 plan:
1. Kesehatan: ping database, versi migrasi terakhir, status R2 dan ImageKit, keberadaan kunci RajaOngkir dan Midtrans (jangan tampilkan nilainya) beserta mode sandbox/production, uji ringan RajaOngkir, waktu notifikasi Midtrans terakhir diterima.
2. Antrean bermasalah: pesanan `menunggu_verifikasi` > 24 jam, pesanan `diproses` > N hari tanpa resi, stok `reserved` yang tidak cocok dengan pesanan aktif (harus nol selisih), notifikasi gagal terkirim.
3. Error terbaru dari ErrorLog (penyaringan per rute, retensi dan ukuran dibatasi). Pasang pencatat error di server dan error boundary di klien, dengan pembatasan laju agar tidak membanjiri database.
4. Audit log (hanya lihat).
5. Pastikan Developer tidak punya izin tulis ke data bisnis, dan setiap akses Developer ke halaman sensitif tercatat.

Tes:
- integrasi: setiap indikator berubah saat kondisinya sengaja dirusak di lingkungan uji (matikan database uji, hapus kunci, buat pesanan macet buatan, buat selisih reserved)
- matriks hak akses untuk semua endpoint Developer
- E2E Playwright: E2E-12

Definition of Done:
- semua indikator terbukti bereaksi benar terhadap kerusakan buatan (sertakan bukti)
- Developer tidak bisa mengubah data bisnis (tes penolakan lulus)
- semua tes hijau, termasuk regresi fase 1 sampai 4
```

---

## PROMPT TESTING MENYELURUH (jalankan setelah Fase 5, sebelum Fase 6)

```
TESTING MENYELURUH LUVIRA 2.0

Peranmu sekarang adalah QA engineer yang skeptis. Tujuanmu MENCARI KEGAGALAN, bukan membenarkan. Jangan mengubah fitur; boleh memperbaiki bug yang ditemukan, satu bug satu commit dengan tes regresi.

Kerjakan:
1. Jalankan seluruh suite (unit, integrasi, matriks hak akses, E2E). Laporkan hasil apa adanya.
2. Audit celah cakupan: bandingkan daftar endpoint, halaman, dan server action dengan tes yang ada. Tambahkan tes untuk yang belum tertutup, prioritas: uang, stok, hak akses.
3. Uji keamanan dasar: coba akses setiap rute admin/owner/developer tanpa login dan dengan peran salah; coba memanipulasi harga, ongkir, diskon, dan total dari klien; coba memakai promo wilayah dari wilayah lain; coba melihat bukti transfer atau pesanan orang lain; coba brute-force login dan tracking; coba unggah file berbahaya atau terlalu besar. Semuanya harus ditolak dengan pesan aman.
4. Uji konkurensi: 30 permintaan bersamaan membeli stok terakhir sebuah varian (hanya satu boleh berhasil); notifikasi Midtrans dikirim dua kali; dua admin mengubah status pesanan yang sama bersamaan.
5. Uji kegagalan eksternal: RajaOngkir timeout/kuota habis/respons aneh, Midtrans webhook dengan signature salah, ImageKit/R2 gagal unggah, SMTP gagal. Aplikasi tidak boleh crash dan pesan ke pengguna harus jelas.
6. Uji data tepi: nama dengan karakter khusus, alamat sangat panjang, berat nol, keranjang kosong, promo kedaluwarsa tepat di batas waktu, pembulatan PPN dan total (bandingkan dengan perhitungan manual).
7. Uji UI/UX: jalankan semua alur utama di lebar 360, 390, 768, 1280; periksa elemen terpotong, kontras, fokus keyboard pada combobox alamat, keadaan memuat/kosong/error, dan teks yang masih berbahasa Inggris atau berantakan.
8. Performa: Lighthouse mobile untuk halaman katalog, produk, checkout; uji beban ringan 50 pengguna bersamaan pada alur checkout sambil memantau jumlah koneksi database (harus di bawah batas hosting).
9. Konsistensi data: pastikan tidak ada selisih antara stok reserved dan pesanan aktif, total pesanan = jumlah baris item + ongkir + PPN − diskon, dan total laporan Owner = jumlah pesanan yang lunas.

Serahkan `docs/TEST_REPORT.md` berisi:
- tabel hasil per kategori (PASS/FAIL), dengan bukti ringkas
- daftar bug: judul, langkah reproduksi, tingkat keparahan (tinggi = uang/stok/akses/tidak bisa checkout), status (diperbaiki/terbuka)
- cakupan tes sebelum dan sesudah
- rekomendasi go/no-go berdasarkan aturan lolos di bagian 13 plan

Jangan menyatakan "siap rilis" jika ada bug berkeparahan tinggi yang terbuka.
```

---

## FASE 6: Pengerasan dan peluncuran

```
FASE 6: PENGERASAN DAN PELUNCURAN

Tujuan: menyiapkan Luvira 2.0 ke produksi di Hostinger dengan aman dan bisa dikembalikan bila ada masalah. JANGAN deploy ke produksi tanpa persetujuan tertulis Wann pada setiap checkpoint.

Kerjakan:
1. Pengerasan: header keamanan (CSP yang masuk akal, nosniff, referrer-policy), rate limit di semua endpoint sensitif, audit dependensi (`npm audit`) dan perbarui yang berisiko tinggi, pastikan tidak ada `console.log` berisi data sensitif, pastikan error produksi tidak membocorkan detail teknis ke pengguna.
2. Performa: perbaiki temuan Lighthouse dan uji beban dari testing, batasi `connection_limit` Prisma, cache yang aman, optimasi gambar.
3. Operasional: route job terjadwal (kedaluwarsa pesanan, pembersihan log, ringkasan harian) dengan token rahasia; dokumentasikan konfigurasi Cron Jobs di hPanel; skrip ekspor database berkala ke penyimpanan di luar hosting; panduan restore.
4. Dokumen: `docs/RUNBOOK.md` (deploy, rollback, rotasi kunci, membuat akun Owner pertama, apa yang dilakukan jika Midtrans/RajaOngkir/database bermasalah), `docs/UAT_CHECKLIST.md` berbahasa bisnis per peran untuk Pak Dimas, `docs/LAUNCH_CHECKLIST.md`.
5. Staging: siapkan lingkungan staging di Hostinger (branch `staging`, database terpisah, kunci sandbox). Jalankan seluruh E2E terhadap staging.

CHECKPOINT A (berhenti, tunggu persetujuan Wann): tampilkan hasil staging, UAT_CHECKLIST, dan daftar variabel env produksi yang perlu diisi di hPanel.

Setelah disetujui:
6. Siapkan rilis produksi: urutan langkah cutover (backup → migrasi `prisma migrate deploy` → deploy → smoke test → buka ke publik), jam rilis di waktu sepi, dan rencana rollback tertulis (kembali ke versi sebelumnya; database lama tetap dipertahankan sampai Wann menyatakan aman).

CHECKPOINT B (berhenti, tunggu persetujuan Wann): tampilkan LAUNCH_CHECKLIST yang sudah terisi dan rencana rollback. Jangan jalankan cutover sebelum Wann menulis "GO".

Pasca rilis (setelah Wann menyatakan GO dan cutover selesai): jalankan smoke test produksi (satu pesanan nyata bernilai kecil dengan Midtrans production dan satu transfer manual, lalu dibatalkan sesuai prosedur), pantau ErrorLog dan dashboard Developer selama 48 jam, dan laporkan setiap anomali.

Definition of Done:
- semua tes otomatis hijau di staging
- UAT_CHECKLIST dijalankan Pak Dimas tanpa temuan berkeparahan tinggi
- restore database dari backup berhasil dilatih sekali
- RUNBOOK, LAUNCH_CHECKLIST, dan rencana rollback tertulis
- persetujuan "GO" dari Wann tercatat
```

---

## Catatan praktis

- **Satu fase bisa terlalu besar untuk satu sesi.** Jika Antigravity kehabisan konteks, minta dia menyimpan progres di `docs/PROGRESS_FASE_X.md` (selesai, sedang dikerjakan, tersisa), lalu mulai sesi baru dengan BLOK UMUM + "lanjutkan Fase X dari `docs/PROGRESS_FASE_X.md`".
- **Jika agent minta keputusan produk**, jawab di `docs/LUVIRA_2_PLAN.md` (bagian 2 atau 3), bukan hanya di chat, supaya sesi berikutnya ikut tahu.
- **Urutan ketergantungan data:** data alamat gudang Pusat dan Yogyakarta, berat varian, dan kunci RajaOngkir/Midtrans harus sudah siap sebelum Fase 2 (daftar di bagian 3 plan).
