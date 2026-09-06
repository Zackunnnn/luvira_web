// lib/midtrans.ts — Singleton initializer for the official Midtrans Node.js SDK.
//
// KENAPA PAKAI SDK RESMI (`midtrans-client`):
// 1. Menangani HTTP auth (Base64 encoding ServerKey) secara otomatis
// 2. Signature verification helper sudah built-in
// 3. Endpoint URL sandbox vs production di-handle via `isProduction` flag
// 4. Maintained oleh tim Midtrans — kompatibilitas API terjamin
//
// File ini HANYA boleh di-import dari server-side code (API routes),
// JANGAN import dari komponen client ('use client') karena mengandung ServerKey.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const midtransClient = require('midtrans-client');

// ============================================================================
// ENVIRONMENT VARIABLE VALIDATION
// Memastikan key Midtrans tersedia sebelum runtime — fail fast saat development
// agar developer langsung tahu kalau setup belum benar.
// ============================================================================

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
const MIDTRANS_CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
const MIDTRANS_ENV = process.env.NEXT_PUBLIC_MIDTRANS_ENV || 'sandbox';
const isProduction = MIDTRANS_ENV === 'production';

if (!MIDTRANS_SERVER_KEY) {
  throw new Error(
    '[Midtrans] MIDTRANS_SERVER_KEY tidak ditemukan di environment variables.\n' +
    'Pastikan file .env.local sudah dibuat dengan key dari https://dashboard.sandbox.midtrans.com\n' +
    'Lihat .env.local.example untuk template.'
  );
}

if (!MIDTRANS_CLIENT_KEY) {
  throw new Error(
    '[Midtrans] NEXT_PUBLIC_MIDTRANS_CLIENT_KEY tidak ditemukan di environment variables.\n' +
    'Pastikan file .env.local sudah dibuat dengan key dari https://dashboard.sandbox.midtrans.com\n' +
    'Lihat .env.local.example untuk template.'
  );
}

// ============================================================================
// SNAP API INSTANCE (Singleton)
// Digunakan untuk membuat transaction token yang akan di-consume oleh
// Snap.js popup di frontend. isProduction: false = Sandbox environment.
// ============================================================================

export const snap = new midtransClient.Snap({
  isProduction: isProduction,    // determined by NEXT_PUBLIC_MIDTRANS_ENV
  serverKey: MIDTRANS_SERVER_KEY,
  clientKey: MIDTRANS_CLIENT_KEY,
});

// ============================================================================
// CORE API INSTANCE (Singleton)
// Digunakan untuk operasi server-side lainnya seperti:
// - Mengecek status transaksi: coreApi.transaction.status(orderId)
// - Cancel/refund transaksi
// Tidak digunakan untuk create transaction (itu via Snap).
// ============================================================================

export const coreApi = new midtransClient.CoreApi({
  isProduction: isProduction,
  serverKey: MIDTRANS_SERVER_KEY,
  clientKey: MIDTRANS_CLIENT_KEY,
});
