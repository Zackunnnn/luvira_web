// scripts/setup-test-db.ts
import { execSync } from 'child_process';
import { assertDatabaseSafety } from '../lib/db-guard';

async function setupTestDb() {
  assertDatabaseSafety({ isTestEnvironment: true });
  const testUrl = process.env.DATABASE_URL_TEST;
  if (!testUrl) {
    throw new Error('DATABASE_URL_TEST belum disetel di .env');
  }

  console.log('[Test DB] Memulai migrasi dan seed database uji...');
  console.log(`[Test DB] Target: ${testUrl.replace(/:[^:@]+@/, ':****@')}`);

  // Push schema to test database
  execSync('npx prisma db push --force-reset', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: testUrl,
    },
  });

  // Seed test database
  execSync('npx tsx prisma/seed.ts', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: testUrl,
    },
  });

  console.log('[Test DB] Database uji berhasil disiapkan dan di-seed!');
}

setupTestDb().catch((err) => {
  console.error('[Test DB Setup Error]', err);
  process.exit(1);
});
