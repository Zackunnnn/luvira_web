// lib/notify/order-events.ts
// ============================================================================
// Order Notification Dispatch Helper - FT-1
// Menghubungkan peristiwa bisnis pesanan ke Antrean WaOutbox
// Menegakkan aturan persetujuan pembeli (waConsent) secara ketat di server
// ============================================================================

import { prisma } from '@/lib/db';
import { enqueueWhatsAppNotification } from '@/lib/notify/queue';
import { templates } from '@/lib/notify/templates';
import { DEFAULT_STORE_WA } from '@/lib/whatsapp';
import { Role } from '@prisma/client';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://luvira.id';

/**
 * Mengambil nomor WhatsApp Admin penangan wilayah (atau fallback ke Admin Pusat/Default Store)
 */
async function getAdminWhatsAppNumber(regionId?: string | null): Promise<string> {
  try {
    if (regionId) {
      const regionalAdmin = await prisma.user.findFirst({
        where: {
          regionId,
          role: { in: [Role.ADMIN_WILAYAH, Role.ADMIN_PUSAT] },
          isActive: true,
          phone: { not: null },
        },
        select: { phone: true },
      });
      if (regionalAdmin?.phone) return regionalAdmin.phone;
    }

    // Fallback ke Admin Pusat
    const pusatAdmin = await prisma.user.findFirst({
      where: {
        role: Role.ADMIN_PUSAT,
        isActive: true,
        phone: { not: null },
      },
      select: { phone: true },
    });
    if (pusatAdmin?.phone) return pusatAdmin.phone;
  } catch {
    // Abaikan jika DB offline
  }

  return DEFAULT_STORE_WA;
}

/**
 * 1. Peristiwa: Pesanan Baru Masuk -> Notifikasi ke Admin Penangan
 */
export async function notifyNewOrderCreated(order: {
  id: string;
  code: string;
  regionId: string;
  totalPrice: number;
  paymentMethod: string;
  isTest?: boolean;
  region?: { name: string };
  items?: Array<{ productName: string; variantName: string; quantity: number }>;
}) {
  try {
    const adminPhone = await getAdminWhatsAppNumber(order.regionId);
    const regionName = order.region?.name || 'Pusat (Depok)';
    const itemsSummary = (order.items || [])
      .map(i => `${i.productName} (${i.variantName}) x${i.quantity}`)
      .join(', ') || 'Item Produk';

    const message = templates.newOrderAdmin({
      orderCode: order.code,
      total: order.totalPrice,
      regionName,
      itemsSummary,
      paymentMethod: order.paymentMethod,
      isTest: Boolean(order.isTest),
    });

    return await enqueueWhatsAppNotification({
      target: adminPhone,
      message,
      relatedType: 'ORDER',
      relatedId: order.id,
      idempotencyKey: `new-order-${order.id}`,
    });
  } catch (err) {
    console.error('[notifyNewOrderCreated Error]', err);
    return null;
  }
}

/**
 * 2. Peristiwa: Bukti Transfer Diunggah -> Notifikasi ke Admin Penangan
 */
export async function notifyTransferProofUploaded(order: {
  id: string;
  code: string;
  regionId: string;
  customerName: string;
  isTest?: boolean;
}, payment: {
  id: string;
  amount: number;
  bankName?: string;
}) {
  try {
    const adminPhone = await getAdminWhatsAppNumber(order.regionId);
    const message = templates.newTransferProofAdmin({
      orderCode: order.code,
      customerName: order.customerName,
      amount: payment.amount,
      bankName: payment.bankName,
      isTest: Boolean(order.isTest),
    });

    return await enqueueWhatsAppNotification({
      target: adminPhone,
      message,
      relatedType: 'PAYMENT',
      relatedId: payment.id,
      idempotencyKey: `proof-${payment.id}`,
    });
  } catch (err) {
    console.error('[notifyTransferProofUploaded Error]', err);
    return null;
  }
}

/**
 * 3. Peristiwa: Pembayaran Dikonfirmasi -> Notifikasi ke Pembeli (HANYA BILA waConsent == true)
 */
export async function notifyPaymentConfirmed(order: {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  totalPrice: number;
  waConsent?: boolean;
  isTest?: boolean;
}) {
  // ATURAN KETAT FT-1: HANYA bila pembeli mencentang "Kirim update pesanan lewat WhatsApp"
  if (order.waConsent === false) {
    return { skipped: true, reason: 'Pembeli tidak memberikan persetujuan notifikasi WhatsApp (waConsent=false)' };
  }

  if (!order.customerPhone) {
    return { skipped: true, reason: 'Nomor telepon pembeli kosong' };
  }

  try {
    const trackUrl = `${APP_URL}/track?code=${order.code}`;
    const message = templates.paymentConfirmedBuyer({
      orderCode: order.code,
      customerName: order.customerName,
      total: order.totalPrice,
      trackUrl,
      isTest: Boolean(order.isTest),
    });

    return await enqueueWhatsAppNotification({
      target: order.customerPhone,
      message,
      relatedType: 'ORDER',
      relatedId: order.id,
      idempotencyKey: `pay-confirm-${order.id}`,
    });
  } catch (err) {
    console.error('[notifyPaymentConfirmed Error]', err);
    return null;
  }
}

/**
 * 4. Peristiwa: Pesanan Dikirim -> Notifikasi ke Pembeli (HANYA BILA waConsent == true)
 */
export async function notifyOrderShipped(
  order: {
    id: string;
    code: string;
    customerName: string;
    customerPhone: string;
    waConsent?: boolean;
    isTest?: boolean;
  },
  courier: string,
  trackingNumber: string
) {
  if (order.waConsent === false) {
    return { skipped: true, reason: 'waConsent=false' };
  }

  if (!order.customerPhone) {
    return { skipped: true, reason: 'customerPhone empty' };
  }

  try {
    const trackUrl = `${APP_URL}/track?code=${order.code}`;
    const message = templates.orderShippedBuyer({
      orderCode: order.code,
      customerName: order.customerName,
      courier,
      trackingNumber,
      trackUrl,
      isTest: Boolean(order.isTest),
    });

    return await enqueueWhatsAppNotification({
      target: order.customerPhone,
      message,
      relatedType: 'ORDER',
      relatedId: order.id,
      idempotencyKey: `shipped-${order.id}`,
    });
  } catch (err) {
    console.error('[notifyOrderShipped Error]', err);
    return null;
  }
}

/**
 * 5. Peristiwa: Pesanan Kedaluwarsa -> Notifikasi ke Pembeli (HANYA BILA waConsent == true)
 */
export async function notifyOrderExpired(order: {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  waConsent?: boolean;
  isTest?: boolean;
}) {
  if (order.waConsent === false) {
    return { skipped: true, reason: 'waConsent=false' };
  }

  if (!order.customerPhone) {
    return { skipped: true, reason: 'customerPhone empty' };
  }

  try {
    const message = templates.orderExpiredBuyer({
      orderCode: order.code,
      customerName: order.customerName,
      isTest: Boolean(order.isTest),
    });

    return await enqueueWhatsAppNotification({
      target: order.customerPhone,
      message,
      relatedType: 'ORDER',
      relatedId: order.id,
      idempotencyKey: `expired-${order.id}`,
    });
  } catch (err) {
    console.error('[notifyOrderExpired Error]', err);
    return null;
  }
}

