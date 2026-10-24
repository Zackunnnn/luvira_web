import { PrismaClient } from '@prisma/client';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const prisma = new PrismaClient();
const BACKUP_DIR = join(process.cwd(), 'backups');

async function exportTable<T>(tableName: string, fetcher: () => Promise<T[]>) {
  try {
    const data = await fetcher();
    const filePath = join(BACKUP_DIR, `${tableName}.json`);
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[EXPORT] ${tableName}: ${data.length} rows -> ${filePath}`);
    return { table: tableName, count: data.length, success: true };
  } catch (error) {
    console.error(`[EXPORT ERROR] ${tableName}:`, error);
    return { table: tableName, count: 0, success: false, error };
  }
}

async function main() {
  console.log('--- Starting Neon PostgreSQL Database Export ---');
  await mkdir(BACKUP_DIR, { recursive: true });

  const results = [];

  results.push(await exportTable('Product', () => prisma.product.findMany()));
  results.push(await exportTable('ColorVariant', () => prisma.colorVariant.findMany()));
  results.push(await exportTable('SiteContent', () => prisma.siteContent.findMany()));
  results.push(await exportTable('ChangeLog', () => prisma.changeLog.findMany()));
  results.push(await exportTable('User', () => prisma.user.findMany()));
  results.push(await exportTable('Order', () => prisma.order.findMany()));
  results.push(await exportTable('OrderItem', () => prisma.orderItem.findMany()));
  results.push(await exportTable('PromoCode', () => prisma.promoCode.findMany()));
  results.push(await exportTable('Media', () => prisma.media.findMany()));

  console.log('\n--- Export Summary ---');
  console.table(results.map(r => ({ Table: r.table, 'Row Count': r.count, Status: r.success ? 'OK' : 'FAILED' })));
}

main()
  .catch((e) => {
    console.error('Fatal export error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
