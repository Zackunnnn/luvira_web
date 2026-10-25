import { PrismaClient } from '@prisma/client';

import { assertDatabaseSafety } from './db-guard';

const prismaClientSingleton = () => {
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.NEXT_PHASE !== 'phase-production-build' &&
    process.env.ALLOW_PROD_DB !== 'true'
  ) {
    assertDatabaseSafety();
  }
  return new PrismaClient();
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
