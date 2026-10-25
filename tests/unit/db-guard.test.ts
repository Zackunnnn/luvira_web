import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { checkDatabaseSafety, assertDatabaseSafety, PROD_HOST_KEYWORD } from '@/lib/db-guard';

describe('Database Safety Guard', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('lolos jika DATABASE_URL bukan host produksi', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@ep-aged-pond-123.neon.tech/neondb';
    const res = checkDatabaseSafety();
    expect(res.isSafe).toBe(true);
  });

  it('menolak keras jika DATABASE_URL menunjuk ke host produksi Neon', () => {
    process.env.DATABASE_URL = `postgresql://user:pass@${PROD_HOST_KEYWORD}-pooler.neon.tech/neondb`;
    const res = checkDatabaseSafety();
    expect(res.isSafe).toBe(false);
    expect(res.error).toContain('BAHAYA: DATABASE_URL menunjuk ke host produksi Neon');
    expect(() => assertDatabaseSafety()).toThrow(/BAHAYA: DATABASE_URL/);
  });

  it('menolak di lingkungan tes jika DATABASE_URL_TEST tidak disetel', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@ep-aged-pond.neon.tech/neondb';
    delete process.env.DATABASE_URL_TEST;
    const res = checkDatabaseSafety({ isTestEnvironment: true });
    expect(res.isSafe).toBe(false);
    expect(res.error).toContain('DATABASE_URL_TEST yang terisi');
  });

  it('menolak di lingkungan tes jika DATABASE_URL_TEST sama dengan DATABASE_URL', () => {
    const url = 'postgresql://user:pass@ep-aged-pond.neon.tech/neondb';
    process.env.DATABASE_URL = url;
    process.env.DATABASE_URL_TEST = url;
    const res = checkDatabaseSafety({ isTestEnvironment: true });
    expect(res.isSafe).toBe(false);
    expect(res.error).toContain('DATABASE_URL_TEST sama persis dengan DATABASE_URL');
  });

  it('menolak jika DATABASE_URL_TEST menunjuk ke produksi', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@ep-aged-pond.neon.tech/neondb';
    process.env.DATABASE_URL_TEST = `postgresql://user:pass@${PROD_HOST_KEYWORD}.neon.tech/neondb`;
    const res = checkDatabaseSafety({ isTestEnvironment: true });
    expect(res.isSafe).toBe(false);
    expect(res.error).toContain('DATABASE_URL_TEST menunjuk ke host produksi');
  });

  it('lolos di lingkungan tes jika DATABASE_URL dan DATABASE_URL_TEST terpisah dan aman', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@ep-aged-pond.neon.tech/neondb';
    process.env.DATABASE_URL_TEST = 'postgresql://user:pass@ep-jolly-mode.neon.tech/neondb';
    const res = checkDatabaseSafety({ isTestEnvironment: true });
    expect(res.isSafe).toBe(true);
  });

  it('lolos jika di lingkungan hosting produksi (NODE_ENV=production)', () => {
    (process.env as any).NODE_ENV = 'production';
    process.env.DATABASE_URL = `postgresql://user:pass@${PROD_HOST_KEYWORD}-pooler.neon.tech/neondb`;
    const res = checkDatabaseSafety();
    expect(res.isSafe).toBe(true);
    expect(() => assertDatabaseSafety()).not.toThrow();
  });

  it('lolos saat proses build Next.js (phase-production-build)', () => {
    (process.env as any).NODE_ENV = 'development';
    process.env.NEXT_PHASE = 'phase-production-build';
    process.env.DATABASE_URL = `postgresql://user:pass@${PROD_HOST_KEYWORD}-pooler.neon.tech/neondb`;
    const res = checkDatabaseSafety();
    expect(res.isSafe).toBe(true);
    expect(() => assertDatabaseSafety()).not.toThrow();
  });

  it('lolos jika ALLOW_PROD_DB diaktifkan secara eksplisit', () => {
    (process.env as any).NODE_ENV = 'development';
    delete process.env.NEXT_PHASE;
    process.env.ALLOW_PROD_DB = 'true';
    process.env.DATABASE_URL = `postgresql://user:pass@${PROD_HOST_KEYWORD}-pooler.neon.tech/neondb`;
    const res = checkDatabaseSafety();
    expect(res.isSafe).toBe(true);
    expect(() => assertDatabaseSafety()).not.toThrow();
  });
});
