# 📊 LAPORAN HASIL PENGUJIAN & SHOWCASE SISTEM LUVIRA 2.0 (LUVIRA.ID)

**Tanggal Pengujian:** 26 Oktober 2026, 10:23–10:50 WIB (audit browser 10:27–10:50 WIB, 23 menit, terukur runtime)
**Target Domain:** https://luvira.id
**Status Audit Keseluruhan:** ❌ TIDAK LULUS 100% — ada temuan kritis yang harus diperbaiki sebelum klaim "100% READY"

> Laporan ini ditulis dari hasil penjelajahan langsung di situs produksi, bukan dari template brief. Status di brief yang mengasumsikan semua PASS tidak dipertahankan karena hasil audit menunjukkan sebaliknya. Tidak ada data yang diubah, tidak ada pembayaran yang dikonfirmasi, tidak ada status pesanan yang diubah, dan tidak ada resi yang dimasukkan selama audit.

## Pesanan uji yang dibuat

- **Invoice:** LVR-20261026-7943
- **Nama:** Auditor QA Luvira
- **WhatsApp:** 081234567890 (dinormalisasi menjadi 6281234567890)
- **Alamat:** Jl. Kaliurang KM 5.5 No. 12, Sleman, DI Yogyakarta 55281 — DI Yogyakarta, Kabupaten Sleman, Kecamatan Depok, Kelurahan Caturtunggal
- **Item:** Black Sole Split Toe All Variant, Penelope × 1 pasang, Rp35.000
- **Status akhir:** MENUNGGU_PEMBAYARAN / "Tunggu Bayar" — tidak ada pembayaran, tidak ada bukti transfer yang diunggah.

---

## 1. Ringkasan Eksekutif

Storefront, katalog, dan konten Nasihat Syar'i sebagian besar berfungsi dengan baik: modal lokasi terpusat dan filternya jalan, pergantian varian warna terasa instan, detail produk dan cart drawer jalan, dan isolasi wilayah Admin Jogja terbukti.

Namun ada tiga masalah yang berdampak langsung ke uang dan kepercayaan pembeli. Pertama, total yang ditampilkan di checkout (Rp73.850) berbeda Rp29.000 dengan total di halaman pesanan dan lacak pesanan (Rp44.850), tanpa rincian yang menjelaskan selisihnya. Kedua, kupon `JOGJAISTIMEWA` tidak bisa dipakai untuk item uji Rp35.000 karena minimal belanjanya Rp40.000, dan kedua kode promo yang ada tercatat 0 kali dipakai. Ketiga, dashboard Owner menampilkan angka yang tidak cocok dengan jumlah barisnya sendiri dan dengan file CSV ekspornya: total akhir baris Rp526.228 vs Omzet Rp470.000, dan laba baris Rp212.250 vs Laba Bersih Rp237.000.

Di samping itu, varian bertanda "Stok Habis" masih bisa di-checkout, hanya JNE yang muncul sebagai kurir dengan tarif yang berubah setelah pilih kelurahan, alamat tampil "undefined SLEMAN", dan dashboard Developer tidak punya tombol logout. Audit ini tidak menemukan bukti bahwa sistem siap 100%.

---

## 2. Matriks Hasil Pengujian (Checklist)

| No | Modul / Flow | Status | Catatan / Hasil Observasi |
|---|---|:---:|---|
| 1 | Bar & Modal "Ubah Lokasi" (Portal & GPS) | ✅ PASS | Modal tampil terpusat, backdrop gelap, kartu Deteksi Lokasi Otomatis ada, pencarian "Yogyakarta" / "Jawa Barat" memfilter instan, tutup via "Batal / Tutup" |
| 2 | Katalog & Swatch Warna Kaus Kaki | ✅ PASS, dengan catatan | 5 model tampil. Pink Blossom, Winter Blue, Penelope berganti instan tanpa kedip. Tombol "+ Tambah ke Keranjang" benar. Catatan: jumlah ulasan berubah antar load (mis. 128/210/94 vs 12/46/54) |
| 3 | Storytelling Detail Modal & Cart Drawer | ⚠️ PARTIAL / FAIL stok | Galeri, kuantitas (1→2 = Rp70.000), dan 3 accordion (bahan nylon, standar syar'i, care guide) jalan. FAIL: semua warna bertanda "(Habis)" + badge "Stok Habis", tetapi tetap bisa ditambah ke keranjang dan di-checkout tanpa peringatan. Cart Drawer terbuka dari kanan dengan benar |
| 4 | Konten Dakwah & Nasihat Syar'i | ✅ PASS | 3 artikel tampil (25, 24, 22 Okt 2026), "Baca Selengkapnya" membuka modal baca dengan dalil, termasuk QS. Al-'Ankabut: 69 |
| 5 | Checkout Multi-Hub & Diskon Promo | ❌ FAIL | Hanya JNE (tanpa SiCepat/J&T). JNE-REG berubah Rp14.000/2 hari → Rp35.000/4 hari setelah pilih kelurahan; ada tarif JTR sampai Rp2.800.000. Kupon `JOGJAISTIMEWA` ditolak: minimal belanja Rp40.000, subtotal Rp35.000. PPN 11% Rp3.850 tampil. Total checkout Rp73.850 vs total order Rp44.850 (selisih Rp29.000). Rekening Jago Syariah dan BSI a.n. Muhammad Naufal Ammr Dzakwan tampil. Tombol submit "Konfirmasi Pesanan", bukan "Buat Pesanan Sekarang" |
| 6 | Verifikasi Transfer Manual & Resi | ⚠️ TIDAK DAPAT DIUJI PENUH | Pesanan uji masih "Menunggu Pembayaran" tanpa bukti, jadi di Admin Jogja tidak ada tombol "Cek Bukti" / "Konfirmasi Pembayaran" / "Kirim Pesanan" — itu sudah benar. Filter "Verifikasi Bukti" di Jogja kosong. Satu pesanan menunggu verifikasi ada di Pusat (LVR-20261024-004, Fatimah Azzahra, Rp87.700), tombol "Verifikasi" tidak diklik dan statusnya tidak diubah |
| 7 | Pelacakan Pesanan Publik (`/track`) | ✅ PASS, dengan gap | Invoice LVR-20261026-7943 + 7890 menampilkan MENUNGGU_PEMBAYARAN, total Rp44.850, timeline 26/10/2026 10.26.46, dan rincian item. Resi belum ada (wajar). Gap: alamat pengiriman tidak ditampilkan |
| 8 | Laporan Bisnis Owner & Ekspor CSV | ⚠️ PASS, dengan selisih angka | Omzet Rp470.000, HPP Rp233.000 ("Rahasia Owner"), Laba Bersih Rp237.000, PPN 11% Rp48.978. CSV terunduh 467 byte dan isinya terverifikasi. Selisih: total akhir baris/CSV Rp526.228 vs Omzet Rp470.000; laba baris Rp212.250 vs Laba Rp237.000; HPP dan PPN cocok. Tabel Owner menampilkan semua metode "TRANSFER", padahal CSV/Admin Pusat menunjukkan Midtrans untuk Dian/Dewi/Siti. Kolom Invoice di CSV kosong. Tabel tanpa kolom promo dan tanpa nomor invoice, jadi pemakaian promo tidak bisa diverifikasi dari tabel |
| 9 | Developer System Health Hub | ✅ PASS, dengan gap | DATABASE STATUS "UP" (latensi 2235 ms lalu 730 ms), STORAGE MODE "local-stub" / "READY", RajaOngkir: live, Midtrans: production, Total Pesanan 9, "0 errors / 16 audit", ErrorLog kosong. Gap: tidak ada kartu berlabel "Neon PostgreSQL Database" (hanya kartu generik DATABASE STATUS), dan dashboard Developer tidak ada tombol logout — sesi tetap aktif setelah navigasi ulang |

---

## 3. Detail per Flow

### Flow 1 — Storefront & Pengalaman Pembeli

**1.1 Modal Ubah Lokasi — PASS.**
Sticky bar: "Dikirim ke: Kota Depok, Jawa Barat (Pusat)" + "Ubah Lokasi". Modal terbuka di tengah dengan backdrop gelap, judul "Pilih Wilayah Pengiriman / Luvira Multi-Hub Routing (Depok & Yogyakarta)", kartu "Deteksi Lokasi Otomatis (Izin GPS)" dengan tombol "Gunakan Lokasi Perangkat Saya", dan kolom pencarian provinsi. Ketik "Yogyakarta" → hanya "DI YOGYAKARTA"; ketik "Jawa Barat" → hanya "JAWA BARAT". Ditutup via "Batal / Tutup"; lokasi tetap Depok.

**1.2 Katalog — PASS, dengan catatan.**
Lima model tampil:
- Emboss Split Toe All Variant — Rp35.000 (was Rp45.000), 4.9
- Emboss All Variant — Rp30.000 (was Rp40.000), 4.7
- Black Sole All Variant — Rp35.000 (was Rp45.000), 4.8
- Black Sole Split Toe All Variant — Rp35.000 (was Rp45.000), 4.9 (46)
- Anti-Slip Split Toe All Variant — Rp40.000 (was Rp45.000), 4.9 (54), "Safe Grip", White Marble

Pada Black Sole Split Toe, Pink Blossom → gambar pink, Winter Blue → biru navy, Penelope → nude peach, berganti instan tanpa kedip yang terlihat. Label tombol satu kali "+ Tambah ke Keranjang", bukan "++".

**1.3 Detail produk & Cart Drawer — PARTIAL / FAIL stok.**
Modal "DETAIL KOLEKSI LUVIRA": Rp35.000 / Rp45.000, "Hemat 22%", 4.9 (46 Ulasan), MODEL: BLACK-SOLE-SPLIT-TOE, galeri besar. Kuantitas + mengubah 1 → 2 dan SUBTOTAL menjadi Rp70.000. Tiga accordion terbuka: "Keunggulan Model & Desain Ergonomis" (Bahan Nylon Premium), "Standar Mutu Material & Kenyamanan Syar'i" (Grade A, tidak menerawang, Wudhu & Activity Friendly), "Panduan Perawatan" (cuci air suhu ruang maks 30°C).

Temuan: setiap warna bertanda "(Habis)" dan gambar membawa badge "Stok Habis", tetapi "Tambah ke Keranjang" tetap menambahkan item tanpa peringatan. Cart Drawer terbuka dari kanan: "Keranjang Belanja (1)", Penelope, Rp35.000, "Estimasi Ongkir: Dihitung di WA", "Total Sementara Rp35.000", tombol "Lanjut ke Checkout".

**1.4 Nasihat Syar'i (`/nasihat`) — PASS.**
Heading "Nasihat & Hikmah Kaus Kaki Syar'i", sempat menampilkan "Memuat artikel nasihat..." lalu 3 artikel tampil:
- "Menjaga Kesucian di Setiap Langkah: Ikhtiar Istiqomah di Tengah Modernitas" (25 Okt 2026)
- "Mahkota Kesantunan: Langkah Anggun Menjadi Muslimah Berkarakter dan Berakhlak Mulia" (24 Okt 2026)
- "Kaki pun Aurat yang Mulia: Menjaga Kesempurnaan Hijab di Setiap Langkah" (22 Okt 2026)

Semua berkategori "Hikmah Syar'i", penulis "Pak Dimas / Wann (Owner)". "Baca Selengkapnya" pada artikel pertama membuka modal baca dengan kutipan QS. Al-'Ankabut: 69.

### Flow 2 — Checkout & Kalkulasi Finansial Multi-Hub — FAIL

Form diisi: Nama "Auditor QA Luvira", WhatsApp "081234567890", alamat "Jl. Kaliurang KM 5.5 No. 12", Kode Pos "55281". Dropdown bertingkat Provinsi/Kota/Kecamatan/Kelurahan hanya muncul setelah klik "Pilih Bertingkat" (default "Cari Cepat"). Dipilih DI YOGYAKARTA, SLEMAN, DEPOK, Kelurahan "CATUR TUNGGAL ()" — label kelurahan menampilkan tanda kurung kosong.

Kurir: hanya JNE, tidak ada SiCepat dan tidak ada J&T.
- Setelah Kecamatan Depok (sebelum kelurahan): JNE-REG Rp14.000, estimasi 2 hari; JNE-JTR Rp105.000, 6 hari; total Rp52.850.
- Setelah pilih kelurahan Catur Tunggal: JNE-REG Rp35.000, 4 hari; JNE-JTR Rp100.000, 10 hari; plus JNE-JTR<130 Rp1.750.000, >130 Rp2.700.000, >200 Rp2.800.000 — tarif trucking yang tidak masuk akal untuk satu pasang kaus kaki.
- "Dikirim dari: Yogyakarta (DIY)".

Promo: "JOGJAISTIMEWA" + "Pakai" mengembalikan error merah "Minimal pembelanjaan untuk kode ini adalah Rp 40.000". Subtotal Rp35.000, jadi diskon 15% tidak diterapkan dan tidak ada baris diskon. PPN 11% tampil: Rp3.850 atas Rp35.000. Ringkasan checkout saat submit: Subtotal Rp35.000, PPN 11% Rp3.850, Ongkos Kirim Rp35.000, Total Pembayaran Rp73.850.

Pembayaran: "Transfer Bank Manual (BSI / Jago Syariah)" dipilih (default "Pembayaran Otomatis (Midtrans Snap)"). Rekening dengan tombol "Salin": Jago Syariah 509366156008 a.n. Muhammad Naufal Ammr Dzakwan (terpilih) dan BSI 7239477938 a.n. Muhammad Naufal Ammr Dzakwan.

Pesanan dibuat di https://luvira.id/order/LVR-20261026-7943/status, status "Menunggu Pembayaran". Total di halaman pesanan Rp44.850, bukan Rp73.850 — selisih Rp29.000 tanpa rincian harga di halaman pesanan (35.000 + 3.850 = 38.850; total pesanan menyiratkan ongkir Rp6.000, vs Rp35.000 di checkout).

Upload bukti hanya diamati: ada "Pilih Foto Bukti Transfer (Screenshot Struk/M-Banking)", tombol "Choose file", textbox "Atau tempel URL gambar bukti di sini", dan tombol "Kirim" (disabled sampai ada file/URL). Tidak ada file yang diunggah.

### Flow 3 — Pelacakan Pesanan Publik (`/track`) — PASS, dengan gap

Input LVR-20261026-7943 + 7890 → "Status Pesanan Saat Ini: MENUNGGU_PEMBAYARAN", Total Rp44.850. Timeline: "MENUNGGU_PEMBAYARAN — Pesanan dibuat diarahkan ke gudang Yogyakarta (DIY) — 26/10/2026, 10.26.46". Rincian: Black Sole Split Toe All Variant, Penelope × 1 pasang, Rp35.000. Resi belum ada: "Nomor resi pengiriman akan otomatis muncul di sini setelah pesanan dikemas dan diserahkan ke pihak kurir." (wajar untuk pesanan belum bayar). Gap: hasil lacak tidak menampilkan alamat pengiriman, jadi alamat tidak bisa divalidasi di halaman ini.

### Flow 4 — Admin Cabang Yogyakarta (`/dashboard/admin`) — PASS, dengan cacat

Login berhasil (~20 detik "Memproses..."), redirect ke https://luvira.id/dashboard/admin. Header "Admin Wilayah - Yogyakarta (DIY)", badge "ADMIN WILAYAH", banner "Isolasi Wilayah: Menampilkan Pesanan Khusus Cabang Yogyakarta (DIY)". Counter "1 Siap Dikirim". Menu: Pesanan Masuk (badge 1), Katalog & Harga, Stok Gudang, Kode Promo, Nasihat Syar'i, Copywriting CMS.

Hanya 4 pesanan, semuanya gudang Yogyakarta (DIY) — isolasi wilayah bertahan untuk pesanan yang ditampilkan:
- LVR-20261026-7943, Auditor QA Luvira, Rp44.850, Transfer Manual, "Tunggu Bayar", alamat tampil "undefined SLEMAN, DI YOGYAKARTA". Di modal detail: "Jl. Kaliurang KM 5.5 No. 12, , undefined SLEMAN, DI YOGYAKARTA 55281", item Penelope × 1 Rp35.000, riwayat MENUNGGU_PEMBAYARAN 26/10/2026 10.26.46. Hanya ada tombol "Tutup" — tidak ada "Cek Bukti", "Konfirmasi Pembayaran", atau "Kirim Pesanan" (sudah benar, karena belum bayar dan tanpa bukti). Tidak diubah, tidak ada resi.
- LVR-20261023-003, Dian Permatasari, Rp97.633, Midtrans Snap, "Siap Dikirim", tombol "Kirim Pesanan".
- LVR-20261022-002, Annisa Lathifah, Rp141.200, Transfer Manual, "Dikirim", "SICEPAT: 004189201938", tombol "Selesai".
- LVR-20261025-006, Dewi Sartika, Rp173.500, Midtrans Snap, "Selesai", "POS: POS9928172648".

Filter "Verifikasi Bukti": "Tidak Ada Pesanan". Jadi tidak ada pesanan yang menunggu verifikasi di Yogyakarta.

Cacat: (1) alamat pesanan uji tampil "undefined SLEMAN, DI YOGYAKARTA"; (2) pola "undefined" / koma kosong juga muncul di baris lain (mis. alamat Dian Permatasari berakhir dengan ",").

### Flow 4b — Admin Pusat — PASS

Login berhasil. Header "Admin Pusat (Depok)", badge "ADMIN PUSAT", banner "Pusat Kendali Nasional: Menampilkan Pesanan Seluruh Wilayah". Counter "1 Butuh Verifikasi" dan "1 Siap Dikirim". Menu tambahan vs Jogja: "Kelola Admin Wilayah".

Daftar nasional, 9 pesanan campuran Yogyakarta dan Pusat, termasuk:
- LVR-20261026-7943 (uji, Rp44.850, "Tunggu Bayar", detail saja)
- LVR-20261025-005 Nurul Hidayah (Pusat, Rp150.860, Midtrans Snap, "Tunggu Bayar")
- LVR-20261024-004 Fatimah Azzahra (Pusat, Rp87.700, Transfer Manual, "Cek Bukti Transfer", tombol "Verifikasi" ungu aktif — satu-satunya pesanan yang menunggu verifikasi; tidak diklik, status tidak diubah)
- LVR-20261023-003 (Siap Dikirim), LVR-20261022-002 (Dikirim, SICEPAT: 004189201938), LVR-20261019-007 Maya Safitri (Pusat, Rp43.965, "Batal"), LVR-20261025-006 (Selesai, POS: POS9928172648), LVR-20261020-001 Siti Rahmawati (Pusat, Selesai, JNE: JNE901827364501), LVR-20261018-008 Rina Kusuma (Pusat, Rp86.700, "Batal")

Menu Kode Promo: banner "Proteksi Batas Diskon Maksimal (50%)", tombol "+ Buat Kode Promo". Dua kode aktif, keduanya 0 kali dipakai:
- JOGJAISTIMEWA — Khusus Yogyakarta (DIY), 15%, Min. Belanja Rp40.000, Kuota "0 / 50", Aktif
- RESELLER2026 — Reseller Nasional, 10%, Min. Belanja Rp50.000, Kuota "0 / 100", Aktif

Ini mengonfirmasi temuan Flow 2: `JOGJAISTIMEWA` tidak bisa dipakai untuk pesanan uji Rp35.000, dan kedua kode belum pernah dipakai.

### Flow 5 — Owner Executive Dashboard (`/dashboard/owner`) — PASS, dengan selisih angka

Login berhasil setelah login Owner tersimpan via Secure Vault (error sebelumnya "Email atau kata sandi tidak cocok." berasal dari password lama / auto-fill akun admin). Header "Owner Executive Dashboard", badge "HAK AKSES TERTINGGI", subtitle "Pengawasan Penuh Finansial, HPP, Rekening Transfer, Pengaturan Sistem, dan Audit Log". Tab: Finansial & HPP, Rekening Bank Transfer, Pengaturan Bisnis & Margin, Audit Trail Sistem, Semua Akun Admin.

Angka dashboard (filter Sepanjang Waktu, semua metode):
- Omzet Penjualan (Kotor): Rp470.000 — "4 order" — "Total nilai pesanan terkonfirmasi & selesai"
- Total HPP (Modal & Packing): Rp233.000 — "Rahasia Owner" — "Terkunci & tersembunyi dari Admin Wilayah/Pusat"
- Laba Bersih (Net Profit): Rp237.000 — "Omzet - HPP"
- PPN 11% (Titipan Pajak): Rp48.978 — "Kas Titipan"

Tabel Riwayat Transaksi Bisnis, "4 Pesanan", kolom: INVOICE & TANGGAL, METODE, HPP MODAL, LABA BERSIH, TOTAL AKHIR, STATUS. Tidak ada kolom promo dan tidak ada nomor invoice (hanya tanggal + nama), jadi pemakaian promo tidak bisa diverifikasi dari tabel ini:
- 24/10/2026 Dian Permatasari — TRANSFER — HPP Rp47.000 — Laba Rp33.750 — Total Rp97.633 — DIPROSES
- 22/10/2026 Annisa Lathifah — TRANSFER — HPP Rp60.000 — Laba Rp60.000 — Total Rp141.200 — DIKIRIM
- 20/10/2026 Dewi Sartika — TRANSFER — HPP Rp74.000 — Laba Rp76.000 — Total Rp173.500 — SELESAI
- 20/10/2026 Siti Rahmawati — TRANSFER — HPP Rp52.000 — Laba Rp42.500 — Total Rp113.895 — SELESAI

Pesanan uji LVR-20261026-7943 tidak muncul di tabel (masih "Tunggu Bayar"). "Peringatan Stok Menipis (< 10 pcs)": "0 Varian", "Semua Stok Aman!"

Ekspor CSV — PASS: tombol "Ekspor Laporan (CSV)" diklik, file terunduh 467 byte dengan nama `rekap_penjualan_luvira_all_1792986314448.csv` (file terlampir di laporan ini). Tidak ada toast/konfirmasi di halaman.

Isi CSV terverifikasi langsung dari file unduhan:
- Kolom: Invoice, Tanggal, Nama Pelanggan, Status, Metode Bayar, Subtotal Bersih, HPP Total, PPN, Ongkir, Total Akhir
- Dian Permatasari: MIDTRANS_SNAP, Subtotal 80.750, HPP 47.000, PPN 8.883, Ongkir 8.000, Total 97.633
- Annisa Lathifah: MANUAL_TRANSFER, 120.000, 60.000, 13.200, 8.000, 141.200
- Dewi Sartika: MIDTRANS_SNAP, 150.000, 74.000, 16.500, 7.000, 173.500
- Siti Rahmawati: MIDTRANS_SNAP, 94.500, 52.000, 10.395, 9.000, 113.895
- Kolom Invoice kosong untuk semua baris — cacat CSV.
- Cross-check: Subtotal bersih total Rp445.250; HPP total Rp233.000 (cocok dengan kartu HPP); PPN total Rp48.978 (cocok dengan kartu PPN); Total Akhir total Rp526.228.
- Selisih: Total Akhir Rp526.228 vs Omzet kartu Rp470.000 (selisih Rp56.228); Laba per baris (Subtotal − HPP) total Rp212.250 vs Laba kartu Rp237.000 (selisih Rp24.750; 237.000 = 470.000 − 233.000, jadi laba mengikuti kartu Omzet, bukan jumlah baris).
- Metode: CSV benar (Dian/Dewi/Siti Midtrans, Annisa Manual), sedangkan tabel dashboard Owner menampilkan semua "TRANSFER" — tabel dashboard menyesatkan vs CSV dan vs Admin Pusat.

### Flow 6 — Developer Observability Hub (`/dashboard/developer`) — PASS, dengan gap

Login berhasil via Secure Vault (submit pertama sempat kembali ke form login tanpa error, tetapi login ternyata sudah diproses, lalu navigasi ke https://luvira.id/dashboard/developer). Header "Observabilitas Developer Luvira 2.0", subtitle "Pemantauan Kesehatan Sistem, Antrean Bermasalah & Log Kesalahan", badge "ROLE: DEVELOPER", label akun "Senior Developer (Alias)".

Health Monitor, 4 kartu:
- DATABASE STATUS: "UP" (hijau), latensi 2235 ms saat load pertama dan 730 ms saat reload — tidak ada kartu berlabel eksplisit "Neon PostgreSQL Database" di halaman mana pun; database hanya ditampilkan sebagai kartu generik "DATABASE STATUS / UP", jadi branding/status Neon tidak bisa dikonfirmasi dari dashboard.
- STORAGE MODE: "local-stub", "READY" (hijau) — storage berjalan di local stub, bukan cloud store bernama.
- INTEGRASI EKSTERNAL: "RajaOngkir: live" (hijau) dan "Midtrans: production" (biru).
- TOTAL PESANAN & LOG: "9", "0 errors / 16 audit".

Di bawah kartu: "Log Kesalahan Server Terbaru (ErrorLog)" — "Batas laju aktif (max 30/menit)" — "Tidak ada catatan kesalahan sistem (sistem berjalan prima)." Bagian "REST API OBSERVABILITAS DEVELOPER": GET /api/developer/health, GET /api/developer/queues, GET /api/developer/errors, GET /api/developer/audit.

Logout — tidak bisa via kontrol yang terlihat: dashboard Developer tidak ada tombol "Keluar" (berbeda dengan Owner dan Admin), dan header storefront juga tidak ada kontrol logout. Sesi tetap aktif: buka https://luvira.id/dashboard/login menampilkan form login, tetapi buka ulang https://luvira.id/dashboard/developer langsung terbuka tanpa login lagi. Sesi developer masih aktif di browser audit; tab ditinggal di homepage storefront. Gap keamanan/UX minor.

---

## 4. Galeri Bukti Pengujian (Screenshots & Media)

Tangkapan layar diambil oleh browser audit selama penjelajahan (referensi internal i2–i40 untuk Flow 1–3, i3/i5/i8/i9 untuk Flow 4, i12/i14 untuk Admin Pusat, i1–i3 untuk Owner, i1/i2/i4 untuk Developer). File gambar screenshot tersebut tidak tersimpan sebagai file di workspace, jadi tidak bisa dilampirkan sebagai gambar di laporan ini — hanya deskripsi dan nilai yang terverifikasi di atas yang dicatat.

Bukti yang bisa dilampirkan dan sudah diverifikasi isinya:
- **File CSV ekspor Owner (467 byte):** [rekap_penjualan_luvira_all_1792986314448.csv](sandbox://workspace/your_files/luvira-qa-2026-10-26/rekap_penjualan_luvira_all_1792986314448.csv)

**Animasi/GIF:** GIF bersifat opsional di brief. Tidak ada GIF rekaman yang dibuat, karena tidak ada frame tangkapan layar yang tersedia sebagai file untuk dirangkai menjadi GIF yang jujur. Membuat GIF dari gambar lain akan menyesatkan, jadi langkah ini sengaja tidak dilakukan. Jika GIF showcase diperlukan, rekaman harus diambil ulang dengan alat perekam layar di sesi browser yang sama, lalu dilampirkan sebagai file.

---

## 5. Temuan Prioritas untuk Diperbaiki

1. **Selisih total checkout vs order (kritis):** Rp73.850 di checkout vs Rp44.850 di halaman order/track, selisih Rp29.000 tanpa rincian. Periksa perhitungan ongkir dan PPN di kedua halaman, dan tampilkan rincian harga yang sama di halaman order.
2. **Selisih angka Owner (kritis):** Omzet kartu Rp470.000 vs total akhir baris/CSV Rp526.228; Laba kartu Rp237.000 vs laba baris Rp212.250. Tentukan definisi Omzet yang dipakai (subtotal bersih? total akhir? hanya pesanan terkonfirmasi?) dan samakan dengan jumlah baris.
3. **Stok Habis masih bisa di-checkout:** blokir "Tambah ke Keranjang" dan checkout untuk varian bertanda "(Habis)" / badge "Stok Habis", atau tampilkan peringatan yang jelas.
4. **Kurir hanya JNE dan tarif berubah:** periksa integrasi SiCepat/J&T, dan kenapa JNE-REG berubah Rp14.000/2 hari → Rp35.000/4 hari setelah pilih kelurahan. Sembunyikan atau perbaiki tarif JTR Rp1.750.000–Rp2.800.000 yang tidak masuk akal untuk satu pasang kaus kaki.
5. **Alamat "undefined":** perbaiki kelurahan yang hilang — label "CATUR TUNGGAL ()" di checkout dan "undefined SLEMAN, DI YOGYAKARTA" di admin/track.
6. **Kupon tidak bisa dipakai untuk item uji:** `JOGJAISTIMEWA` minimal Rp40.000, sementara item uji Rp35.000. Turunkan minimal belanja, atau ubah skrip uji ke 2 pasang (Rp70.000) agar diskon 15% bisa diuji. Kedua kode promo tercatat 0 kali dipakai.
7. **Tabel Owner menyesatkan:** metode bayar di tabel menampilkan semua "TRANSFER", padahal CSV benar (Midtrans untuk Dian/Dewi/Siti). Tambahkan kolom promo dan nomor invoice di tabel, dan isi kolom Invoice di CSV yang saat ini kosong.
8. **Dashboard Developer:** tambahkan kartu eksplisit "Neon PostgreSQL Database" jika itu memang integrasi yang dipakai, jelaskan "STORAGE MODE: local-stub" di produksi, dan tambahkan tombol "Keluar" — saat ini developer tidak bisa logout dari UI.
9. **Jumlah ulasan berubah antar load:** periksa sumber angka ulasan di kartu produk.
10. **Label tombol:** samakan label submit checkout — di situs "Konfirmasi Pesanan", di brief "Buat Pesanan Sekarang".
11. **Keamanan setelah audit:** ganti password default / kredensial QA setelah audit selesai, dan pastikan sesi Developer di browser audit ditutup.

---

## 6. Rekomendasi Selanjutnya

- Perbaiki temuan nomor 1, 2, dan 3 dulu, karena ketiganya menyentuh uang pembeli dan stok yang dijual.
- Ulangi Flow 2 dengan keranjang 2 pasang (subtotal Rp70.000) agar kupon `JOGJAISTIMEWA` 15% dan `RESELLER2026` 10% benar-benar teruji, lalu verifikasi PPN 11% dari harga setelah diskon.
- Buat satu pesanan uji transfer manual sampai ke status "MENUNGGU VERIFIKASI" dengan bukti transfer, agar Flow 4 (verifikasi admin Jogja dan input resi) bisa diuji penuh — di audit ini langkah itu tidak bisa diuji karena pesanan uji masih "Menunggu Pembayaran".
- Setelah perbaikan, jalankan ulang audit Flow 2, 5, dan 6, dan ambil ulang screenshot + rekaman GIF showcase di sesi yang sama.
- Simpan file CSV ekspor di atas sebagai bukti awal; jangan jadikan angka Omzet Rp470.000 sebagai angka resmi sampai selisih dengan CSV dijelaskan.
