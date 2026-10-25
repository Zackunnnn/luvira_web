'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  AlertTriangle, 
  Plus, 
  ArrowUpDown, 
  History, 
  Loader2, 
  CheckCircle2, 
  ShieldAlert, 
  RefreshCw,
  X
} from 'lucide-react';

interface StockTabProps {
  user: any;
}

export const StockTab: React.FC<StockTabProps> = ({ user }) => {
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [summary, setSummary] = useState({ totalItems: 0, lowStockCount: 0 });

  // Stock edit modal
  const [modalStock, setModalStock] = useState<any | null>(null);
  const [newQty, setNewQty] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stock');
      if (res.ok) {
        const data = await res.json();
        setStocks(data.stocks || []);
        setLowStockThreshold(data.lowStockThreshold || 10);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch stock', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  const handleOpenModal = (s: any) => {
    setModalStock(s);
    setNewQty(s.qty.toString());
    setReason('');
    setFormError('');
  };

  const handleSaveStock = async () => {
    if (!modalStock) return;
    const parsedQty = parseInt(newQty, 10);
    if (isNaN(parsedQty) || parsedQty < 0) {
      setFormError('Jumlah stok harus berupa angka positif.');
      return;
    }
    if (!reason.trim()) {
      setFormError('Alasan penyesuaian / mutasi stok wajib diisi.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const res = await fetch('/api/admin/stock', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: modalStock.variantId,
          regionId: modalStock.regionId,
          qty: parsedQty,
          reason: reason.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal mengubah stok.');
      }

      setModalStock(null);
      fetchStock();
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan saat menyimpan stok.');
    } finally {
      setSubmitting(false);
    }
  };

  const isWilayah = user?.role === 'ADMIN_WILAYAH';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-deep-forest/10 text-deep-forest">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-stone-900">{summary.totalItems}</div>
            <div className="text-xs text-stone-500 font-medium">Total Item Varian Terdaftar</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center gap-4">
          <div className={`p-3 rounded-xl ${summary.lowStockCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className={`text-2xl font-black ${summary.lowStockCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {summary.lowStockCount}
            </div>
            <div className="text-xs text-stone-500 font-medium">
              Varian Menipis (&le; {lowStockThreshold} pasang)
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">Cakupan Kelola</div>
            <div className="text-sm font-extrabold text-stone-900 mt-1">
              {isWilayah ? `Gudang ${user?.region?.name || 'Yogyakarta (DIY)'}` : 'Gudang Pusat & Cabang'}
            </div>
          </div>
          <button
            onClick={fetchStock}
            className="p-2 rounded-xl text-stone-600 hover:bg-stone-100 border border-stone-200 cursor-pointer"
            title="Refresh Stok"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-deep-forest" />
              <span>Inventaris Fisik & Ketersediaan Stok</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Stok fisik riil, stok yang terkunci pesanan aktif (*reserved*), dan stok bebas dijual (*available*).
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-stone-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-deep-forest" />
            <span className="text-xs font-semibold">Memuat data inventaris...</span>
          </div>
        ) : stocks.length === 0 ? (
          <div className="p-12 text-center text-stone-500 space-y-2">
            <Package className="w-10 h-10 text-stone-300 mx-auto" />
            <h4 className="text-sm font-bold text-stone-700">Tidak Ada Data Stok</h4>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-bold">
                <tr>
                  <th className="p-3.5">Produk & Varian</th>
                  <th className="p-3.5">SKU / Kode</th>
                  <th className="p-3.5">Lokasi Gudang</th>
                  <th className="p-3.5 text-center">Stok Fisik</th>
                  <th className="p-3.5 text-center">Ter-Reserve</th>
                  <th className="p-3.5 text-center">Tersedia</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {stocks.map((s) => (
                  <tr key={s.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="p-3.5">
                      <div className="font-extrabold text-stone-900">{s.productName}</div>
                      <div className="text-[11px] text-stone-500">{s.variantName}</div>
                    </td>

                    <td className="p-3.5 font-mono text-[11px] text-stone-600 font-semibold">
                      {s.sku || '-'}
                    </td>

                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                        {s.regionName}
                      </span>
                    </td>

                    <td className="p-3.5 text-center font-bold text-stone-900">
                      {s.qty} pasang
                    </td>

                    <td className="p-3.5 text-center font-bold text-amber-700">
                      {s.reserved} pasang
                    </td>

                    <td className="p-3.5 text-center font-extrabold text-emerald-800 text-sm">
                      {s.available} pasang
                    </td>

                    <td className="p-3.5 text-center">
                      {s.isLowStock ? (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Stok Menipis
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Aman
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleOpenModal(s)}
                        className="px-2.5 py-1.5 text-xs font-bold text-deep-forest bg-warm-cream hover:bg-stone-200 rounded-xl border border-stone-200 transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                        id={`btn-edit-stock-${s.variantId}`}
                      >
                        <ArrowUpDown className="w-3 h-3" />
                        <span>Sesuaikan Stok</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL: SESUAIKAN STOK DENGAN ALASAN MUTASI (SKENARIO 2)   */}
      {/* ========================================================= */}
      {modalStock && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-100 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-deep-forest" />
                <h3 className="font-extrabold text-stone-900 text-sm">
                  Penyesuaian Stok Gudang
                </h3>
              </div>
              <button
                onClick={() => setModalStock(null)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-3.5">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-1">
                <div>Produk: <strong className="text-stone-900">{modalStock.productName}</strong></div>
                <div>Varian: <strong className="text-stone-900">{modalStock.variantName}</strong></div>
                <div>Gudang Wilayah: <strong className="text-deep-forest">{modalStock.regionName}</strong></div>
                <div>Stok Fisik Saat Ini: <strong className="font-mono">{modalStock.qty} pasang</strong></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Jumlah Stok Fisik Baru (Pasang) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  className="w-full p-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl font-bold font-mono focus:outline-none focus:ring-2 focus:ring-deep-forest/20"
                  id="stock-qty-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Alasan Penambahan / Mutasi Stok <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Kiriman 50 pasang dari produsen tiba, atau koreksi opname stok fisik..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-deep-forest/20"
                  id="stock-reason-input"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  Sesuai prinsip kepatuhan audit Luvira 2.0, setiap perubahan stok dicatat di *StockMovement* lengkap dengan identitas admin dan alasan.
                </p>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setModalStock(null)}
                className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-xs font-bold rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleSaveStock}
                disabled={submitting}
                className="flex-1 py-2.5 bg-deep-forest hover:bg-deep-forest/90 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                id="btn-save-stock"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
