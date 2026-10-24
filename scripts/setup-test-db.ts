// scripts/setup-test-db.ts
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { assertDatabaseSafety } from '../lib/db-guard';

// Load .env manual tanpa dependensi eksternal
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

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
