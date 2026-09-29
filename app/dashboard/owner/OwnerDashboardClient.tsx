'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Crown, TrendingUp, DollarSign, Wallet, 
  PackageSearch, Download, Loader2, AlertTriangle, RefreshCcw
} from 'lucide-react';

export default function OwnerDashboardClient() {
  const [filter, setFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/owner/analytics?filter=${filter}&payment=${paymentFilter}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filter, paymentFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleExportCsv = () => {
    if (!data || !data.transactions) return;

    const headers = ['Invoice', 'Tanggal', 'Nama Pelanggan', 'Status', 'Metode Bayar', 'Subtotal Bersih', 'PPN', 'Ongkir', 'Total Akhir'];
    const rows = data.transactions.map((tx: any) => [
      tx.invoiceNumber,
      new Date(tx.createdAt).toLocaleString('id-ID'),
      `"${tx.customerName}"`,
      tx.status,
      tx.paymentMethod || 'Transfer Manual',
      tx.totalPrice - (tx.ppnAmount || 0) - (tx.shippingCost || 0),
      tx.ppnAmount || 0,
      tx.shippingCost || 0,
      tx.totalPrice
    ]);

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

  return (
    <div className="min-h-screen bg-[#F8F6F0] p-4 sm:p-6 lg:p-12">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="p-2 hover:bg-black/5 rounded-full transition-colors bg-white shadow-sm">
              <ArrowLeft className="w-5 h-5 text-muted-charcoal" />
            </Link>
            <div className="flex items-center gap-2">
              <Crown className="w-8 h-8 text-amber-500" />
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-deep-forest">Owner Dashboard</h1>
                <p className="text-xs text-muted-charcoal/60">Ringkasan Finansial & Inventaris Bisnis</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-deep-forest/10 text-deep-forest outline-none focus:ring-2 focus:ring-leaf-olive/50"
            >
              <option value="all">Sepanjang Waktu</option>
              <option value="this_month">Bulan Ini</option>
              <option value="this_year">Tahun Ini</option>
            </select>

            <select
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value)}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-deep-forest/10 text-deep-forest outline-none focus:ring-2 focus:ring-leaf-olive/50"
            >
              <option value="all">Semua Metode</option>
              <option value="manual">Manual Transfer</option>
              <option value="midtrans">Midtrans</option>
            </select>
            
            <button
              onClick={handleExportCsv}
              disabled={loading || !data?.transactions?.length}
              className="flex items-center gap-2 px-4 py-2 bg-leaf-olive hover:bg-leaf-olive/90 text-white rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/admin/login';
              }}
              className="flex items-center gap-2 px-4 py-2 bg-dusty-rose hover:bg-dusty-rose/90 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
            >
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* LOADING STATE */}
        {loading && !data ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-leaf-olive" />
            <p className="text-sm font-bold text-muted-charcoal mt-4">Memuat Analitik...</p>
          </div>
        ) : data ? (
          <>
            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-deep-forest/10 shadow-sm flex flex-col gap-2">
                <div className="flex items-center gap-2 text-muted-charcoal/70">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-xs font-bold">Total Transaksi Sukses</span>
                </div>
                <div className="text-2xl font-black text-deep-forest">
                  {data.summary.totalOrders} <span className="text-sm font-semibold text-muted-charcoal/50">pesanan</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-deep-forest/10 shadow-sm flex flex-col gap-2">
                <div className="flex items-center gap-2 text-blue-600/70">
                  <Wallet className="w-5 h-5" />
                  <span className="text-xs font-bold">Omzet Penjualan (Kotor)</span>
                </div>
                <div className="text-2xl font-black text-blue-700">
                  {formatCurrency(data.summary.actualRevenue)}
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-emerald-600/20 shadow-sm flex flex-col gap-2 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-5">
                  <Crown className="w-24 h-24 text-emerald-600" />
                </div>
                <div className="flex items-center gap-2 text-emerald-700/70 z-10">
                  <DollarSign className="w-5 h-5" />
                  <span className="text-xs font-bold">Net Profit (Estimasi)</span>
                </div>
                <div className="text-2xl font-black text-emerald-700 z-10">
                  {formatCurrency(data.summary.netProfit)}
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-deep-forest/10 shadow-sm flex flex-col gap-2">
                <div className="flex items-center gap-2 text-amber-600/70">
                  <RefreshCcw className="w-5 h-5" />
                  <span className="text-xs font-bold">PPN 11% (Titipan)</span>
                </div>
                <div className="text-2xl font-black text-amber-600">
                  {formatCurrency(data.summary.totalPpn)}
                </div>
              </div>
            </div>

            {/* TWO COLUMNS LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* RECENT TRANSACTIONS */}
              <div className="lg:col-span-2 bg-white rounded-3xl border border-deep-forest/10 shadow-sm overflow-hidden flex flex-col h-[500px]">
                <div className="p-5 border-b border-deep-forest/10 flex items-center justify-between bg-gray-50/50">
                  <h2 className="font-bold text-deep-forest flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-leaf-olive" />
                    Riwayat Transaksi
                  </h2>
                  <span className="text-xs font-bold text-muted-charcoal/60 bg-white px-3 py-1 rounded-full border shadow-xs">
                    {data.transactions.length} Data
                  </span>
                </div>
                <div className="flex-1 overflow-auto p-0">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-white sticky top-0 border-b border-gray-100 z-10 shadow-xs">
                      <tr className="text-xs text-muted-charcoal/60">
                        <th className="py-3 px-5">Invoice</th>
                        <th className="py-3 px-5">Metode</th>
                        <th className="py-3 px-5">Profit Bersih</th>
                        <th className="py-3 px-5">Total Bayar</th>
                        <th className="py-3 px-5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.transactions.map((tx: any) => {
                        // Calculate profit for this row specifically
                        let txCost = 0;
                        tx.items.forEach((item: any) => {
                          txCost += ((item.costEach + item.packingEach) * item.quantity);
                        });
                        const txNetRevenue = tx.totalPrice - (tx.ppnAmount || 0) - (tx.shippingCost || 0);
                        const txProfit = txNetRevenue - txCost;

                        return (
                          <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-3 px-5">
                              <div className="font-mono font-bold text-deep-forest text-xs">{tx.invoiceNumber}</div>
                              <div className="text-[10px] text-muted-charcoal/60">{new Date(tx.createdAt).toLocaleDateString('id-ID')}</div>
                            </td>
                            <td className="py-3 px-5">
                              <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${tx.paymentMethod === 'midtrans' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                {tx.paymentMethod === 'midtrans' ? 'Midtrans' : 'Manual'}
                              </span>
                            </td>
                            <td className="py-3 px-5 font-bold text-emerald-600">
                              {formatCurrency(txProfit)}
                            </td>
                            <td className="py-3 px-5 font-semibold text-muted-charcoal">
                              {formatCurrency(tx.totalPrice)}
                            </td>
                            <td className="py-3 px-5">
                              <span className="px-2 py-1 bg-leaf-olive/10 text-leaf-olive text-[10px] font-bold rounded-full uppercase">
                                {tx.status.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {data.transactions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-xs text-muted-charcoal/50">
                            Belum ada transaksi di periode ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* LOW STOCK ALERTS */}
              <div className="bg-white rounded-3xl border border-dusty-rose/20 shadow-sm overflow-hidden flex flex-col h-[500px]">
                <div className="p-5 border-b border-dusty-rose/20 bg-dusty-rose/5 flex items-center justify-between">
                  <h2 className="font-bold text-dusty-rose flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Low Stock Alert
                  </h2>
                  <span className="text-xs font-bold bg-white text-dusty-rose px-2.5 py-1 rounded-full shadow-xs border border-dusty-rose/20">
                    {data.lowStock.length} Varian
                  </span>
                </div>
                <div className="flex-1 overflow-auto p-5 space-y-3">
                  {data.lowStock.length > 0 ? (
                    data.lowStock.map((variant: any) => (
                      <div key={variant.id} className="p-3 border border-dusty-rose/20 rounded-2xl bg-white flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl shrink-0" style={{ backgroundColor: variant.hex }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs text-deep-forest truncate">{variant.product.name}</p>
                          <p className="text-[10px] text-muted-charcoal/70 truncate">Warna: {variant.name}</p>
                        </div>
                        <div className="shrink-0 text-center">
                          <p className="text-[10px] text-muted-charcoal/60 font-semibold mb-0.5">Sisa Stok</p>
                          <p className="text-sm font-black text-dusty-rose bg-dusty-rose/10 px-2 rounded-lg">
                            {variant.stock}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 space-y-3">
                      <PackageSearch className="w-8 h-8 text-leaf-olive/30 mx-auto" />
                      <p className="text-xs text-muted-charcoal/60 font-medium">Stok aman! Tidak ada produk di bawah 10 pcs.</p>
                    </div>
                  )}
                </div>
              </div>
              
            </div>
          </>
        ) : null}

      </div>
    </div>
  );
}
