const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Promo 1: Diskon Persentase (Contoh: Diskon 50%)
  const promo1 = await prisma.promoCode.upsert({
    where: { code: 'SUPER50' },
    update: {},
    create: {
      code: 'SUPER50',
      discountType: 'percentage',
      discountValue: 50, // 50%
      quota: 100, // Bisa dipakai 100 kali
      isActive: true,
      isFreeShipping: false
    }
  });

  // Promo 2: Diskon Nominal Tetap (Contoh: Potongan Rp 50.000)
  const promo2 = await prisma.promoCode.upsert({
    where: { code: 'HEMAT50K' },
    update: {},
    create: {
      code: 'HEMAT50K',
      discountType: 'fixed',
      discountValue: 50000, // Rp 50.000
      quota: 100,
      isActive: true,
      isFreeShipping: false
    }
  });

  // Promo 3: Gratis Ongkir
  const promo3 = await prisma.promoCode.upsert({
    where: { code: 'GRATISONGKIR' },
    update: {},
    create: {
      code: 'GRATISONGKIR',
      discountType: 'fixed',
      discountValue: 0, 
      quota: 500,
      isActive: true,
      isFreeShipping: true
    }
  });

  console.log('Berhasil membuat kode promo:', promo1.code, promo2.code, promo3.code);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
