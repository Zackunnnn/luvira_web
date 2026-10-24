// scripts/optimize-photos.ts
// ============================================================================
// Skrip Optimasi Foto Kaus Kaki Luvira (WebP 1200px Max Dimension, Quality 80)
// Menyimpan salinan yang dioptimalkan ke public/socks-web/ tanpa mengubah
// berkas foto asli di public/socks/
// ============================================================================

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const SOURCE_DIR = path.join(process.cwd(), 'public', 'socks');
const TARGET_DIR = path.join(process.cwd(), 'public', 'socks-web');

const MAX_LONG_EDGE = 1200; // Sisi terpanjang maksimal 1200px
const WEBP_QUALITY = 80;    // Kualitas WebP 80%

async function main() {
  console.log('=== MEMULAI OPTIMASI FOTO PRODUK LUVIRA ===\n');
  console.log(`Direktori Sumber: ${SOURCE_DIR}`);
  console.log(`Direktori Target: ${TARGET_DIR}\n`);

  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`Error: Direktori sumber ${SOURCE_DIR} tidak ditemukan!`);
    process.exit(1);
  }

  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  }

  const files = fs.readdirSync(SOURCE_DIR).filter((f) => /\.(webp|jpg|jpeg|png)$/i.test(f));
  console.log(`Ditemukan ${files.length} berkas foto untuk diproses.\n`);

  let totalOriginalBytes = 0;
  let totalOptimizedBytes = 0;
  const results: any[] = [];

  for (const file of files) {
    const srcPath = path.join(SOURCE_DIR, file);
    const fileNameWithoutExt = path.parse(file).name;
    const destFileName = `${fileNameWithoutExt}.webp`;
    const destPath = path.join(TARGET_DIR, destFileName);

    const originalStat = fs.statSync(srcPath);
    totalOriginalBytes += originalStat.size;

    // Baca metadata gambar untuk resize proporsional sisi panjang
    const image = sharp(srcPath);
    const metadata = await image.metadata();

    let resizeOptions = {};
    if (metadata.width && metadata.height) {
      if (metadata.width >= metadata.height) {
        resizeOptions = { width: Math.min(metadata.width, MAX_LONG_EDGE), withoutEnlargement: true };
      } else {
        resizeOptions = { height: Math.min(metadata.height, MAX_LONG_EDGE), withoutEnlargement: true };
      }
    } else {
      resizeOptions = { width: MAX_LONG_EDGE, height: MAX_LONG_EDGE, fit: 'inside', withoutEnlargement: true };
    }

    await sharp(srcPath)
      .resize(resizeOptions)
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toFile(destPath);

    const optimizedStat = fs.statSync(destPath);
    totalOptimizedBytes += optimizedStat.size;

    const originalKB = (originalStat.size / 1024).toFixed(1);
    const optimizedKB = (optimizedStat.size / 1024).toFixed(1);
    const savedPercent = (((originalStat.size - optimizedStat.size) / originalStat.size) * 100).toFixed(1);

    results.push({
      Berkas: destFileName,
      'Ukuran Asli': `${originalKB} KB`,
      'Ukuran Optimasi': `${optimizedKB} KB`,
      Hemat: `${savedPercent}%`,
    });
  }

  console.table(results);

  const totalOriginalMB = (totalOriginalBytes / 1024 / 1024).toFixed(2);
  const totalOptimizedMB = (totalOptimizedBytes / 1024 / 1024).toFixed(2);
  const totalSavedPercent = (
    ((totalOriginalBytes - totalOptimizedBytes) / totalOriginalBytes) *
    100
  ).toFixed(2);

  console.log('\n================ RINGKASAN HASIL ================');
  console.log(`Total Ukuran Asli    : ${totalOriginalMB} MB (${totalOriginalBytes} bytes)`);
  console.log(`Total Ukuran Optimasi: ${totalOptimizedMB} MB (${totalOptimizedBytes} bytes)`);
  console.log(`Total Penghematan    : ${totalSavedPercent}% (Berkurang ${(totalOriginalBytes - totalOptimizedBytes) / 1024 / 1024} MB)`);
  console.log('Berkas asli di public/socks/ TIDAK DIUBAH sama sekali.');
  console.log(`Berkas WebP web-ready tersimpan di: ${TARGET_DIR}`);
  console.log('=================================================\n');
}

main().catch((err) => {
  console.error('Fatal Error saat optimasi foto:', err);
  process.exit(1);
});
