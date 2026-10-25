'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  Tag, 
  Edit3, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  RefreshCw,
  X,
  ShieldAlert
} from 'lucide-react';

interface ProductsTabProps {
  user: any;
}

export const ProductsTab: React.FC<ProductsTabProps> = ({ user }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit price modal
  const [editModalProduct, setEditModalProduct] = useState<any | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [newOriginalPrice, setNewOriginalPrice] = useState('');
  const [priceSubmitting, setPriceSubmitting] = useState(false);
  const [priceError, setPriceError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  const isPusatOrOwner = user?.role === 'ADMIN_PUSAT' || user?.role === 'OWNER';

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const json = await res.json();
        setProducts(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleOpenEdit = (p: any) => {
    if (!isPusatOrOwner) return;
    setEditModalProduct(p);
    setNewPrice(p.price.toString());
    setNewOriginalPrice(p.originalPrice ? p.originalPrice.toString() : '');
    setPriceError('');
  };

  const handleSavePrice = async () => {
    if (!editModalProduct) return;
    const priceNum = parseInt(newPrice, 10);
    if (isNaN(priceNum) || priceNum <= 0) {
      setPriceError('Harga jual harus berupa nominal positif.');
      return;
    }

    setPriceSubmitting(true);
    setPriceError('');

    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: editModalProduct.id,
          price: priceNum,
          originalPrice: newOriginalPrice ? parseInt(newOriginalPrice, 10) : null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal mengubah harga.');
      }

      setEditModalProduct(null);
      setSuccessBanner(`Harga jual untuk "${editModalProduct.name}" berhasil diubah menjadi Rp ${priceNum.toLocaleString('id-ID')} dan berlaku seragam di seluruh Indonesia.`);
      setTimeout(() => setSuccessBanner(''), 6000);
      fetchProducts();
    } catch (err: any) {
      setPriceError(err.message || 'Terjadi kesalahan saat menyimpan harga.');
    } finally {
      setPriceSubmitting(false);
    }
  };

  const formatRupiah = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Banner Notifikasi Keseragaman Harga & Proteksi HPP */}
      <div className="p-4 rounded-2xl bg-stone-100 border border-stone-200 text-stone-800 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-deep-forest text-warm-cream">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs sm:text-sm text-stone-900">
              Penetapan Harga Jual Seragam Nasional
            </h4>
            <p className="text-[11px] text-stone-600 mt-0.5">
              {isPusatOrOwner
                ? 'Sebagai Admin Pusat / Owner, perubahan harga yang Anda lakukan di sini langsung berlaku seragam di seluruh wilayah (Pusat & Cabang).'
                : 'Harga jual ditetapkan seragam oleh Admin Pusat. Admin Wilayah memiliki akses baca (read-only) untuk katalog.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-white border border-stone-200 rounded-lg text-[11px] font-bold text-stone-700 flex items-center gap-1.5 shadow-2xs">
            <Lock className="w-3.5 h-3.5 text-dusty-rose" />
            <span>Kolom HPP Dirahasiakan (Owner Only)</span>
          </span>
        </div>
      </div>

      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in" id="price-success-banner">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Product List Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-deep-forest" />
              <span>Daftar Model Kaus Kaki Luvira</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Semua produk aktif yang tampil di storefront dan katalog publik.
            </p>
          </div>

          <button
            onClick={fetchProducts}
            className="p-2 rounded-xl text-stone-600 hover:bg-stone-100 border border-stone-200 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-stone-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-deep-forest" />
            <span className="text-xs font-semibold">Memuat katalog produk...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-stone-500 space-y-2">
            <Package className="w-10 h-10 text-stone-300 mx-auto" />
            <h4 className="text-sm font-bold text-stone-700">Katalog Kosong</h4>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-bold">
                <tr>
                  <th className="p-3.5">Nama Model</th>
                  <th className="p-3.5">Kategori / Model</th>
                  <th className="p-3.5">Varian Warna</th>
                  <th className="p-3.5">Harga Coret (Rp)</th>
                  <th className="p-3.5">Harga Jual Seragam</th>
                  <th className="p-3.5 text-center text-stone-400">Harga Modal (HPP)</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="p-3.5 align-top">
                      <div className="font-extrabold text-stone-900 text-sm">{p.name}</div>
                      <div className="text-[11px] text-stone-500 mt-0.5 line-clamp-1 max-w-xs">{p.description}</div>
                    </td>

                    <td className="p-3.5 align-top">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                        {p.model}
                      </span>
                    </td>

                    <td className="p-3.5 align-top">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {p.variants?.map((v: any) => (
                          <span
                            key={v.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-50 border border-stone-200"
                          >
                            <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: v.hex || '#E8D5C4' }} />
                            <span>{v.name}</span>
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="p-3.5 align-top text-stone-400 line-through">
                      {p.originalPrice ? formatRupiah(p.originalPrice) : '-'}
                    </td>

                    <td className="p-3.5 align-top">
                      <span className="font-mono text-sm font-black text-deep-forest" id={`price-display-${p.id}`}>
                        {formatRupiah(p.price)}
                      </span>
                    </td>

                    {/* HPP Column - Masked / Hidden for Admins */}
                    <td className="p-3.5 align-top text-center">
                      <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-stone-100 text-stone-400 border border-stone-200 inline-flex items-center gap-1 cursor-not-allowed" title="HPP Hanya dapat diakses oleh Akun Owner">
                        <Lock className="w-3 h-3 text-stone-400" />
                        <span>Terkunci</span>
                      </span>
                    </td>

                    <td className="p-3.5 align-top text-right">
                      {isPusatOrOwner ? (
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="px-2.5 py-1.5 text-xs font-bold text-white bg-deep-forest hover:bg-deep-forest/90 rounded-xl shadow-xs transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                          id={`btn-edit-price-${p.id}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Ubah Harga</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-medium text-stone-400 italic">
                          Terkunci Pusat
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
      {/* MODAL: UBAH HARGA JUAL SERAGAM (SKENARIO 3)               */}
      {/* ========================================================= */}
      {editModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-100 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-deep-forest" />
                <h3 className="font-extrabold text-stone-900 text-sm">
                  Ubah Harga Jual Seragam
                </h3>
              </div>
              <button
                onClick={() => setEditModalProduct(null)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {priceError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{priceError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs text-stone-700">
                Model: <strong className="text-stone-900">{editModalProduct.name}</strong>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Harga Jual Seragam Baru (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full p-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl font-bold font-mono focus:outline-none focus:ring-2 focus:ring-deep-forest/20 text-deep-forest"
                  id="input-uniform-price"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Harga Coret / Asli (Opsional) (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="Kosongkan jika tidak ada diskon coret"
                  value={newOriginalPrice}
                  onChange={(e) => setNewOriginalPrice(e.target.value)}
                  className="w-full p-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-stone-400"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                💡 <strong>Catatan Bisnis:</strong> Sesuai instruksi pemilik usaha, harga jual ini langsung berlaku <strong>seragam</strong> baik untuk pesanan yang dilayani oleh gudang Pusat Depok maupun gudang Yogyakarta.
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setEditModalProduct(null)}
                className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-xs font-bold rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleSavePrice}
                disabled={priceSubmitting}
                className="flex-1 py-2.5 bg-deep-forest hover:bg-deep-forest/90 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                id="btn-save-uniform-price"
              >
                {priceSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Simpan Harga Seragam</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
