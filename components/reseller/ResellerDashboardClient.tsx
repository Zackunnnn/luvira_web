'use client';

// components/reseller/ResellerDashboardClient.tsx
// ============================================================================
// Antarmuka Dashboard Reseller Luvira 2.0 (FT-4)
// Mobile-first, 4 state (Loading, Error, Empty, Populated), Bahasa Indonesia.
// Menjamin privasi pelanggan: nama B*** S***, telepon ••••1234, tanpa HPP & stok.
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  TrendingUp,
  Tag,
  CheckCircle2,
  Send,
  Download,
  MessageSquare,
  User,
  KeyRound,
  RefreshCw,
  AlertCircle,
  LogOut,
  ArrowUpRight,
  X,
} from 'lucide-react';

interface ResellerSummary {
  totalOrders: number;
  grossTurnover: number;
  netTurnover: number;
  totalDiscount: number;
  completedOrders: number;
  pendingOrders: number;
  ordersByStatus: Record<string, number>;
}

interface ResellerOrder {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  status: string;
  paymentMethod: string;
  totalPrice: number;
  subtotal: number;
  discountAmount: number;
  createdAt: string;
  promoCode?: { code: string; discountType: string; discountValue: number } | null;
  secondPromoCode?: { code: string; discountType: string; discountValue: number } | null;
  items: Array<{
    id: string;
    productName: string;
    variantName: string;
    quantity: number;
    priceEach: number;
    subtotal: number;
  }>;
}

interface ResellerPromo {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  maxDiscountAmount?: number | null;
  quota: number;
  usedCount: number;
  quotaRemaining: number | string;
  expiresAt: string | null;
  isActive: boolean;
  isExpired: boolean;
  region?: { name: string } | null;
}

interface DailyTrendItem {
  date: string;
  count: number;
  turnover: number;
}

export default function ResellerDashboardClient() {
  const router = useRouter();

  // State Data
  const [period, setPeriod] = useState<string>('30d');
  const [summary, setSummary] = useState<ResellerSummary | null>(null);
  const [dailyTrend, setDailyTrend] = useState<DailyTrendItem[]>([]);
  const [orders, setOrders] = useState<ResellerOrder[]>([]);
  const [promos, setPromos] = useState<ResellerPromo[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');

  // UI States (4 States)
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Profile
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);
  const [ft5ModalOpen, setFt5ModalOpen] = useState<boolean>(false);
  const [ft6ModalOpen, setFt6ModalOpen] = useState<boolean>(false);

  // Profile Form State
  const [profileName, setProfileName] = useState<string>('');
  const [profilePhone, setProfilePhone] = useState<string>('');
  const [profileSaving, setProfileSaving] = useState<boolean>(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Password Form State
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [passwordSaving, setPasswordSaving] = useState<boolean>(false);
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // User Info
  const [userName, setUserName] = useState<string>('Reseller Luvira');
  const [userRegion, setUserRegion] = useState<string>('Pusat');

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Analytics
      const resAnalytics = await fetch(`/api/reseller/analytics?period=${period}`);
      const dataAnalytics = await resAnalytics.json();

      // 2. Fetch Orders
      const resOrders = await fetch(`/api/reseller/orders?status=${orderStatusFilter}`);
      const dataOrders = await resOrders.json();

      // 3. Fetch Promos
      const resPromos = await fetch('/api/reseller/promos');
      const dataPromos = await resPromos.json();

      // 4. Fetch Profile
      const resProfile = await fetch('/api/reseller/profile');
      const dataProfile = await resProfile.json();

      if (!resAnalytics.ok || !dataAnalytics.success) {
        throw new Error(dataAnalytics.error || 'Gagal memuat analitik reseller.');
      }

      setSummary(dataAnalytics.data.summary);
      setDailyTrend(dataAnalytics.data.dailyTrend || []);
      setOrders(dataOrders.data || []);
      setPromos(dataPromos.data || []);

      if (dataProfile.data) {
        setUserName(dataProfile.data.name || 'Reseller');
        setProfileName(dataProfile.data.name || '');
        setProfilePhone(dataProfile.data.phone || '');
        if (dataProfile.data.region) {
          setUserRegion(dataProfile.data.region.name);
        }
      }
    } catch (err: any) {
      console.error('[Reseller Dashboard Load Error]', err);
      setError(err.message || 'Terjadi kesalahan saat memuat dashboard reseller.');
    } finally {
      setLoading(false);
    }
  }, [period, orderStatusFilter]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handler Update Profil & Kirim Pesan Uji WA
  const handleSaveProfile = async (sendTestWa = false) => {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const res = await fetch('/api/reseller/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName,
          phone: profilePhone,
          sendTestWa,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal memperbarui profil.');
      }
      setProfileMsg({ text: data.message, type: 'success' });
      setUserName(profileName);
    } catch (err: any) {
      setProfileMsg({ text: err.message, type: 'error' });
    } finally {
      setProfileSaving(false);
    }
  };

  // Handler Ganti Kata Sandi
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordMsg(null);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengubah kata sandi.');
      }
      setPasswordMsg({ text: 'Kata sandi berhasil diubah.', type: 'success' });
      setOldPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordMsg({ text: err.message, type: 'error' });
    } finally {
      setPasswordSaving(false);
    }
  };

  // Handler Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/dashboard/login');
    } catch (err) {
      console.error(err);
      router.push('/dashboard/login');
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SELESAI':
        return <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800">Selesai</span>;
      case 'DIKIRIM':
        return <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-100 text-blue-800">Diserahkan / Dikirim</span>;
      case 'DIPROSES':
        return <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800">Menunggu Serah Terima</span>;
      case 'DIBATALKAN':
        return <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-rose-100 text-rose-800">Dibatalkan</span>;
      default:
        return <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-stone-100 text-stone-700">{status}</span>;
    }
  };

  // 1. STATE 1: LOADING
  if (loading && !summary) {
    return (
      <div className="min-h-screen bg-[#fafaf9] p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-stone-200 border-t-[#14532d] rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-stone-600">Memuat data Dashboard Reseller...</p>
        </div>
      </div>
    );
  }

  // 2. STATE 2: ERROR
  if (error && !summary) {
    return (
      <div className="min-h-screen bg-[#fafaf9] p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-6 rounded-3xl border border-rose-200 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-stone-900 font-serif">Gagal Memuat Dashboard</h2>
          <p className="text-xs text-stone-600">{error}</p>
          <button
            type="button"
            onClick={loadDashboardData}
            className="w-full py-2.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Coba Muat Ulang
          </button>
        </div>
      </div>
    );
  }

  const isDataEmpty = (summary?.totalOrders || 0) === 0 && orders.length === 0 && promos.length === 0;

  return (
    <div className="min-h-screen bg-[#fafaf9] text-stone-900 pb-16">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-200 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#14532d] text-white flex items-center justify-center font-serif font-black text-base shadow-sm">
            L
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-stone-900 font-serif">{userName}</h1>
              <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold rounded-full uppercase">
                Reseller
              </span>
            </div>
            <p className="text-[11px] text-stone-500">Wilayah Akun: {userRegion}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setProfileModalOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs font-bold text-stone-700 flex items-center gap-1.5 transition-colors"
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Profil & Sandi</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            title="Keluar"
            className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Aksi Cepat Bar (Mobile First) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Link
            href="/dashboard/reseller/orders/manual"
            className="p-3.5 bg-[#14532d] hover:bg-[#0f3e21] text-white rounded-2xl shadow-xs transition-all flex items-center gap-3 group"
          >
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-xs font-bold leading-tight flex items-center gap-1">
                Buat COD
                <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
              <p className="text-[10px] text-white/70">Pesanan manual</p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setFt5ModalOpen(true)}
            className="p-3.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 rounded-2xl shadow-xs transition-colors flex items-center gap-3 text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold leading-tight">Unduh Data</div>
              <p className="text-[10px] text-stone-500">Cermin Sheet (FT-5)</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setFt6ModalOpen(true)}
            className="p-3.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 rounded-2xl shadow-xs transition-colors flex items-center gap-3 text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold leading-tight">Laporan WA</div>
              <p className="text-[10px] text-stone-500">Langganan (FT-6)</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setProfileModalOpen(true)}
            className="p-3.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 rounded-2xl shadow-xs transition-colors flex items-center gap-3 text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold leading-tight">Profil & Sandi</div>
              <p className="text-[10px] text-stone-500">Kelola akun</p>
            </div>
          </button>
        </div>

        {/* Filter Periode & Judul Ringkasan */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-stone-200 shadow-xs">
          <div>
            <h2 className="text-sm font-bold text-stone-900 font-serif">Ringkasan Kinerja Penjualan</h2>
            <p className="text-[11px] text-stone-500">
              Omzet dan pesanan dari kode promo tertaut serta pesanan manual COD Anda.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-stone-100 p-1 rounded-2xl">
            {[
              { id: 'today', label: 'Hari Ini' },
              { id: '7d', label: '7 Hari' },
              { id: '30d', label: '30 Hari' },
              { id: 'this_month', label: 'Bulan Ini' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  period === p.id
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. STATE 3: EMPTY STATE JIKA BELUM ADA DATA APAPUN */}
        {isDataEmpty ? (
          <div className="bg-white p-8 sm:p-12 rounded-3xl border border-stone-200 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 bg-emerald-50 text-[#14532d] rounded-full flex items-center justify-center mx-auto">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-stone-900 font-serif">Belum Ada Transaksi</h3>
              <p className="text-xs text-stone-500">
                Mulai bagikan kode promo Anda kepada pelanggan atau buat pesanan manual COD pertama Anda untuk mencatat transaksi.
              </p>
            </div>
            <Link
              href="/dashboard/reseller/orders/manual"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#14532d] hover:bg-[#0f3e21] text-white text-xs font-bold rounded-2xl transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              Buat Pesanan Manual (COD)
            </Link>
          </div>
        ) : (
          /* 4. STATE 4: POPULATED DATA STATE */
          <>
            {/* Metrik Utama (4 Kartu) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Jumlah Pesanan */}
              <div className="p-4 bg-white rounded-3xl border border-stone-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-stone-500">
                  <span className="text-xs font-semibold">Total Pesanan</span>
                  <ShoppingBag className="w-4 h-4 text-emerald-800" />
                </div>
                <div className="text-xl sm:text-2xl font-bold font-serif text-stone-900">
                  {summary?.totalOrders || 0}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                  <span className="text-emerald-700 font-bold">{summary?.completedOrders || 0} Selesai</span>
                  <span>•</span>
                  <span>{summary?.pendingOrders || 0} Berjalan</span>
                </div>
              </div>

              {/* Omzet Kotor */}
              <div className="p-4 bg-white rounded-3xl border border-stone-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-stone-500">
                  <span className="text-xs font-semibold">Omzet Kotor</span>
                  <TrendingUp className="w-4 h-4 text-teal-800" />
                </div>
                <div className="text-xl sm:text-2xl font-bold font-serif text-stone-900">
                  Rp {(summary?.grossTurnover || 0).toLocaleString('id-ID')}
                </div>
                <p className="text-[11px] text-stone-500">Total belanja sebelum diskon</p>
              </div>

              {/* Omzet Bersih */}
              <div className="p-4 bg-white rounded-3xl border border-stone-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-stone-500">
                  <span className="text-xs font-semibold">Omzet Bersih</span>
                  <CheckCircle2 className="w-4 h-4 text-[#14532d]" />
                </div>
                <div className="text-xl sm:text-2xl font-bold font-serif text-[#14532d]">
                  Rp {(summary?.netTurnover || 0).toLocaleString('id-ID')}
                </div>
                <p className="text-[11px] text-stone-500">Nilai transaksi produk netto</p>
              </div>

              {/* Total Diskon Diberikan */}
              <div className="p-4 bg-white rounded-3xl border border-stone-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-stone-500">
                  <span className="text-xs font-semibold">Diskon Diberikan</span>
                  <Tag className="w-4 h-4 text-rose-700" />
                </div>
                <div className="text-xl sm:text-2xl font-bold font-serif text-rose-700">
                  Rp {(summary?.totalDiscount || 0).toLocaleString('id-ID')}
                </div>
                <p className="text-[11px] text-stone-500">Total hemat pelanggan</p>
              </div>
            </div>

            {/* Tren Penjualan Sederhana (Bar Visual) */}
            {dailyTrend.length > 0 && (
              <div className="p-5 bg-white rounded-3xl border border-stone-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-[#14532d]" />
                    Tren Penjualan Harian
                  </h3>
                  <span className="text-[11px] text-stone-500">{dailyTrend.length} hari tercatat</span>
                </div>

                <div className="pt-4 flex items-end gap-1.5 h-32 overflow-x-auto pb-1">
                  {dailyTrend.map((d) => {
                    const maxVal = Math.max(...dailyTrend.map((t) => t.turnover), 1);
                    const heightPercent = Math.max(10, Math.round((d.turnover / maxVal) * 100));
                    return (
                      <div key={d.date} className="flex-1 min-w-[28px] flex flex-col items-center gap-1 group relative">
                        {/* Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-stone-900 text-white text-[10px] py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap z-10 shadow-md">
                          {d.date}: {d.count} pesanan (Rp {d.turnover.toLocaleString('id-ID')})
                        </div>
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-[#14532d]/80 group-hover:bg-[#14532d] rounded-t-md transition-all"
                        />
                        <span className="text-[9px] text-stone-400 font-mono">
                          {d.date.slice(-2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Kode Promo Saya (Read-Only) */}
            <div className="p-5 bg-white rounded-3xl border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#14532d]" />
                  Kode Promo Saya ({promos.length})
                </h3>
                <span className="text-[11px] text-stone-500">Hanya-Baca (Dikelola Owner/Pusat)</span>
              </div>

              {promos.length === 0 ? (
                <div className="p-4 bg-stone-50 rounded-2xl text-center text-xs text-stone-500">
                  Belum ada kode promo yang ditautkan ke akun Anda. Silakan hubungi Owner atau Admin Pusat.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {promos.map((p) => {
                    const percentUsed = p.quota > 0 ? Math.min(100, Math.round((p.usedCount / p.quota) * 100)) : 0;
                    return (
                      <div key={p.id} className="p-3.5 bg-stone-50/70 border border-stone-200 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-stone-900 bg-white px-2 py-0.5 rounded-lg border border-stone-200">
                            {p.code}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              p.isActive && !p.isExpired
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-stone-200 text-stone-600'
                            }`}
                          >
                            {p.isExpired ? 'Kedaluwarsa' : p.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </div>

                        <div className="text-xs text-stone-700">
                          Diskon:{' '}
                          <span className="font-bold">
                            {p.discountType.toLowerCase() === 'percentage'
                              ? `${p.discountValue}%`
                              : `Rp ${p.discountValue.toLocaleString('id-ID')}`}
                          </span>
                        </div>

                        {/* Progress Kuota */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-stone-500">
                            <span>Terpakai: {p.usedCount}</span>
                            <span>Sisa: {p.quotaRemaining}</span>
                          </div>
                          {p.quota > 0 && (
                            <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${percentUsed}%` }}
                                className="bg-[#14532d] h-full rounded-full"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pesanan Saya (Tabel / Card) */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 font-serif">Pesanan Saya</h3>
                  <p className="text-[11px] text-stone-500">
                    Data pelanggan disamarkan demi privasi (Asumsi F4).
                  </p>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {['ALL', 'DIPROSES', 'DIKIRIM', 'SELESAI', 'DIBATALKAN'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOrderStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors ${
                        orderStatusFilter === st
                          ? 'bg-[#14532d] text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {st === 'ALL' ? 'Semua' : st}
                    </button>
                  ))}
                </div>
              </div>

              {orders.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-500 space-y-2">
                  <p>Tidak ada pesanan ditemukan untuk filter status ini.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-stone-100 bg-stone-50/50 text-stone-500 font-bold uppercase text-[10px]">
                        <th className="py-3 px-4">Kode Pesanan</th>
                        <th className="py-3 px-4">Tanggal</th>
                        <th className="py-3 px-4">Pelanggan</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Metode</th>
                        <th className="py-3 px-4">Promo</th>
                        <th className="py-3 px-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-700">
                      {orders.map((o) => (
                        <tr key={o.id} className="hover:bg-stone-50/60 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-stone-900">
                            {o.code}
                          </td>
                          <td className="py-3 px-4 text-stone-500 whitespace-nowrap">
                            {new Date(o.createdAt).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-semibold text-stone-900">{o.customerName}</div>
                            <div className="text-[11px] text-stone-400 font-mono">{o.customerPhone}</div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {getStatusBadge(o.status)}
                          </td>
                          <td className="py-3 px-4 uppercase text-[11px] font-bold text-stone-600 whitespace-nowrap">
                            {o.paymentMethod === 'COD' ? 'COD' : o.paymentMethod.replace('_', ' ')}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {o.promoCode || o.secondPromoCode ? (
                              <div className="flex flex-wrap gap-1">
                                {o.promoCode && (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-mono font-bold text-[10px]">
                                    {o.promoCode.code}
                                  </span>
                                )}
                                {o.secondPromoCode && (
                                  <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 font-mono font-bold text-[10px]">
                                    +{o.secondPromoCode.code}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-stone-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-stone-900 whitespace-nowrap">
                            Rp {o.totalPrice.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* MODAL: PROFIL & KATA SANDI */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 border border-stone-200 shadow-xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-sm font-bold text-stone-900 font-serif flex items-center gap-2">
                <User className="w-4 h-4 text-[#14532d]" />
                Pengaturan Profil & Sandi
              </h3>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Ubah Profil & Nomor WhatsApp */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider text-[10px]">
                Informasi Akun & WhatsApp
              </h4>

              {profileMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium ${
                    profileMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {profileMsg.text}
                </div>
              )}

              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-stone-600 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-stone-600 mb-1">Nomor WhatsApp (Aktif)</label>
                  <input
                    type="text"
                    value={profilePhone}
                    placeholder="Contoh: 081234567890"
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 outline-none font-mono font-medium"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={profileSaving}
                  onClick={() => handleSaveProfile(false)}
                  className="flex-1 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {profileSaving ? 'Menyimpan...' : 'Simpan Profil'}
                </button>
                <button
                  type="button"
                  disabled={profileSaving || !profilePhone}
                  onClick={() => handleSaveProfile(true)}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  title="Kirim pesan uji coba ke WhatsApp Anda"
                >
                  <Send className="w-3.5 h-3.5" />
                  Kirim Uji WA
                </button>
              </div>
            </div>

            {/* Form Ubah Sandi */}
            <form onSubmit={handleChangePassword} className="border-t border-stone-100 pt-4 space-y-3">
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider text-[10px]">
                Ganti Kata Sandi
              </h4>

              {passwordMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium ${
                    passwordMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {passwordMsg.text}
                </div>
              )}

              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-stone-600 mb-1">Kata Sandi Saat Ini</label>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1">Kata Sandi Baru</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 outline-none font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={passwordSaving || !oldPassword || !newPassword}
                className="w-full py-2 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
              >
                {passwordSaving ? 'Mengubah...' : 'Perbarui Kata Sandi'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FT-5 PLACEHOLDER (UNDUH DATA / SPREADSHEET MIRROR) */}
      {ft5ModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-3xl p-6 border border-stone-200 shadow-xl space-y-4 text-center">
            <div className="w-12 h-12 bg-emerald-50 text-[#14532d] rounded-full flex items-center justify-center mx-auto">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-stone-900 font-serif">Cermin Spreadsheet Saya (FT-5)</h3>
            <p className="text-xs text-stone-500">
              Fitur sinkronisasi otomatis satu arah ke Google Sheets reseller (FT-5) sedang disiapkan di tahap berikutnya. Anda akan dapat menautkan Google Sheet pribadi Anda di sini.
            </p>
            <button
              type="button"
              onClick={() => setFt5ModalOpen(false)}
              className="w-full py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}

      {/* MODAL: FT-6 PLACEHOLDER (LAPORAN WHATSAPP SAYA) */}
      {ft6ModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-3xl p-6 border border-stone-200 shadow-xl space-y-4 text-center">
            <div className="w-12 h-12 bg-teal-50 text-teal-800 rounded-full flex items-center justify-center mx-auto">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-stone-900 font-serif">Langganan Laporan WhatsApp (FT-6)</h3>
            <p className="text-xs text-stone-500">
              Fitur langganan ringkasan harian dan mingguan otomatis langsung ke nomor WhatsApp reseller Anda (FT-6) sedang dipersiapkan di tahap berikutnya.
            </p>
            <button
              type="button"
              onClick={() => setFt6ModalOpen(false)}
              className="w-full py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
