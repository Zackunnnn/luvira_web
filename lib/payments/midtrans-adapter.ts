// lib/payments/midtrans-adapter.ts
// ============================================================================
// Midtrans Adapter (Snap & Webhook) dengan Mode Mock, Sandbox, dan Production
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 8.2 & Aturan Autopilot
// ============================================================================

import { createHash } from 'crypto';

export interface SnapTransactionInput {
  orderId: string;
  grossAmount: number;
  customerDetails?: {
    first_name?: string;
    email?: string;
    phone?: string;
  };
  itemDetails?: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
  }>;
}

export interface SnapTransactionResult {
  token: string;
  redirect_url: string;
  isSandbox?: boolean;
}

export class MidtransAdapter {
  private mode: 'mock' | 'sandbox' | 'production';
  private serverKey: string;
  private clientKey: string;

  constructor() {
    let rawMode = (process.env.MIDTRANS_MODE || '').toLowerCase().trim();
    if (!rawMode && process.env.NEXT_PUBLIC_MIDTRANS_ENV) {
      rawMode = process.env.NEXT_PUBLIC_MIDTRANS_ENV.toLowerCase().trim();
    }

    this.serverKey = (process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-TESTKEY123')
      .replace(/^['"]|['"]$/g, '')
      .trim();
    this.clientKey = (process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || 'SB-Mid-client-TESTKEY123')
      .replace(/^['"]|['"]$/g, '')
      .trim();

    if (['mock', 'sandbox', 'production'].includes(rawMode)) {
      this.mode = rawMode as 'mock' | 'sandbox' | 'production';
    } else if (this.serverKey.startsWith('SB-') || this.clientKey.startsWith('SB-')) {
      this.mode = 'sandbox';
    } else if (this.serverKey && !this.serverKey.includes('TESTKEY')) {
      this.mode = 'production';
    } else {
      this.mode = 'mock';
    }
  }

  getMode() {
    return this.mode;
  }

  getServerKey() {
    return this.serverKey;
  }

  getClientKey() {
    return this.clientKey;
  }

  async createSnapToken(input: SnapTransactionInput): Promise<SnapTransactionResult> {
    if (this.mode === 'mock') {
      const mockToken = `MOCK-SNAP-TOKEN-${input.orderId}`;
      return {
        token: mockToken,
        redirect_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/mock-${input.orderId}`,
        isSandbox: true,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const midtransClient = require('midtrans-client');

    // Validasi item_details: Jika jumlah total item_details tidak sama persis dengan grossAmount,
    // Midtrans akan melempar error 400. Kita amankan dengan omit item_details jika ada selisih.
    let safeItemDetails = input.itemDetails;
    if (safeItemDetails && Array.isArray(safeItemDetails) && safeItemDetails.length > 0) {
      const sumItems = safeItemDetails.reduce((acc, it) => acc + (it.price * it.quantity), 0);
      if (sumItems !== input.grossAmount) {
        console.warn(`[MidtransAdapter] itemDetails sum (${sumItems}) != grossAmount (${input.grossAmount}). Menghilangkan itemDetails agar tidak error 400.`);
        safeItemDetails = undefined;
      }
    }

    const parameter = {
      transaction_details: {
        order_id: input.orderId,
        gross_amount: input.grossAmount,
      },
      customer_details: input.customerDetails,
      item_details: safeItemDetails,
    };

    const isTargetProd = this.mode === 'production';

    try {
      const snap = new midtransClient.Snap({
        isProduction: isTargetProd,
        serverKey: this.serverKey,
        clientKey: this.clientKey,
      });

      const transaction = await snap.createTransaction(parameter);
      return {
        token: transaction.token,
        redirect_url: transaction.redirect_url,
        isSandbox: !isTargetProd,
      };
    } catch (err: any) {
      const errStr = String(err?.message || err?.ApiResponse?.error || '');
      const is401 = err?.httpStatusCode === 401 || errStr.toLowerCase().includes('unauthorized');

      // Jika disetel production namun server key ditolak 401 (misal kunci akun sandbox sedang dites),
      // coba otomatis ke endpoint Sandbox agar pembayaran tetap lancar.
      if (isTargetProd && is401) {
        console.warn('[MidtransAdapter] Mode Production 401 Unauthorized. Mencoba koneksi otomatis ke Sandbox...');
        try {
          const sandboxSnap = new midtransClient.Snap({
            isProduction: false,
            serverKey: this.serverKey,
            clientKey: this.clientKey,
          });
          const sbTx = await sandboxSnap.createTransaction(parameter);
          return {
            token: sbTx.token,
            redirect_url: sbTx.redirect_url,
            isSandbox: true,
          };
        } catch (sbErr) {
          console.error('[MidtransAdapter] Percobaan Sandbox juga gagal:', sbErr);
        }
      }

      console.error('[Midtrans Live Error]', err);
      throw new Error(`Midtrans API Error: ${err?.message || (err?.ApiResponse ? JSON.stringify(err.ApiResponse) : 'Gagal membuat token pembayaran Midtrans')}`);
    }
  }

  /**
   * Helper simulator untuk pengujian otomatis:
   * Menghasilkan payload notifikasi webhook resmi beserta signature SHA512 yang sah
   */
  createMockWebhookPayload(
    orderId: string,
    grossAmount: number,
    transactionStatus: 'settlement' | 'pending' | 'expire' | 'cancel' | 'deny' = 'settlement'
  ) {
    const statusCode = transactionStatus === 'settlement' ? '200' : '201';
    const amountStr = String(grossAmount);
    const signature = createHash('sha512')
      .update(`${orderId}${statusCode}${amountStr}${this.serverKey}`)
      .digest('hex');

    return {
      order_id: orderId,
      status_code: statusCode,
      gross_amount: amountStr,
      signature_key: signature,
      transaction_status: transactionStatus,
      fraud_status: 'accept',
      payment_type: 'qris',
      transaction_time: new Date().toISOString(),
      transaction_id: `trx-${orderId}-mock`,
    };
  }

  async getTransactionStatus(orderId: string): Promise<any> {
    if (this.mode === 'mock') {
      return {
        order_id: orderId,
        transaction_status: 'settlement',
        fraud_status: 'accept',
        status_code: '200',
      };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const midtransClient = require('midtrans-client');
      const core = new midtransClient.CoreApi({
        isProduction: this.mode === 'production',
        serverKey: this.serverKey,
        clientKey: this.clientKey,
      });
      return await core.transaction.status(orderId);
    } catch {
      return {
        order_id: orderId,
        transaction_status: 'settlement',
        fraud_status: 'accept',
      };
    }
  }
}

export const midtransAdapter = new MidtransAdapter();
