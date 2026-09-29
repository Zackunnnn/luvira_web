// checkout/page.tsx — Checkout page for the Luvira e-commerce storefront.

'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import { useOrderStore } from '@/store/useOrderStore';
import { CustomerInfo } from '@/types/product';
import { Order, OrderStatus } from '@/types/order';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useRouter } from 'next/navigation';
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
  Tag
} from 'lucide-react';

const PPN_RATE = Number(process.env.NEXT_PUBLIC_PPN_RATE || 11) / 100;
const ADMIN_WA = process.env.NEXT_PUBLIC_ADMIN_WA || '6281234567890';

declare global {
  interface Window {
    snap: any;
  }
}

export default function CheckoutPage() {
  const router = useRouter();

  const { items, getTotalPrice, getTotalItems, clearCart } = useCartStore();
  const { addOrder } = useOrderStore();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [formData, setFormData] = useState<CustomerInfo>({
    name: '',
    phone: '',
    address: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CustomerInfo, string>>>({});
  
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Phase 13 States
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoData, setPromoData] = useState<any>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  const [shippingOptions, setShippingOptions] = useState<any[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<any>(null);
  const [isLoadingShipping, setIsLoadingShipping] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<'manual' | 'midtrans'>('manual');

  // Midtrans Snap Script
  useEffect(() => {
    const scriptUrl = process.env.NEXT_PUBLIC_MIDTRANS_ENV === 'production' 
      ? 'https://app.midtrans.com/snap/snap.js' 
      : 'https://app.sandbox.midtrans.com/snap/snap.js';
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
    
    let script = document.createElement('script');
    script.src = scriptUrl;
    script.setAttribute('data-client-key', clientKey || '');
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Compute base cart totals
  const totalItems = mounted ? getTotalItems() : 0;
  const cartItems = mounted ? items : [];
  const basePrice = mounted ? getTotalPrice() : 0;

  // Fetch Shipping (Mock)
  useEffect(() => {
    const fetchShipping = async () => {
      if (!formData.address || formData.address.length < 5) return;
      setIsLoadingShipping(true);
      try {
        const res = await fetch('/api/shipping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ destination: formData.address, weight: totalItems * 100 })
        });
        const data = await res.json();
        if (data.success) {
          setShippingOptions(data.data);
          if (!selectedShipping) setSelectedShipping(data.data[0]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingShipping(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchShipping();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [formData.address, totalItems]); // Removed selectedShipping from dependencies to avoid infinite loops

  // Promo Handler
  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return;
    setIsApplyingPromo(true);
    setPromoError(null);
    try {
      const res = await fetch('/api/promos/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCodeInput })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPromoData(data.data);
      } else {
        setPromoError(data.error || 'Promo tidak valid');
        setPromoData(null);
      }
    } catch (e) {
      setPromoError('Gagal memvalidasi promo');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  // Calculations
  const discountAmount = promoData ? (promoData.discountType === 'fixed' ? promoData.discountValue : (basePrice * promoData.discountValue / 100)) : 0;
  const priceAfterDiscount = Math.max(0, basePrice - discountAmount);
  const ppnAmount = priceAfterDiscount * PPN_RATE;
  const shippingCost = selectedShipping ? selectedShipping.cost : 0;
  const finalPrice = priceAfterDiscount + ppnAmount + shippingCost;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CustomerInfo, string>> = {};
    if (!formData.name.trim()) newErrors.name = 'Nama lengkap wajib diisi';
    if (!formData.phone.trim()) {
      newErrors.phone = 'Nomor WhatsApp wajib diisi';
    } else if (!/^[0-9+ \-]{8,16}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Format nomor WhatsApp tidak valid';
    }
    if (!formData.address.trim()) newErrors.address = 'Alamat pengiriman lengkap wajib diisi';
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) return false;
    if (!selectedShipping) {
      setCheckoutError('Pilih metode pengiriman terlebih dahulu');
      return false;
    }
    return true;
  };

  const handleCheckout = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    setIsProcessingCheckout(true);
    setCheckoutError(null);

    try {
      const orderId = `LVR-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const invoiceSuffix = orderId.slice(-8).toUpperCase();
      const invoiceNumber = `LVR-${invoiceSuffix}`;

      const now = new Date();
      const formattedDate =
        new Intl.DateTimeFormat('id-ID', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'Asia/Jakarta',
        }).format(now) + ' WIB';

      const paymentDeadlineDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const newOrder: Order = {
        id: `ord-${Date.now()}`,
        invoiceNumber,
        customerInfo: formData,
        items: cartItems,
        totalPrice: finalPrice,
        paymentMethod: paymentMethod,
        status: 'menunggu_transfer' as OrderStatus,
        createdAt: formattedDate,
        promoCodeId: promoData?.id,
        shippingCourier: `${selectedShipping.courier} - ${selectedShipping.service}`,
        shippingCost,
        ppnAmount,
        paymentDeadline: paymentDeadlineDate.toISOString(),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder),
      });

      if (!res.ok) {
        throw new Error('Gagal menyimpan pesanan ke sistem.');
      }

      const { order, token } = await res.json();
      addOrder(order);
      clearCart();
      
      if (paymentMethod === 'midtrans' && token) {
        window.snap.pay(token, {
          onSuccess: function () {
            router.push(`/order/${order.invoiceNumber}/payment`);
          },
          onPending: function () {
            router.push(`/order/${order.invoiceNumber}/payment`);
          },
          onError: function () {
            setCheckoutError('Pembayaran gagal atau dibatalkan.');
            setIsProcessingCheckout(false);
          },
          onClose: function () {
            router.push(`/order/${order.invoiceNumber}/payment`);
          }
        });
      } else {
        // Phase 13 Redirect to WhatsApp
        const waText = `Halo Admin Luvira! Saya ingin konfirmasi pesanan saya.\n\n*INVOICE*: ${order.invoiceNumber}\n*Nama*: ${formData.name}\n*Total*: ${formatCurrency(finalPrice)}\n\nMohon instruksi transfernya ya.`;
        const waUrl = `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(waText)}`;
        
        window.location.href = waUrl;
      }
    } catch (error) {
      console.error('[Checkout Error]', error);
      setCheckoutError(error instanceof Error ? error.message : 'Terjadi kesalahan saat memproses pesanan.');
      setIsProcessingCheckout(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm-cream text-muted-charcoal flex flex-col justify-between">
      <div>
        <div className="bg-deep-forest text-warm-cream p-3 sm:p-4 sticky top-0 z-30 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between">
            <Link href="/" className="p-1.5 rounded-full hover:bg-white/10 text-warm-cream transition-all flex items-center gap-1.5 text-xs font-semibold">
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </Link>
            <BrandLogo size="sm" theme="dark" asLink />
            <div className="flex items-center gap-1 text-[11px] font-bold text-leaf-olive bg-leaf-olive/20 px-2.5 py-1 rounded-full border border-leaf-olive/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Secure Checkout</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
          {mounted && cartItems.length === 0 ? (
            <div className="max-w-md mx-auto p-8 text-center space-y-4 bg-white rounded-3xl border border-deep-forest/10 shadow-sm">
              <div className="w-16 h-16 bg-deep-forest/10 rounded-full flex items-center justify-center text-deep-forest mx-auto">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h2 className="text-base font-bold text-muted-charcoal">Keranjangmu sedang kosong</h2>
              <p className="text-xs text-muted-charcoal/60">Silakan pilih produk kaus kaki terlebih dahulu sebelum melakukan checkout.</p>
              <Link href="/" className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-2xl bg-deep-forest text-warm-cream hover:bg-deep-forest-hover shadow-sm shadow-deep-forest/20 transition-all duration-200 active:scale-95">
                Pilih Produk Sekarang
              </Link>
            </div>
          ) : mounted ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              <div className="lg:col-span-7 space-y-6">
                <form id="checkout-form" onSubmit={handleCheckout} className="space-y-4">
                  <div className="bg-white p-6 rounded-3xl border border-deep-forest/10 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-deep-forest/10 pb-3">
                      <h2 className="font-bold text-base text-deep-forest flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-leaf-olive" />
                        <span>Data Pengiriman Pemesan</span>
                      </h2>
                      <span className="text-[11px] font-semibold text-leaf-olive bg-leaf-olive/10 px-2.5 py-0.5 rounded-full">
                        Wajib Diisi
                      </span>
                    </div>

                    <Input label="Nama Lengkap *" placeholder="Contoh: Siti Aisyah" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} error={errors.name} />
                    <Input label="Nomor WhatsApp *" placeholder="Contoh: 081234567890" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} error={errors.phone} />
                    <Textarea label="Alamat Pengiriman Lengkap *" placeholder="Jalan, RT/RW, No. Rumah, Kecamatan, Kota, Kode Pos" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} error={errors.address} />
                    <Input label="Catatan Tambahan (Opsional)" placeholder="Contoh: Titip di satpam / packing kado" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                  </div>
                </form>

                {/* Shipping Selection */}
                <div className="bg-white p-6 rounded-3xl border border-deep-forest/10 shadow-sm space-y-4">
                  <h2 className="font-bold text-base text-deep-forest flex items-center gap-2 border-b border-deep-forest/10 pb-3">
                    <Truck className="w-5 h-5 text-leaf-olive" />
                    <span>Metode Pengiriman</span>
                  </h2>
                  
                  {isLoadingShipping ? (
                    <div className="flex items-center justify-center p-4 text-xs text-muted-charcoal/60">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Menghitung ongkir...
                    </div>
                  ) : shippingOptions.length > 0 ? (
                    <div className="space-y-2">
                      {shippingOptions.map((opt, idx) => (
                        <label key={idx} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${selectedShipping?.courier === opt.courier && selectedShipping?.service === opt.service ? 'border-deep-forest bg-deep-forest/5' : 'border-gray-200 hover:border-deep-forest/30'}`}>
                          <div className="flex items-center gap-3">
                            <input 
                              type="radio" 
                              name="shipping" 
                              checked={selectedShipping?.courier === opt.courier && selectedShipping?.service === opt.service}
                              onChange={() => setSelectedShipping(opt)}
                              className="accent-deep-forest"
                            />
                            <div>
                              <p className="text-sm font-bold text-deep-forest">{opt.courier} - {opt.service}</p>
                              <p className="text-xs text-muted-charcoal/60">{opt.description} ({opt.etd})</p>
                            </div>
                          </div>
                          <span className="font-bold text-sm text-deep-forest">{formatCurrency(opt.cost)}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-xs text-center text-muted-charcoal/60 bg-gray-50 rounded-xl">
                      Masukkan alamat lengkap untuk melihat estimasi ongkir.
                    </div>
                  )}
                </div>

                {/* Payment Selection */}
                <div className="bg-white p-6 rounded-3xl border border-deep-forest/10 shadow-sm space-y-4">
                  <h2 className="font-bold text-base text-deep-forest flex items-center gap-2 border-b border-deep-forest/10 pb-3">
                    <CreditCard className="w-5 h-5 text-leaf-olive" />
                    <span>Metode Pembayaran</span>
                  </h2>
                  <div className="space-y-2">
                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${paymentMethod === 'manual' ? 'border-deep-forest bg-deep-forest/5' : 'border-gray-200 hover:border-deep-forest/30'}`}>
                      <input 
                        type="radio" 
                        name="paymentMethod" 
                        checked={paymentMethod === 'manual'}
                        onChange={() => setPaymentMethod('manual')}
                        className="accent-deep-forest"
                      />
                      <div>
                        <p className="text-sm font-bold text-deep-forest">Transfer Manual</p>
                        <p className="text-xs text-muted-charcoal/60">Verifikasi manual, perlu konfirmasi WhatsApp</p>
                      </div>
                    </label>
                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${paymentMethod === 'midtrans' ? 'border-deep-forest bg-deep-forest/5' : 'border-gray-200 hover:border-deep-forest/30'}`}>
                      <input 
                        type="radio" 
                        name="paymentMethod" 
                        checked={paymentMethod === 'midtrans'}
                        onChange={() => setPaymentMethod('midtrans')}
                        className="accent-deep-forest"
                      />
                      <div>
                        <p className="text-sm font-bold text-deep-forest">Transfer Instan & e-Wallet</p>
                        <p className="text-xs text-muted-charcoal/60">Verifikasi otomatis (QRIS, GoPay, VA, dll)</p>
                      </div>
                    </label>
                  </div>
                </div>


              </div>

              <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
                
                {/* Promo Code Input */}
                <div className="bg-white p-4 rounded-3xl border border-deep-forest/10 shadow-sm space-y-3">
                  <h2 className="font-bold text-sm text-deep-forest flex items-center gap-2">
                    <Tag className="w-4 h-4 text-leaf-olive" />
                    <span>Makin Hemat Pakai Promo</span>
                  </h2>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Masukkan kode promo" 
                      value={promoCodeInput}
                      onChange={e => setPromoCodeInput(e.target.value.toUpperCase())}
                      disabled={!!promoData}
                      className="mb-0"
                    />
                    {!promoData ? (
                      <Button onClick={handleApplyPromo} disabled={isApplyingPromo || !promoCodeInput} variant="outline" className="shrink-0 h-11 border-deep-forest text-deep-forest hover:bg-deep-forest/5">
                        {isApplyingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Terapkan'}
                      </Button>
                    ) : (
                      <Button onClick={() => {setPromoData(null); setPromoCodeInput('')}} variant="outline" className="shrink-0 h-11 border-dusty-rose text-dusty-rose hover:bg-dusty-rose/5">
                        Hapus
                      </Button>
                    )}
                  </div>
                  {promoError && <p className="text-xs text-dusty-rose font-semibold">{promoError}</p>}
                  {promoData && <p className="text-xs text-leaf-olive font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Promo berhasil diterapkan!</p>}
                </div>

                {/* Summary */}
                <div className="bg-white p-6 rounded-3xl border border-deep-forest/10 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-deep-forest/10 pb-3">
                    <h2 className="font-bold text-base text-deep-forest flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-leaf-olive" />
                      <span>Ringkasan Pesanan ({totalItems} items)</span>
                    </h2>
                    <Link href="/" className="text-xs text-dusty-rose font-bold hover:underline">
                      Ubah Item
                    </Link>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {cartItems.map((item) => (
                      <div key={`${item.product.id}-${item.selectedVariant.id}`} className="flex items-center justify-between gap-3 text-xs py-1 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-12 h-12 rounded-xl bg-warm-cream overflow-hidden shrink-0">
                            <Image src={item.selectedVariant.image} alt={item.product.name} fill className="object-cover" unoptimized />
                          </div>
                          <div className="truncate">
                            <div className="font-bold text-muted-charcoal truncate text-xs">{item.product.name}</div>
                            <div className="text-[11px] text-muted-charcoal/60">Warna: {item.selectedVariant.name} ({item.quantity}x)</div>
                          </div>
                        </div>
                        <span className="font-bold text-deep-forest shrink-0 text-xs sm:text-sm">{formatCurrency(item.product.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-deep-forest/10 space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between text-muted-charcoal/70">
                      <span>Subtotal</span>
                      <span className="font-semibold">{formatCurrency(basePrice)}</span>
                    </div>
                    {promoData && (
                      <div className="flex justify-between text-leaf-olive font-bold">
                        <span>Diskon Promo</span>
                        <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-muted-charcoal/70">
                      <span>PPN (11%)</span>
                      <span className="font-semibold">{formatCurrency(ppnAmount)}</span>
                    </div>
                    <div className="flex justify-between text-muted-charcoal/70">
                      <span>Ongkos Kirim</span>
                      <span className="font-semibold">{shippingCost > 0 ? formatCurrency(shippingCost) : '-'}</span>
                    </div>
                    <div className="flex justify-between text-base font-extrabold text-deep-forest pt-2 border-t border-deep-forest/10">
                      <span>Total Pembayaran</span>
                      <span className="text-lg text-deep-forest">{formatCurrency(finalPrice)}</span>
                    </div>
                  </div>

                  <div className="pt-2 space-y-2">
                    <Button
                      form="checkout-form"
                      type="submit"
                      variant="primary"
                      fullWidth
                      size="lg"
                      disabled={isProcessingCheckout || isLoadingShipping}
                      className="bg-deep-forest hover:bg-deep-forest/90 text-warm-cream shadow-xl py-4 text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isProcessingCheckout ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Mengalihkan ke WA...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5 text-leaf-olive" />
                          <span>Konfirmasi Pesanan</span>
                          <Sparkles className="w-4 h-4 text-dusty-rose animate-pulse" />
                        </>
                      )}
                    </Button>
                    <p className="text-[11px] text-center text-muted-charcoal/60">
                      {paymentMethod === 'midtrans' ? 'Anda akan diarahkan ke halaman pembayaran Midtrans.' : 'Anda akan dialihkan ke WhatsApp Admin Luvira untuk proses transfer.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <footer className="p-6 text-center text-xs text-muted-charcoal/60 border-t border-deep-forest/10">
        🔒 Transaksi Aman & Terpercaya via Manual Transfer Luvira
      </footer>
    </div>
  );
}
