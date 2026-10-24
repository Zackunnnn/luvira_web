// prisma/scripts/map-local-photos.ts
import fs from 'fs';
import path from 'path';
import { prisma } from '../../lib/db';

export async function mapLocalPhotos() {
  console.log('[PhotoMap] Memulai pemetaan foto lokal ke varian produk...');

  const socksDir = path.resolve(process.cwd(), 'public/socks');
  if (!fs.existsSync(socksDir)) {
    console.error('[PhotoMap] Direktori public/socks tidak ditemukan!');
    return;
  }

  const localFiles = fs.readdirSync(socksDir).filter((f) => f.endsWith('.webp'));
  console.log(`[PhotoMap] Ditemukan ${localFiles.length} berkas WebP di public/socks`);

  const variants = await prisma.productVariant.findMany({
    include: { product: true },
  });

  let mappedCount = 0;
  const usedFiles = new Set<string>();

  for (const variant of variants) {
    const legacyUrl = variant.legacyImageUrl || variant.imageUrl || '';
    // Ekstrak kode seperti est6, bsst1, e2 dari nama berkas ImageKit
    const match = legacyUrl.match(/-(as\d+|bsst\d+|bs\d+|est\d+|e\d+)_/i);
    if (match) {
      const code = match[1].toLowerCase();
      const localFileName = `${code}.webp`;
      if (localFiles.includes(localFileName)) {
        usedFiles.add(localFileName);
        const localPath = `/socks/${localFileName}`;
        await prisma.productVariant.update({
          where: { id: variant.id },
          data: {
            imageUrl: localPath,
            legacyImageUrl: legacyUrl,
          },
        });
        mappedCount++;
        console.log(`  ✓ ${variant.product.name} - ${variant.name} -> ${localPath}`);
      }
    }
  }

  const unusedFiles = localFiles.filter((f) => !usedFiles.has(f));
  console.log(`[PhotoMap] Berhasil memetakan ${mappedCount} varian.`);
  if (unusedFiles.length > 0) {
    console.log(`[PhotoMap] Berkas tidak terpakai (${unusedFiles.length}):`, unusedFiles);
  } else {
    console.log('[PhotoMap] Semua 26 berkas foto lokal terpakai 100%!');
  }
}

if (require.main === module) {
  mapLocalPhotos()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
