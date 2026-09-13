import { NextRequest } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { Order, OrderStatus } from '@/types/order';

const DATA_DIR = join(process.cwd(), 'data');
const ORDERS_FILE = join(DATA_DIR, 'orders.json');

// Helper to read orders
export async function readOrders(): Promise<Order[]> {
  try {
    const data = await readFile(ORDERS_FILE, 'utf-8');
    return JSON.parse(data) as Order[];
  } catch {
    return []; // Return empty array if file doesn't exist
  }
}

// Helper to write orders
export async function writeOrders(orders: Order[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const orders = await readOrders();
    return Response.json(orders);
  } catch (error) {
    console.error('[API Orders GET] Error:', error);
    return Response.json({ error: 'Failed to read orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const newOrder: Order = await request.json();
    
    // Validasi basic
    if (!newOrder || !newOrder.id || !newOrder.customerInfo) {
      return Response.json({ error: 'Invalid order data' }, { status: 400 });
    }

    const orders = await readOrders();
    
    // Cek apakah orderId sudah ada (idempotency)
    const existingIndex = orders.findIndex((o) => o.id === newOrder.id);
    if (existingIndex >= 0) {
      // Update existing order
      orders[existingIndex] = { ...orders[existingIndex], ...newOrder };
    } else {
      // Insert new order at the beginning
      orders.unshift(newOrder);
    }

    await writeOrders(orders);
    
    return Response.json({ success: true, order: newOrder }, { status: 201 });
  } catch (error) {
    console.error('[API Orders POST] Error:', error);
    return Response.json({ error: 'Failed to save order' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, status }: { id: string; status: OrderStatus } = await request.json();
    
    if (!id || !status) {
      return Response.json({ error: 'id and status are required' }, { status: 400 });
    }

    const orders = await readOrders();
    let updated = false;

    const newOrders = orders.map((o) => {
      if (o.id === id) {
        updated = true;
        return { ...o, status };
      }
      return o;
    });

    if (!updated) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    await writeOrders(newOrders);
    
    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[API Orders PUT] Error:', error);
    return Response.json({ error: 'Failed to update order status' }, { status: 500 });
  }
}
