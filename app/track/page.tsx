// app/track/page.tsx
// ============================================================================
// Halaman Pelacakan Pesanan Luvira 2.0 (Kode Pesanan + 4 Digit Terakhir WA)
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 9, A7, E2E-15
// ============================================================================

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Truck,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  MessageCircle,
  MapPin,
} from 'lucide-react';
import { OrderStatus } from '@prisma/client';

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const [orderCode, setOrderCode] = useState(initialCode);
  const [phoneLast4, setPhoneLast4] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any>(null);

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderCode.trim()) {
      setError('Kode pesanan wajib diisi.');
      return;
    }
    if (!phoneLast4.trim() || phoneLast4.trim().length !== 4) {
      setError('4 digit terakhir nomor WhatsApp wajib diisi (tepat 4 angka).');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const cleanCode = orderCode.trim().toUpperCase();
      const res = await fetch(`/api/orders/${encodeURIComponent(cleanCode)}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneLast4: phoneLast4.trim() }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Pesanan tidak ditemukan.');
      }

      setOrderData(json.order);
    } catch (err: any) {
      setError(err.message || 'Gagal melacak pesanan.');
      setOrderData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getStepStatus = (stepStatus: OrderStatus) => {
    if (!orderData) return 'pending';
    const statusOrder: OrderStatus[] = [
      OrderStatus.MENUNGGU_PEMBAYARAN,
      OrderStatus.MENUNGGU_VERIFIKASI,
      OrderStatus.DIPROSES,
      OrderStatus.DIKIRIM,
      OrderStatus.SELESAI,
    ];

    const currentIdx = statusOrder.indexOf(orderData.status);
    const stepIdx = statusOrder.indexOf(stepStatus);

    if (orderData.status === OrderStatus.DIBATALKAN) return 'cancelled';
    if (currentIdx >= stepIdx) return 'completed';
    return 'upcoming';
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 pb-16">
      {/* Header Top Nav */}
      <header className="border-b border-stone-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex items-center space-x-1.5 text-xs font-medium text-stone-600 hover:text-stone-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Toko</span>
          </Link>
          <div className="font-serif text-lg font-bold tracking-wider text-stone-900">
            LUVIRA
          </div>
          <div className="flex items-center space-x-1 text-xs text-stone-500">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            <span className="hidden sm:inline">Lacak Pesanan</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 space-y-6">
        {/* FORM PENCARIAN */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4">
            <h1 className="text-base font-bold text-stone-900 sm:text-lg">
              Lacak Status Pesanan Anda
            </h1>
            <p className="mt-1 text-xs text-stone-500">
              Masukkan Kode Pesanan dan 4 digit terakhir nomor WhatsApp yang digunakan saat pemesanan demi keamanan data Anda.
            </p>
          </div>

          <form onSubmit={handleTrackSubmit} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="input-track-order-code"
                  className="mb-1 block text-xs font-semibold text-stone-700"
                >
                  Kode Pesanan *
                </label>
                <input
                  id="input-track-order-code"
                  type="text"
                  required
                  value={orderCode}
                  onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: LVR-20261024-1234"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs uppercase placeholder-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label
                  htmlFor="input-track-phone-last4"
                  className="mb-1 block text-xs font-semibold text-stone-700"
                >
                  4 Digit Terakhir Nomor WhatsApp *
                </label>
                <input
                  id="input-track-phone-last4"
                  type="text"
                  maxLength={4}
                  required
                  value={phoneLast4}
                  onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, ''))}
                  placeholder="Contoh: 7890"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs placeholder-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>

            {error && (
              <div
                id="track-error-message"
                className="flex items-center space-x-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-800 border border-rose-200"
              >
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              id="btn-submit-track"
              disabled={isLoading}
              className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-800 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-900 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Memeriksa Pesanan...</span>
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  <span>Lacak Pesanan</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* HASIL PELACAKAN */}
        {orderData && (
          <div id="tracking-result-section" className="space-y-6 animate-in fade-in zoom-in-95">
            {/* 1. KARTU STATUS & RESI */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-3 gap-2">
                <div>
                  <p className="text-xs text-stone-500 font-medium">Status Pesanan Saat Ini:</p>
                  <p className="font-mono text-base font-bold text-stone-900" id="result-order-status">
                    {orderData.status}
                  </p>
                </div>
                <div className="text-xs text-stone-500">
                  Total: <strong className="text-stone-900">Rp {orderData.totalPrice.toLocaleString('id-ID')}</strong>
                </div>
              </div>

              {/* Kurir & Nomor Resi (E2E-02, E2E-15) */}
              {orderData.trackingNumber ? (
                <div className="rounded-xl bg-emerald-50 p-3.5 text-xs text-emerald-900 border border-emerald-200 flex items-start space-x-3">
                  <Truck className="h-5 w-5 text-emerald-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-emerald-950">
                      Ekspedisi: {orderData.courierCode || 'JNE'}
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-bold tracking-wide" id="result-tracking-number">
                      No. Resi: {orderData.trackingNumber}
                    </p>
                    <p className="text-[11px] text-emerald-800 mt-1">
                      Pesanan Anda sedang dalam proses pengantaran oleh kurir.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-stone-100 p-3 text-xs text-stone-600">
                  <p className="font-medium">Nomor Resi:</p>
                  <p className="text-[11px] text-stone-500">
                    Nomor resi pengiriman akan otomatis muncul di sini setelah pesanan dikemas dan diserahkan ke pihak kurir.
                  </p>
                </div>
              )}

              {/* TIMELINE VISUAL STEP */}
              <div className="pt-2">
                <h3 className="text-xs font-semibold text-stone-700 mb-3">Timeline Progres:</h3>
                <div className="space-y-3">
                  {orderData.timeline?.map((log: any) => (
                    <div key={log.id} className="flex items-start space-x-3 text-xs">
                      <div className="mt-0.5 h-2 w-2 rounded-full bg-emerald-600 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="font-semibold text-stone-900">{log.toStatus}</span>
                        <p className="text-stone-500">{log.note || 'Pembaruan status'}</p>
                        <span className="text-[10px] text-stone-400">
                          {new Date(log.createdAt).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. RINCIAN BARANG */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="mb-3 text-sm font-bold text-stone-900">Rincian Barang</h3>
              <div className="divide-y divide-stone-100">
                {orderData.items?.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between py-2 text-xs">
                    <div>
                      <p className="font-semibold text-stone-900">{item.productName}</p>
                      <p className="text-stone-500">
                        {item.variantName} • {item.quantity} pasang
                      </p>
                    </div>
                    <span className="font-medium text-stone-900">
                      Rp {item.subtotal.toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. BANTUAN WHATSAPP */}
            {orderData.whatsappHelpUrl && (
              <div className="text-center pt-2">
                <a
                  href={orderData.whatsappHelpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="btn-whatsapp-help"
                  className="inline-flex items-center space-x-2 rounded-xl border border-emerald-700 bg-white px-5 py-2.5 text-xs font-semibold text-emerald-800 shadow-sm hover:bg-emerald-50"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-700" />
                  <span>Butuh Bantuan Pesanan? Hubungi WhatsApp Admin</span>
                </a>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-stone-50">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-800" />
        </div>
      }
    >
      <TrackOrderContent />
    </Suspense>
  );
}
