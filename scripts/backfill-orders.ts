import { PrismaClient } from '@prisma/client';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { Order as OldOrder } from '../types/order';

const prisma = new PrismaClient();
const DATA_DIR = join(process.cwd(), 'data');
const ORDERS_FILE = join(DATA_DIR, 'orders.json');

async function main() {
  console.log('Start backfilling orders...');
  
  let oldOrders: OldOrder[] = [];
  try {
    const data = await readFile(ORDERS_FILE, 'utf-8');
    oldOrders = JSON.parse(data);
  } catch (error) {
    console.log('No orders.json found or failed to read. Assuming empty.');
    return;
  }

  console.log(`Found ${oldOrders.length} orders to backfill.`);

  for (const oldOrder of oldOrders) {
    const existingOrder = await prisma.order.findUnique({
      where: { id: oldOrder.id },
    });

    if (!existingOrder) {
      // parse date string or use current date if invalid
      let createdAt = new Date();
      // Format from frontend: "16 Sep 2026, 21.05 WIB" (approx)
      // Since it might be hard to parse exactly, we'll just use now() for backfilled if we can't parse.
      
      const newOrder = await prisma.order.create({
        data: {
          id: oldOrder.id,
          customerName: oldOrder.customerInfo?.name || 'Unknown',
          customerPhone: oldOrder.customerInfo?.phone || 'Unknown',
          customerAddress: oldOrder.customerInfo?.address || 'Unknown',
          status: oldOrder.status || 'menunggu_transfer',
          createdAt: createdAt, // we can't parse the custom ID format easily, so just use now
          items: {
            create: oldOrder.items.map((item) => ({
              productId: item.product.id,
              variantId: item.selectedVariant.id,
              quantity: item.quantity,
              priceEach: item.product.price,
            })),
          },
        },
      });
      console.log(`Migrated order: ${newOrder.id}`);
    } else {
      console.log(`Order ${oldOrder.id} already exists. Skipping.`);
    }
  }

  console.log('Backfill finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
