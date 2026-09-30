const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
  const products = await prisma.product.findMany({
    include: { variants: true },
  });
  fs.writeFileSync('db_out2.json', JSON.stringify(products, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
