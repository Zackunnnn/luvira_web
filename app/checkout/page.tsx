// app/checkout/page.tsx
// ============================================================================
// Halaman Checkout Luvira 2.0 (Mobile-first, Multi-step, Server-Side Pricing)
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 7.4, 8.1, 8.2, E2E-01, E2E-02, E2E-04, E2E-06, E2E-13, E2E-14
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { CascadingAddressCombobox, AddressDestination } from '@/components/checkout/CascadingAddressCombobox';
import BankAccountSelector from '@/components/checkout/BankAccountSelector';
import {
  ArrowLeft,
  ShieldCheck,
  ShoppingBag,
  Truck,
  CreditCard,
  Building2,
  Tag,
  Loader2,
  AlertCircle,
  CheckCircle2,
  MapPin,
  ChevronRight,
  Info,
} from 'lucide-react';
import { normalizeWhatsAppNumber } from '@/lib/whatsapp';
import { resolveSockImage } from '@/lib/products/sock-images';

const PPN_RATE = 0.11;

declare global {
  interface Window {
    snap: any;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotalPrice, getTotalItems, clearCart } = useCartStore();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Form Customer Info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Alamat Cascading
  const [destination, setDestination] = useState<AddressDestination>({
    provinceId: '',
    provinceName: '',
    cityId: '',
    cityName: '',
    districtId: '',
    districtName: '',
    subDistrictId: '',
    subDistrictName: '',
    postalCode: '',
    street: '',
  });
  const [addressError, setAddressError] = useState<string | null>(null);

  // Pengiriman & RajaOngkir
  const [shippingRates, setShippingRates] = useState<any[]>([]);
  const [selectedRate, setSelectedRate] = useState<any>(null);
  const [isLoadingShipping, setIsLoadingShipping] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [handlingRegionInfo, setHandlingRegionInfo] = useState<{
    name: string;
    isFallback: boolean;
    reason?: string;
  } | null>(null);

  // Promo Code
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoData, setPromoData] = useState<any>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState<'MIDTRANS_SNAP' | 'MANUAL_TRANSFER'>('MIDTRANS_SNAP');

  // Submit Processing
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Midtrans Snap Script Loader
  useEffect(() => {
    const isProd = process.env.NEXT_PUBLIC_MIDTRANS_ENV === 'production';
    const scriptUrl = isProd
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js';
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || 'SB-Mid-client-TESTKEY123';

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.setAttribute('data-client-key', clientKey);
    script.async = true;
    document.body.appendChild(script);

    return () => {
      try {
        document.body.removeChild(script);
      } catch {
        // Abaikan
      }
    };
  }, []);

  // Restore saved address from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('luvira_saved_address');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.provinceName) setDestination(parsed);
      }
      const savedName = localStorage.getItem('luvira_customer_name');
      if (savedName) setCustomerName(savedName);
      const savedPhone = localStorage.getItem('luvira_customer_phone');
      if (savedPhone) setCustomerPhone(savedPhone);
    } catch {
      // Abaikan
    }
  }, []);

  const cartItems = mounted ? items : [];
  const totalItems = mounted ? getTotalItems() : 0;
  const baseSubtotal = mounted ? getTotalPrice() : 0;

  // Hitung ongkir otomatis saat alamat (provinsi) dan item berubah
  useEffect(() => {
    if (!destination.provinceName || cartItems.length === 0) return;

    let isSubscribed = true;
    setIsLoadingShipping(true);
    setShippingError(null);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/shipping/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            destination: {
              provinceName: destination.provinceName,
              cityName: destination.cityName,
              districtName: destination.districtName,
              subDistrictName: destination.subDistrictName,
              subDistrictId: destination.subDistrictId,
              cityId: destination.cityId,
            },
            items: cartItems.map((i) => ({
              productId: i.product.id,
              variantId: i.selectedVariant.id,
              quantity: i.quantity,
            })),
            courier: 'all',
          }),
        });

        const data = await res.json();
        if (!isSubscribed) return;

        if (data.rates && data.rates.length > 0) {
          setShippingRates(data.rates);
          setSelectedRate(data.rates[0]);
          if (data.originRegion) {
            setHandlingRegionInfo({
              name: data.originRegion.name,
              isFallback: data.isFallbackToPusat,
              reason: data.fallbackReason,
            });
          }
        } else {
          // Graceful handling jika tarif tidak kembali (E2E-14)
          setShippingError(data.error || 'Tarif ongkir belum tersedia untuk wilayah ini.');
          setShippingRates([]);
          setSelectedRate(null);
        }
      } catch (err: any) {
        if (!isSubscribed) return;
        setShippingError('Gagal memuat tarif ongkir. Silakan coba kembali.');
      } finally {
        if (isSubscribed) setIsLoadingShipping(false);
      }
    }, 500);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [destination.provinceName, destination.cityId, destination.subDistrictId, cartItems.length]);

  // Validasi & Terapkan Promo
  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return;
    setIsApplyingPromo(true);
    setPromoError(null);

    try {
      const res = await fetch('/api/promos/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCodeInput.trim(),
          destinationProvince: destination.provinceName,
          subtotal: baseSubtotal,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPromoData(data.data);
      } else {
        setPromoError(data.error || 'Kode promo tidak valid.');
        setPromoData(null);
      }
    } catch {
      setPromoError('Gagal memvalidasi kode promo.');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  // Kalkulasi Harga Tampilan Klien
  let discountAmount = 0;
  if (promoData) {
    if (promoData.discountType === 'percentage' || promoData.discountType === 'PERSEN') {
      discountAmount = Math.round((baseSubtotal * promoData.discountValue) / 100);
      if (promoData.maxDiscount && discountAmount > promoData.maxDiscount) {
        discountAmount = promoData.maxDiscount;
      }
    } else {
      discountAmount = Math.min(baseSubtotal, promoData.discountValue);
    }
  }

  const netPrice = Math.max(0, baseSubtotal - discountAmount);
  const isFreeTax = promoData?.isFreeTax === true;
  const ppnAmount = isFreeTax ? 0 : Math.round(netPrice * PPN_RATE);
  const isFreeShipping = promoData?.isFreeShipping === true;
  const shippingCost = isFreeShipping ? 0 : selectedRate?.cost || 0;
  const totalPrice = netPrice + ppnAmount + shippingCost;

  // Handler Checkout Submit
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setPhoneError(null);
    setAddressError(null);

    // 1. Validasi Nama
    if (!customerName.trim()) {
      setSubmitError('Nama lengkap pemesan wajib diisi.');
      return;
    }

    // 2. Validasi & Normalisasi WA
    const normPhone = normalizeWhatsAppNumber(customerPhone);
    if (!normPhone || normPhone.length < 10) {
      setPhoneError('Nomor WhatsApp tidak valid (minimal 10 digit, contoh: 0812...).');
      return;
    }

    // 3. Validasi Alamat
    if (!destination.provinceName || !destination.street.trim()) {
      setAddressError('Alamat pengiriman belum lengkap (provinsi dan nama jalan wajib diisi).');
      return;
    }

    // 4. Validasi Ongkir
    if (!selectedRate && !isFreeShipping) {
      setSubmitError('Silakan pilih opsi pengiriman terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simpan alamat dan kontak terakhir ke localStorage
      localStorage.setItem('luvira_saved_address', JSON.stringify(destination));
      localStorage.setItem('luvira_customer_name', customerName);
      localStorage.setItem('luvira_customer_phone', customerPhone);

      const payload = {
        customerName: customerName.trim(),
        customerPhone: normPhone,
        customerEmail: customerEmail.trim() || undefined,
        destination: {
          provinceName: destination.provinceName,
          cityName: destination.cityName,
          districtName: destination.districtName,
          subDistrictName: destination.subDistrictName,
          postalCode: destination.postalCode,
          street: destination.street,
          notes: destination.benchmark,
        },
        items: cartItems.map((item) => ({
          productId: item.product.id,
          variantId: item.selectedVariant.id,
          quantity: item.quantity,
        })),
        paymentMethod,
        promoCodeId: promoData?.id,
        shippingCourier: selectedRate ? `${selectedRate.courier} - ${selectedRate.service}` : 'GRATIS',
        shippingCost,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses pesanan.');
      }

      const createdOrder = data.order;
      clearCart();

      // Alur Pembayaran
      if (paymentMethod === 'MIDTRANS_SNAP') {
        if (data.token && !data.token.startsWith('MOCK-') && typeof window !== 'undefined' && window.snap) {
          window.snap.pay(data.token, {
            onSuccess: () => {
              router.push(`/order/${createdOrder.code}/status`);
            },
            onPending: () => {
              router.push(`/order/${createdOrder.code}/status`);
            },
            onError: () => {
              router.push(`/order/${createdOrder.code}/status?error=payment_failed`);
            },
            onClose: () => {
              router.push(`/order/${createdOrder.code}/status`);
            },
          });
        } else {
          // Jika token mock simulasi atau fallback langsung
          router.push(`/order/${createdOrder.code}/status`);
        }
      } else {
        // Transfer Manual -> Buka Halaman Status & Upload Bukti Transfer
        router.push(`/order/${createdOrder.code}/status`);
      }
    } catch (err: any) {
      console.error('[Checkout Error]', err);
      setSubmitError(err.message || 'Terjadi kesalahan sistem saat checkout.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-800" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 text-center">
        <ShoppingBag className="h-16 w-16 text-stone-300" />
        <h2 className="mt-4 text-lg font-bold text-stone-900">Keranjang Belanja Kosong</h2>
        <p className="mt-1 text-sm text-stone-500">
          Yuk lihat koleksi kaus kaki muslimah Luvira yang nyaman dan syar&apos;i.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex items-center rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900"
        >
          Lihat Katalog
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 pb-28 sm:pb-12">
      {/* Header Top Nav */}
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex items-center space-x-1.5 text-xs font-medium text-stone-600 hover:text-stone-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Toko</span>
          </Link>
          <div className="text-center font-serif text-lg font-bold tracking-wider text-stone-900">
            LUVIRA
          </div>
          <div className="flex items-center space-x-1 text-xs text-stone-500">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            <span className="hidden sm:inline">Checkout Aman</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* KOLOM KIRI: FORM DATA, ALAMAT, ONGKIR, PEMBAYARAN */}
          <div className="space-y-6 lg:col-span-7">
            {/* 1. DATA PEMESAN */}
            <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="mb-3 flex items-center space-x-2 text-sm font-semibold text-stone-900 sm:text-base">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-800 text-xs text-white">
                  1
                </span>
                <span>Data Pemesan</span>
              </h2>

              <div className="space-y-3">
                <div>
                  <label htmlFor="customer-name" className="mb-1 block text-xs font-medium text-stone-700">
                    Nama Lengkap *
                  </label>
                  <input
                    id="customer-name"
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Contoh: Fatimah Az-Zahra"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label htmlFor="customer-phone" className="mb-1 block text-xs font-medium text-stone-700">
                    Nomor WhatsApp *
                  </label>
                  <input
                    id="customer-phone"
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value);
                      setPhoneError(null);
                    }}
                    placeholder="081234567890"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                  <p className="mt-1 text-[11px] text-stone-500">
                    Notifikasi pesanan dan konfirmasi akan dikirim ke nomor ini.
                  </p>
                  {phoneError && <p className="mt-1 text-xs text-rose-600">{phoneError}</p>}
                </div>

                <div>
                  <label htmlFor="customer-email" className="mb-1 block text-xs font-medium text-stone-700">
                    Alamat Email (Opsional)
                  </label>
                  <input
                    id="customer-email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="email@contoh.com"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>
            </section>

            {/* 2. ALAMAT PENGIRIMAN CASCADING & QUICK SEARCH */}
            <section>
              <CascadingAddressCombobox
                value={destination}
                onChange={(newDest) => {
                  setDestination(newDest);
                  setAddressError(null);
                }}
                error={addressError || undefined}
              />
            </section>

            {/* 3. PENGIRIMAN & RAJAONGKIR */}
            <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Truck className="h-5 w-5 text-emerald-700" />
                  <h3 className="text-sm font-semibold text-stone-900 sm:text-base">
                    Metode Pengiriman
                  </h3>
                </div>
                {handlingRegionInfo && (
                  <span
                    id="badge-handling-region"
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      handlingRegionInfo.isFallback
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-emerald-100 text-emerald-900'
                    }`}
                  >
                    Dikirim dari: {handlingRegionInfo.name}
                    {handlingRegionInfo.isFallback && ' (Pusat)'}
                  </span>
                )}
              </div>

              {handlingRegionInfo?.isFallback && (
                <div className="mt-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 border border-amber-200">
                  <p className="font-medium">Catatan Distribusi:</p>
                  <p>{handlingRegionInfo.reason || 'Stok dialihkan ke Gudang Pusat.'}</p>
                </div>
              )}

              {/* Informative Tip: Standar Ekspedisi 1 kg */}
              <div className="mt-2.5 flex items-start space-x-2 rounded-lg bg-emerald-50/70 p-2.5 text-[11px] text-emerald-900 border border-emerald-100">
                <Info className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  <strong className="font-semibold">Hemat Ongkir:</strong> Ekspedisi mengenakan tarif minimal 1 kg (muat hingga 25-28 pasang kaus kaki). Tambah belanjaan, ongkos kirim tidak naik!
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {!destination.provinceName ? (
                  <p className="text-xs text-stone-500 italic">
                    Silakan lengkapi alamat di atas untuk melihat pilihan ongkos kirim.
                  </p>
                ) : isLoadingShipping ? (
                  <div className="flex items-center space-x-2 py-3 text-xs text-stone-500">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
                    <span>Menghitung ongkir terbaik dari RajaOngkir...</span>
                  </div>
                ) : shippingError ? (
                  <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200">
                    <p className="font-semibold">{shippingError}</p>
                    <p className="mt-0.5 text-rose-600">
                      Anda tetap dapat mencoba memilih atau melanjutkan pesanan.
                    </p>
                  </div>
                ) : (
                  shippingRates.map((rate, idx) => {
                    const isSelected = selectedRate?.courier === rate.courier && selectedRate?.service === rate.service;
                    const courierColor =
                      rate.courier === 'JNT'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : rate.courier === 'SICEPAT'
                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : rate.courier === 'ANTERAJA'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200';

                    return (
                      <label
                        key={`${rate.courier}-${rate.service}-${idx}`}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${
                          isSelected
                            ? 'border-emerald-700 bg-emerald-50/40 ring-1 ring-emerald-700'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="shippingRate"
                            checked={isSelected}
                            onChange={() => setSelectedRate(rate)}
                            className="h-4 w-4 text-emerald-700 focus:ring-emerald-600"
                          />
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className={`rounded px-1.5 py-0.2 text-[10px] font-bold border ${courierColor}`}>
                                {rate.courier}
                              </span>
                              <p className="text-xs font-bold text-stone-900">
                                {rate.service}
                              </p>
                            </div>
                            <p className="text-[11px] text-stone-500 mt-0.5">
                              {rate.description} • Estimasi: {rate.etd}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-stone-900">
                          {isFreeShipping ? 'GRATIS' : `Rp ${rate.cost.toLocaleString('id-ID')}`}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </section>

            {/* 4. METODE PEMBAYARAN */}
            <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center space-x-2 border-b border-stone-100 pb-3">
                <CreditCard className="h-5 w-5 text-emerald-700" />
                <h3 className="text-sm font-semibold text-stone-900 sm:text-base">
                  Metode Pembayaran
                </h3>
              </div>

              <div className="mt-3 space-y-3">
                {/* Midtrans Snap */}
                <label
                  className={`flex cursor-pointer items-start space-x-3 rounded-xl border p-3.5 transition ${
                    paymentMethod === 'MIDTRANS_SNAP'
                      ? 'border-emerald-700 bg-emerald-50/40 ring-1 ring-emerald-700'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="MIDTRANS_SNAP"
                    checked={paymentMethod === 'MIDTRANS_SNAP'}
                    onChange={() => setPaymentMethod('MIDTRANS_SNAP')}
                    className="mt-0.5 h-4 w-4 text-emerald-700 focus:ring-emerald-600"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-stone-900">
                      Pembayaran Otomatis (Midtrans Snap)
                    </p>
                    <p className="text-[11px] text-stone-500">
                      QRIS (GoPay, OVO, ShopeePay), BCA/Mandiri/BNI Virtual Account, dan Kartu. Terverifikasi instan tanpa unggah struk.
                    </p>
                  </div>
                </label>

                {/* Manual Transfer */}
                <label
                  className={`flex cursor-pointer items-start space-x-3 rounded-xl border p-3.5 transition ${
                    paymentMethod === 'MANUAL_TRANSFER'
                      ? 'border-emerald-700 bg-emerald-50/40 ring-1 ring-emerald-700'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="MANUAL_TRANSFER"
                    checked={paymentMethod === 'MANUAL_TRANSFER'}
                    onChange={() => setPaymentMethod('MANUAL_TRANSFER')}
                    className="mt-0.5 h-4 w-4 text-emerald-700 focus:ring-emerald-600"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-stone-900">
                      Transfer Bank Manual (BSI / Jago Syariah)
                    </p>
                    <p className="text-[11px] text-stone-500">
                      Transfer langsung ke rekening resmi Luvira dan unggah bukti transfer.
                    </p>
                  </div>
                </label>

                {paymentMethod === 'MANUAL_TRANSFER' && <BankAccountSelector />}
              </div>
            </section>
          </div>

          {/* KOLOM KANAN: RINGKASAN ITEM, KUPON PROMO, TOTAL HARGA */}
          <div className="space-y-6 lg:col-span-5">
            {/* RINGKASAN BELANJA */}
            <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
              <h3 className="mb-3 text-sm font-semibold text-stone-900">
                Ringkasan Pesanan ({totalItems} pasang)
              </h3>

              <div className="max-h-60 divide-y divide-stone-100 overflow-y-auto pr-1">
                {cartItems.map((item, idx) => (
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
                      onChange={(e) => {
                        setPromoCodeInput(e.target.value.toUpperCase());
                        setPromoError(null);
                      }}
                      placeholder="Masukkan kode promo"
                      className="w-full rounded-lg border border-stone-300 py-1.5 pl-8 pr-3 text-xs uppercase placeholder-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                    <Tag className="absolute left-2.5 top-2 h-3.5 w-3.5 text-stone-400" />
                  </div>
                  <button
                    type="button"
                    id="btn-apply-promo"
                    disabled={isApplyingPromo || !promoCodeInput.trim()}
                    onClick={handleApplyPromo}
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
                      onClick={() => {
                        setPromoData(null);
                        setPromoCodeInput('');
                      }}
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

                <div className="flex justify-between">
                  <span>PPN (11%)</span>
                  <span className="font-medium text-stone-900">
                    {isFreeTax ? 'Bebas PPN' : `Rp ${ppnAmount.toLocaleString('id-ID')}`}
                  </span>
                </div>

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

              {/* Desktop Submit Button */}
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
                    {paymentMethod === 'MIDTRANS_SNAP' ? 'Bayar Sekarang' : 'Konfirmasi Pesanan'} • Rp{' '}
                    {totalPrice.toLocaleString('id-ID')}
                  </span>
                )}
              </button>
            </section>
          </div>

          {/* FLOATING BOTTOM BAR UNTUK MOBILE HP (360PX+) */}
          <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200 bg-white/95 px-4 py-2.5 backdrop-blur-md shadow-lg sm:hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-stone-500 font-medium">Total Pembayaran</p>
                <p className="text-sm font-extrabold text-emerald-800" id="mobile-total-price">
                  Rp {totalPrice.toLocaleString('id-ID')}
                </p>
              </div>
              <button
                type="submit"
                id="btn-submit-order-mobile"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-900 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>{paymentMethod === 'MIDTRANS_SNAP' ? 'Bayar Sekarang' : 'Konfirmasi'}</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
