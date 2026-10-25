// app/api/orders/[code]/track/route.ts
// ============================================================================
// API Pelacakan Pesanan Terproteksi (Kode + 4 Digit Terakhir WA)
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 9, A7, E2E-15
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getLast4Digits, generateOrderHelpWhatsAppUrl } from '@/lib/whatsapp';

// Rate Limiting sederhana in-memory: IP -> { count, resetTime }
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 5 * 60 * 1000 }); // Window 5 menit
    return true;
  }

  if (entry.count >= 20) {
    return false; // Melebihi batas
  }

  entry.count += 1;
  return true;
}

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan pelacakan. Silakan coba kembali dalam 5 menit.' },
        { status: 429 }
      );
    }

    const { code } = await params;
    const body = await request.json().catch(() => ({}));
    const phoneLast4 = body.phoneLast4 || '';

    if (!code) {
      return NextResponse.json({ error: 'Kode pesanan wajib diisi.' }, { status: 400 });
    }

    if (!phoneLast4 || typeof phoneLast4 !== 'string' || phoneLast4.trim().length !== 4) {
      return NextResponse.json(
        { error: '4 digit terakhir nomor WhatsApp wajib diisi (tepat 4 angka).' },
        { status: 400 }
      );
    }

    // 1. Cari pesanan
    const order = await prisma.order.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: {
        items: true,
        region: true,
        payments: true,
        statusLogs: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Pesanan dengan kode tersebut tidak ditemukan.' },
        { status: 404 }
      );
    }

    // 2. Verifikasi 4 digit terakhir nomor WA (A7 / E2E-15)
    const expectedLast4 = getLast4Digits(order.customerPhone);
    const inputLast4 = phoneLast4.trim();

    if (inputLast4 !== expectedLast4) {
      return NextResponse.json(
        { error: '4 digit terakhir nomor WhatsApp tidak cocok dengan pesanan ini.' },
        { status: 403 }
      );
    }

    // 3. Bangkitkan tautan bantuan WhatsApp resmi
    const helpUrl = generateOrderHelpWhatsAppUrl(order.code);

    return NextResponse.json({
      success: true,
      order: {
        code: order.code,
        status: order.status,
        customerName: order.customerName,
        customerPhoneMasked: order.customerPhone.replace(/\d(?=\d{4})/g, '*'),
        shippingAddress: order.shippingAddress,
        courierCode: order.courierCode,
        trackingNumber: order.trackingNumber,
        subtotal: order.subtotal,
        discountAmount: order.discountAmount,
        ppnAmount: order.ppnAmount,
        shippingCost: order.shippingCost,
        totalPrice: order.totalPrice,
        paymentMethod: order.paymentMethod,
        paymentProofUrl: order.payments.find((p) => p.proofUrl)?.proofUrl || null,
        createdAt: order.createdAt,
        expiresAt: order.expiresAt,
        regionName: order.region?.name || 'Pusat',
        items: order.items.map((item) => ({
          id: item.id,
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity,
          priceEach: item.priceEach,
          subtotal: item.subtotal,
        })),
        timeline: order.statusLogs.map((log) => ({
          id: log.id,
          fromStatus: log.fromStatus,
          toStatus: log.toStatus,
          note: log.note,
          createdAt: log.createdAt,
        })),
        whatsappHelpUrl: helpUrl,
      },
    });
  } catch (error: any) {
    console.error('[API Order Track Error]', error);
    return NextResponse.json(
      { error: error.message || 'Gagal melacak pesanan.' },
      { status: 500 }
    );
  }
}
