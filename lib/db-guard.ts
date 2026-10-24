// lib/db-guard.ts
// ============================================================================
// Guard Keamanan Database Luvira 2.0
// Memastikan:
// 1. DATABASE_URL tidak pernah menunjuk ke Neon Produksi (ep-holy-meadow-*)
// 2. Lingkungan pengujian / reset data memakai DATABASE_URL_TEST yang terpisah
// ============================================================================

export const PROD_HOST_KEYWORD = 'ep-holy-meadow';

export interface DbGuardCheckResult {
  isSafe: boolean;
  error?: string;
  devUrl?: string;
  testUrl?: string;
}

export function checkDatabaseSafety(options?: { isTestEnvironment?: boolean }): DbGuardCheckResult {
  const devUrl = process.env.DATABASE_URL || '';
  const testUrl = process.env.DATABASE_URL_TEST || '';

  // 1. Cek apakah DATABASE_URL terhubung ke host produksi
  if (devUrl.includes(PROD_HOST_KEYWORD)) {
    return {
      isSafe: false,
      error: `BAHAYA: DATABASE_URL menunjuk ke host produksi Neon (${PROD_HOST_KEYWORD})! Operasi segera dihentikan demi keselamatan data.`,
      devUrl,
      testUrl,
    };
  }

  // 2. Jika di lingkungan tes / reset data:
  if (options?.isTestEnvironment) {
    if (!testUrl) {
      return {
        isSafe: false,
        error: 'BAHAYA: Lingkungan tes membutuhkan DATABASE_URL_TEST yang terisi!',
        devUrl,
        testUrl,
      };
    }

    if (testUrl.includes(PROD_HOST_KEYWORD)) {
      return {
        isSafe: false,
        error: `BAHAYA: DATABASE_URL_TEST menunjuk ke host produksi Neon (${PROD_HOST_KEYWORD})! Operasi segera dihentikan.`,
        devUrl,
        testUrl,
      };
    }

    if (devUrl && testUrl === devUrl) {
      return {
        isSafe: false,
        error: 'BAHAYA: DATABASE_URL_TEST sama persis dengan DATABASE_URL! Pengujian yang mereset data dilarang menimpa database dev.',
        devUrl,
        testUrl,
      };
    }
  }

  return {
    isSafe: true,
    devUrl,
    testUrl,
  };
}

export function assertDatabaseSafety(options?: { isTestEnvironment?: boolean }): void {
  const check = checkDatabaseSafety(options);
  if (!check.isSafe) {
    throw new Error(check.error);
  }
}
