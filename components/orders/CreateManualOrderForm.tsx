'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, User, Phone, MapPin, Tag, AlertCircle, CheckCircle2, Loader2, ArrowLeft, Plus, Trash2 } from 'lucide-react';

interface Variant {
  id: string;
  name: string;
  stocks?: Array<{ regionId: string; qty: number; reserved: number }>;
}

interface Product {
  id: string;
  name: string;
  price: number;
  variants: Variant[];
}

interface OrderItemRow {
  productId: string;
  variantId: string;
  quantity: number;
}

export default function CreateManualOrderForm({ backUrl = '/dashboard/admin' }: { backUrl?: string }) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [handoverLocation, setHandoverLocation] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<OrderItemRow[]>([
    { productId: '', variantId: '', quantity: 1 },
  ]);

  // Promo State
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<any>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch('/api/products');
        const json = await res.json();
        if (json.data) {
          setProducts(json.data);
          if (json.data.length > 0 && json.data[0].variants?.length > 0) {
            setItems([
              {
                productId: json.data[0].id,
                variantId: json.data[0].variants[0].id,
                quantity: 1,
              },
            ]);
          }
        }
      } catch (err) {
        console.error('Failed to load products', err);
      } finally {
        setLoadingProducts(false);
      }
    }
    loadProducts();
  }, []);

  // Hitung Subtotal
  const baseSubtotal = items.reduce((acc, row) => {
    const p = products.find((prod) => prod.id === row.productId);
    return acc + (p?.price || 0) * (row.quantity || 1);
  }, 0);

  // Hitung Diskon
  let discountAmount = 0;
  if (appliedPromo) {
    const dType = (appliedPromo.discountType || '').toLowerCase();
    if (dType === 'percentage' || dType === 'persen') {
      discountAmount = Math.round((baseSubtotal * appliedPromo.discountValue) / 100);
      const maxD = appliedPromo.maxDiscount || appliedPromo.maxDiscountAmount;
      if (maxD && discountAmount > maxD) {
        discountAmount = maxD;
      }
    } else {
      discountAmount = Math.min(baseSubtotal, appliedPromo.discountValue);
    }
  }

  const netPrice = Math.max(0, baseSubtotal - discountAmount);
  const ppnAmount = appliedPromo?.isFreeTax ? 0 : Math.round(netPrice * 0.11);
  const shippingCost = 0; // Forced Rp 0 COD
  const totalPrice = netPrice + ppnAmount + shippingCost;

  // Handler Terapkan Promo
  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return;
    setValidatingPromo(true);
    setPromoError(null);
    try {
      const res = await fetch('/api/promos/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCodeInput.trim(),
          subtotal: baseSubtotal,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAppliedPromo(data.data);
      } else {
        setPromoError(data.error || 'Kode promo tidak valid.');
        setAppliedPromo(null);
      }
    } catch {
      setPromoError('Gagal memvalidasi kode promo.');
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleAddItemRow = () => {
    if (products.length === 0) return;
    const defaultProduct = products[0];
    setItems([
      ...items,
      {
        productId: defaultProduct.id,
        variantId: defaultProduct.variants?.[0]?.id || '',
        quantity: 1,
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof OrderItemRow, value: any) => {
    const updated = [...items];
    if (field === 'productId') {
      const prod = products.find((p) => p.id === value);
      updated[index] = {
        productId: value,
        variantId: prod?.variants?.[0]?.id || '',
        quantity: updated[index].quantity,
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerName.trim() || !customerPhone.trim()) {
      setFormError('Nama lengkap dan nomor WhatsApp pelanggan wajib diisi.');
      return;
    }

    if (items.length === 0 || items.some((i) => !i.productId || !i.variantId || i.quantity < 1)) {
      setFormError('Harap lengkapi semua pilihan produk dan jumlah pesanan.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          handoverLocation: handoverLocation.trim() || undefined,
          note: note.trim() || undefined,
          promoCode: appliedPromo?.code || undefined,
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal membuat pesanan manual COD.');
      }

      setSuccessOrder(data.data);
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSubmitting(false);
    }
  };

  if (successOrder) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-3xl border border-stone-200 shadow-sm text-center space-y-5 my-8">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-stone-900 font-serif">Pesanan Manual COD Berhasil Dibuat!</h2>
        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-left space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-stone-500">Kode Pesanan:</span>
            <span className="font-mono font-bold text-stone-900">{successOrder.code}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Pelanggan:</span>
            <span className="font-semibold text-stone-900">{successOrder.customerName} ({successOrder.customerPhone})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Metode Bayar:</span>
            <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">COD (Cash on Delivery)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Ongkos Kirim:</span>
            <span className="font-bold text-emerald-700">Rp 0 (COD, serah langsung)</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-stone-200 text-sm font-bold text-stone-900">
            <span>Total Tagihan Kas:</span>
            <span>Rp {(successOrder.totalPrice || 0).toLocaleString('id-ID')}</span>
          </div>
        </div>
        <p className="text-xs text-stone-500">
          Stok barang telah direservasi. Silakan serahkan barang kepada pelanggan dan tandai status &quot;Diserahkan&quot;.
        </p>
        <div className="flex justify-center gap-3 pt-3">
          <button
            onClick={() => {
              setSuccessOrder(null);
              setCustomerName('');
              setCustomerPhone('');
              setHandoverLocation('');
              setNote('');
              setAppliedPromo(null);
              setPromoCodeInput('');
            }}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors"
          >
            Buat Pesanan Baru
          </button>
          <button
            onClick={() => router.push(backUrl)}
            className="px-4 py-2 bg-[#14532d] hover:bg-[#0f3f22] text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            Kembali ke Daftar Pesanan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push(backUrl)}
          className="flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
          Pesanan Manual COD (Ongkir Rp 0)
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-black text-stone-900 font-serif">Buat Pesanan Manual (COD)</h1>
        <p className="text-xs text-stone-500 mt-1">
          Khusus penjualan langsung / serah terima di tempat. Ongkir otomatis Rp 0 dan stok direservasi seketika.
        </p>
      </div>

      {formError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kolom Kiri: Form Data Pelanggan & Produk */}
        <div className="lg:col-span-7 space-y-5">
          {/* Data Pelanggan */}
          <div className="p-5 bg-white rounded-3xl border border-stone-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <User className="w-4 h-4 text-[#14532d]" />
              Data Pelanggan
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nama Lengkap Pelanggan *
                </label>
                <input
                  type="text"
                  required
                  id="input-customer-name"
                  placeholder="Contoh: Siti Aisyah"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-medium focus:ring-2 focus:ring-[#14532d]/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nomor WhatsApp Pelanggan *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    required
                    id="input-customer-phone"
                    placeholder="08123456789"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-medium focus:ring-2 focus:ring-[#14532d]/20 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Lokasi / Alamat Serah Terima (Opsional)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    id="input-handover-location"
                    placeholder="Contoh: Toko Luvira Pusat / COD Depan Masjid Al-Ikhlas"
                    value={handoverLocation}
                    onChange={(e) => setHandoverLocation(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-medium focus:ring-2 focus:ring-[#14532d]/20 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Catatan Pesanan (Opsional)
                </label>
                <input
                  type="text"
                  id="input-order-note"
                  placeholder="Contoh: Janjian serah barang jam 3 sore"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-medium focus:ring-2 focus:ring-[#14532d]/20 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Pilih Produk & Varian */}
          <div className="p-5 bg-white rounded-3xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#14532d]" />
                Pilih Produk & Varian
              </h2>
              <button
                type="button"
                id="btn-add-item-row"
                onClick={handleAddItemRow}
                className="flex items-center gap-1 text-xs font-bold text-[#14532d] hover:text-[#0f3f22]"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Produk
              </button>
            </div>

            {loadingProducts ? (
              <div className="py-8 text-center text-xs text-stone-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                Memuat katalog produk...
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((row, idx) => {
                  const selectedProduct = products.find((p) => p.id === row.productId);
                  const selectedVariant = selectedProduct?.variants.find((v) => v.id === row.variantId);

                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border border-stone-200/80 bg-stone-50/50 space-y-2.5 relative"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                        {/* Pilih Produk */}
                        <div className="sm:col-span-5">
                          <label className="block text-[10px] font-bold text-stone-500 mb-0.5">Produk</label>
                          <select
                            value={row.productId}
                            onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                            className="w-full px-2.5 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white outline-none"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} - Rp {p.price.toLocaleString('id-ID')}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Pilih Varian */}
                        <div className="sm:col-span-4">
                          <label className="block text-[10px] font-bold text-stone-500 mb-0.5">Varian</label>
                          <select
                            value={row.variantId}
                            onChange={(e) => handleItemChange(idx, 'variantId', e.target.value)}
                            className="w-full px-2.5 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white outline-none"
                          >
                            {selectedProduct?.variants.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Jumlah */}
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-stone-500 mb-0.5">Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={(e) =>
                              handleItemChange(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))
                            }
                            className="w-full px-2.5 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white text-center outline-none"
                          />
                        </div>

                        {/* Hapus Baris */}
                        <div className="sm:col-span-1 flex items-end justify-center pt-4 sm:pt-0">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(idx)}
                              className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Hapus baris"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Info Ketersediaan Stok */}
                      {selectedVariant && (
                        <div className="text-[11px] text-stone-500 flex items-center justify-between pt-1 border-t border-stone-200/50">
                          <span>Harga Satuan: <b>Rp {(selectedProduct?.price || 0).toLocaleString('id-ID')}</b></span>
                          <span className="font-bold text-emerald-700">Subtotal: Rp {((selectedProduct?.price || 0) * row.quantity).toLocaleString('id-ID')}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Kupon Promo, Ringkasan, & Tombol Submit */}
        <div className="lg:col-span-5 space-y-5">
          {/* Kupon Promo */}
          <div className="p-5 bg-white rounded-3xl border border-stone-200 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#14532d]" />
              Kode Promo (Opsional)
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                id="input-manual-promo"
                placeholder="Masukkan kode promo"
                value={promoCodeInput}
                onChange={(e) => {
                  setPromoCodeInput(e.target.value.toUpperCase());
                  setPromoError(null);
                }}
                className="flex-1 px-3.5 py-2 rounded-xl border border-stone-200 text-xs uppercase font-mono font-bold outline-none"
              />
              <button
                type="button"
                id="btn-apply-manual-promo"
                disabled={validatingPromo || !promoCodeInput.trim()}
                onClick={handleApplyPromo}
                className="px-3.5 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-colors"
              >
                {validatingPromo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Terapkan'}
              </button>
            </div>

            {promoError && <p className="text-xs text-rose-600 font-medium">{promoError}</p>}

            {appliedPromo && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                <span className="font-bold">Kode {appliedPromo.code} aktif!</span>
                <button
                  type="button"
                  onClick={() => {
                    setAppliedPromo(null);
                    setPromoCodeInput('');
                  }}
                  className="text-stone-500 hover:text-stone-800 underline text-[11px]"
                >
                  Hapus
                </button>
              </div>
            )}
          </div>

          {/* Ringkasan Biaya COD */}
          <div className="p-5 bg-white rounded-3xl border border-stone-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-stone-900 font-serif">Ringkasan Pesanan COD</h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal Produk</span>
                <span className="font-semibold text-stone-900">Rp {baseSubtotal.toLocaleString('id-ID')}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Diskon Promo</span>
                  <span>- Rp {discountAmount.toLocaleString('id-ID')}</span>
                </div>
              )}

              <div className="flex justify-between text-stone-600">
                <span>PPN (11%)</span>
                <span className="font-semibold text-stone-900">Rp {ppnAmount.toLocaleString('id-ID')}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-y border-stone-100">
                <div>
                  <span className="font-bold text-stone-900 block">Ongkos Kirim</span>
                  <span className="text-[10px] text-emerald-700 font-semibold">COD, serah langsung</span>
                </div>
                <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                  Rp 0 (COD, serah langsung)
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 text-base font-black text-stone-900">
                <span>Total Tagihan Kas</span>
                <span className="text-lg text-[#14532d] font-serif">
                  Rp {totalPrice.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <button
              type="submit"
              id="btn-submit-manual-cod"
              disabled={submitting || items.length === 0}
              className="w-full py-3.5 bg-[#14532d] hover:bg-[#0f3f22] text-white rounded-2xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Membuat Pesanan COD...</span>
                </>
              ) : (
                <span>Buat Pesanan Manual COD</span>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

