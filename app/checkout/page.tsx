// checkout/page.tsx — Checkout page for the Luvira e-commerce storefront.
// Displays customer delivery form (left) and order summary (right) on desktop,
// stacked vertically on mobile.
//
// PAYMENT MODE (controlled by NEXT_PUBLIC_PAYMENT_MODE):
// - 'midtrans' → Midtrans Snap popup (production-capable, Sandbox keys untuk testing)
// - 'sandbox'  → SandboxPaymentModal simulasi lokal (dev/UI testing only)

'use client'; // Required for form state, validation, and navigation hooks

import React, { useState, useEffect, useCallback } from 'react'; // React core + hooks
import Image from 'next/image'; // Next.js optimized image component
import Link from 'next/link'; // Next.js client-side navigation
import Script from 'next/script'; // Next.js script loader for Snap.js
import { useCartStore } from '@/store/useCartStore'; // Zustand cart state
import { useOrderStore } from '@/store/useOrderStore'; // Zustand order history store
import { CustomerInfo } from '@/types/product'; // TypeScript type for customer form
import { Order, OrderStatus } from '@/types/order'; // Order types
import { Input, Textarea } from '@/components/ui/Input'; // Reusable form input components
import { Button } from '@/components/ui/Button'; // Reusable button component
import { SandboxPaymentModal } from '@/components/checkout/SandboxPaymentModal'; // Sandbox Payment Gateway Modal (fallback)
import { DigitalReceiptModal } from '@/components/checkout/DigitalReceiptModal'; // Digital receipt for Midtrans payments
import { BrandLogo } from '@/components/ui/BrandLogo'; // Universal official brand logo
import { useRouter } from 'next/navigation'; // Navigation for post-checkout redirect
import {
  ArrowLeft,
  ShieldCheck,
  ShoppingBag,
  Truck,
  CheckCircle2,
  CreditCard,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react'; // Icons

// ============================================================================
// PAYMENT MODE CONFIGURATION
// Baca dari environment variable. Default: 'midtrans' (production-ready).
// Set ke 'sandbox' di .env.local jika ingin testing UI tanpa hit Midtrans API.
// ============================================================================
const PAYMENT_MODE = process.env.NEXT_PUBLIC_PAYMENT_MODE || 'midtrans';
const MIDTRANS_CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '';
const MIDTRANS_ENV = process.env.NEXT_PUBLIC_MIDTRANS_ENV || 'sandbox';
const snapScriptSrc = MIDTRANS_ENV === 'production' 
  ? 'https://app.midtrans.com/snap/snap.js' 
  : 'https://app.sandbox.midtrans.com/snap/snap.js';

// ============================================================================
// SNAP.JS TYPE DECLARATION
// Midtrans Snap.js menambahkan `window.snap` global object.
// Kita declare type-nya agar TypeScript tidak error.
// ============================================================================
declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        callbacks: {
          onSuccess?: (result: MidtransSnapResult) => void;
          onPending?: (result: MidtransSnapResult) => void;
          onError?: (result: MidtransSnapResult) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

/** Result object yang dikembalikan oleh Snap.js callbacks */
interface MidtransSnapResult {
  order_id: string;
  transaction_id: string;
  transaction_status: string;
  payment_type: string;
  gross_amount: string;
  status_code: string;
  status_message: string;
  fraud_status?: string;
}

export default function CheckoutPage() {
  const router = useRouter();

  // Access cart state and totals from Zustand store
  const { items, getTotalPrice, getTotalItems, clearCart } = useCartStore();
  const { addOrder } = useOrderStore();

  // FIX: Prevent Zustand hydration mismatch — defer cart data until client mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true); // Mark that client-side hydration is complete
  }, []);

  // Customer delivery form state
  const [formData, setFormData] = useState<CustomerInfo>({
    name: '', // Nama Lengkap
    phone: '', // Nomor WhatsApp
    address: '', // Alamat Pengiriman Lengkap
    notes: '', // Catatan Tambahan (optional)
  });

  // Field-level validation error messages
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerInfo, string>>>({});

  // State to control Sandbox Payment Simulation Gateway Modal visibility (fallback mode)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);

  // ============================================================================
  // MIDTRANS-SPECIFIC STATE
  // ============================================================================
  const [isProcessingMidtrans, setIsProcessingMidtrans] = useState(false);
  const [midtransError, setMidtransError] = useState<string | null>(null);
  const [isSnapReady, setIsSnapReady] = useState(false);

  // State for showing Digital Receipt after successful Midtrans payment
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Compute cart totals only after client mount (avoid hydration mismatch)
  const totalPrice = mounted ? getTotalPrice() : 0;
  const totalItems = mounted ? getTotalItems() : 0;
  const cartItems = mounted ? items : [];

  // Currency formatter for Indonesian Rupiah (IDR)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Form validation — checks required fields and phone format
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CustomerInfo, string>> = {};

    // Validate Nama Lengkap — required
    if (!formData.name.trim()) {
      newErrors.name = 'Nama lengkap wajib diisi';
    }

    // Validate Nomor WhatsApp — required + format check
    if (!formData.phone.trim()) {
      newErrors.phone = 'Nomor WhatsApp wajib diisi';
    } else if (!/^[0-9+ \-]{8,16}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Format nomor WhatsApp tidak valid';
    }

    // Validate Alamat — required
    if (!formData.address.trim()) {
      newErrors.address = 'Alamat pengiriman lengkap wajib diisi';
    }

    setErrors(newErrors); // Update error state
    return Object.keys(newErrors).length === 0; // True if no errors
  };

  // ============================================================================
  // MIDTRANS SNAP PAYMENT HANDLER
  // Flow:
  // 1. Validate form
  // 2. POST ke /api/midtrans/create-transaction untuk dapat Snap token
  // 3. Trigger window.snap.pay(token) untuk munculkan popup pembayaran
  // 4. Handle callback (onSuccess/onPending/onError/onClose)
  // ============================================================================
  const handleMidtransPayment = useCallback(async () => {
    if (!validate()) return;

    // Pastikan Snap.js sudah loaded
    if (!window.snap) {
      setMidtransError(
        'Midtrans Snap belum siap. Pastikan koneksi internet stabil dan coba lagi.'
      );
      return;
    }

    setIsProcessingMidtrans(true);
    setMidtransError(null);

    try {
      // Generate unique order ID — format: LVR-{timestamp}-{random}
      const orderId = `LVR-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      // ====================================================================
      // STEP 1: Panggil API route untuk membuat transaksi Midtrans
      // ====================================================================
      const response = await fetch('/api/midtrans/create-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          grossAmount: totalPrice,
          itemDetails: cartItems.map((item) => ({
            id: `${item.product.id}-${item.selectedVariant.id}`,
            price: item.product.price,
            quantity: item.quantity,
            name: `${item.product.name} (${item.selectedVariant.name})`.substring(0, 50),
          })),
          customerDetails: {
            first_name: formData.name.trim(),
            phone: formData.phone.trim(),
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Gagal membuat transaksi');
      }

      const { token } = await response.json();

      // ====================================================================
      // STEP 2: Trigger Midtrans Snap popup
      // window.snap.pay() membuka modal pembayaran Midtrans.
      // Callbacks menangani hasil pembayaran.
      // ====================================================================
      setIsProcessingMidtrans(false);

      window.snap!.pay(token, {
        // ----------------------------------------------------------------
        // onSuccess: Pembayaran berhasil dikonfirmasi oleh Midtrans
        // ----------------------------------------------------------------
        onSuccess: (result: MidtransSnapResult) => {
          console.log('[Midtrans Snap] Payment Success:', result);

          const now = new Date();
          const formattedDate =
            new Intl.DateTimeFormat('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: 'Asia/Jakarta',
            }).format(now) + ' WIB';

          // Buat invoice number dari order_id
          const invoiceSuffix = orderId.slice(-8).toUpperCase();
          const invoiceNumber = `LVR-${invoiceSuffix}`;

          // Map payment_type Midtrans ke label yang user-friendly
          const paymentMethodLabel = mapPaymentType(result.payment_type);

          // Construct order object dan simpan ke useOrderStore
          const newOrder: Order = {
            id: `ord-${Date.now()}`,
            invoiceNumber,
            customerInfo: formData,
            items: cartItems,
            totalPrice,
            paymentMethod: paymentMethodLabel,
            status: 'Lunas' as OrderStatus,
            createdAt: formattedDate,
            midtransOrderId: orderId,
          };

          addOrder(newOrder);
          setCompletedOrder(newOrder);
          setShowReceiptModal(true);

          // Clear cart setelah pembayaran berhasil
          clearCart();
        },

        // ----------------------------------------------------------------
        // onPending: Customer belum menyelesaikan pembayaran
        // (misal: VA sudah dibuat tapi belum transfer)
        // ----------------------------------------------------------------
        onPending: (result: MidtransSnapResult) => {
          console.log('[Midtrans Snap] Payment Pending:', result);

          const now = new Date();
          const formattedDate =
            new Intl.DateTimeFormat('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: 'Asia/Jakarta',
            }).format(now) + ' WIB';

          const invoiceSuffix = orderId.slice(-8).toUpperCase();
          const paymentMethodLabel = mapPaymentType(result.payment_type);

          const newOrder: Order = {
            id: `ord-${Date.now()}`,
            invoiceNumber: `LVR-${invoiceSuffix}`,
            customerInfo: formData,
            items: cartItems,
            totalPrice,
            paymentMethod: paymentMethodLabel,
            status: 'Menunggu Pembayaran' as OrderStatus,
            createdAt: formattedDate,
            midtransOrderId: orderId,
          };

          addOrder(newOrder);

          // Tampilkan pesan pending — user perlu menyelesaikan pembayaran
          setMidtransError(
            'Pembayaran menunggu konfirmasi. Silakan selesaikan pembayaran sesuai instruksi. ' +
            'Status akan terupdate otomatis setelah pembayaran terkonfirmasi.'
          );
        },

        // ----------------------------------------------------------------
        // onError: Pembayaran gagal (ditolak/error teknis)
        // ----------------------------------------------------------------
        onError: (result: MidtransSnapResult) => {
          console.error('[Midtrans Snap] Payment Error:', result);
          setMidtransError(
            `Pembayaran gagal: ${result.status_message || 'Terjadi kesalahan'}. Silakan coba lagi.`
          );
        },

        // ----------------------------------------------------------------
        // onClose: User menutup popup tanpa menyelesaikan pembayaran
        // ----------------------------------------------------------------
        onClose: () => {
          console.log('[Midtrans Snap] Popup closed by user');
          // Tidak perlu show error — user sengaja close
        },
      });
    } catch (error) {
      console.error('[Midtrans Payment Error]', error);
      setIsProcessingMidtrans(false);
      setMidtransError(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi.'
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, cartItems, totalPrice, addOrder, clearCart]);

  // Form submission handler — validates form fields, then triggers payment
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    if (!validate()) {
      return;
    }

    if (PAYMENT_MODE === 'midtrans') {
      // Midtrans Snap mode — call API and open popup
      handleMidtransPayment();
    } else {
      // Sandbox fallback mode — open local simulation modal
      setIsPaymentModalOpen(true);
    }
  };

  return (
    // Full page container
    <div className="min-h-screen bg-warm-cream text-muted-charcoal flex flex-col justify-between">
      {/* ========== LOAD MIDTRANS SNAP.JS SCRIPT ========== */}
      {/* Script hanya di-load jika payment mode = midtrans dan client key tersedia */}
      {PAYMENT_MODE === 'midtrans' && MIDTRANS_CLIENT_KEY && (
        <Script
          src={snapScriptSrc}
          data-client-key={MIDTRANS_CLIENT_KEY}
          strategy="lazyOnload"
          onReady={() => {
            console.log('[Midtrans] Snap.js loaded and ready');
            setIsSnapReady(true);
          }}
          onError={() => {
            console.error('[Midtrans] Failed to load Snap.js');
            setMidtransError(
              'Gagal memuat Midtrans payment module. Periksa koneksi internet.'
            );
          }}
        />
      )}

      <div>
        {/* ========== TOP NAVIGATION BAR ========== */}
        {/* Deep forest green header with back link, official logo, and secure badge */}
        <div className="bg-deep-forest text-warm-cream p-3 sm:p-4 sticky top-0 z-30 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between">
            {/* Back to shop link */}
            <Link
              href="/"
              className="p-1.5 rounded-full hover:bg-white/10 text-warm-cream transition-all flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </Link>
            {/* Official Brand Logo */}
            <BrandLogo size="sm" theme="dark" asLink />
            {/* Secure Checkout indicator */}
            <div className="flex items-center gap-1 text-[11px] font-bold text-leaf-olive bg-leaf-olive/20 px-2.5 py-1 rounded-full border border-leaf-olive/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Secure Checkout</span>
            </div>
          </div>
        </div>

        {/* ========== MAIN CONTENT AREA ========== */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
          {/* Cart Empty Safeguard — show message if cart is empty */}
          {mounted && cartItems.length === 0 && !showReceiptModal ? (
            <div className="max-w-md mx-auto p-8 text-center space-y-4 bg-white rounded-3xl border border-deep-forest/10 shadow-sm">
              {/* Empty bag illustration */}
              <div className="w-16 h-16 bg-deep-forest/10 rounded-full flex items-center justify-center text-deep-forest mx-auto">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h2 className="text-base font-bold text-muted-charcoal">
                Keranjangmu sedang kosong
              </h2>
              <p className="text-xs text-muted-charcoal/60">
                Silakan pilih produk kaus kaki terlebih dahulu sebelum melakukan checkout.
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-2xl bg-deep-forest text-warm-cream hover:bg-deep-forest-hover shadow-sm shadow-deep-forest/20 transition-all duration-200 active:scale-95"
              >
                Pilih Produk Sekarang
              </Link>
            </div>
          ) : mounted ? (
            // ========== 2-COLUMN CHECKOUT LAYOUT (form left, summary right) ==========
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

              {/* LEFT COLUMN: Customer Delivery Form */}
              <div className="lg:col-span-7">
                <form id="checkout-form" onSubmit={handleSubmit} className="space-y-4">
                  {/* Form card container */}
                  <div className="bg-white p-6 rounded-3xl border border-deep-forest/10 shadow-sm space-y-4">
                    {/* Form section header */}
                    <div className="flex items-center justify-between border-b border-deep-forest/10 pb-3">
                      <h2 className="font-bold text-base text-deep-forest flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-leaf-olive" />
                        <span>Data Pengiriman Pemesan</span>
                      </h2>
                      <span className="text-[11px] font-semibold text-leaf-olive bg-leaf-olive/10 px-2.5 py-0.5 rounded-full">
                        Wajib Diisi
                      </span>
                    </div>

                    {/* Nama Lengkap input field */}
                    <Input
                      label="Nama Lengkap *"
                      placeholder="Contoh: Siti Aisyah"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      error={errors.name}
                    />

                    {/* Nomor WhatsApp input field */}
                    <Input
                      label="Nomor WhatsApp *"
                      placeholder="Contoh: 081234567890"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      error={errors.phone}
                    />

                    {/* Alamat Lengkap textarea field */}
                    <Textarea
                      label="Alamat Pengiriman Lengkap *"
                      placeholder="Jalan, RT/RW, No. Rumah, Kecamatan, Kota, Kode Pos"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      error={errors.address}
                    />

                    {/* Catatan Tambahan input field (optional) */}
                    <Input
                      label="Catatan Tambahan (Opsional)"
                      placeholder="Contoh: Titip di satpam / packing kado"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>

                  {/* Info Note — dynamic based on payment mode */}
                  <div className="bg-deep-forest/5 p-4 rounded-2xl border border-deep-forest/10 text-xs text-muted-charcoal/80 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-deep-forest shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      {PAYMENT_MODE === 'midtrans' ? (
                        <>
                          <p className="font-bold text-deep-forest">
                            Pembayaran Aman via Midtrans (Sandbox)
                          </p>
                          <p className="leading-relaxed text-xs text-muted-charcoal/80">
                            Setelah mengisi data di atas, Anda akan diarahkan ke popup pembayaran Midtrans
                            yang mendukung QRIS, Bank Transfer, E-Wallet, dan metode lainnya.
                            Saat ini menggunakan mode Sandbox untuk testing — tidak ada uang yang berpindah.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-deep-forest">
                            Simulasi Pembayaran Instan (Sandbox Gateway)
                          </p>
                          <p className="leading-relaxed text-xs text-muted-charcoal/80">
                            Setelah mengisi data di atas, Anda dapat mencoba simulasi pembayaran via QRIS atau Virtual Account. Setelah transaksi terverifikasi, detail pesanan & invoice akan diteruskan ke WhatsApp Admin.
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Midtrans Error Message */}
                  {midtransError && (
                    <div className="p-4 rounded-2xl border border-dusty-rose/30 bg-dusty-rose/5 text-xs text-dusty-rose flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold">Perhatian</p>
                        <p className="leading-relaxed text-muted-charcoal/80">{midtransError}</p>
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* RIGHT COLUMN: Order Summary & Payment CTA */}
              <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
                {/* Order summary card */}
                <div className="bg-white p-6 rounded-3xl border border-deep-forest/10 shadow-sm space-y-4">
                  {/* Summary header with edit link */}
                  <div className="flex items-center justify-between border-b border-deep-forest/10 pb-3">
                    <h2 className="font-bold text-base text-deep-forest flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-leaf-olive" />
                      <span>Ringkasan Pesanan ({totalItems} items)</span>
                    </h2>
                    {/* Link to go back and modify cart items */}
                    <Link href="/" className="text-xs text-dusty-rose font-bold hover:underline">
                      Ubah Item
                    </Link>
                  </div>

                  {/* Items List — scrollable if many items */}
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {cartItems.map((item) => (
                      <div
                        key={`${item.product.id}-${item.selectedVariant.id}`}
                        className="flex items-center justify-between gap-3 text-xs py-1 border-b border-gray-50 last:border-0"
                      >
                        {/* Item thumbnail + name + variant */}
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Variant-specific product thumbnail */}
                          <div className="relative w-12 h-12 rounded-xl bg-warm-cream overflow-hidden shrink-0">
                            <Image
                              src={item.selectedVariant.image}
                              alt={item.product.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div className="truncate">
                            {/* Product name */}
                            <div className="font-bold text-muted-charcoal truncate text-xs">
                              {item.product.name}
                            </div>
                            {/* Variant color name and quantity */}
                            <div className="text-[11px] text-muted-charcoal/60">
                              Warna: {item.selectedVariant.name} ({item.quantity}x)
                            </div>
                          </div>
                        </div>
                        {/* Line item total price */}
                        <span className="font-bold text-deep-forest shrink-0 text-xs sm:text-sm">
                          {formatCurrency(item.product.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Pricing Totals Section */}
                  <div className="pt-3 border-t border-deep-forest/10 space-y-2 text-xs sm:text-sm">
                    {/* Subtotal row */}
                    <div className="flex justify-between text-muted-charcoal/70">
                      <span>Subtotal ({totalItems} pasang)</span>
                      <span className="font-semibold">{formatCurrency(totalPrice)}</span>
                    </div>
                    {/* Shipping estimate row */}
                    <div className="flex justify-between text-muted-charcoal/70">
                      <span>Estimasi Ongkir</span>
                      <span className="text-leaf-olive font-semibold flex items-center gap-1">
                        <Truck className="w-4 h-4" /> Dihitung Admin WA
                      </span>
                    </div>
                    {/* Grand total row */}
                    <div className="flex justify-between text-base font-extrabold text-deep-forest pt-2 border-t border-deep-forest/10">
                      <span>Total Pembayaran</span>
                      <span className="text-lg text-deep-forest">{formatCurrency(totalPrice)}</span>
                    </div>
                  </div>

                  {/* CTA Button: Triggers form validation and payment */}
                  <div className="pt-2 space-y-2">
                    <Button
                      form="checkout-form" // Links this button to the form above
                      type="submit"
                      variant="primary"
                      fullWidth
                      size="lg"
                      disabled={
                        isProcessingMidtrans || 
                        (PAYMENT_MODE === 'midtrans' && !isSnapReady && !!MIDTRANS_CLIENT_KEY) ||
                        (PAYMENT_MODE === 'midtrans' && !MIDTRANS_CLIENT_KEY)
                      }
                      className="bg-deep-forest hover:bg-deep-forest/90 text-warm-cream shadow-xl py-4 text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isProcessingMidtrans ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Memproses Pembayaran...</span>
                        </>
                      ) : PAYMENT_MODE === 'midtrans' ? (
                        <>
                          <CreditCard className="w-5 h-5 text-leaf-olive" />
                          <span>Bayar via Midtrans</span>
                          <ShieldCheck className="w-4 h-4 text-leaf-olive" />
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5 text-leaf-olive" />
                          <span>Bayar via Sandbox Gateway</span>
                          <Sparkles className="w-4 h-4 text-dusty-rose animate-pulse" />
                        </>
                      )}
                    </Button>

                    <p className="text-[11px] text-center text-muted-charcoal/60">
                      {PAYMENT_MODE === 'midtrans'
                        ? MIDTRANS_CLIENT_KEY 
                          ? '🔒 Pembayaran diproses aman oleh Midtrans (Sandbox Mode)'
                          : '⚠️ Sistem Midtrans belum dikonfigurasi. Hubungi Admin.'
                        : '✨ Uji coba transaksi langsung dengan QRIS & Virtual Account simulasi.'}
                    </p>

                    {/* Payment mode indicator badge */}
                    <div className="flex items-center justify-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        PAYMENT_MODE === 'midtrans'
                          ? 'bg-deep-forest/5 text-deep-forest border-deep-forest/20'
                          : 'bg-leaf-olive/10 text-leaf-olive border-leaf-olive/20'
                      }`}>
                        <ShieldCheck className="w-3 h-3" />
                        Mode: {PAYMENT_MODE === 'midtrans' ? 'Midtrans Snap' : 'Sandbox Simulasi'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : null /* Show nothing during SSR to avoid hydration mismatch */}
        </div>
      </div>

      {/* ========== SANDBOX PAYMENT MODAL (FALLBACK MODE ONLY) ========== */}
      {/* Hanya dirender jika NEXT_PUBLIC_PAYMENT_MODE=sandbox */}
      {PAYMENT_MODE === 'sandbox' && (
        <SandboxPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          items={cartItems}
          customerInfo={formData}
          totalPrice={totalPrice}
        />
      )}

      {/* ========== DIGITAL RECEIPT MODAL (MIDTRANS SUCCESS) ========== */}
      {/* Ditampilkan setelah pembayaran Midtrans berhasil (onSuccess) */}
      <DigitalReceiptModal
        isOpen={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false);
          router.push('/');
        }}
        order={completedOrder}
      />

      {/* ========== FOOTER ========== */}
      <footer className="p-6 text-center text-xs text-muted-charcoal/60 border-t border-deep-forest/10">
        {PAYMENT_MODE === 'midtrans'
          ? '🔒 Pembayaran Aman via Midtrans Payment Gateway (Sandbox Environment)'
          : '🔒 Transaksi Aman & Terpercaya via Luvira Sandbox Payment Simulator & Official WhatsApp'}
      </footer>
    </div>
  );
}

// ============================================================================
// HELPER: Map Midtrans payment_type ke label yang user-friendly
// ============================================================================
function mapPaymentType(paymentType: string): string {
  const typeMap: Record<string, string> = {
    qris: 'QRIS',
    gopay: 'GoPay',
    shopeepay: 'ShopeePay',
    bank_transfer: 'Bank Transfer (VA)',
    echannel: 'Mandiri Bill',
    cstore: 'Indomaret/Alfamart',
    credit_card: 'Kartu Kredit/Debit',
    bca_klikpay: 'BCA KlikPay',
    bca_klikbca: 'KlikBCA',
    bri_epay: 'BRI E-Pay',
    danamon_online: 'Danamon Online',
    akulaku: 'Akulaku',
  };
  return typeMap[paymentType] || paymentType;
}
