# Kumpulan Prompt Antigravity untuk Luvira

**Versi 1.0 — 11 Oktober 2026**

## Cara Pakai (baca dulu)

1. **Sebelum prompt apa pun:** commit semua perubahan (`git status` harus bersih), lalu buat branch (`git checkout -b audit/recap-2026-10`). Ini asuransi terhadap kejadian run sebelumnya yang menghapus Midtrans dan menjalankan `prisma db push`.
2. **Gunakan database development** (cabang Neon terpisah) untuk semua pekerjaan agen. Produksi hanya lewat migrasi yang kamu setujui.
3. Tempel `AGENTS.md` ke root repo dan folder `docs/` (SRS.md, DESIGN.md, CHANGELOG.md, DECISIONS.md) sebelum P-01.
4. Jalankan prompt **berurutan**: P-00 → P-01 → (hasil recap dikirim ke Claude/Wann untuk memperbarui SRS) → P-02 dst. Satu prompt per sesi/percakapan agen.
5. Untuk P-01 gunakan mode **Planning/read-only** bila tersedia. Jika agen mulai mengedit file pada P-01, hentikan dan batalkan.
6. Teks dalam `{kurung kurawal}` adalah isian.

---

## P-00 — Pasang Konteks Proyek (sekali)

```
Baca AGENTS.md dan seluruh isi folder docs/ (SRS.md, DESIGN.md, DECISIONS.md, CHANGELOG.md).
JANGAN mengubah apa pun. Setelah selesai membaca, balas dengan:
1) ringkasan 10 baris tentang proyek Luvira menurut dokumen,
2) daftar aturan keselamatan dari AGENTS.md yang kamu pahami,
3) daftar hal yang menurutmu ambigu atau saling bertentangan di dokumen.
```

## P-01 — RECAP / AUDIT READ-ONLY (paling penting; jalankan sebelum meeting bila sempat)

```
TUGAS: AUDIT READ-ONLY. DILARANG mengedit/membuat/menghapus file, install/uninstall paket,
menjalankan migrasi (prisma db push/migrate), atau mengubah database. Hanya membaca dan melaporkan.

Konteks: dokumen kebutuhan ada di docs/SRS.md. Untuk SETIAP FR di SRS (FR-AUTH-01 … FR-AUD-02),
tentukan kondisi sebenarnya di kode, lalu keluarkan tabel Markdown dengan kolom:
| FR ID | Status (IMPL / PART / TODO) | Bukti: file & fungsi (path:baris) | Tabel DB yang dipakai | Catatan/penyimpangan |

Setelah tabel, jawab bagian-bagian ini (jawaban singkat + bukti file):
A. Versi: Next.js, React, Prisma, Node (package.json). Apakah memakai middleware.ts atau proxy.ts?
B. Skema Prisma: daftar model + kolom penting. Berikan daftar enum status order PERSIS seperti di schema.
   Apakah Order menyimpan snapshot harga jual, modal, PPN, ongkir, packing, diskon, reseller?
C. Pembayaran: apakah ada sisa kode/dependensi Midtrans? Apa yang dihapus pada perubahan terakhir
   (cek git log/diff terakhir) dan commit mana yang masih memuat versi Midtrans yang berfungsi?
   Apakah ada penulisan ke file JSON lokal untuk order/notifikasi?
D. Penyimpanan file: Cloudflare R2 vs ImageKit — yang mana dipakai untuk (1) gambar produk (2) bukti bayar? Public/private?
E. Auth: apakah SETIAP route handler di app/api/admin dan app/api/owner memanggil pengecekan sesi/role sendiri
   (bukan hanya proxy/middleware)? Daftar route yang TIDAK memeriksa.
F. Field harga modal: apakah ada? Apakah bocor ke response untuk role Admin atau publik?
G. ChangeLog: route/aksi mutasi mana saja yang BELUM menulis ChangeLog?
H. PromoCode: kolom lengkap, logika isFreeShipping (apakah dipakai di perhitungan checkout?), relasi ke reseller.
I. Format pesan WhatsApp pasca-checkout PERSIS (salin template-nya).
J. Format SKU/kode produk yang dipakai di kode/seed.
K. Stok: apakah ada pengecekan batas reorder (24 pasang) di web? Di mana?
L. Ongkir: sumber data saat ini (mock?), file mana, kurir apa saja.
M. Ada hal mencurigakan: secret di repo, console.log sisa, TODO/FIXME penting, route tanpa pengamanan.
N. Daftar semua route halaman (app/**/page.tsx) dan route API (app/api/**/route.ts).

Akhiri dengan: "10 temuan paling berisiko" diurutkan dari paling kritis.
Format keluaran: Markdown rapi supaya bisa langsung saya salin ke Claude.
```

## P-02 — Pulihkan Midtrans sebagai Opsi Pembayaran

```
Keputusan proyek D-01: Midtrans HARUS tersedia sebagai pilihan di samping transfer manual/QRIS.
Penghapusan sebelumnya adalah kesalahan. Gunakan git untuk memulihkan, jangan menulis ulang dari nol bila tidak perlu.

Langkah:
1) PLAN dulu (jangan edit): temukan commit terakhir sebelum Midtrans dihapus (git log --stat),
   tampilkan file yang akan dipulihkan (midtrans-client, app/api/midtrans/*, bagian di route pembuatan order).
2) Tunggu persetujuan saya.
3) Setelah disetujui: pulihkan; pastikan flag isFreeShipping yang baru tetap berfungsi (jangan di-revert).
4) Pastikan: pembeli memilih manual ATAU Midtrans; webhook memverifikasi signature_key, idempotent,
   dan MENULIS KE DATABASE (bukan file JSON); Server Key hanya di env server.
5) Jalankan lint, tsc, build. Tambah test untuk checkout dua metode.
6) Perbarui FR-CHK-05 dan FR-CHK-08 di docs/SRS.md serta CHANGELOG.
Jangan menjalankan prisma db push. Kerjakan di branch fix/restore-midtrans.
```

## P-03 — Usulan Pembersihan File Mati (PROPOSE ONLY)

```
Analisis repo dan buat DAFTAR USULAN file/route/dependensi yang tidak terpakai atau mati
(pakai import graph, pencarian referensi, dan knip/depcheck bila tersedia).
JANGAN menghapus apa pun. Untuk tiap item beri: path, bukti tidak terpakai, risiko, rekomendasi (hapus/pertahankan).
Tandai item yang terkait SRS (FR) sebagai "JANGAN HAPUS tanpa persetujuan". Keluaran: tabel Markdown.
```

## P-04 — Hubungkan Change Log ke Semua Mutasi (FR-AUD-01)

```
Implementasikan FR-AUD-01 sesuai docs/SRS.md.
- Buat helper tunggal (mis. lib/audit.ts: withAudit/logChange) yang menulis ChangeLog (user, role, waktu, entitas, id, aksi, before, after)
  DALAM TRANSAKSI yang sama dengan mutasi.
- Pasang di semua mutasi: produk, varian, stok, konten (SiteContent), promo, status order, verifikasi pembayaran.
- Log append-only; tidak ada endpoint edit/hapus.
- Halaman /admin/changelog: filter user/tanggal/entitas, tampilkan before/after (diff).
- Admin hanya melihat log miliknya; Owner melihat semua.
Rencana dulu, tunggu persetujuan, lalu kerjakan di branch feat/audit-log. Jangan prisma db push; bila perlu kolom, buat migrasi di DB dev.
```

## P-05 — Implementasi Satu FR (template umum)

```
Implementasikan {FR-ID}: {nama} sesuai docs/SRS.md (lihat deskripsi, BR, dan AC).
Ikuti AGENTS.md. Urutan: (1) rencana singkat + file yang disentuh + risiko, tunggu persetujuan bila menyentuh DB/auth/pembayaran;
(2) implementasi minimal yang memenuhi semua AC; (3) tambah test untuk setiap AC;
(4) jalankan lint, tsc, test, build; (5) perbarui status FR di SRS, RTM, CHANGELOG;
(6) laporkan bukti tiap AC (output/ cuplikan). Branch: feat/{fr-id-slug}.
```

## P-06 — Bangun Dashboard Owner & Admin Gaya CMU

```
Bangun ulang dashboard Owner dan Admin mengikuti docs/DESIGN.md (rujukan CMU: sidebar gradien accordion, kartu KPI pastel,
grafik 6 bulan, Top 5, Quick Actions, Risk & Alert Center). Kerjakan BERTAHAP, satu tahap per sesi:
 Tahap 1: DashboardShell + tema role (data-role) + Sidebar (menu dari config/menu.ts) + requireRole di server.
 Tahap 2: Executive Dashboard Owner (FR-OWN-01) memakai data yang sudah terintegrasi; fungsi angka di lib/analytics + unit test.
 Tahap 3: Dashboard Admin (FR-ADM-01) + antrean Verifikasi Pembayaran.
 Tahap 4: Risk & Alert (FR-OWN-04): implementasi AL-01..AL-08 sebagai fungsi terpisah, ambang dari konfigurasi.
 Tahap 5: Financial Performance (FR-OWN-02) dan Operational Insight (FR-OWN-03).
 Tahap 6: Laporan + Export (FR-OWN-07..11, 13).
Kerjakan HANYA tahap yang saya sebutkan: "Kerjakan Tahap {n}". Rencana dulu, lalu tunggu persetujuan.
Pastikan angka Dashboard = angka Rekap Profit (satu sumber rumus, Lampiran D). Tampilkan screenshot bila bisa.
```

## P-07 — Sinkronisasi Dokumen dengan Kode (setelah tiap rilis)

```
Bandingkan kode saat ini dengan docs/SRS.md. READ-ONLY terhadap kode; hanya boleh mengedit docs/.
Perbarui: status tiap FR (IMPL/PART/TODO), kolom file implementasi dan tabel DB di docs/RTM (bila ada),
tambah entri docs/CHANGELOG.md, dan catat penyimpangan baru di bagian Gap. Jangan mengubah isi kebutuhan (deskripsi/BR/AC)
kecuali saya minta; bila menemukan perbedaan kebutuhan vs kode, tuliskan sebagai pertanyaan, bukan perubahan.
```

## P-08 — Hardening Keamanan (read-only lalu usulan)

```
Audit keamanan READ-ONLY terhadap: otorisasi per endpoint, kebocoran field modal/profit, validasi input, unggahan file,
cookie sesi, rate limit login, secret di repo/riwayat git, header keamanan, penanganan data pribadi pembeli (log).
Keluarkan tabel temuan: tingkat, lokasi (path:baris), dampak, perbaikan yang disarankan. Jangan mengubah kode.
```

## P-09 — Ongkir Nyata (JNT/Lion Parcel) setelah D-03 diputuskan

```
Ganti data mock di /api/shipping dengan integrasi {Biteship | RajaOngkir} untuk JNT dan Lion Parcel.
Implementasikan FR-SHP-01 dan FR-SHP-02 (fallback tabel referensi bila API gagal, error terlog).
Hitung berat dari item. API key hanya di env server. Rencana dulu, lalu kerjakan di branch feat/shipping-real.
```

---

## Setelah P-01: Alur ke Claude

Kirim hasil P-01 (tabel + jawaban A–N) ke percakapan ini. Claude akan: (1) memperbarui status ⚠️ di SRS dan RTM, (2) menyesuaikan Lampiran B/C, enum status, dan nama tabel, (3) menghasilkan versi dokumen berikutnya (mis. 1.0.1), termasuk salinan arsip.
