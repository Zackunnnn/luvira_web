// checkout/page.tsx — Checkout page for the Luvira e-commerce storefront.
// Displays customer delivery form (left) and order summary (right) on desktop,
// stacked vertically on mobile. Integrates with the Sandbox Payment Simulation Gateway.

'use client'; // Required for form state, validation, and navigation hooks

import React, { useState, useEffect } from 'react'; // React core + hooks
import Image from 'next/image'; // Next.js optimized image component
import Link from 'next/link'; // Next.js client-side navigation
import { useCartStore } from '@/store/useCartStore'; // Zustand cart state
import { CustomerInfo } from '@/types/product'; // TypeScript type for customer form
import { Input, Textarea } from '@/components/ui/Input'; // Reusable form input components
import { Button } from '@/components/ui/Button'; // Reusable button component
import { SandboxPaymentModal } from '@/components/checkout/SandboxPaymentModal'; // Sandbox Payment Gateway Modal
import { BrandLogo } from '@/components/ui/BrandLogo'; // Universal official brand logo
import {
  ArrowLeft,
  ShieldCheck,
  ShoppingBag,
  Truck,
  CheckCircle2,
  CreditCard,
  Sparkles,
} from 'lucide-react'; // Icons

export default function CheckoutPage() {
  // Access cart state and totals from Zustand store
  const { items, getTotalPrice, getTotalItems } = useCartStore();

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

  // State to control Sandbox Payment Simulation Gateway Modal visibility
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);

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

  // Form submission handler — validates form fields, then opens the Sandbox Gateway Modal
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    if (!validate()) {
      // Scroll to the first error if on small screen
      return;
    }

    // Open the interactive Sandbox Payment Simulation Modal
    setIsPaymentModalOpen(true);
  };

  return (
    // Full page container
    <div className="min-h-screen bg-warm-cream text-muted-charcoal flex flex-col justify-between">
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
          {mounted && cartItems.length === 0 ? (
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

                  {/* Info Note — explaining the Sandbox Gateway experience */}
                  <div className="bg-deep-forest/5 p-4 rounded-2xl border border-deep-forest/10 text-xs text-muted-charcoal/80 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-deep-forest shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-deep-forest">
                        Simulasi Pembayaran Instan (Sandbox Gateway)
                      </p>
                      <p className="leading-relaxed text-xs text-muted-charcoal/80">
                        Setelah mengisi data di atas, Anda dapat mencoba simulasi pembayaran via QRIS atau Virtual Account. Setelah transaksi terverifikasi, detail pesanan & invoice akan diteruskan ke WhatsApp Admin.
                      </p>
                    </div>
                  </div>
                </form>
              </div>

              {/* RIGHT COLUMN: Order Summary & Sandbox Payment CTA */}
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

                  {/* CTA Button: Triggers form validation and opens Sandbox Payment Modal */}
                  <div className="pt-2 space-y-2">
                    <Button
                      form="checkout-form" // Links this button to the form above
                      type="submit"
                      variant="primary"
                      fullWidth
                      size="lg"
                      className="bg-deep-forest hover:bg-deep-forest/90 text-warm-cream shadow-xl py-4 text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CreditCard className="w-5 h-5 text-leaf-olive" />
                      <span>Bayar via Sandbox Gateway</span>
                      <Sparkles className="w-4 h-4 text-dusty-rose animate-pulse" />
                    </Button>

                    <p className="text-[11px] text-center text-muted-charcoal/60">
                      ✨ Uji coba transaksi langsung dengan QRIS & Virtual Account simulasi.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          ) : null /* Show nothing during SSR to avoid hydration mismatch */}
        </div>
      </div>

      {/* ========== SANDBOX PAYMENT MODAL ========== */}
      <SandboxPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        items={cartItems}
        customerInfo={formData}
        totalPrice={totalPrice}
      />

      {/* ========== FOOTER ========== */}
      <footer className="p-6 text-center text-xs text-muted-charcoal/60 border-t border-deep-forest/10">
        🔒 Transaksi Aman & Terpercaya via Luvira Sandbox Payment Simulator & Official WhatsApp
      </footer>
    </div>
  );
}
