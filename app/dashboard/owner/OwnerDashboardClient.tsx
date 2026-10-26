'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Crown, TrendingUp, DollarSign, Wallet, 
  PackageSearch, Download, Loader2, AlertTriangle, RefreshCcw,
  Sliders, ShieldCheck, History, Users, Building2, CheckCircle2,
  ExternalLink, LogOut, ArrowRight, Save, ToggleLeft, ToggleRight,
  Layers, Package, Calendar
} from 'lucide-react';

export default function OwnerDashboardClient() {
  const [activeTab, setActiveTab] = useState<'finances' | 'accounts' | 'settings' | 'audit' | 'users'>('finances');

  // Finances tab state
  const [filter, setFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [financeData, setFinanceData] = useState<any>(null);
  const [loadingFinances, setLoadingFinances] = useState(true);

  // Settings & Accounts tab state
  const [settingsData, setSettingsData] = useState<any>(null);
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    ppnRate: 11,
    lowStockThreshold: 10,
    maxDiscountPercent: 50,
    activeCouriers: ['jne', 'sicepat', 'jnt'],
  });

  // Audit tab state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Users tab state
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // 1. Fetch Finance Analytics
  const fetchFinances = useCallback(async () => {
    setLoadingFinances(true);
    try {
      const res = await fetch(`/api/owner/analytics?filter=${filter}&payment=${paymentFilter}`);
      const json = await res.json();
      if (json.success) {
        setFinanceData(json);
      }
    } catch (e) {
      console.error('Failed to fetch finances', e);
    } finally {
      setLoadingFinances(false);
    }
  }, [filter, paymentFilter]);

  // 2. Fetch Settings & Bank Accounts
  const fetchSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch('/api/owner/settings');
      const json = await res.json();
      if (res.ok) {
        setSettingsData(json.settings);
        setPaymentAccounts(json.paymentAccounts || []);
        if (json.settings) {
          setSettingsForm({
            ppnRate: json.settings.ppnRate ?? 11,
            lowStockThreshold: json.settings.lowStockThreshold ?? 10,
            maxDiscountPercent: json.settings.maxDiscountPercent ?? 50,
            activeCouriers: Array.isArray(json.settings.activeCouriers) ? json.settings.activeCouriers : ['jne', 'sicepat', 'jnt'],
          });
        }
      }
    } catch (e) {
      console.error('Failed to fetch settings', e);
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  // 3. Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const res = await fetch('/api/owner/audit?limit=30');
      const json = await res.json();
      if (res.ok && json.logs) {
        setAuditLogs(json.logs);
      }
    } catch (e) {
      console.error('Failed to fetch audit logs', e);
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  // 4. Fetch Admin Users
  const fetchAdminUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/owner/users');
      const json = await res.json();
      if (res.ok && json.users) {
        setAdminUsers(json.users);
      }
    } catch (e) {
      console.error('Failed to fetch admin users', e);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'finances') fetchFinances();
    if (activeTab === 'accounts' || activeTab === 'settings') fetchSettings();
    if (activeTab === 'audit') fetchAuditLogs();
    if (activeTab === 'users') fetchAdminUsers();
  }, [activeTab, fetchFinances, fetchSettings, fetchAuditLogs, fetchAdminUsers]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const handleExportCsv = () => {
    if (!financeData || !financeData.transactions) return;

    const headers = ['Kode Pesanan', 'Tanggal', 'Nama Pelanggan', 'Status', 'Metode Bayar', 'Kode Promo', 'Subtotal Kotor', 'Diskon', 'Subtotal Bersih', 'HPP Total', 'PPN', 'Ongkir', 'Total Akhir'];
    const rows = financeData.transactions.map((tx: any) => {
      let costTotal = 0;
      if (Array.isArray(tx.items)) {
        tx.items.forEach((item: any) => {
          costTotal += ((item.costEach + item.packingEach) * item.quantity);
        });
      }
      const grossSubtotal = tx.subtotal || ((tx.netPrice || 0) + (tx.discountAmount || 0));
      const netSubtotal = tx.netPrice !== undefined && tx.netPrice !== null ? tx.netPrice : (grossSubtotal - (tx.discountAmount || 0));
      const payMethodLabel = tx.paymentMethod === 'MIDTRANS_SNAP' || tx.paymentMethod === 'midtrans' ? 'Midtrans' : 'Transfer Manual';
      const promoCodeLabel = tx.promoCode?.code || '-';

      return [
        tx.code || tx.invoiceNumber || '-',
        new Date(tx.createdAt).toLocaleString('id-ID'),
        `"${tx.customerName}"`,
        tx.status,
        payMethodLabel,
        promoCodeLabel,
        grossSubtotal,
        tx.discountAmount || 0,
        netSubtotal,
        costTotal,
        tx.ppnAmount || 0,
        tx.shippingCost || 0,
        tx.totalPrice
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rekap_penjualan_luvira_${filter}_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/owner/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm),
      });
      const json = await res.json();
      if (res.ok) {
        alert('Pengaturan bisnis berhasil diperbarui dan dicatat dalam audit log.');
        fetchSettings();
      } else {
        alert(json.error || 'Gagal menyimpan pengaturan');
      }
    } catch (err: any) {
      alert(err.message || 'Koneksi gagal');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTogglePaymentAccount = async (account: any) => {
    try {
      const updatedAccounts = paymentAccounts.map((a) =>
        a.id === account.id ? { ...a, isActive: !a.isActive } : a
      );
      const res = await fetch('/api/owner/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentAccounts: updatedAccounts }),
      });
      if (res.ok) {
        fetchSettings();
      } else {
        alert('Gagal mengubah status rekening');
      }
    } catch (e: any) {
      alert(e.message || 'Gagal mengubah rekening');
    }
  };

  const handleToggleUserStatus = async (userItem: any) => {
    try {
      const res = await fetch('/api/owner/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userItem.id,
          isActive: !userItem.isActive,
        }),
      });
      if (res.ok) {
        fetchAdminUsers();
      } else {
        alert('Gagal memperbarui status pengguna');
      }
    } catch (e: any) {
      alert(e.message || 'Gagal mengubah status pengguna');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F6F0] text-stone-800 p-4 sm:p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* TOP HEADER */}
        <div className="bg-white p-5 rounded-3xl border border-deep-forest/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Crown className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-deep-forest font-serif">
                  Owner Executive Dashboard
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 font-extrabold text-[10px] uppercase border border-amber-500/20">
                  Hak Akses Tertinggi
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Pengawasan Penuh Finansial, HPP, Rekening Transfer, Pengaturan Sistem, dan Audit Log
              </p>
            </div>
          </div>

          {/* Quick Cross-Dashboard Navigation & Logout */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/dashboard/admin"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 hover:bg-deep-forest hover:text-white rounded-xl text-xs font-bold transition-all text-stone-700 border border-stone-200 shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
              <span>Portal Admin</span>
            </Link>

            <Link
              href="/dashboard/developer"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 hover:bg-stone-800 hover:text-emerald-400 rounded-xl text-xs font-bold transition-all text-stone-700 border border-stone-200 shadow-2xs"
            >
              <History className="w-3.5 h-3.5 text-stone-400" />
              <span>Developer Hub</span>
            </Link>

            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/dashboard/login';
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all border border-rose-200 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-stone-200">
          <button
            onClick={() => setActiveTab('finances')}
            id="tab-owner-finances"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'finances'
                ? 'bg-deep-forest text-warm-cream shadow-sm'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/80'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Finansial & HPP</span>
          </button>

          <button
            onClick={() => setActiveTab('accounts')}
            id="tab-owner-accounts"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'accounts'
                ? 'bg-deep-forest text-warm-cream shadow-sm'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/80'
            }`}
          >
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>Rekening Bank Transfer</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            id="tab-owner-settings"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-deep-forest text-warm-cream shadow-sm'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/80'
            }`}
          >
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Pengaturan Bisnis & Margin</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            id="tab-owner-audit"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-deep-forest text-warm-cream shadow-sm'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/80'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Audit Trail Sistem</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            id="tab-owner-users"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'users'
                ? 'bg-deep-forest text-warm-cream shadow-sm'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/80'
            }`}
          >
            <Users className="w-4 h-4 text-cyan-400" />
            <span>Semua Akun Admin</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: FINANSIAL & HPP                                                    */}
        {/* ========================================================================= */}
        {activeTab === 'finances' && (
          <div className="space-y-6">
            {/* Filters & Export Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200/80 shadow-2xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-stone-500">Filter Analitik:</span>
                <select
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-stone-50 border border-stone-200 text-stone-800 outline-none focus:ring-2 focus:ring-deep-forest/20"
                >
                  <option value="all">Sepanjang Waktu</option>
                  <option value="this_month">Bulan Ini</option>
                  <option value="this_year">Tahun Ini</option>
                </select>

                <select
                  value={paymentFilter}
                  onChange={e => setPaymentFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-stone-50 border border-stone-200 text-stone-800 outline-none focus:ring-2 focus:ring-deep-forest/20"
                >
                  <option value="all">Semua Metode Pembayaran</option>
                  <option value="manual">Transfer Manual (2 Rekening)</option>
                  <option value="midtrans">Midtrans Snap</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchFinances}
                  className="p-2 text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                  title="Muat Ulang"
                >
                  <RefreshCcw className={`w-4 h-4 ${loadingFinances ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={handleExportCsv}
                  disabled={loadingFinances || !financeData?.transactions?.length}
                  id="btn-export-csv"
                  className="flex items-center gap-2 px-4 py-2 bg-leaf-olive hover:bg-leaf-olive/90 text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor Laporan (CSV)</span>
                </button>
              </div>
            </div>

            {loadingFinances && !financeData ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-3xl border border-stone-200">
                <Loader2 className="w-8 h-8 animate-spin text-deep-forest" />
                <span className="text-xs font-bold text-stone-500">Menghitung analitik finansial & HPP...</span>
              </div>
            ) : financeData ? (
              <>
                {/* 4 SUMMARY KPI CARDS: Omzet, HPP (Visible for Owner), Laba Bersih, PPN 11% */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* CARD 1: OMZET */}
                  <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs flex flex-col gap-2">
                    <div className="flex items-center justify-between text-blue-700/80">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-blue-600" />
                        <span className="text-xs font-bold text-stone-600">Omzet Penjualan (Kotor)</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {financeData.summary.totalOrders} order
                      </span>
                    </div>
                    <div className="text-2xl font-black text-blue-900 font-serif">
                      {formatCurrency(financeData.summary.actualRevenue)}
                    </div>
                    <p className="text-[11px] text-stone-400">Total nilai pesanan terkonfirmasi & selesai</p>
                  </div>

                  {/* CARD 2: HPP (BIAYA MODAL PRODUK - EKSKLUSIF OWNER) */}
                  <div className="bg-white p-5 rounded-3xl border border-rose-200 shadow-xs flex flex-col gap-2 bg-gradient-to-br from-white to-rose-50/20">
                    <div className="flex items-center justify-between text-rose-700">
                      <div className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-rose-600" />
                        <span className="text-xs font-bold text-rose-900">Total HPP (Modal & Packing)</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                        Rahasia Owner
                      </span>
                    </div>
                    <div className="text-2xl font-black text-rose-900 font-serif">
                      {formatCurrency(financeData.summary.totalCost)}
                    </div>
                    <p className="text-[11px] text-stone-500">Terkunci & tersembunyi dari Admin Wilayah/Pusat</p>
                  </div>

                  {/* CARD 3: NET PROFIT */}
                  <div className="bg-white p-5 rounded-3xl border border-emerald-200 shadow-xs flex flex-col gap-2 relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/30">
                    <div className="flex items-center justify-between text-emerald-700">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-900">Laba Bersih (Net Profit)</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Omzet - HPP
                      </span>
                    </div>
                    <div className="text-2xl font-black text-emerald-900 font-serif">
                      {formatCurrency(financeData.summary.netProfit)}
                    </div>
                    <p className="text-[11px] text-stone-500">Margin laba setelah dikurangi modal & packing</p>
                  </div>

                  {/* CARD 4: PPN 11% */}
                  <div className="bg-white p-5 rounded-3xl border border-amber-200 shadow-xs flex flex-col gap-2 bg-gradient-to-br from-white to-amber-50/20">
                    <div className="flex items-center justify-between text-amber-700">
                      <div className="flex items-center gap-2">
                        <RefreshCcw className="w-5 h-5 text-amber-600" />
                        <span className="text-xs font-bold text-amber-900">PPN 11% (Titipan Pajak)</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        Kas Titipan
                      </span>
                    </div>
                    <div className="text-2xl font-black text-amber-800 font-serif">
                      {formatCurrency(financeData.summary.totalPpn)}
                    </div>
                    <p className="text-[11px] text-stone-500">Pajak pertambahan nilai siap disetor</p>
                  </div>
                </div>

                {/* TRANSACTIONS & LOW STOCK DUAL COLUMN */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* TRANSACTIONS TABLE */}
                  <div className="lg:col-span-2 bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden flex flex-col h-[520px]">
                    <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                      <h2 className="font-bold text-stone-900 flex items-center gap-2 text-sm font-serif">
                        <Wallet className="w-4 h-4 text-leaf-olive" />
                        Riwayat Transaksi Bisnis (HPP & Profit)
                      </h2>
                      <span className="text-[11px] font-bold text-stone-500 bg-white px-2.5 py-0.5 rounded-full border shadow-2xs">
                        {financeData.transactions.length} Pesanan
                      </span>
                    </div>
                    <div className="flex-1 overflow-auto p-0">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-white sticky top-0 border-b border-stone-100 z-10 text-stone-500 font-bold uppercase tracking-wider">
                          <tr>
                            <th className="py-3 px-4">Kode & Pelanggan</th>
                            <th className="py-3 px-4">Metode</th>
                            <th className="py-3 px-4">Promo</th>
                            <th className="py-3 px-4">HPP Modal</th>
                            <th className="py-3 px-4">Laba Bersih</th>
                            <th className="py-3 px-4">Total Akhir</th>
                            <th className="py-3 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                          {financeData.transactions.map((tx: any) => {
                            let txCost = 0;
                            if (Array.isArray(tx.items)) {
                              tx.items.forEach((item: any) => {
                                txCost += ((item.costEach + item.packingEach) * item.quantity);
                              });
                            }
                            const txNetRevenue = tx.netPrice !== undefined && tx.netPrice !== null
                              ? tx.netPrice
                              : (tx.totalPrice - (tx.ppnAmount || 0) - (tx.shippingCost || 0));
                            const txProfit = txNetRevenue - txCost;
                            const isMidtrans = tx.paymentMethod === 'MIDTRANS_SNAP' || tx.paymentMethod === 'midtrans';

                            return (
                              <tr key={tx.id} className="hover:bg-stone-50/60 transition-colors">
                                <td className="py-3 px-4">
                                  <div className="font-mono font-bold text-deep-forest text-xs">{tx.code || tx.invoiceNumber || '-'}</div>
                                  <div className="text-[10px] text-stone-400">
                                    {new Date(tx.createdAt).toLocaleDateString('id-ID')} • {tx.customerName}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                                    isMidtrans ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-stone-100 text-stone-700 border border-stone-200'
                                  }`}>
                                    {isMidtrans ? 'Midtrans' : 'Transfer'}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  {tx.promoCode?.code ? (
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      {tx.promoCode.code}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-stone-400">-</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 font-semibold text-rose-700">
                                  {formatCurrency(txCost)}
                                </td>
                                <td className="py-3 px-4 font-bold text-emerald-700">
                                  {formatCurrency(txProfit)}
                                </td>
                                <td className="py-3 px-4 font-bold text-stone-900">
                                  {formatCurrency(tx.totalPrice)}
                                </td>
                                <td className="py-3 px-4">
                                  <span className="px-2 py-0.5 bg-leaf-olive/10 text-leaf-olive text-[10px] font-bold rounded-full uppercase">
                                    {tx.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          {financeData.transactions.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-xs text-stone-400">
                                Belum ada transaksi di periode ini.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* LOW STOCK ALERTS */}
                  <div className="bg-white rounded-3xl border border-rose-200 shadow-xs overflow-hidden flex flex-col h-[520px]">
                    <div className="p-4 sm:p-5 border-b border-rose-100 bg-rose-50/50 flex items-center justify-between">
                      <h2 className="font-bold text-rose-900 flex items-center gap-2 text-sm font-serif">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        Peringatan Stok Menipis (&lt; 10 pcs)
                      </h2>
                      <span className="text-[11px] font-bold bg-white text-rose-700 px-2 py-0.5 rounded-full border border-rose-200 shadow-2xs">
                        {financeData.lowStock.length} Varian
                      </span>
                    </div>
                    <div className="flex-1 overflow-auto p-4 space-y-3">
                      {financeData.lowStock.length > 0 ? (
                        financeData.lowStock.map((variant: any, idx: number) => (
                          <div key={idx} className="p-3 border border-stone-200/80 rounded-2xl bg-white flex items-center justify-between gap-3 shadow-2xs">
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-stone-900 truncate">{variant.product?.name || 'Kaus Kaki'}</p>
                              <p className="text-[10px] text-stone-500 truncate">Varian: {variant.name} • Gudang: {variant.regionName}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-black text-rose-700 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">
                                Sisa {variant.stock} pcs
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-16 space-y-2">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                          <p className="text-xs font-bold text-stone-700">Semua Stok Aman!</p>
                          <p className="text-[11px] text-stone-400">Tidak ada produk dengan sisa di bawah 10 pcs.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: REKENING BANK TRANSFER                                             */}
        {/* ========================================================================= */}
        {activeTab === 'accounts' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 rounded-xl bg-blue-50 text-blue-700">
                  <Building2 className="w-5 h-5" />
                </span>
                <h2 className="text-xl font-black text-stone-900 font-serif">
                  Rekening Transfer Manual Luvira
                </h2>
              </div>
              <p className="text-xs text-stone-500 max-w-2xl">
                Sesuai Keputusan Bagian 2 Dokumen Rencana Luvira 2.0, nomor rekening disimpan di database dan dikelola langsung oleh Owner (bukan hardcoded di kode sumber). Pembeli hanya akan melihat rekening yang berstatus aktif saat checkout.
              </p>
            </div>

            {loadingSettings ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-3xl border border-stone-200">
                <Loader2 className="w-8 h-8 animate-spin text-deep-forest" />
                <span className="text-xs font-bold text-stone-500">Memuat rekening...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentAccounts.map((acc: any) => (
                  <div
                    key={acc.id}
                    className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs space-y-4 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-stone-100 flex items-center justify-center font-bold text-sm text-deep-forest">
                          {acc.bankName.slice(0, 3).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-black text-sm text-stone-900">{acc.bankName}</h3>
                          <p className="text-[11px] text-stone-400">a.n. {acc.accountHolder}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleTogglePaymentAccount(acc)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${
                          acc.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-stone-100 text-stone-500 border border-stone-200'
                        }`}
                      >
                        {acc.isActive ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Aktif</span>
                          </>
                        ) : (
                          <span>Nonaktif</span>
                        )}
                      </button>
                    </div>

                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 font-mono font-bold text-base text-deep-forest text-center tracking-wider">
                      {acc.accountNumber}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1 border-t border-stone-100">
                      <span>Dibuat: {new Date(acc.createdAt).toLocaleDateString('id-ID')}</span>
                      <span>{acc.isActive ? 'Tampil di Halaman Checkout' : 'Disembunyikan dari Pembeli'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PENGATURAN BISNIS & PROTEKSI MARGIN                                */}
        {/* ========================================================================= */}
        {activeTab === 'settings' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200/80 shadow-xs max-w-2xl space-y-6">
            <div className="border-b border-stone-100 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 rounded-xl bg-amber-50 text-amber-700">
                  <Sliders className="w-5 h-5" />
                </span>
                <h2 className="text-xl font-black text-stone-900 font-serif">
                  Pengaturan Kebijakan Bisnis & Proteksi Margin
                </h2>
              </div>
              <p className="text-xs text-stone-500">
                Pengaturan ini ditegakkan di sisi server (Server Always Wins) untuk seluruh transaksi Luvira 2.0.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-5">
              {/* PPN Rate */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Tarif PPN Penjualan (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={settingsForm.ppnRate}
                    onChange={(e) => setSettingsForm({ ...settingsForm, ppnRate: parseInt(e.target.value) || 0 })}
                    className="w-32 px-4 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-deep-forest/20 outline-none"
                  />
                  <span className="text-xs text-stone-500">Standar perpajakan nasional (default 11%)</span>
                </div>
              </div>

              {/* Max Promo Discount */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Batas Maksimum Diskon Promo Wilayah (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settingsForm.maxDiscountPercent}
                    onChange={(e) => setSettingsForm({ ...settingsForm, maxDiscountPercent: parseInt(e.target.value) || 0 })}
                    className="w-32 px-4 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-deep-forest/20 outline-none"
                  />
                  <span className="text-xs text-stone-500">Mencegah Admin Wilayah membuat promo yang merugikan margin (default 50%)</span>
                </div>
              </div>

              {/* Low Stock Threshold */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Ambang Batas Peringatan Stok Menipis (Pcs)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settingsForm.lowStockThreshold}
                    onChange={(e) => setSettingsForm({ ...settingsForm, lowStockThreshold: parseInt(e.target.value) || 0 })}
                    className="w-32 px-4 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-deep-forest/20 outline-none"
                  />
                  <span className="text-xs text-stone-500">Memicu notifikasi ke Admin & Owner saat stok gudang di bawah angka ini</span>
                </div>
              </div>

              {/* Active Couriers */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-2">
                  Kurir Ekspedisi yang Diaktifkan (RajaOngkir Komerce)
                </label>
                <div className="flex items-center gap-4 flex-wrap">
                  {['jne', 'sicepat', 'jnt', 'pos', 'tiki'].map((courier) => {
                    const isChecked = settingsForm.activeCouriers.includes(courier);
                    return (
                      <label key={courier} className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer uppercase">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSettingsForm({ ...settingsForm, activeCouriers: [...settingsForm.activeCouriers, courier] });
                            } else {
                              setSettingsForm({ ...settingsForm, activeCouriers: settingsForm.activeCouriers.filter(c => c !== courier) });
                            }
                          }}
                          className="w-4 h-4 rounded text-deep-forest focus:ring-deep-forest cursor-pointer"
                        />
                        <span>{courier}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="flex items-center gap-2 px-6 py-2.5 bg-deep-forest text-warm-cream font-bold text-xs rounded-xl hover:bg-deep-forest/90 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingSettings ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-dusty-rose" />}
                  <span>Simpan Perubahan Pengaturan</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: AUDIT TRAIL SISTEM                                                 */}
        {/* ========================================================================= */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="p-1.5 rounded-xl bg-purple-50 text-purple-700">
                    <ShieldCheck className="w-5 h-5" />
                  </span>
                  <h2 className="text-xl font-black text-stone-900 font-serif">
                    Immutable Audit Trail Log
                  </h2>
                </div>
                <p className="text-xs text-stone-500">
                  Prinsip 3: Setiap mutasi stok, perubahan harga, verifikasi pembayaran, dan promo tersimpan permanen (append-only) demi transparansi bisnis.
                </p>
              </div>

              <button
                onClick={fetchAuditLogs}
                className="p-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
                title="Muat Ulang"
              >
                <RefreshCcw className={`w-4 h-4 ${loadingAudit ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingAudit ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-3xl border border-stone-200">
                <Loader2 className="w-8 h-8 animate-spin text-deep-forest" />
                <span className="text-xs font-bold text-stone-500">Memuat audit trail...</span>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 text-xs text-stone-400">
                Belum ada aktivitas audit log yang tercatat.
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-5">Waktu</th>
                        <th className="py-3 px-5">Pelaku</th>
                        <th className="py-3 px-5">Peran</th>
                        <th className="py-3 px-5">Aksi</th>
                        <th className="py-3 px-5">Entitas</th>
                        <th className="py-3 px-5">Detail Perubahan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                      {auditLogs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-stone-50/60 transition-colors">
                          <td className="py-3 px-5 text-stone-500 font-mono text-[11px]">
                            {new Date(log.createdAt).toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-5 font-bold text-stone-900">
                            {log.actorName || log.actorId || 'Sistem'}
                          </td>
                          <td className="py-3 px-5">
                            <span className="px-2 py-0.5 rounded-full bg-stone-100 text-[10px] font-bold text-stone-700">
                              {log.actorRole || 'SYSTEM'}
                            </span>
                          </td>
                          <td className="py-3 px-5 font-bold text-deep-forest font-mono text-[11px]">
                            {log.action}
                          </td>
                          <td className="py-3 px-5">
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                              {log.entity}
                            </span>
                          </td>
                          <td className="py-3 px-5 max-w-xs truncate text-[11px] text-stone-500 font-mono">
                            {JSON.stringify(log.after || log.before || {})}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: SEMUA AKUN ADMIN                                                   */}
        {/* ========================================================================= */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="p-1.5 rounded-xl bg-cyan-50 text-cyan-700">
                    <Users className="w-5 h-5" />
                  </span>
                  <h2 className="text-xl font-black text-stone-900 font-serif">
                    Otoritas Akun Admin (Pusat & Wilayah)
                  </h2>
                </div>
                <p className="text-xs text-stone-500">
                  Sebagai Owner, Anda memiliki kendali penuh mengaktifkan atau menonaktifkan seluruh admin di ekosistem Luvira.
                </p>
              </div>

              <button
                onClick={fetchAdminUsers}
                className="p-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
                title="Muat Ulang"
              >
                <RefreshCcw className={`w-4 h-4 ${loadingUsers ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingUsers ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-3xl border border-stone-200">
                <Loader2 className="w-8 h-8 animate-spin text-deep-forest" />
                <span className="text-xs font-bold text-stone-500">Memuat akun admin...</span>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-5">Nama & Email</th>
                        <th className="py-3 px-5">Peran</th>
                        <th className="py-3 px-5">Wilayah Tugas</th>
                        <th className="py-3 px-5">Status</th>
                        <th className="py-3 px-5">Terakhir Login</th>
                        <th className="py-3 px-5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                      {adminUsers.map((u: any) => (
                        <tr key={u.id} className="hover:bg-stone-50/60 transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="font-bold text-stone-900">{u.name}</div>
                            <div className="text-[11px] text-stone-400 font-mono">{u.email}</div>
                          </td>
                          <td className="py-3.5 px-5">
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                              u.role === 'ADMIN_PUSAT' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
                            }`}>
                              {u.role === 'ADMIN_PUSAT' ? 'Admin Pusat (Depok)' : 'Admin Wilayah'}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 font-semibold text-stone-700">
                            {u.region?.name || 'Seluruh Indonesia'}
                          </td>
                          <td className="py-3.5 px-5">
                            {u.isActive ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                Dinonaktifkan
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-stone-400 text-[11px]">
                            {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('id-ID') : 'Belum pernah'}
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                u.isActive
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              }`}
                            >
                              {u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
