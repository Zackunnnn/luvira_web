'use client';

// components/luvibot/LuviBotDashboardClient.tsx
// ============================================================================
// Dashboard Sub-Admin LuviBot (Model A)
// Otorisasi: Edit Harga & Promo HANYA setelah Draf Lengkap + Approval Awan
// View-only: Pesanan, Stok, Rekap, Reseller Tersamarkan, Log Perubahan
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  Tag,
  Package,
  ShoppingBag,
  Users,
  FileText,
  History,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Bot,
  Lock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default function LuviBotDashboardClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'price' | 'promos' | 'orders' | 'stock' | 'recap' | 'resellers' | 'changelog'>('price');

  // Products & Price State
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [newPrice, setNewPrice] = useState<string>('');
  const [priceDraftId, setPriceDraftId] = useState<string>('');
  const [priceApprovalTime, setPriceApprovalTime] = useState<string>('');
  const [priceLoading, setPriceLoading] = useState<boolean>(false);
  const [priceMessage, setPriceMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Promo State
  const [promoCode, setPromoCode] = useState<string>('');
  const [promoDiscountType, setPromoDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [promoDiscountValue, setPromoDiscountValue] = useState<string>('');
  const [promoMinOrder, setPromoMinOrder] = useState<string>('50000');
  const [promoQuota, setPromoQuota] = useState<string>('100');
  const [promoExpiresAt, setPromoExpiresAt] = useState<string>('');
  const [promoDraftId, setPromoDraftId] = useState<string>('');
  const [promoApprovalTime, setPromoApprovalTime] = useState<string>('');
  const [promoLoading, setPromoLoading] = useState<boolean>(false);
  const [promoMessage, setPromoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [promoList, setPromoList] = useState<any[]>([]);

  // View-only states
  const [orders, setOrders] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [resellers, setResellers] = useState<any[]>([]);
  const [changeLogs, setChangeLogs] = useState<any[]>([]);
  const [recapData, setRecapData] = useState<any>(null);
  const [loadingView, setLoadingView] = useState<boolean>(false);

  // Load Products
  const loadProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.data || data.products || []);
        setProducts(list);
        if (list.length > 0 && !selectedProductId) {
          setSelectedProductId(list[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load Promos
  const loadPromos = async () => {
    try {
      const res = await fetch('/api/admin/promos');
      if (res.ok) {
        const data = await res.json();
        setPromoList(data.promos || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load Orders (View-Only)
  const loadOrders = async () => {
    try {
      setLoadingView(true);
      const res = await fetch('/api/admin/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingView(false);
    }
  };

  // Load Stocks (View-Only)
  const loadStocks = async () => {
    try {
      setLoadingView(true);
      const res = await fetch('/api/admin/stock');
      if (res.ok) {
        const data = await res.json();
        setStocks(data.stocks || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingView(false);
    }
  };

  // Load Resellers (Masked View-Only)
  const loadResellers = async () => {
    try {
      setLoadingView(true);
      const res = await fetch('/api/admin/resellers');
      if (res.ok) {
        const data = await res.json();
        setResellers(data.resellers || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingView(false);
    }
  };

  // Load ChangeLogs (View-Only)
  const loadChangeLogs = async () => {
    try {
      setLoadingView(true);
      const res = await fetch('/api/changelog');
      if (res.ok) {
        const data = await res.json();
        setChangeLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingView(false);
    }
  };

  // Load Recap Report (View-Only)
  const loadRecap = async () => {
    try {
      setLoadingView(true);
      const res = await fetch('/api/owner/reports');
      if (res.ok) {
        const data = await res.json();
        setRecapData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingView(false);
    }
  };

  useEffect(() => {
    loadProducts();
    loadPromos();
  }, []);

  useEffect(() => {
    if (activeTab === 'orders') loadOrders();
    if (activeTab === 'stock') loadStocks();
    if (activeTab === 'resellers') loadResellers();
    if (activeTab === 'changelog') loadChangeLogs();
    if (activeTab === 'recap') loadRecap();
  }, [activeTab]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Handler Ganti Harga (Model A)
  const handleExecutePriceChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPriceMessage(null);

    if (!priceDraftId.trim()) {
      setPriceMessage({ type: 'error', text: 'ID Draf wajib diisi sesuai persetujuan Awan.' });
      return;
    }
    if (!newPrice || parseInt(newPrice, 10) <= 0) {
      setPriceMessage({ type: 'error', text: 'Harga baru harus lebih besar dari 0.' });
      return;
    }

    try {
      setPriceLoading(true);
      const res = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          price: parseInt(newPrice, 10),
          draftId: priceDraftId.trim(),
          requestedBy: 'Awan',
          approvedBy: 'Awan',
          approvalTimeWib: priceApprovalTime.trim() || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setPriceMessage({ type: 'error', text: result.error || 'Gagal mengubah harga.' });
        return;
      }

      setPriceMessage({
        type: 'success',
        text: `Sukses! Harga berhasil diubah menjadi Rp ${parseInt(newPrice, 10).toLocaleString('id-ID')}. Log: ${result.changeLog?.logCode || 'Tercatat'}`,
      });

      // Refresh list dan changelog
      loadProducts();
      setNewPrice('');
      setPriceDraftId('');
      setPriceApprovalTime('');
    } catch (err: any) {
      setPriceMessage({ type: 'error', text: err.message || 'Kesalahan jaringan.' });
    } finally {
      setPriceLoading(false);
    }
  };

  // Handler Tambah Promo (Model A)
  const handleExecutePromoCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoMessage(null);

    if (!promoDraftId.trim()) {
      setPromoMessage({ type: 'error', text: 'ID Draf wajib diisi sesuai persetujuan Awan.' });
      return;
    }
    if (!promoCode.trim()) {
      setPromoMessage({ type: 'error', text: 'Kode promo wajib diisi.' });
      return;
    }
    if (!promoExpiresAt) {
      setPromoMessage({ type: 'error', text: 'Masa berlaku promo wajib diisi (tidak boleh kosong).' });
      return;
    }

    try {
      setPromoLoading(true);
      const res = await fetch('/api/admin/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCode.trim().toUpperCase(),
          type: 'RESELLER',
          discountType: promoDiscountType,
          discountValue: parseInt(promoDiscountValue, 10),
          minOrderAmount: parseInt(promoMinOrder, 10),
          quota: parseInt(promoQuota, 10),
          expiresAt: new Date(promoExpiresAt).toISOString(),
          draftId: promoDraftId.trim(),
          requestedBy: 'Awan',
          approvedBy: 'Awan',
          approvalTimeWib: promoApprovalTime.trim() || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setPromoMessage({ type: 'error', text: result.error || 'Gagal membuat kode promo.' });
        return;
      }

      setPromoMessage({
        type: 'success',
        text: `Sukses! Kode promo "${promoCode.toUpperCase()}" berhasil dibuat. Log: ${result.changeLog?.logCode || 'Tercatat'}`,
      });

      loadPromos();
      setPromoCode('');
      setPromoDiscountValue('');
      setPromoDraftId('');
      setPromoApprovalTime('');
      setPromoExpiresAt('');
    } catch (err: any) {
      setPromoMessage({ type: 'error', text: err.message || 'Kesalahan jaringan.' });
    } finally {
      setPromoLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/dashboard/login');
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900">
      {/* TOPBAR */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-[#14532d] text-white rounded-xl flex items-center justify-center shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base tracking-tight text-stone-900">LuviBot Sub-Admin</h1>
                <span className="px-2 py-0.5 bg-emerald-100 text-[#14532d] text-[10px] font-bold rounded-full">
                  Model A
                </span>
              </div>
              <p className="text-[11px] text-stone-500">Eksekusi hanya setelah Draf Lengkap & Approval Tertulis Awan</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Keluar
            </button>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 overflow-x-auto border-t border-stone-100 text-xs font-semibold text-stone-600">
          <button
            onClick={() => setActiveTab('price')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'price' ? 'border-[#14532d] text-[#14532d] font-bold' : 'border-transparent hover:text-stone-900'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Ganti Harga (Model A)
          </button>

          <button
            onClick={() => setActiveTab('promos')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'promos' ? 'border-[#14532d] text-[#14532d] font-bold' : 'border-transparent hover:text-stone-900'
            }`}
          >
            <Tag className="w-4 h-4" />
            Tambah Promo
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'orders' ? 'border-[#14532d] text-[#14532d] font-bold' : 'border-transparent hover:text-stone-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Pesanan (Lihat)
          </button>

          <button
            onClick={() => setActiveTab('stock')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'stock' ? 'border-[#14532d] text-[#14532d] font-bold' : 'border-transparent hover:text-stone-900'
            }`}
          >
            <Package className="w-4 h-4" />
            Cek Stok
          </button>

          <button
            onClick={() => setActiveTab('recap')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'recap' ? 'border-[#14532d] text-[#14532d] font-bold' : 'border-transparent hover:text-stone-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            Rekap Penjualan
          </button>

          <button
            onClick={() => setActiveTab('resellers')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'resellers' ? 'border-[#14532d] text-[#14532d] font-bold' : 'border-transparent hover:text-stone-900'
            }`}
          >
            <Users className="w-4 h-4" />
            Reseller (Tersensor)
          </button>

          <button
            onClick={() => setActiveTab('changelog')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'changelog' ? 'border-[#14532d] text-[#14532d] font-bold' : 'border-transparent hover:text-stone-900'
            }`}
          >
            <History className="w-4 h-4" />
            Log Perubahan
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* BANNER MODEL A */}
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#14532d] shrink-0 mt-0.5" />
          <div className="text-xs text-stone-700 leading-relaxed">
            <span className="font-bold text-[#14532d]">Prosedur Model A Aktif:</span> Setiap mutasi harga, promo, atau stok yang dilakukan LuviBot wajib mencantumkan ID Draf yang telah disetujui tertulis oleh Awan di chat. Seluruh aksi otomatis tervalidasi dan dicatat permanen di <span className="font-semibold">Log Perubahan Sistem</span>.
          </div>
        </div>

        {/* TAB 1: GANTI HARGA (MODEL A) */}
        {activeTab === 'price' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
              <h2 className="text-base font-bold text-stone-900 mb-1 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#14532d]" />
                Formulir Eksekusi Ganti Harga Produk
              </h2>
              <p className="text-xs text-stone-500 mb-6">
                Langkah 6 Alur Model A: Masukkan data draf yang telah disetujui Awan untuk mengeksekusi harga baru.
              </p>

              {priceMessage && (
                <div
                  className={`mb-6 p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                    priceMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {priceMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  {priceMessage.text}
                </div>
              )}

              <form onSubmit={handleExecutePriceChange} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">Pilih Produk:</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#14532d]"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — Rp {p.price?.toLocaleString('id-ID')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">Harga Sekarang:</label>
                    <input
                      type="text"
                      disabled
                      value={selectedProduct ? `Rp ${selectedProduct.price?.toLocaleString('id-ID')}` : '-'}
                      className="w-full bg-stone-100 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">Harga Baru (Rp): *</label>
                    <input
                      type="number"
                      required
                      placeholder="Contoh: 38000"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#14532d]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">ID Draf yang Disetujui: *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: DRAF-20261111-01"
                      value={priceDraftId}
                      onChange={(e) => setPriceDraftId(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#14532d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">Jam Approval Awan (WIB):</label>
                    <input
                      type="text"
                      placeholder="Contoh: 11:15 WIB"
                      value={priceApprovalTime}
                      onChange={(e) => setPriceApprovalTime(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#14532d]"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={priceLoading}
                    className="w-full py-3 px-4 bg-[#14532d] hover:bg-[#0f3f22] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {priceLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Eksekusi Perubahan Harga & Catat ke Log
                  </button>
                </div>
              </form>
            </div>

            {/* PANDUAN USE CASE MODEL A */}
            <div className="bg-stone-100 rounded-2xl p-6 border border-stone-200 text-xs space-y-3">
              <h3 className="font-bold text-stone-900 text-sm">Alur Model A: Use Case Ganti Harga</h3>
              <ol className="list-decimal pl-4 space-y-2 text-stone-600">
                <li>Awan minta LuviBot ganti harga di chat Muse.</li>
                <li>LuviBot cek harga sekarang di dashboard ini.</li>
                <li>LuviBot lapor harga sekarang & Awan beri harga baru.</li>
                <li>LuviBot buat Draf Lengkap (Status: Menunggu Approval).</li>
                <li>Awan beri approval tertulis di chat.</li>
                <li>LuviBot eksekusi form di samping dengan ID Draf.</li>
                <li>LuviBot verifikasi harga tampil di katalog & checkout.</li>
                <li>LuviBot cek Log Perubahan & lapor ke Awan.</li>
              </ol>
            </div>
          </div>
        )}

        {/* TAB 2: TAMBAH PROMO */}
        {activeTab === 'promos' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs max-w-3xl">
              <h2 className="text-base font-bold text-stone-900 mb-1 flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#14532d]" />
                Tambah Kode Promo (Wajib Draf Lengkap)
              </h2>
              <p className="text-xs text-stone-500 mb-6">
                Seluruh parameter (diskon, masa berlaku, kuota, min belanja) wajib diisi lengkap sesuai draf yang disetujui.
              </p>

              {promoMessage && (
                <div
                  className={`mb-6 p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                    promoMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {promoMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  {promoMessage.text}
                </div>
              )}

              <form onSubmit={handleExecutePromoCreate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">Kode Promo: *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: LUVIAWAN10"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#14532d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">Jenis Diskon: *</label>
                    <select
                      value={promoDiscountType}
                      onChange={(e: any) => setPromoDiscountType(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#14532d]"
                    >
                      <option value="PERCENTAGE">Persentase (%)</option>
                      <option value="FIXED">Nominal Tetap (Rp)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      Nilai Diskon ({promoDiscountType === 'PERCENTAGE' ? '%' : 'Rp'}): *
                    </label>
                    <input
                      type="number"
                      required
                      placeholder={promoDiscountType === 'PERCENTAGE' ? '10' : '5000'}
                      value={promoDiscountValue}
                      onChange={(e) => setPromoDiscountValue(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#14532d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">Minimal Belanja (Rp): *</label>
                    <input
                      type="number"
                      required
                      value={promoMinOrder}
                      onChange={(e) => setPromoMinOrder(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#14532d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">Kuota Pemakaian: *</label>
                    <input
                      type="number"
                      required
                      value={promoQuota}
                      onChange={(e) => setPromoQuota(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#14532d]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">Masa Berlaku (Kedaluwarsa): *</label>
                  <input
                    type="date"
                    required
                    value={promoExpiresAt}
                    onChange={(e) => setPromoExpiresAt(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#14532d]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">ID Draf yang Disetujui: *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: DRAF-PROMO-20261111-01"
                      value={promoDraftId}
                      onChange={(e) => setPromoDraftId(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#14532d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">Jam Approval Awan (WIB):</label>
                    <input
                      type="text"
                      placeholder="Contoh: 11:20 WIB"
                      value={promoApprovalTime}
                      onChange={(e) => setPromoApprovalTime(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#14532d]"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={promoLoading}
                    className="w-full py-3 px-4 bg-[#14532d] hover:bg-[#0f3f22] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {promoLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
                    Buat Kode Promo & Catat ke Log
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: PESANAN (VIEW-ONLY) */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#14532d]" />
                Daftar Pesanan (View-Only)
              </h2>
              <button
                onClick={loadOrders}
                className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {loadingView ? (
              <p className="text-xs text-stone-500 py-8 text-center">Memuat daftar pesanan...</p>
            ) : orders.length === 0 ? (
              <p className="text-xs text-stone-400 py-8 text-center italic">Tidak ada pesanan.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 text-stone-600">
                      <th className="py-2.5 px-3">Kode Order</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Pelanggan</th>
                      <th className="py-2.5 px-3">Metode Bayar</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-stone-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-stone-800">{o.code}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700">
                            {o.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">{o.customerName || '-'}</td>
                        <td className="py-2.5 px-3">{o.paymentMethod}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          Rp {o.totalPrice?.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CEK STOK (VIEW-ONLY) */}
        {activeTab === 'stock' && (
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-[#14532d]" />
                Cek Ketersediaan Stok Gudang (View-Only)
              </h2>
              <button
                onClick={loadStocks}
                className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {loadingView ? (
              <p className="text-xs text-stone-500 py-8 text-center">Memuat stok...</p>
            ) : stocks.length === 0 ? (
              <p className="text-xs text-stone-400 py-8 text-center italic">Tidak ada data stok.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 text-stone-600">
                      <th className="py-2.5 px-3">Produk & Varian</th>
                      <th className="py-2.5 px-3">Gudang / Wilayah</th>
                      <th className="py-2.5 px-3 text-center">Fisik (Qty)</th>
                      <th className="py-2.5 px-3 text-center">Reserved</th>
                      <th className="py-2.5 px-3 text-center">Tersedia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {stocks.map((s) => (
                      <tr key={s.id} className="hover:bg-stone-50">
                        <td className="py-2.5 px-3 font-semibold text-stone-800">
                          {s.variant?.product?.name} ({s.variant?.name})
                        </td>
                        <td className="py-2.5 px-3">{s.region?.name}</td>
                        <td className="py-2.5 px-3 text-center font-bold">{s.qty}</td>
                        <td className="py-2.5 px-3 text-center text-stone-500">{s.reserved}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-[#14532d]">
                          {s.qty - s.reserved}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: REKAP PENJUALAN (VIEW-ONLY) */}
        {activeTab === 'recap' && (
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
            <h2 className="text-base font-bold text-stone-900 mb-1 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#14532d]" />
              Rekap Penjualan Bisnis (View-Only)
            </h2>
            <p className="text-xs text-stone-500 mb-6">
              Akses baca langsung ke laporan keuangan tanpa tombol export atau share publik.
            </p>

            {loadingView ? (
              <p className="text-xs text-stone-500 py-8 text-center">Memuat rekap penjualan...</p>
            ) : !recapData ? (
              <p className="text-xs text-stone-400 py-8 text-center italic">Data rekap belum tersedia.</p>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                    <p className="text-[11px] text-stone-500 mb-1">Total Pesanan</p>
                    <p className="text-xl font-black text-stone-900">{recapData.summary?.totalOrders || 0} order</p>
                  </div>
                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                    <p className="text-[11px] text-stone-500 mb-1">Omzet Kotor</p>
                    <p className="text-xl font-black text-[#14532d]">
                      Rp {(recapData.summary?.grossTurnover || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                    <p className="text-[11px] text-stone-500 mb-1">Omzet Bersih</p>
                    <p className="text-xl font-black text-stone-900">
                      Rp {(recapData.summary?.netTurnover || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: DAFTAR RESELLER (DATA TERSENSOR) */}
        {activeTab === 'resellers' && (
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
            <h2 className="text-base font-bold text-stone-900 mb-1 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#14532d]" />
              Daftar Mitra Reseller (Data Sensitif Disamarkan)
            </h2>
            <p className="text-xs text-stone-500 mb-6">
              Sesuai aturan privasi, nama dan nomor WhatsApp mitra reseller disensor secara otomatis di level server.
            </p>

            {loadingView ? (
              <p className="text-xs text-stone-500 py-8 text-center">Memuat daftar reseller...</p>
            ) : resellers.length === 0 ? (
              <p className="text-xs text-stone-400 py-8 text-center italic">Tidak ada reseller terdaftar.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 text-stone-600">
                      <th className="py-2.5 px-3">Nama (Sensor)</th>
                      <th className="py-2.5 px-3">WhatsApp (Sensor)</th>
                      <th className="py-2.5 px-3">Wilayah</th>
                      <th className="py-2.5 px-3">Kode Promo Ditautkan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {resellers.map((r) => (
                      <tr key={r.id} className="hover:bg-stone-50">
                        <td className="py-2.5 px-3 font-semibold text-stone-800">{r.name}</td>
                        <td className="py-2.5 px-3 font-mono text-stone-600">{r.phone}</td>
                        <td className="py-2.5 px-3">{r.region?.name || 'Pusat'}</td>
                        <td className="py-2.5 px-3">
                          {r.resellerPromos?.map((p: any) => (
                            <span key={p.id} className="mr-1 px-2 py-0.5 bg-stone-100 rounded text-[10px] font-mono font-bold">
                              {p.code}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: LOG PERUBAHAN (VIEW-ONLY, IMMUTABLE) */}
        {activeTab === 'changelog' && (
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-[#14532d]" />
                  Log Perubahan LuviBot (Immutable Audit Trail)
                </h2>
                <p className="text-xs text-stone-500">
                  Catatan otomatis setiap perubahan yang dieksekusi LuviBot. Tidak dapat diubah atau dihapus.
                </p>
              </div>
              <button
                onClick={loadChangeLogs}
                className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {loadingView ? (
              <p className="text-xs text-stone-500 py-8 text-center">Memuat log perubahan...</p>
            ) : changeLogs.length === 0 ? (
              <p className="text-xs text-stone-400 py-8 text-center italic">Belum ada catatan log perubahan.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 text-stone-600">
                      <th className="py-2.5 px-3">ID Log / Draf</th>
                      <th className="py-2.5 px-3">Waktu (WIB)</th>
                      <th className="py-2.5 px-3">Approval Awan</th>
                      <th className="py-2.5 px-3">Target</th>
                      <th className="py-2.5 px-3">Perubahan (Lama → Baru)</th>
                      <th className="py-2.5 px-3 text-center">Hasil Verifikasi</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {changeLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-stone-50">
                        <td className="py-2.5 px-3">
                          <p className="font-mono font-bold text-stone-800">{log.logCode}</p>
                          <p className="text-[10px] text-stone-500 font-mono">{log.draftId}</p>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-stone-600 whitespace-nowrap">{log.executedAtWib}</td>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-stone-800">{log.approvedBy}</p>
                          <p className="text-[10px] text-stone-500">{log.approvalTimeWib}</p>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold">{log.targetName}</span>
                          <span className="block text-[10px] text-stone-400">{log.fieldChanged}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="line-through text-stone-400 mr-1.5">{log.oldValue}</span>
                          <span className="font-bold text-[#14532d]">{log.newValue}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {log.verificationResult}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-800">
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

