// tests/unit/midtrans-webhook.test.ts
import { test, expect } from 'vitest';
import { createHash } from 'crypto';
import {
  verifyMidtransSignature,
  mapMidtransStatus,
  mapMidtransStatusToOrderStatus,
  evaluateStatusTransition,
  FINAL_PAID_STATUS,
} from '@/lib/midtrans-webhook';
import { OrderStatus } from '@prisma/client';

test('Midtrans Webhook: verifikasi signature valid dan tolak signature palsu', () => {
  const serverKey = 'SB-Mid-server-TESTKEY123';
  const orderId = 'LVR-TEST-001';
  const statusCode = '200';
  const grossAmount = '75000';

  const validSignature = createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');

  const validPayload = {
    order_id: orderId,
    status_code: statusCode,
    gross_amount: grossAmount,
    signature_key: validSignature,
  };

  expect(verifyMidtransSignature(validPayload, serverKey)).toBe(true);

  const fakePayload = {
    ...validPayload,
    signature_key: 'invalid_signature_hash_xyz',
  };
  expect(verifyMidtransSignature(fakePayload, serverKey)).toBe(false);
});

test('Midtrans Webhook: status mapping yang benar', () => {
  expect(mapMidtransStatus('settlement')).toBe('Lunas');
  expect(mapMidtransStatus('capture', 'accept')).toBe('Lunas');
  expect(mapMidtransStatus('capture', 'challenge')).toBe('Gagal');
  expect(mapMidtransStatus('pending')).toBe('Menunggu Pembayaran');
  expect(mapMidtransStatus('expire')).toBe('Gagal');
  expect(mapMidtransStatus('deny')).toBe('Gagal');
  expect(mapMidtransStatus('cancel')).toBe('Gagal');
  expect(mapMidtransStatus('something_else')).toBe('unknown');

  // Prisma OrderStatus mapping
  expect(mapMidtransStatusToOrderStatus('settlement')).toBe(OrderStatus.DIPROSES);
  expect(mapMidtransStatusToOrderStatus('pending')).toBe(OrderStatus.MENUNGGU_PEMBAYARAN);
  expect(mapMidtransStatusToOrderStatus('cancel')).toBe(OrderStatus.DIBATALKAN);
});

test('Midtrans Idempotency: status Lunas tidak boleh turun oleh notifikasi telat atau ganda', () => {
  // 1. Order pending berubah jadi Lunas -> Harus update
  const res1 = evaluateStatusTransition(OrderStatus.MENUNGGU_PEMBAYARAN, FINAL_PAID_STATUS);
  expect(res1.shouldUpdate).toBe(true);
  expect(res1.newStatus).toBe(FINAL_PAID_STATUS);

  // 2. Order sudah Lunas, tiba notifikasi pending yang telat -> DITOLAK (tidak boleh turun)
  const res2 = evaluateStatusTransition(FINAL_PAID_STATUS, OrderStatus.MENUNGGU_PEMBAYARAN);
  expect(res2.shouldUpdate).toBe(false);
  expect(res2.newStatus).toBe(FINAL_PAID_STATUS);

  // 3. Order sudah Lunas, tiba notifikasi expire/cancel/deny yang telat -> DITOLAK
  const res3 = evaluateStatusTransition(FINAL_PAID_STATUS, OrderStatus.DIBATALKAN);
  expect(res3.shouldUpdate).toBe(false);
  expect(res3.newStatus).toBe(FINAL_PAID_STATUS);

  // 4. Order sudah Lunas, tiba notifikasi settlement ganda -> Idempoten (tidak update DB lagi)
  const res4 = evaluateStatusTransition(FINAL_PAID_STATUS, FINAL_PAID_STATUS);
  expect(res4.shouldUpdate).toBe(false);
  expect(res4.newStatus).toBe(FINAL_PAID_STATUS);
});
