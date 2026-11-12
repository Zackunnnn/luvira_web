'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Package, 
  Tag, 
  Edit3, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  X,
  Plus,
  Trash2,
  Upload,
  Search,
  Sliders,
  Power,
  ImageIcon,
  Check,
  ChevronDown
} from 'lucide-react';

interface ProductsTabProps {
  user: any;
}

interface VariantItem {
  id?: string;
  name: string;
  hex: string;
  sku?: string;
  weightGram: number;
  imageUrl?: string;
  stock?: number;
  isActive?: boolean;
}

interface ProductItem {
  id: string;
  name: string;
  slug: string;
  model: string;
  description?: string;
  price: number;
  originalPrice?: number | null;
  rating?: number;
  badge?: string | null;
  features?: string[];
  isActive?: boolean;
  variants: any[];
}

const COMMON_MODELS = [
  { value: 'emboss-split-toe', label: 'Emboss Split Toe (Jempol Motif)' },
  { value: 'plain-split-toe', label: 'Plain Split Toe (Jempol Polos)' },
  { value: 'ankle', label: 'Ankle Socks (Semata Kaki)' },
  { value: 'crew', label: 'Crew Socks (Setengah Betis)' },
  { value: 'knee-high', label: 'Knee High (Selutut Syar\'i)' },
  { value: 'wudhu', label: 'Wudhu Friendly Socks' },
];

const BADGE_OPTIONS = [
  { value: '', label: 'Tanpa Badge' },
  { value: 'Must Have', label: 'Must Have' },
  { value: 'Best Seller', label: 'Best Seller' },
  { value: 'New Arrival', label: 'New Arrival' },
  { value: 'Exclusive', label: 'Exclusive' },
];

export const ProductsTab: React.FC<ProductsTabProps> = ({ user }) => {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Quick Price Modal
  const [editPriceModalProduct, setEditPriceModalProduct] = useState<ProductItem | null>(null);
  const [quickNewPrice, setQuickNewPrice] = useState('');
  const [quickNewOriginalPrice, setQuickNewOriginalPrice] = useState('');
  const [quickPriceSubmitting, setQuickPriceSubmitting] = useState(false);
  const [quickPriceError, setQuickPriceError] = useState('');

  // Create Product Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({
    name: '',
    model: 'emboss-split-toe',
    price: '',
    originalPrice: '',
    badge: '',
    description: '',
    features: ['Bahan Nylon Premium lembut dan elastis', 'Jahitan rapi dan tidak mudah melar'],
    variants: [
      { name: 'Hitam', hex: '#000000', weightGram: 35, stock: 50, imageUrl: '/socks/placeholder.webp' },
      { name: 'Cream / Beige', hex: '#E8D5C4', weightGram: 35, stock: 50, imageUrl: '/socks/placeholder.webp' }
    ] as VariantItem[],
  });

  // Edit Product & Variants Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState<{
    id: string;
    name: string;
    model: string;
    price: string;
    originalPrice: string;
    badge: string;
    description: string;
    isActive: boolean;
    features: string[];
    variants: VariantItem[];
  } | null>(null);

  // Delete / Toggle Confirmation Modal
  const [deleteModalProduct, setDeleteModalProduct] = useState<ProductItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Uploading state for variant photo
  const [uploadingVariantIndex, setUploadingVariantIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadTargetForm, setUploadTargetForm] = useState<'create' | 'edit'>('create');

  const isPusatOrOwner = user?.role === 'ADMIN_PUSAT' || user?.role === 'OWNER';

  // 1. Fetch Products from Admin API
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/products');
      if (res.ok) {
        const json = await res.json();
        setProducts(json.products || []);
      } else {
        // Fallback to /api/products if admin fails
        const fallback = await fetch('/api/products');
        if (fallback.ok) {
          const json = await fallback.json();
          setProducts(json.data || []);
        }
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

  const showNotification = (type: 'success' | 'error', text: string) => {
    setBannerMessage({ type, text });
    setTimeout(() => setBannerMessage(null), 6000);
  };

  // Helper Format Rupiah
  const formatRupiah = (amount: number) => {
    return `Rp ${(amount || 0).toLocaleString('id-ID')}`;
  };

  // -------------------------------------------------------------
  // HANDLER: QUICK PRICE CHANGE
  // -------------------------------------------------------------
  const handleOpenQuickPrice = (p: ProductItem) => {
    if (!isPusatOrOwner) return;
    setEditPriceModalProduct(p);
    setQuickNewPrice(p.price.toString());
    setQuickNewOriginalPrice(p.originalPrice ? p.originalPrice.toString() : '');
    setQuickPriceError('');
  };

  const handleSaveQuickPrice = async () => {
    if (!editPriceModalProduct) return;
    const priceNum = parseInt(quickNewPrice, 10);
    if (isNaN(priceNum) || priceNum <= 0) {
      setQuickPriceError('Harga jual harus berupa nominal positif.');
      return;
    }

    setQuickPriceSubmitting(true);
    setQuickPriceError('');

    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: editPriceModalProduct.id,
          price: priceNum,
          originalPrice: quickNewOriginalPrice ? parseInt(quickNewOriginalPrice, 10) : null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal mengubah harga.');
      }

      setEditPriceModalProduct(null);
      showNotification('success', `Harga jual "${editPriceModalProduct.name}" berhasil diubah menjadi ${formatRupiah(priceNum)}.`);
      fetchProducts();
    } catch (err: any) {
      setQuickPriceError(err.message || 'Terjadi kesalahan saat menyimpan harga.');
    } finally {
      setQuickPriceSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLER: CREATE NEW PRODUCT
  // -------------------------------------------------------------
  const handleOpenCreateModal = () => {
    setCreateForm({
      name: '',
      model: 'emboss-split-toe',
      price: '',
      originalPrice: '',
      badge: '',
      description: '',
      features: ['Bahan Nylon Premium lembut dan elastis', 'Jahitan rapi dan tidak mudah melar'],
      variants: [
        { name: 'Hitam', hex: '#000000', weightGram: 35, stock: 50, imageUrl: '/socks/placeholder.webp' },
        { name: 'Cream / Beige', hex: '#E8D5C4', weightGram: 35, stock: 50, imageUrl: '/socks/placeholder.webp' }
      ],
    });
    setCreateError('');
    setCreateModalOpen(true);
  };

  const handleAddCreateVariant = () => {
    setCreateForm(prev => ({
      ...prev,
      variants: [
        ...prev.variants,
        { name: `Warna Baru ${prev.variants.length + 1}`, hex: '#3B82F6', weightGram: 35, stock: 50, imageUrl: '/socks/placeholder.webp' }
      ]
    }));
  };

  const handleRemoveCreateVariant = (index: number) => {
    if (createForm.variants.length <= 1) return;
    setCreateForm(prev => ({
      ...prev,
      variants: prev.variants.filter((_, idx) => idx !== index)
    }));
  };

  const handleSaveCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.price) {
      setCreateError('Nama produk dan harga jual wajib diisi.');
      return;
    }

    if (createForm.variants.length === 0) {
      setCreateError('Produk harus memiliki minimal 1 varian warna.');
      return;
    }

    setCreateSubmitting(true);
    setCreateError('');

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name.trim(),
          model: createForm.model.trim(),
          price: parseInt(createForm.price, 10),
          originalPrice: createForm.originalPrice ? parseInt(createForm.originalPrice, 10) : null,
          badge: createForm.badge || null,
          description: createForm.description.trim(),
          features: createForm.features.filter(f => f.trim().length > 0),
          variants: createForm.variants.map((v, i) => ({
            name: v.name.trim(),
            hex: v.hex || '#000000',
            weightGram: v.weightGram || 35,
            stock: v.stock !== undefined ? parseInt(String(v.stock), 10) : 50,
            imageUrl: v.imageUrl || '/socks/placeholder.webp',
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal menambahkan produk baru.');
      }

      setCreateModalOpen(false);
      showNotification('success', `Model produk baru "${createForm.name}" berhasil dibuat dengan ${createForm.variants.length} varian!`);
      fetchProducts();
    } catch (err: any) {
      setCreateError(err.message || 'Terjadi kesalahan sistem saat membuat produk.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLER: EDIT PRODUCT & VARIANTS
  // -------------------------------------------------------------
  const handleOpenEditModal = (p: ProductItem) => {
    setEditForm({
      id: p.id,
      name: p.name || '',
      model: p.model || 'emboss-split-toe',
      price: (p.price || 0).toString(),
      originalPrice: p.originalPrice ? p.originalPrice.toString() : '',
      badge: p.badge || '',
      description: p.description || '',
      isActive: p.isActive !== false,
      features: Array.isArray(p.features) && p.features.length > 0 ? [...p.features] : ['Bahan Nylon Premium', 'Jahitan Rapi'],
      variants: (p.variants || []).map(v => ({
        id: v.id,
        name: v.name || '',
        hex: v.hex || '#000000',
        sku: v.sku,
        weightGram: v.weightGram || 35,
        imageUrl: v.imageUrl || v.image || '/socks/placeholder.webp',
        isActive: v.isActive !== false,
      })),
    });
    setEditError('');
    setEditModalOpen(true);
  };

  const handleAddEditVariant = () => {
    if (!editForm) return;
    setEditForm(prev => {
      if (!prev) return null;
      return {
        ...prev,
        variants: [
          ...prev.variants,
          {
            id: `temp-${Date.now()}`,
            name: `Varian Baru ${prev.variants.length + 1}`,
            hex: '#10B981',
            weightGram: 35,
            stock: 50,
            imageUrl: '/socks/placeholder.webp',
            isActive: true,
          }
        ]
      };
    });
  };

  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    if (!editForm.name.trim() || !editForm.price) {
      setEditError('Nama produk dan harga jual wajib diisi.');
      return;
    }

    setEditSubmitting(true);
    setEditError('');

    try {
      const res = await fetch(`/api/admin/products/${editForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          model: editForm.model.trim(),
          price: parseInt(editForm.price, 10),
          originalPrice: editForm.originalPrice ? parseInt(editForm.originalPrice, 10) : null,
          badge: editForm.badge || null,
          description: editForm.description.trim(),
          isActive: editForm.isActive,
          features: editForm.features.filter(f => f.trim().length > 0),
          variants: editForm.variants.map((v) => ({
            id: v.id,
            name: v.name.trim(),
            hex: v.hex,
            weightGram: v.weightGram || 35,
            imageUrl: v.imageUrl || '/socks/placeholder.webp',
            isActive: v.isActive !== false,
            stock: v.stock !== undefined ? parseInt(String(v.stock), 10) : 50,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal menyimpan perubahan produk.');
      }

      setEditModalOpen(false);
      showNotification('success', `Produk "${editForm.name}" dan seluruh variannya berhasil diperbarui!`);
      fetchProducts();
    } catch (err: any) {
      setEditError(err.message || 'Terjadi kesalahan sistem saat memperbarui produk.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLER: DELETE / TOGGLE ACTIVE STATUS
  // -------------------------------------------------------------
  const handleToggleProductStatus = async (product: ProductItem) => {
    setDeleteSubmitting(true);
    try {
      if (product.isActive !== false) {
        // Deactivate (DELETE)
        const res = await fetch(`/api/admin/products/${product.id}`, { method: 'DELETE' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Gagal menonaktifkan produk.');
        showNotification('success', `Produk "${product.name}" berhasil dinonaktifkan dari katalog.`);
      } else {
        // Reactivate (PUT)
        const res = await fetch(`/api/admin/products/${product.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: true }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Gagal mengaktifkan produk.');
        showNotification('success', `Produk "${product.name}" berhasil diaktifkan kembali.`);
      }
      setDeleteModalProduct(null);
      fetchProducts();
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal mengubah status produk.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLER: IMAGE UPLOAD HELPER
  // -------------------------------------------------------------
  const handleUploadFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploadingVariantIndex === null) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'luvira/products');

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengunggah foto.');

      const uploadedUrl = data.url || data.path || '/socks/placeholder.webp';

      if (uploadTargetForm === 'create') {
        setCreateForm(prev => {
          const newVars = [...prev.variants];
          if (newVars[uploadingVariantIndex]) {
            newVars[uploadingVariantIndex].imageUrl = uploadedUrl;
          }
          return { ...prev, variants: newVars };
        });
      } else if (uploadTargetForm === 'edit' && editForm) {
        setEditForm(prev => {
          if (!prev) return null;
          const newVars = [...prev.variants];
          if (newVars[uploadingVariantIndex]) {
            newVars[uploadingVariantIndex].imageUrl = uploadedUrl;
          }
          return { ...prev, variants: newVars };
        });
      }
      showNotification('success', 'Foto varian berhasil diunggah.');
    } catch (err: any) {
      showNotification('error', err.message || 'Gagal mengunggah gambar.');
    } finally {
      setUploadingVariantIndex(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerUploadForVariant = (index: number, formType: 'create' | 'edit') => {
    setUploadingVariantIndex(index);
    setUploadTargetForm(formType);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // -------------------------------------------------------------
  // FILTERING
  // -------------------------------------------------------------
  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.variants?.some((v: any) => v.name?.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return p.isActive !== false;
    if (statusFilter === 'inactive') return p.isActive === false;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Hidden File Input for Image Upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleUploadFileChange} 
        accept="image/png, image/jpeg, image/webp" 
        className="hidden" 
      />

      {/* Top Banner Alert */}
      {bannerMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in shadow-xs ${
            bannerMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}
        >
          {bannerMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-700 shrink-0" />
          )}
          <span>{bannerMessage.text}</span>
        </div>
      )}

      {/* Header Info & Actions Bar */}
      <div className="p-5 rounded-3xl bg-white border border-stone-200 text-stone-800 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-deep-forest text-warm-cream shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-stone-900 tracking-tight">
                Manajemen Model Kaus Kaki & Varian
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Kelola katalog produk, tambah model baru, atur varian warna, bobot gram, dan harga jual seragam nasional.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button: Tambah Model Baru */}
        {isPusatOrOwner && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-deep-forest hover:bg-deep-forest/90 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
              id="btn-add-product"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Model Baru</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama model, kategori, varian..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-deep-forest/20 focus:border-deep-forest"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="inline-flex p-1 bg-stone-100 rounded-xl text-xs font-bold text-stone-600">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'all' ? 'bg-white text-stone-900 shadow-2xs' : 'hover:text-stone-900'}`}
            >
              Semua ({products.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'active' ? 'bg-white text-emerald-800 shadow-2xs' : 'hover:text-stone-900'}`}
            >
              Aktif ({products.filter(p => p.isActive !== false).length})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'inactive' ? 'bg-white text-rose-800 shadow-2xs' : 'hover:text-stone-900'}`}
            >
              Nonaktif ({products.filter(p => p.isActive === false).length})
            </button>
          </div>

          <button
            onClick={fetchProducts}
            className="p-2 rounded-xl text-stone-600 hover:bg-stone-100 border border-stone-200 cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Product List Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-stone-500 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-deep-forest" />
            <span className="text-xs font-semibold">Memuat katalog model kaus kaki...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-16 text-center text-stone-500 space-y-3">
            <Package className="w-12 h-12 text-stone-300 mx-auto" />
            <h4 className="text-sm font-bold text-stone-700">Tidak ada model produk yang cocok</h4>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              {searchTerm ? 'Coba ubah kata kunci pencarian Anda.' : 'Katalog masih kosong. Klik "Tambah Model Baru" untuk menambahkan produk pertama.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Model & Kaus Kaki</th>
                  <th className="p-4">Kategori / Model</th>
                  <th className="p-4">Varian Warna ({' '}
                    {filteredProducts.reduce((sum, p) => sum + (p.variants?.length || 0), 0)} Varian Total
                  )</th>
                  <th className="p-4">Harga Coret</th>
                  <th className="p-4">Harga Jual</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Aksi Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredProducts.map((p) => {
                  const isDeactivated = p.isActive === false;
                  return (
                    <tr 
                      key={p.id} 
                      className={`hover:bg-stone-50/70 transition-colors ${isDeactivated ? 'bg-stone-50/50 opacity-75' : ''}`}
                    >
                      {/* Product Name & Description */}
                      <td className="p-4 align-top max-w-xs">
                        <div className="flex items-start gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0 overflow-hidden">
                            {p.variants?.[0]?.imageUrl || p.variants?.[0]?.image ? (
                              <img 
                                src={p.variants[0].imageUrl || p.variants[0].image} 
                                alt={p.name} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-4 h-4 text-stone-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
                              <span>{p.name}</span>
                              {p.badge && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                                  {p.badge}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                              {p.description || 'Tidak ada deskripsi'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Model Tag */}
                      <td className="p-4 align-top">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-stone-100 text-stone-700 border border-stone-200 inline-block font-mono">
                          {p.model}
                        </span>
                      </td>

                      {/* Variants & Colors */}
                      <td className="p-4 align-top">
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {p.variants?.map((v: any) => (
                            <span
                              key={v.id || v.name}
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                v.isActive === false
                                  ? 'bg-stone-100 text-stone-400 border-dashed border-stone-300 line-through'
                                  : 'bg-white text-stone-800 border-stone-200 shadow-2xs'
                              }`}
                              title={`Bobot: ${v.weightGram || 35}g | SKU: ${v.sku || '-'}`}
                            >
                              <span 
                                className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0" 
                                style={{ backgroundColor: v.hex || '#000000' }} 
                              />
                              <span>{v.name}</span>
                            </span>
                          ))}
                        </div>
                        <div className="text-[10px] text-stone-400 mt-1.5 font-medium">
                          {p.variants?.length || 0} varian terdaftar
                        </div>
                      </td>

                      {/* Original / Strike Price */}
                      <td className="p-4 align-top text-stone-400 line-through">
                        {p.originalPrice ? formatRupiah(p.originalPrice) : '-'}
                      </td>

                      {/* Uniform Price */}
                      <td className="p-4 align-top">
                        <span className="font-mono text-sm font-extrabold text-deep-forest" id={`price-display-${p.id}`}>
                          {formatRupiah(p.price)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-4 align-top text-center">
                        {isDeactivated ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Nonaktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Aktif
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 align-top text-right">
                        {isPusatOrOwner ? (
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Tombol Edit Lengkap & Varian */}
                            <button
                              onClick={() => handleOpenEditModal(p)}
                              className="px-2.5 py-1.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition flex items-center gap-1 cursor-pointer"
                              title="Edit Detail Model & Varian"
                            >
                              <Sliders className="w-3.5 h-3.5 text-stone-600" />
                              <span>Edit Model & Varian</span>
                            </button>

                            {/* Tombol Ubah Harga Cepat */}
                            <button
                              onClick={() => handleOpenQuickPrice(p)}
                              className="px-2.5 py-1.5 text-xs font-bold text-white bg-deep-forest hover:bg-deep-forest/90 rounded-xl shadow-2xs transition flex items-center gap-1 cursor-pointer"
                              title="Ubah Harga Cepat"
                            >
                              <Tag className="w-3.5 h-3.5" />
                              <span>Ubah Harga</span>
                            </button>

                            {/* Tombol Nonaktifkan / Aktifkan */}
                            <button
                              onClick={() => setDeleteModalProduct(p)}
                              className={`p-1.5 rounded-xl border transition cursor-pointer ${
                                isDeactivated 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                              }`}
                              title={isDeactivated ? 'Aktifkan Kembali' : 'Nonaktifkan Produk'}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] font-medium text-stone-400 italic">
                            Terkunci Pusat
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: TAMBAH MODEL BARU                                */}
      {/* ========================================================= */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-stone-100 my-8 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-deep-forest rounded-xl">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-sm">
                    Tambah Model Produk Kaus Kaki Baru
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Model baru langsung tersinkron ke katalog publik dan diinisialisasi ke seluruh gudang cabang.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCreateProduct} className="space-y-4">
              {/* Data Utama Produk */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Nama Model Produk: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Emboss Split Toe Rose Gold"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-deep-forest/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Kategori / Tipe Model: <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={createForm.model}
                    onChange={(e) => setCreateForm({ ...createForm, model: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-deep-forest/20"
                  >
                    {COMMON_MODELS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Badge Tampilan (Opsional):
                  </label>
                  <select
                    value={createForm.badge}
                    onChange={(e) => setCreateForm({ ...createForm, badge: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-deep-forest/20"
                  >
                    {BADGE_OPTIONS.map(b => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Harga Jual Seragam (Rp): <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1000"
                    placeholder="Contoh: 35000"
                    value={createForm.price}
                    onChange={(e) => setCreateForm({ ...createForm, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-deep-forest/20 text-deep-forest"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Harga Coret Asli (Opsional) (Rp):
                  </label>
                  <input
                    type="number"
                    min="1000"
                    placeholder="Contoh: 45000"
                    value={createForm.originalPrice}
                    onChange={(e) => setCreateForm({ ...createForm, originalPrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Deskripsi Produk:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Jelaskan kenyamanan, bahan nylon premium, dan keunggulan syar'i..."
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-deep-forest/20"
                  />
                </div>
              </div>

              {/* Kelola Varian Warna */}
              <div className="pt-3 border-t border-stone-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-extrabold text-stone-900 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-deep-forest" />
                    <span>Daftar Varian Warna Produk ({createForm.variants.length})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddCreateVariant}
                    className="text-xs font-bold text-deep-forest hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Varian Warna</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {createForm.variants.map((v, idx) => (
                    <div 
                      key={idx}
                      className="p-3 bg-stone-50 border border-stone-200 rounded-xl grid grid-cols-12 gap-2 items-center text-xs"
                    >
                      {/* Color Picker & Dot */}
                      <div className="col-span-2 flex items-center gap-1.5">
                        <input
                          type="color"
                          value={v.hex}
                          onChange={(e) => {
                            const newV = [...createForm.variants];
                            newV[idx].hex = e.target.value;
                            setCreateForm({ ...createForm, variants: newV });
                          }}
                          className="w-7 h-7 rounded-lg border border-stone-300 cursor-pointer p-0 shrink-0"
                          title="Pilih Warna"
                        />
                        <input
                          type="text"
                          value={v.hex}
                          onChange={(e) => {
                            const newV = [...createForm.variants];
                            newV[idx].hex = e.target.value;
                            setCreateForm({ ...createForm, variants: newV });
                          }}
                          className="w-14 px-1 py-1 font-mono text-[10px] uppercase border border-stone-200 rounded bg-white"
                        />
                      </div>

                      {/* Variant Name */}
                      <div className="col-span-4">
                        <input
                          type="text"
                          required
                          placeholder="Nama Warna (mis: Hitam)"
                          value={v.name}
                          onChange={(e) => {
                            const newV = [...createForm.variants];
                            newV[idx].name = e.target.value;
                            setCreateForm({ ...createForm, variants: newV });
                          }}
                          className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold"
                        />
                      </div>

                      {/* Weight (Gram) */}
                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          placeholder="35g"
                          value={v.weightGram}
                          onChange={(e) => {
                            const newV = [...createForm.variants];
                            newV[idx].weightGram = parseInt(e.target.value, 10) || 35;
                            setCreateForm({ ...createForm, variants: newV });
                          }}
                          className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-center font-mono"
                          title="Bobot per pasang (gram)"
                        />
                      </div>

                      {/* Image Upload / URL */}
                      <div className="col-span-3 flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="Foto URL..."
                          value={v.imageUrl || ''}
                          onChange={(e) => {
                            const newV = [...createForm.variants];
                            newV[idx].imageUrl = e.target.value;
                            setCreateForm({ ...createForm, variants: newV });
                          }}
                          className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-[10px] font-mono truncate"
                        />
                        <button
                          type="button"
                          onClick={() => triggerUploadForVariant(idx, 'create')}
                          className="p-1.5 bg-stone-200 hover:bg-stone-300 rounded-lg shrink-0"
                          title="Unggah Foto dari Komputer"
                        >
                          <Upload className="w-3.5 h-3.5 text-stone-700" />
                        </button>
                      </div>

                      {/* Remove */}
                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          disabled={createForm.variants.length <= 1}
                          onClick={() => handleRemoveCreateVariant(idx)}
                          className="p-1 text-stone-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-stone-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-xs font-bold rounded-xl hover:bg-stone-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="flex-1 py-2.5 bg-deep-forest hover:bg-deep-forest/90 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  id="btn-save-new-product"
                >
                  {createSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Simpan Model Produk</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: EDIT DETAIL MODEL & VARIAN LENGKAP               */}
      {/* ========================================================= */}
      {editModalOpen && editForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-stone-100 my-8 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-stone-100 text-stone-700 rounded-xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-sm">
                    Edit Detail Model & Varian Warna
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    ID: {editForm.id} | Mengubah model, warna, status aktif, bobot, atau foto produk.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditProduct} className="space-y-4">
              {/* Product Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Nama Model Produk: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-deep-forest/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Kategori / Tipe Model:
                  </label>
                  <select
                    value={editForm.model}
                    onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-deep-forest/20"
                  >
                    {COMMON_MODELS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Badge Tampilan:
                  </label>
                  <select
                    value={editForm.badge}
                    onChange={(e) => setEditForm({ ...editForm, badge: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-deep-forest/20"
                  >
                    {BADGE_OPTIONS.map(b => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Harga Jual Seragam (Rp): <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1000"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-deep-forest/20 text-deep-forest"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Harga Coret Asli (Rp):
                  </label>
                  <input
                    type="number"
                    min="1000"
                    placeholder="Kosongkan jika tidak ada"
                    value={editForm.originalPrice}
                    onChange={(e) => setEditForm({ ...editForm, originalPrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Deskripsi Produk:
                  </label>
                  <textarea
                    rows={2}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-deep-forest/20"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-is-active"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-deep-forest focus:ring-deep-forest"
                  />
                  <label htmlFor="edit-is-active" className="text-xs font-bold text-stone-800 cursor-pointer">
                    Produk Aktif (Tampil di Katalog dan Checkout Publik)
                  </label>
                </div>
              </div>

              {/* Kelola Varian Warna */}
              <div className="pt-3 border-t border-stone-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-extrabold text-stone-900 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-deep-forest" />
                    <span>Daftar Varian Warna Produk ({editForm.variants.length})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddEditVariant}
                    className="text-xs font-bold text-deep-forest hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Varian Baru</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {editForm.variants.map((v, idx) => (
                    <div 
                      key={v.id || idx}
                      className="p-3 bg-stone-50 border border-stone-200 rounded-xl grid grid-cols-12 gap-2 items-center text-xs"
                    >
                      {/* Color Picker & Dot */}
                      <div className="col-span-2 flex items-center gap-1.5">
                        <input
                          type="color"
                          value={v.hex || '#000000'}
                          onChange={(e) => {
                            if (!editForm) return;
                            const newV = [...editForm.variants];
                            newV[idx].hex = e.target.value;
                            setEditForm({ ...editForm, variants: newV });
                          }}
                          className="w-7 h-7 rounded-lg border border-stone-300 cursor-pointer p-0 shrink-0"
                          title="Pilih Warna"
                        />
                        <input
                          type="text"
                          value={v.hex || '#000000'}
                          onChange={(e) => {
                            if (!editForm) return;
                            const newV = [...editForm.variants];
                            newV[idx].hex = e.target.value;
                            setEditForm({ ...editForm, variants: newV });
                          }}
                          className="w-14 px-1 py-1 font-mono text-[10px] uppercase border border-stone-200 rounded bg-white"
                        />
                      </div>

                      {/* Variant Name */}
                      <div className="col-span-4">
                        <input
                          type="text"
                          required
                          placeholder="Nama Warna"
                          value={v.name}
                          onChange={(e) => {
                            if (!editForm) return;
                            const newV = [...editForm.variants];
                            newV[idx].name = e.target.value;
                            setEditForm({ ...editForm, variants: newV });
                          }}
                          className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold"
                        />
                      </div>

                      {/* Weight (Gram) */}
                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          placeholder="35g"
                          value={v.weightGram}
                          onChange={(e) => {
                            if (!editForm) return;
                            const newV = [...editForm.variants];
                            newV[idx].weightGram = parseInt(e.target.value, 10) || 35;
                            setEditForm({ ...editForm, variants: newV });
                          }}
                          className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-center font-mono"
                          title="Bobot per pasang (gram)"
                        />
                      </div>

                      {/* Image Upload / URL */}
                      <div className="col-span-3 flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="Foto URL..."
                          value={v.imageUrl || ''}
                          onChange={(e) => {
                            if (!editForm) return;
                            const newV = [...editForm.variants];
                            newV[idx].imageUrl = e.target.value;
                            setEditForm({ ...editForm, variants: newV });
                          }}
                          className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-[10px] font-mono truncate"
                        />
                        <button
                          type="button"
                          onClick={() => triggerUploadForVariant(idx, 'edit')}
                          className="p-1.5 bg-stone-200 hover:bg-stone-300 rounded-lg shrink-0"
                          title="Unggah Foto dari Komputer"
                        >
                          <Upload className="w-3.5 h-3.5 text-stone-700" />
                        </button>
                      </div>

                      {/* Active status / Remove */}
                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (!editForm) return;
                            const newV = [...editForm.variants];
                            newV[idx].isActive = !newV[idx].isActive;
                            setEditForm({ ...editForm, variants: newV });
                          }}
                          className={`p-1 rounded cursor-pointer ${v.isActive === false ? 'text-stone-300' : 'text-emerald-700'}`}
                          title={v.isActive === false ? 'Aktifkan varian ini' : 'Nonaktifkan varian ini'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-stone-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-xs font-bold rounded-xl hover:bg-stone-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 py-2.5 bg-deep-forest hover:bg-deep-forest/90 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  id="btn-save-edit-product"
                >
                  {editSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: UBAH HARGA CEPAT (MODAL ASLI TETAP TERSEDIA)      */}
      {/* ========================================================= */}
      {editPriceModalProduct && (
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
                onClick={() => setEditPriceModalProduct(null)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {quickPriceError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{quickPriceError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs text-stone-700">
                Model: <strong className="text-stone-900">{editPriceModalProduct.name}</strong>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Harga Jual Seragam Baru (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={quickNewPrice}
                  onChange={(e) => setQuickNewPrice(e.target.value)}
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
                  value={quickNewOriginalPrice}
                  onChange={(e) => setQuickNewOriginalPrice(e.target.value)}
                  className="w-full p-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-stone-400"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                💡 <strong>Catatan Bisnis:</strong> Sesuai instruksi pemilik usaha, harga jual ini langsung berlaku <strong>seragam</strong> baik untuk pesanan yang dilayani oleh gudang Pusat Depok maupun gudang Yogyakarta.
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setEditPriceModalProduct(null)}
                className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-xs font-bold rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleSaveQuickPrice}
                disabled={quickPriceSubmitting}
                className="flex-1 py-2.5 bg-deep-forest hover:bg-deep-forest/90 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                id="btn-save-uniform-price"
              >
                {quickPriceSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Simpan Harga Seragam</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: KONFIRMASI STATUS NONAKTIF / AKTIFKAN             */}
      {/* ========================================================= */}
      {deleteModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${deleteModalProduct.isActive === false ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                <Power className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-stone-900 text-sm">
                  {deleteModalProduct.isActive === false ? 'Aktifkan Kembali Model' : 'Nonaktifkan Model'}
                </h3>
                <p className="text-xs text-stone-500">
                  {deleteModalProduct.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              {deleteModalProduct.isActive === false
                ? 'Model ini akan kembali aktif dan tampil di katalog publik serta halaman checkout pembeli.'
                : 'Model ini akan dinonaktifkan dari katalog dan checkout publik. Seluruh riwayat penjualan lama tetap aman tersimpan.'}
            </p>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setDeleteModalProduct(null)}
                className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-xs font-bold rounded-xl hover:bg-stone-50"
              >
                Batal
              </button>
              <button
                onClick={() => handleToggleProductStatus(deleteModalProduct)}
                disabled={deleteSubmitting}
                className={`flex-1 py-2.5 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 ${
                  deleteModalProduct.isActive === false
                    ? 'bg-deep-forest hover:bg-deep-forest/90'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {deleteSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>{deleteModalProduct.isActive === false ? 'Aktifkan' : 'Nonaktifkan'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
