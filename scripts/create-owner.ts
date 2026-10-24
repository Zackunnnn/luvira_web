// scripts/create-owner.ts
// Skrip mandiri untuk membuat akun Owner pertama di produksi
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { assertDatabaseSafety } from '../lib/db-guard';

async function createOwner() {
  assertDatabaseSafety();
  const prisma = new PrismaClient();

  const email = process.argv[2] || 'owner@luvira.id';
  const name = process.argv[3] || 'Owner Luvira';
  const rawPassword = process.argv[4] || crypto.randomBytes(8).toString('hex') + 'A1!';

  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: Role.OWNER,
      isActive: true,
      name,
    },
    create: {
      email,
      name,
      passwordHash,
      role: Role.OWNER,
      isActive: true,
    },
  });

  console.log('====================================================');
  console.log('  AKUN OWNER BERHASIL DIBUAT / DIPERBARUI');
  console.log('====================================================');
  console.log(`  ID       : ${user.id}`);
  console.log(`  Nama     : ${user.name}`);
  console.log(`  Email    : ${user.email}`);
  console.log(`  Role     : ${user.role}`);
  console.log(`  Password : ${rawPassword}`);
  console.log('====================================================');
  console.log('  CATATAN: Sandi ini hanya dicetak sekali di terminal.');
  console.log('====================================================');

  await prisma.$disconnect();
}

createOwner().catch((err) => {
  console.error('[Error Create Owner]', err);
  process.exit(1);
});
