// components/checkout/OrderCostSummary.tsx
// ============================================================================
// Komponen Ringkasan Biaya, Kupon Promo, dan Submit CTA Checkout Luvira 2.0
// Diekstrak dari app/checkout/page.tsx (Langkah 1 Refactoring Checkout)
// Props terkelompok ketat: pricing, promo, submit. Tanpa nested <form>.
// ============================================================================

'use client';

import React from 'react';
import { Tag, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { CartItem } from '@/types/product';
import { PromoValidation } from '@/types/promo';
import { resolveSockImage } from '@/lib/products/sock-images';

export interface OrderPricingProps {
  baseSubtotal: number;
  discountAmount: number;
  ppnRate: number;
  ppnAmount: number;
  shippingCost: number;
  totalPrice: number;
  isFreeShipping: boolean;
  isFreeTax: boolean;
}

export interface OrderPromoProps {
  promoCodeInput: string;
  onPromoCodeChange: (value: string) => void;
  onApplyPromo: () => void;
  onRemovePromo: () => void;
  promoData: PromoValidation | null;
  isApplyingPromo: boolean;
  promoError: string | null;
}

export interface OrderSubmitProps {
  paymentMethod: 'MIDTRANS_SNAP' | 'MANUAL_TRANSFER';
  isSubmitting: boolean;
  submitError: string | null;
}

export interface OrderCostSummaryProps {
  items: CartItem[];
  totalItems: number;
  pricing: OrderPricingProps;
  promo: OrderPromoProps;
  submit: OrderSubmitProps;
  className?: string;
}

export function OrderCostSummary({
  items,
  totalItems,
  pricing,
  promo,
  submit,
  className = '',
}: OrderCostSummaryProps) {
  const {
    baseSubtotal,
    discountAmount,
    ppnRate,
    ppnAmount,
    shippingCost,
    totalPrice,
    isFreeShipping,
    isFreeTax,
  } = pricing;

  const {
    promoCodeInput,
    onPromoCodeChange,
    onApplyPromo,
    onRemovePromo,
    promoData,
    isApplyingPromo,
    promoError,
  } = promo;

  const { paymentMethod, isSubmitting, submitError } = submit;

  return (
    <section className={`rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      <h3 className="mb-3 text-sm font-semibold text-stone-900">
        Ringkasan Pesanan ({totalItems} pasang)
      </h3>

      <div className="max-h-60 divide-y divide-stone-100 overflow-y-auto pr-1">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center space-x-3 py-2.5">
            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-stone-100">
              <img
                src={resolveSockImage(item.selectedVariant.image, item.selectedVariant.name, item.selectedVariant.hex, item.product.model)}
                alt={item.product.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-stone-900">
                {item.product.name}
              </p>
              <p className="text-[11px] text-stone-500">
                {item.selectedVariant.name} • {item.quantity}x
              </p>
            </div>
            <span className="text-xs font-medium text-stone-900">
              Rp {(item.product.price * item.quantity).toLocaleString('id-ID')}
            </span>
          </div>
        ))}
      </div>

      {/* INPUT KODE PROMO */}
      <div className="mt-4 border-t border-stone-100 pt-3">
        <label htmlFor="input-promo-code" className="mb-1 block text-xs font-medium text-stone-700">
          Punya Kode Promo?
        </label>
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <input
              id="input-promo-code"
              type="text"
              value={promoCodeInput}
              onChange={(e) => onPromoCodeChange(e.target.value.toUpperCase())}
              placeholder="Masukkan kode promo"
              className="w-full rounded-lg border border-stone-300 py-1.5 pl-8 pr-3 text-xs uppercase placeholder-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
            <Tag className="absolute left-2.5 top-2 h-3.5 w-3.5 text-stone-400" />
          </div>
          <button
            type="button"
            id="btn-apply-promo"
            disabled={isApplyingPromo || !promoCodeInput.trim()}
            onClick={onApplyPromo}
            className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-900 disabled:opacity-50"
          >
            {isApplyingPromo ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              'Pakai'
            )}
          </button>
        </div>

        {promoError && (
          <p className="mt-1.5 text-xs font-medium text-rose-600" id="promo-error-message">
            {promoError}
          </p>
        )}

        {promoData && (
          <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800 border border-emerald-200">
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span className="font-semibold">{promoData.code} diterapkan</span>
            </div>
            <button
              type="button"
              onClick={onRemovePromo}
              className="text-[11px] text-stone-400 hover:text-stone-700 underline"
            >
              Hapus
            </button>
          </div>
        )}
      </div>

      {/* RINCIAN BIAYA */}
      <div className="mt-4 space-y-1.5 border-t border-stone-100 pt-3 text-xs text-stone-600">
        <div className="flex justify-between">
          <span>Subtotal Produk</span>
          <span className="font-medium text-stone-900">
            Rp {baseSubtotal.toLocaleString('id-ID')}
          </span>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between text-emerald-700 font-medium">
            <span>Diskon Promo</span>
            <span>- Rp {discountAmount.toLocaleString('id-ID')}</span>
          </div>
        )}

        {ppnRate > 0 && !isFreeTax && (
          <div className="flex justify-between">
            <span>
              PPN ({Math.round(ppnRate * 100)}%)
            </span>
            <span className="font-medium text-stone-900">
              Rp {ppnAmount.toLocaleString('id-ID')}
            </span>
          </div>
        )}

        <div className="flex justify-between">
          <span>Ongkos Kirim</span>
          <span className="font-medium text-stone-900">
            {isFreeShipping ? 'Gratis' : `Rp ${shippingCost.toLocaleString('id-ID')}`}
          </span>
        </div>

        <div className="flex justify-between border-t border-stone-200 pt-2 text-sm font-bold text-stone-900">
          <span>Total Pembayaran</span>
          <span className="text-emerald-800 font-extrabold" id="total-price-display">
            Rp {totalPrice.toLocaleString('id-ID')}
          </span>
        </div>
      </div>

      {submitError && (
        <div className="mt-3 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-800 border border-rose-200 flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Desktop Submit Button (Terikat ke parent form) */}
      <button
        type="submit"
        id="btn-submit-order-desktop"
        disabled={isSubmitting}
        className="mt-5 hidden w-full items-center justify-center rounded-xl bg-emerald-800 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-900 disabled:opacity-60 sm:flex"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span>Memproses Pesanan...</span>
          </>
        ) : (
          <span>
            {paymentMethod === 'MIDTRANS_SNAP' ? 'Bayar Otomatis Sekarang (Midtrans)' : 'Buat Pesanan & Upload Struk'} • Rp{' '}
            {totalPrice.toLocaleString('id-ID')}
          </span>
        )}
      </button>
    </section>
  );
}

export default OrderCostSummary;
