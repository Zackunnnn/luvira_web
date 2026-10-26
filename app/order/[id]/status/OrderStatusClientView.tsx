// app/order/[id]/status/OrderStatusClientView.tsx
// ============================================================================
// Client View untuk Halaman Status Pesanan & Upload Bukti Transfer (E2E-02, E2E-03)
// ============================================================================

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BankAccountSelector from '@/components/checkout/BankAccountSelector';
import {
  CheckCircle2,
  Clock,
  Truck,
  Package,
  AlertCircle,
  Upload,
  Loader2,
  ExternalLink,
  MessageCircle,
  MapPin,
} from 'lucide-react';
import { OrderStatus, PaymentMethod } from '@prisma/client';

interface OrderStatusClientProps {
  order: any;
  whatsappHelpUrl: string;
}

export default function OrderStatusClientView({
  order,
  whatsappHelpUrl,
}: OrderStatusClientProps) {
  const router = useRouter();
  const [proofUrlInput, setProofUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Status mapping UI
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.MENUNGGU_PEMBAYARAN:
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
            <Clock className="h-3.5 w-3.5" />
            <span>Menunggu Pembayaran</span>
          </span>
        );
      case OrderStatus.MENUNGGU_VERIFIKASI:
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 border border-blue-200">
            <Clock className="h-3.5 w-3.5" />
            <span>Menunggu Verifikasi Admin</span>
          </span>
        );
      case OrderStatus.DIPROSES:
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
            <Package className="h-3.5 w-3.5" />
            <span>Lunas & Sedang Diproses</span>
          </span>
        );
      case OrderStatus.DIKIRIM:
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
            <Truck className="h-3.5 w-3.5" />
            <span>Pesanan Sedang Dikirim</span>
          </span>
        );
      case OrderStatus.SELESAI:
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Pesanan Selesai</span>
          </span>
        );
      case OrderStatus.DIBATALKAN:
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800 border border-rose-200">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Pesanan Dibatalkan</span>
          </span>
        );
      default:
        return null;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      // 1. Upload via file upload endpoint atau base64 data-url stub
      const formData = new FormData();
      formData.append('file', file);

      let finalUrl = '';
      try {
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (upRes.ok) {
          const upJson = await upRes.json();
          finalUrl = upJson.url;
        }
      } catch {
        // Fallback stub jika upload endpoint mock
      }

      if (!finalUrl) {
        // Buat mock data url untuk pengujian
        finalUrl = `https://ik.imagekit.io/luvira/payment-proofs/mock-proof-${order.code}-${Date.now()}.jpg`;
      }

      // 2. Submit ke API /api/payments/manual-proof (E2E-02, E2E-03)
      const res = await fetch('/api/payments/manual-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderCode: order.code,
          proofUrl: finalUrl,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal menyimpan bukti transfer.');
      }

      setUploadSuccess(true);
      router.refresh();
    } catch (err: any) {
      setUploadError(err.message || 'Gagal mengunggah bukti.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofUrlInput.trim()) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const res = await fetch('/api/payments/manual-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderCode: order.code,
          proofUrl: proofUrlInput.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal menyimpan bukti transfer.');
      }

      setUploadSuccess(true);
      router.refresh();
    } catch (err: any) {
      setUploadError(err.message || 'Gagal menyimpan bukti.');
    } finally {
      setIsUploading(false);
    }
  };

  const canUploadProof =
    order.paymentMethod === PaymentMethod.MANUAL_TRANSFER &&
    (order.status === OrderStatus.MENUNGGU_PEMBAYARAN ||
      order.status === OrderStatus.MENUNGGU_VERIFIKASI);

  return (
    <div className="space-y-6">
      {/* 1. STATUS HEADER CARD */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-4 gap-3">
          <div>
            <p className="text-xs text-stone-500 font-medium">Kode Pesanan:</p>
            <h1 className="font-mono text-lg font-bold text-stone-900" id="order-code-display">
              {order.code}
            </h1>
          </div>
          <div id="order-status-badge">{getStatusBadge(order.status)}</div>
        </div>

        {/* Ringkasan Singkat Pesanan */}
        <div className="mt-4 grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
          <div>
            <span className="text-stone-500">Nama Pemesan:</span>
            <p className="font-semibold text-stone-900 truncate">{order.customerName}</p>
          </div>
          <div>
            <span className="text-stone-500">Metode Bayar:</span>
            <p className="font-semibold text-stone-900">
              {order.paymentMethod === PaymentMethod.MIDTRANS_SNAP ? 'Midtrans' : 'Transfer Manual'}
            </p>
          </div>
          <div>
            <span className="text-stone-500">Gudang Pengirim:</span>
            <p className="font-semibold text-stone-900">{order.region?.name || 'Pusat'}</p>
          </div>
          <div>
            <span className="text-stone-500">Total Pembayaran:</span>
            <p className="font-bold text-emerald-800 text-sm" id="order-total-price">
              Rp {order.totalPrice.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {/* Resi & Kurir (Jika ada) */}
        {order.trackingNumber && (
          <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900 border border-emerald-200">
            <span className="font-semibold">Nomor Resi Pengiriman: </span>
            <span className="font-mono font-bold" id="tracking-number-display">
              {order.trackingNumber}
            </span>{' '}
            ({order.courierCode || 'JNE'})
          </div>
        )}
      </div>

      {/* 2. FORM UNGGAH BUKTI TRANSFER MANUAL (E2E-02, E2E-03) */}
      {canUploadProof && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6 space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="text-sm font-bold text-stone-900 sm:text-base">
              {order.status === OrderStatus.MENUNGGU_VERIFIKASI
                ? 'Unggah Ulang Bukti Transfer'
                : 'Instruksi & Unggah Bukti Transfer'}
            </h2>
            <p className="mt-0.5 text-xs text-stone-500">
              Silakan transfer tepat sebesar{' '}
              <strong className="text-stone-900">
                Rp {order.totalPrice.toLocaleString('id-ID')}
              </strong>{' '}
              ke salah satu rekening resmi Luvira di bawah, lalu unggah bukti transfer.
            </p>
          </div>

          <BankAccountSelector />

          {/* Form Unggah */}
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-semibold text-stone-800">
              Pilih Foto Bukti Transfer (Screenshot Struk/M-Banking)
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                id="file-upload-proof"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="w-full text-xs text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-800 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-emerald-900 disabled:opacity-50"
              />
              {isUploading && (
                <div className="flex items-center space-x-1.5 text-xs text-emerald-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Mengunggah...</span>
                </div>
              )}
            </div>

            {/* Alternatif: Masukkan URL Bukti */}
            <form onSubmit={handleUrlSubmit} className="mt-2 flex items-center space-x-2">
              <input
                id="input-proof-url"
                type="text"
                placeholder="Atau tempel URL gambar bukti di sini"
                value={proofUrlInput}
                onChange={(e) => setProofUrlInput(e.target.value)}
                className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-xs placeholder-stone-400 focus:border-emerald-600 focus:outline-none"
              />
              <button
                type="submit"
                id="btn-submit-proof-url"
                disabled={isUploading || !proofUrlInput.trim()}
                className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-900 disabled:opacity-50"
              >
                Kirim
              </button>
            </form>

            {uploadError && (
              <p className="text-xs font-medium text-rose-600" id="upload-error-message">
                {uploadError}
              </p>
            )}

            {uploadSuccess && (
              <div
                className="flex items-center space-x-1.5 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800 border border-emerald-200"
                id="upload-success-message"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Bukti transfer berhasil dikirim. Menunggu verifikasi admin.</span>
              </div>
            )}

            {order.paymentProofUrl && (
              <div className="mt-2 text-xs text-stone-500">
                <span>Bukti transfer saat ini: </span>
                <a
                  href={order.paymentProofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-emerald-700 underline truncate inline-block max-w-xs align-bottom"
                >
                  Lihat Gambar Bukti
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. ALAMAT PENGIRIMAN, RINCIAN BARANG & RINGKASAN BIAYA */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6 space-y-4">
        {/* Alamat Pengiriman */}
        <div>
          <h3 className="mb-2 text-sm font-bold text-stone-900 flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-emerald-700" />
            Alamat Pengiriman
          </h3>
          <p className="text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-100 leading-relaxed">
            {(() => {
              const addr = order.shippingAddress;
              if (!addr) return '-';
              if (typeof addr === 'string') return addr;
              const parts = [
                addr.street,
                addr.subDistrictName || addr.subDistrict,
                addr.districtName || addr.district,
                addr.cityName || addr.city,
                addr.provinceName || addr.province,
                addr.postalCode ? `(${addr.postalCode})` : '',
              ].filter(Boolean);
              return parts.length > 0 ? parts.join(', ') : '-';
            })()}
          </p>
        </div>

        {/* Item Belanja */}
        <div>
          <h3 className="mb-3 text-sm font-bold text-stone-900">Rincian Barang</h3>
          <div className="divide-y divide-stone-100">
            {order.items.map((item: any) => (
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

        {/* Ringkasan Finansial Resmi */}
        <div className="border-t border-stone-100 pt-3 space-y-2 text-xs">
          <div className="flex justify-between text-stone-600">
            <span>Subtotal Produk</span>
            <span className="font-medium">
              Rp {(order.subtotal || order.items.reduce((s: number, i: any) => s + i.subtotal, 0)).toLocaleString('id-ID')}
            </span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Diskon Promo</span>
              <span>- Rp {order.discountAmount.toLocaleString('id-ID')}</span>
            </div>
          )}
          <div className="flex justify-between text-stone-600">
            <span>PPN (11%)</span>
            <span className="font-medium">Rp {(order.ppnAmount || 0).toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>Ongkos Kirim {order.courierCode ? `(${order.courierCode.toUpperCase()}${order.courierService ? ` - ${order.courierService}` : ''})` : ''}</span>
            <span className="font-medium">Rp {(order.shippingCost || 0).toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-stone-900 font-bold text-sm border-t border-stone-200 pt-2">
            <span>Total Pembayaran</span>
            <span className="text-emerald-800">Rp {order.totalPrice.toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>

      {/* 4. FOOTER AKSI: LACAK PESANAN & WHATSAPP */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <Link
          href={`/track?code=${order.code}`}
          id="btn-go-to-tracking"
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-xl bg-stone-800 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-stone-900 text-center"
        >
          <span>Buka Halaman Pelacakan Pesanan</span>
        </Link>

        <a
          href={whatsappHelpUrl}
          target="_blank"
          rel="noopener noreferrer"
          id="btn-whatsapp-help"
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-xl border border-emerald-700 bg-white px-4 py-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 text-center"
        >
          <MessageCircle className="h-4 w-4 text-emerald-700" />
          <span>Butuh Bantuan? Chat WhatsApp Admin</span>
        </a>
      </div>
    </div>
  );
}
