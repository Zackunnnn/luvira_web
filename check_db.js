const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    include: { variants: true },
  });
  console.dir(products, { depth: null });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
