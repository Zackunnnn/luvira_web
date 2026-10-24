// tests/midtrans-webhook.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'crypto';
import {
  verifyMidtransSignature,
  mapMidtransStatus,
  evaluateStatusTransition,
  FINAL_PAID_STATUS,
} from '../lib/midtrans-webhook';

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

  assert.equal(verifyMidtransSignature(validPayload, serverKey), true, 'Signature sah harus lolos verifikasi');

  const fakePayload = {
    ...validPayload,
    signature_key: 'invalid_signature_hash_xyz',
  };
  assert.equal(verifyMidtransSignature(fakePayload, serverKey), false, 'Signature palsu harus ditolak');
});

test('Midtrans Webhook: status mapping yang benar', () => {
  assert.equal(mapMidtransStatus('settlement'), 'Lunas');
  assert.equal(mapMidtransStatus('capture', 'accept'), 'Lunas');
  assert.equal(mapMidtransStatus('capture', 'challenge'), 'Gagal');
  assert.equal(mapMidtransStatus('pending'), 'Menunggu Pembayaran');
  assert.equal(mapMidtransStatus('expire'), 'Gagal');
  assert.equal(mapMidtransStatus('deny'), 'Gagal');
  assert.equal(mapMidtransStatus('cancel'), 'Gagal');
  assert.equal(mapMidtransStatus('something_else'), 'unknown');
});

test('Midtrans Idempotency: status Lunas tidak boleh turun oleh notifikasi telat atau ganda', () => {
  // 1. Order pending berubah jadi Lunas -> Harus update
  const res1 = evaluateStatusTransition('menunggu_transfer', FINAL_PAID_STATUS);
  assert.equal(res1.shouldUpdate, true);
  assert.equal(res1.newStatus, FINAL_PAID_STATUS);

  // 2. Order sudah Lunas, tiba notifikasi pending yang telat -> DITOLAK (tidak boleh turun)
  const res2 = evaluateStatusTransition(FINAL_PAID_STATUS, 'Menunggu Pembayaran');
  assert.equal(res2.shouldUpdate, false);
  assert.equal(res2.newStatus, FINAL_PAID_STATUS);

  // 3. Order sudah Lunas, tiba notifikasi expire/cancel/deny yang telat -> DITOLAK
  const res3 = evaluateStatusTransition(FINAL_PAID_STATUS, 'Gagal');
  assert.equal(res3.shouldUpdate, false);
  assert.equal(res3.newStatus, FINAL_PAID_STATUS);

  // 4. Order sudah Lunas, tiba notifikasi settlement ganda -> Idempoten (tidak update DB lagi)
  const res4 = evaluateStatusTransition(FINAL_PAID_STATUS, FINAL_PAID_STATUS);
  assert.equal(res4.shouldUpdate, false);
  assert.equal(res4.newStatus, FINAL_PAID_STATUS);
});
