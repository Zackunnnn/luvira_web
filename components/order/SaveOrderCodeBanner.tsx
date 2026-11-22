// components/order/SaveOrderCodeBanner.tsx
// ============================================================================
// Banner pengingat kode pesanan untuk pelacakan ulang (Status & Track)
// Diekstrak dari OrderStatusClientView.tsx & digunakan juga di /track
// ============================================================================

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BookmarkCheck, Copy, Check, Search } from 'lucide-react';

export interface SaveOrderCodeBannerProps {
  orderCode: string;
  context?: 'status' | 'track';
  showTrackLink?: boolean;
  onCopy?: () => void;
  className?: string;
}

export function SaveOrderCodeBanner({
  orderCode,
  context = 'status',
  showTrackLink = context === 'status',
  onCopy,
  className = '',
}: SaveOrderCodeBannerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(orderCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        onCopy?.();
        return;
      }
    } catch {}

    try {
      const input = document.createElement('input');
      input.value = orderCode;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      onCopy?.();
    } catch {}
  };

  return (
    <div
      className={`rounded-2xl border-2 border-amber-300 bg-linear-to-r from-amber-50 to-orange-50 p-4 sm:p-5 shadow-xs ${className}`}
    >
      <div className="flex items-start gap-3.5">
        <div className="rounded-xl bg-amber-500/15 p-2 text-amber-800 shrink-0 mt-0.5">
          <BookmarkCheck className="h-5 w-5 text-amber-800" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
              <span>Penting: Simpan Kode Pesanan Anda!</span>
            </h2>
            <button
              type="button"
              id="btn-copy-order-code-banner"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white px-3 py-1.5 text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                  <span>Kode Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-white" />
                  <span>Salin Kode Pesanan</span>
                </>
              )}
            </button>
          </div>

          {context === 'status' ? (
            <p className="text-xs text-amber-900 leading-relaxed">
              Jika Anda menutup halaman ini atau keluar dari browser, Anda dapat melacak kembali progres pesanan kapan saja melalui menu <strong>Lacak Pesanan</strong> di web Luvira. Cukup gunakan Kode Pesanan Anda: <span className="font-mono font-extrabold bg-amber-200/90 text-amber-950 px-2 py-0.5 rounded-md text-xs tracking-wider">{orderCode}</span> dan <strong>4 digit terakhir nomor WhatsApp</strong> yang Anda gunakan saat pemesanan.
            </p>
          ) : (
            <p className="text-xs text-amber-900 leading-relaxed">
              Simpan atau catat Kode Pesanan Anda: <span className="font-mono font-extrabold bg-amber-200/90 text-amber-950 px-2 py-0.5 rounded-md text-xs tracking-wider">{orderCode}</span> untuk memudahkan pelacakan kembali status pesanan Anda kapan saja.
            </p>
          )}

          {showTrackLink && (
            <div className="pt-0.5 flex items-center gap-3 text-[11px] font-semibold text-amber-900">
              <Link
                href={`/track?code=${orderCode}`}
                className="inline-flex items-center gap-1 underline hover:text-amber-950"
              >
                <Search className="w-3 h-3" />
                <span>Buka Menu Lacak Pesanan</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SaveOrderCodeBanner;
