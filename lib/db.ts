import { PrismaClient } from '@prisma/client';

import { assertDatabaseSafety } from './db-guard';

const prismaClientSingleton = () => {
  assertDatabaseSafety();
  return new PrismaClient();
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
