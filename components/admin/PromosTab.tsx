'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Ticket, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldAlert, 
  RefreshCw,
  X,
  MapPin,
  Users
} from 'lucide-react';

interface PromosTabProps {
  user: any;
}

export const PromosTab: React.FC<PromosTabProps> = ({ user }) => {
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxDiscountPercent, setMaxDiscountPercent] = useState(50);

  // New promo modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [code, setCode] = useState('');
  const [type, setType] = useState<'RESELLER' | 'WILAYAH'>('WILAYAH');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrder, setMinOrder] = useState('0');
  const [quota, setQuota] = useState('100');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const isWilayah = user?.role === 'ADMIN_WILAYAH';

  const fetchPromos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/promos');
      if (res.ok) {
        const data = await res.json();
        setPromos(data.promos || []);
        setMaxDiscountPercent(data.maxDiscountPercent || 50);
      }
    } catch (err) {
      console.error('Failed to fetch promos', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  const handleOpenCreate = () => {
    setShowCreateModal(true);
    setCode('');
    setType(isWilayah ? 'WILAYAH' : 'RESELLER');
    setDiscountType('PERCENTAGE');
    setDiscountValue('15');
    setMinOrder('35000');
    setQuota('100');
    setFormError('');
  };

  const handleCreatePromo = async () => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setFormError('Kode promo wajib diisi.');
      return;
    }

    const val = parseInt(discountValue, 10);
    if (isNaN(val) || val <= 0) {
      setFormError('Nilai diskon harus berupa angka lebih dari 0.');
      return;
    }

    // Business Protection: Max Discount Limit (A4 & Skenario 2)
    if (discountType === 'PERCENTAGE' && val > maxDiscountPercent) {
      setFormError(`Diskon tidak boleh melebihi batas maksimal ${maxDiscountPercent}% untuk menjaga margin usaha Luvira.`);
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const res = await fetch('/api/admin/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: cleanCode,
          type,
          regionId: type === 'WILAYAH' ? user?.regionId : null,
          discountType,
          discountValue: val,
          minOrderAmount: parseInt(minOrder, 10) || 0,
          quota: parseInt(quota, 10) || 100,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal membuat kode promo.');
      }

      setShowCreateModal(false);
      setSuccessMsg(`Kode promo "${cleanCode}" berhasil dibuat!`);
      setTimeout(() => setSuccessMsg(''), 5000);
      fetchPromos();
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan saat membuat promo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Banner Batasan Diskon */}
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs sm:text-sm">
              Proteksi Batas Diskon Maksimal ({maxDiscountPercent}%)
            </h4>
            <p className="text-[11px] text-amber-800 mt-0.5">
              {isWilayah
                ? `Sebagai Admin Cabang ${user?.region?.name || 'Yogyakarta'}, Anda dapat membuat promo khusus wilayah DIY dengan batas diskon aman maksimal ${maxDiscountPercent}%.`
                : `Admin Pusat dapat membuat promo Reseller Nasional dan promo cabang dengan batas maksimal ${maxDiscountPercent}%.`}
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-deep-forest hover:bg-deep-forest/90 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
          id="btn-open-create-promo"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Kode Promo</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Promos Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-leaf-olive" />
              <span>Daftar Kode Promo Aktif</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Kode promo kemitraan reseller nasional dan promo kustom khusus wilayah.
            </p>
          </div>

          <button
            onClick={fetchPromos}
            className="p-2 rounded-xl text-stone-600 hover:bg-stone-100 border border-stone-200 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-stone-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-deep-forest" />
            <span className="text-xs font-semibold">Memuat daftar promo...</span>
          </div>
        ) : promos.length === 0 ? (
          <div className="p-12 text-center text-stone-500 space-y-2">
            <Ticket className="w-10 h-10 text-stone-300 mx-auto" />
            <h4 className="text-sm font-bold text-stone-700">Belum Ada Kode Promo</h4>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-bold">
                <tr>
                  <th className="p-3.5">Kode Kupon</th>
                  <th className="p-3.5">Tipe & Cakupan</th>
                  <th className="p-3.5">Besaran Diskon</th>
                  <th className="p-3.5">Min. Belanja</th>
                  <th className="p-3.5 text-center">Kuota & Terpakai</th>
                  <th className="p-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {promos.map((pr) => (
                  <tr key={pr.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="p-3.5 font-mono font-black text-stone-900 text-sm">
                      {pr.code}
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        {pr.type === 'RESELLER' ? (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                            <Users className="w-3 h-3" /> Reseller Nasional
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Khusus {pr.region?.name || 'Wilayah'}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 font-bold text-deep-forest text-sm">
                      {pr.discountType === 'PERCENTAGE'
                        ? `${pr.discountValue}%`
                        : `Rp ${pr.discountValue.toLocaleString('id-ID')}`}
                    </td>

                    <td className="p-3.5 text-stone-600">
                      Rp {pr.minOrderAmount?.toLocaleString('id-ID') || 0}
                    </td>

                    <td className="p-3.5 text-center">
                      <span className="font-bold text-stone-900">{pr.usedCount}</span> / <span className="text-stone-500">{pr.quota}</span>
                    </td>

                    <td className="p-3.5 text-right">
                      {pr.isActive ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Aktif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-100 text-stone-500">
                          Nonaktif
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL: BUAT KODE PROMO BARU (SKENARIO 2)                  */}
      {/* ========================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-100 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-leaf-olive" />
                <h3 className="font-extrabold text-stone-900 text-sm">
                  Buat Kode Promo Baru
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2" id="promo-error-banner">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Kode Promo (Huruf Kapital) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: JOGJABERKAH atau RESELLER2026"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    if (formError) setFormError('');
                  }}
                  className="w-full p-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-deep-forest/20 uppercase"
                  id="input-promo-code"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Cakupan Promo:
                </label>
                {isWilayah ? (
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-bold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Promo Khusus Cabang {user?.region?.name || 'Yogyakarta (DIY)'}</span>
                  </div>
                ) : (
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full p-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl font-bold"
                  >
                    <option value="RESELLER">Reseller Nasional (Berlaku Seluruh Indonesia)</option>
                    <option value="WILAYAH">Khusus Wilayah</option>
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Jenis Diskon:
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full p-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl font-bold"
                  >
                    <option value="PERCENTAGE">Persentase (%)</option>
                    <option value="FIXED">Nominal Tetap (Rp)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Nilai ({discountType === 'PERCENTAGE' ? '%' : 'Rp'}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => {
                      setDiscountValue(e.target.value);
                      if (formError) setFormError('');
                    }}
                    className="w-full p-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl font-bold font-mono"
                    id="input-promo-value"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Min. Belanja (Rp):
                  </label>
                  <input
                    type="number"
                    value={minOrder}
                    onChange={(e) => setMinOrder(e.target.value)}
                    className="w-full p-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Kuota Penggunaan:
                  </label>
                  <input
                    type="number"
                    value={quota}
                    onChange={(e) => setQuota(e.target.value)}
                    className="w-full p-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-xs font-bold rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleCreatePromo}
                disabled={submitting}
                className="flex-1 py-2.5 bg-deep-forest hover:bg-deep-forest/90 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                id="btn-submit-promo"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Simpan Kode Promo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
