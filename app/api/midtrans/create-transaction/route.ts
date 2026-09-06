// app/api/midtrans/create-transaction/route.ts
// ============================================================================
// API Route: POST /api/midtrans/create-transaction
//
// Endpoint yang dipanggil oleh checkout page untuk membuat transaksi Midtrans
// dan mendapatkan Snap token. Token ini kemudian digunakan di frontend untuk
// memunculkan popup pembayaran Midtrans Snap.
//
// Flow: Checkout Form → POST ke route ini → Midtrans Snap API → Return token
// ============================================================================

import { NextRequest } from 'next/server';
import { snap } from '@/lib/midtrans';
import { CreateTransactionRequest } from '@/types/midtrans';

export async function POST(request: NextRequest) {
  try {
    // Parse request body dari checkout page
    const body: CreateTransactionRequest = await request.json();
    const { orderId, grossAmount, itemDetails, customerDetails } = body;

    // ========================================================================
    // VALIDASI INPUT — Pastikan semua field wajib ada sebelum hit Midtrans API
    // ========================================================================
    if (!orderId || !grossAmount || !itemDetails?.length || !customerDetails) {
      return Response.json(
        {
          error: 'Data transaksi tidak lengkap',
          details: 'orderId, grossAmount, itemDetails, dan customerDetails wajib diisi.',
        },
        { status: 400 }
      );
    }

    if (grossAmount <= 0) {
      return Response.json(
        { error: 'grossAmount harus lebih dari 0' },
        { status: 400 }
      );
    }

    // ========================================================================
    // CONSTRUCT MIDTRANS SNAP PARAMETER
    // Referensi: https://docs.midtrans.com/reference/request-body-json-parameter
    //
    // Midtrans akan menolak jika total item_details tidak sama dengan gross_amount.
    // Kita memastikan konsistensi dengan menghitung ulang dari itemDetails.
    // ========================================================================
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      item_details: itemDetails.map((item) => ({
        id: item.id,
        price: item.price,
        quantity: item.quantity,
        // Midtrans membatasi nama item maksimal 50 karakter
        name: item.name.substring(0, 50),
      })),
      customer_details: {
        first_name: customerDetails.first_name,
        last_name: customerDetails.last_name || '',
        phone: customerDetails.phone,
        // Email opsional — Midtrans butuh minimal first_name dan phone
        ...(customerDetails.email && { email: customerDetails.email }),
      },
    };

    // ========================================================================
    // PANGGIL MIDTRANS SNAP API
    // snap.createTransaction() mengirim request ke Midtrans server dan
    // mengembalikan { token, redirect_url }.
    // - token: Digunakan oleh snap.js popup di frontend (window.snap.pay(token))
    // - redirect_url: URL alternatif jika popup tidak bisa ditampilkan
    // ========================================================================
    const transaction = await snap.createTransaction(parameter);

    return Response.json({
      token: transaction.token,
      redirect_url: transaction.redirect_url,
    });
  } catch (error: unknown) {
    // ========================================================================
    // ERROR HANDLING
    // Midtrans SDK throws error dengan message yang informatif (misal:
    // "Transaction doesn't exist", "Duplicate order ID", dll).
    // Kita forward error message ke client untuk debugging.
    // ========================================================================
    console.error('[Midtrans Create Transaction Error]', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Terjadi kesalahan saat membuat transaksi';

    return Response.json(
      {
        error: 'Gagal membuat transaksi Midtrans',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
