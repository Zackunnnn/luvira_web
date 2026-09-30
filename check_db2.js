const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    include: { variants: true },
  });
  products.forEach(p => {
    p.variants.forEach(v => {
      if (v.imageUrl && v.imageUrl.includes('r2.dev')) {
        console.log(`Product: ${p.name}, Variant: ${v.name}, URL: ${v.imageUrl}`);
      }
    });
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
