// app/api/developer/health/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { Role } from '@prisma/client';
import { recordAuditLog } from '@/lib/audit';
import { calculateShippingRates } from '@/lib/shipping/rajaongkir';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== Role.DEVELOPER) {
    return NextResponse.json({ error: 'Akses ditolak. Khusus Peran Developer.' }, { status: 403 });
  }

  // 1. Audit Log Akses Developer
  await recordAuditLog({
    actorId: user.id,
    actorName: user.name || 'Lead Developer',
    actorRole: user.role,
    action: 'DEVELOPER_VIEW_HEALTH',
    entity: 'SystemHealth',
    entityId: 'global',
    before: null,
    after: { timestamp: new Date().toISOString() },
  });

  // 2. Ping Database
  let dbStatus = 'UP';
  let dbLatencyMs = 0;
  let dbError: string | null = null;
  let tableCounts = { products: 0, orders: 0, users: 0 };

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1 as ping`;
    dbLatencyMs = Date.now() - start;

    const [prodCount, ordCount, usrCount] = await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.user.count(),
    ]);
    tableCounts = { products: prodCount, orders: ordCount, users: usrCount };
  } catch (err: any) {
    dbStatus = 'DOWN';
    dbError = err.message || 'Database connection error';
  }

  // 3. Status Penyimpanan Gambar (ImageKit / Local-Stub)
  const imageStorageMode = process.env.IMAGE_STORAGE_MODE || 'local-stub';
  const hasImageKitKeys = Boolean(process.env.IMAGEKIT_PUBLIC_KEY && process.env.IMAGEKIT_PRIVATE_KEY);
  const storageStatus = {
    mode: imageStorageMode,
    isConfigured: imageStorageMode === 'imagekit' ? hasImageKitKeys : true,
    status: imageStorageMode === 'imagekit' && !hasImageKitKeys ? 'DEGRADED' : 'UP',
  };

  // 4. RajaOngkir (Pengiriman)
  const shippingMode = process.env.SHIPPING_MODE || 'mock';
  const hasRajaOngkirKey = Boolean(process.env.RAJAONGKIR_API_KEY);
  let shippingTestStatus = 'UP';
  let shippingTestError: string | null = null;

  try {
    const testRates = await calculateShippingRates({
      originId: '115', // Depok
      destinationId: '501', // Yogyakarta
      weightGram: 100,
      courier: 'jne',
    });
    if (!testRates || testRates.length === 0) {
      shippingTestStatus = 'DEGRADED';
    }
  } catch (err: any) {
    shippingTestStatus = 'DOWN';
    shippingTestError = err.message || 'Uji ringan ongkir gagal';
  }

  const shippingHealth = {
    mode: shippingMode,
    isConfigured: hasRajaOngkirKey || shippingMode === 'mock',
    status: shippingTestStatus,
    error: shippingTestError,
  };

  // 5. Midtrans (Pembayaran)
  const midtransMode = process.env.MIDTRANS_MODE || 'mock';
  const hasMidtransKey = Boolean(process.env.MIDTRANS_SERVER_KEY);
  
  // Ambil waktu transaksi atau notifikasi Midtrans terakhir
  const lastSettledOrder = await prisma.order.findFirst({
    where: { status: 'DIPROSES' },
    orderBy: { updatedAt: 'desc' },
    select: { updatedAt: true, code: true },
  });

  const paymentHealth = {
    mode: midtransMode,
    isConfigured: hasMidtransKey || midtransMode === 'mock',
    status: hasMidtransKey || midtransMode === 'mock' ? 'UP' : 'DEGRADED',
    lastWebhookAt: lastSettledOrder?.updatedAt || null,
  };

  // 6. Ringkasan Kesehatan Keseluruhan
  const isHealthy =
    dbStatus === 'UP' &&
    storageStatus.status === 'UP' &&
    shippingHealth.status === 'UP' &&
    paymentHealth.status === 'UP';

  return NextResponse.json({
    status: isHealthy ? 'HEALTHY' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      error: dbError,
      records: tableCounts,
    },
    storage: storageStatus,
    shipping: shippingHealth,
    payment: paymentHealth,
  });
}
