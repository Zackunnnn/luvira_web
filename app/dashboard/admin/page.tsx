// admin/page.tsx — Comprehensive Admin Dashboard CMS for Luvira.
// Features:
// 1. Tab [Manajemen Produk]: Product & Variant CRUD, Base64 image upload via FileReader, inline price editing, stock toggles.
// 2. Tab [Editor Copywriting & Konten]: Dynamic text customization for Hero, About 3 Pillars, Feature Highlights, and Cart/Catalog Microcopy.
// 100% Zero-Cost with Zustand + LocalStorage persistence.

'use client'; // Required for client-side forms, file uploads, and state

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useProductStore } from '@/store/useProductStore';
import { useContentStore } from '@/store/useContentStore';
import { useOrderStore } from '@/store/useOrderStore';
import { Product, ColorVariant, ModelType } from '@/types/product';
import { SiteContent, FeatureItem } from '@/types/content';
import { Order, OrderStatus } from '@/types/order';
import { DEFAULT_SITE_CONTENT } from '@/data/defaultContent';
import { DigitalReceiptModal } from '@/components/checkout/DigitalReceiptModal';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  RotateCcw,
  ExternalLink,
  Package,
  Palette,
  ShieldCheck,
  AlertTriangle,
  Check,
  Upload,
  Eye,
  ImageIcon,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  Settings,
  LayoutDashboard,
  FileText,
  Sparkles,
  Layers,
  HeartHandshake,
  Footprints,
  ShoppingBag,
  Wand2,
  Receipt,
  MessageCircle,
  Clock,
  Printer,
  Tag,
  Loader2,
  AlertCircle,
  Folder,
  CheckCircle2
} from 'lucide-react';



// ========== BADGE PRESETS ==========
const BADGE_PRESETS = [
  'Best Seller',
  'New Arrival',
  'Must Have',
  'Most Popular',
  'Safe Grip',
  'Everyday Basic',
];

// ========== EMPTY VARIANT BUILDER ==========
const createEmptyVariant = (): ColorVariant => ({
  id: `var-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  name: '',
  hex: '#E8D5C4',
  image: '',
  stock: 50,
});

// ========== PRODUCT FORM STATE TYPE ==========
interface ProductFormData {
  name: string;
  model: ModelType;
  price: string;
  originalPrice: string;
  rating: string;
  reviewsCount: string;
  badge: string;
  description: string;
  features: string[];
  variants: ColorVariant[];
}

const createEmptyForm = (): ProductFormData => ({
  name: '',
  model: 'emboss',
  price: '',
  originalPrice: '',
  rating: '4.9',
  reviewsCount: '0',
  badge: '',
  description: '',
  features: [''],
  variants: [createEmptyVariant()],
});

// Currency Formatter
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function AdminPage() {
  // ========== TAB STATE ==========
  const [activeTab, setActiveTab] = useState<'products' | 'copywriting' | 'orders'>('products');

  // ========== PRODUCT STORE ==========
  const {
    products,
    categories,
    addProduct,
    updateProduct,
    deleteProduct,
    updateVariantStock,
    addCategory,
    deleteCategory,
    resetToDefaultProducts,
    getTotalVariants,
    fetchProducts,
  } = useProductStore();

  // ========== CONTENT STORE ==========
  const {
    content,
    updateHeroContent,
    updateAboutContent,
    updateFeaturesContent,
    updateMicrocopy,
    resetToDefaultContent,
    fetchContent,
  } = useContentStore();

  // ========== ORDER STORE ==========
  const {
    orders,
    fetchOrders,
    updateOrderStatus,
    deleteOrder,
    clearOrders,
    getTotalRevenue,
  } = useOrderStore();

  // ========== HYDRATION SAFEGUARD ==========
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    fetchProducts();
    fetchContent();
    fetchOrders();
    
    // Auto-refresh orders every 10 seconds to catch Midtrans Webhook updates
    const interval = setInterval(() => {
      fetchOrders();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // ========== PRODUCT FORM STATE ==========
  const [formData, setFormData] = useState<ProductFormData>(createEmptyForm());
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);

  // ========== COPYWRITING FORM STATE ==========
  const [copyForm, setCopyForm] = useState<SiteContent>(DEFAULT_SITE_CONTENT);

  // Sync copyForm when content store hydrates
  useEffect(() => {
    if (mounted) {
      setCopyForm(JSON.parse(JSON.stringify(content)));
    }
  }, [mounted, content]);

  // ========== MODAL STATES ==========
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showResetContentConfirm, setShowResetContentConfirm] = useState(false);
  const [showClearOrdersConfirm, setShowClearOrdersConfirm] = useState(false);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteOrderConfirmId, setDeleteOrderConfirmId] = useState<string | null>(null);

  // Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('Tag');

  // ========== INLINE PRICE EDIT STATE ==========
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlinePrice, setInlinePrice] = useState('');

  // ========== ROUTER & AUTH ==========
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/dashboard/login');
      router.refresh();
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  // ========== TOAST MESSAGE STATE ==========
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ========== FILE INPUT REFS ==========
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // Computed values
  const totalProducts = mounted ? products.length : 0;
  const totalVariants = mounted ? getTotalVariants() : 0;

  // Toast trigger
  const showSuccess = useCallback((msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  }, []);

  // ========== PRODUCT FORM VALIDATION ==========
  const validateProductForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Nama produk wajib diisi';
    if (!formData.price || isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      errors.price = 'Harga wajib diisi dan harus angka positif';
    }
    if (!formData.description.trim()) errors.description = 'Deskripsi produk wajib diisi';
    if (formData.variants.length === 0) errors.variants = 'Minimal 1 varian warna diperlukan';

    formData.variants.forEach((v, i) => {
      if (!v.name.trim()) errors[`variant-name-${i}`] = `Nama varian #${i + 1} wajib diisi`;
      if (!v.image.trim()) errors[`variant-image-${i}`] = `Foto varian #${i + 1} wajib diisi`;
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ========== API IMAGE UPLOAD HANDLER ==========
  const handleImageUpload = async (variantIndex: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      setFormErrors((prev) => ({
        ...prev,
        [`variant-image-${variantIndex}`]: 'File harus berupa gambar (JPG, PNG, WebP)',
      }));
      return;
    }

    try {
      // Show loading state by setting the image to a placeholder or keeping it empty
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      if (!res.ok) {
        throw new Error('Gagal mengunggah gambar ke server');
      }

      const data = await res.json();
      
      const updatedVariants = [...formData.variants];
      updatedVariants[variantIndex] = {
        ...updatedVariants[variantIndex],
        image: data.url,
      };
      setFormData((prev) => ({ ...prev, variants: updatedVariants }));
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[`variant-image-${variantIndex}`];
        return next;
      });
      showSuccess('Gambar berhasil diunggah!');
    } catch (error) {
      setFormErrors((prev) => ({
        ...prev,
        [`variant-image-${variantIndex}`]: 'Error saat mengunggah gambar. Pastikan Storage R2 sudah dikonfigurasi.',
      }));
    }
  };

  // ========== PRODUCT SUBMISSION ==========
  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateProductForm()) return;

    const productData: Product = {
      id: editingProductId || `luv-admin-${Date.now()}`,
      name: formData.name.trim(),
      model: formData.model,
      price: Number(formData.price),
      originalPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
      rating: Number(formData.rating) || 4.9,
      reviewsCount: Number(formData.reviewsCount) || 0,
      badge: formData.badge.trim() || undefined,
      description: formData.description.trim(),
      features: formData.features.filter((f) => f.trim() !== ''),
      variants: formData.variants,
    };

    if (editingProductId) {
      updateProduct(editingProductId, productData);
      showSuccess(`Produk "${productData.name}" berhasil diperbarui!`);
    } else {
      addProduct(productData);
      showSuccess(`Produk "${productData.name}" berhasil ditambahkan!`);
    }

    setFormData(createEmptyForm());
    setEditingProductId(null);
    setShowForm(false);
    setFormErrors({});
  };

  const handleEditProduct = (product: Product) => {
    setFormData({
      name: product.name,
      model: product.model,
      price: product.price.toString(),
      originalPrice: product.originalPrice?.toString() || '',
      rating: product.rating.toString(),
      reviewsCount: product.reviewsCount.toString(),
      badge: product.badge || '',
      description: product.description,
      features: product.features.length > 0 ? product.features : [''],
      variants: product.variants,
    });
    setEditingProductId(product.id);
    setShowForm(true);
    setFormErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      const product = products.find((p) => p.id === deleteConfirmId);
      deleteProduct(deleteConfirmId);
      showSuccess(`Produk "${product?.name}" berhasil dihapus!`);
      setDeleteConfirmId(null);
    }
  };

  const confirmResetProducts = () => {
    resetToDefaultProducts();
    showSuccess('Katalog berhasil di-reset ke data default!');
    setShowResetConfirm(false);
  };

  const saveInlinePrice = (productId: string) => {
    const newPrice = Number(inlinePrice);
    if (!isNaN(newPrice) && newPrice > 0) {
      updateProduct(productId, { price: newPrice });
      showSuccess('Harga berhasil diperbarui!');
    }
    setInlineEditId(null);
    setInlinePrice('');
  };

  // Variant Helpers
  const addVariantToForm = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [...prev.variants, createEmptyVariant()],
    }));
  };

  const removeVariantFromForm = (index: number) => {
    if (formData.variants.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  const updateVariantField = (
    index: number,
    field: keyof ColorVariant,
    value: string | boolean | number
  ) => {
    const updatedVariants = [...formData.variants];
    updatedVariants[index] = { ...updatedVariants[index], [field]: value };
    setFormData((prev) => ({ ...prev, variants: updatedVariants }));
  };

  // Feature Bullet Helpers
  const addFeatureToForm = () => {
    setFormData((prev) => ({ ...prev, features: [...prev.features, ''] }));
  };

  const removeFeatureFromForm = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const updateFeature = (index: number, value: string) => {
    const updatedFeatures = [...formData.features];
    updatedFeatures[index] = value;
    setFormData((prev) => ({ ...prev, features: updatedFeatures }));
  };

  // Tech Feature Helpers for Copywriting CMS (Dynamic without hardcoded keys)
  const addTechFeature = () => {
    setCopyForm((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        items: [
          ...(Array.isArray(prev.features.items) ? prev.features.items : DEFAULT_SITE_CONTENT.features.items),
          {
            id: `feat-${Date.now()}`,
            title: '',
            subtitle: '',
            description: '',
          },
        ],
      },
    }));
  };

  const removeTechFeature = (index: number) => {
    const items = Array.isArray(copyForm.features.items) ? copyForm.features.items : DEFAULT_SITE_CONTENT.features.items;
    if (items.length <= 1) return;
    setCopyForm((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        items: items.filter((_, i) => i !== index),
      },
    }));
  };

  const updateTechFeatureField = (
    index: number,
    field: keyof FeatureItem,
    value: string
  ) => {
    const items = Array.isArray(copyForm.features.items) ? [...copyForm.features.items] : [...DEFAULT_SITE_CONTENT.features.items];
    items[index] = { ...items[index], [field]: value };
    setCopyForm((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        items,
      },
    }));
  };

  // ========== COPYWRITING FORM SUBMISSION ==========
  const handleSaveCopywriting = (e: React.FormEvent) => {
    e.preventDefault();
    updateHeroContent(copyForm.hero);
    updateAboutContent(copyForm.about);
    updateFeaturesContent(copyForm.features);
    updateMicrocopy(copyForm.microcopy);
    showSuccess('Seluruh copywriting website berhasil diperbarui!');
  };

  const confirmResetCopywriting = () => {
    resetToDefaultContent();
    setCopyForm(JSON.parse(JSON.stringify(DEFAULT_SITE_CONTENT)));
    showSuccess('Copywriting berhasil dikembalikan ke format default!');
    setShowResetContentConfirm(false);
  };

  // Seasonal Theme Presets
  const applySeasonalPreset = (presetType: 'ramadan' | 'gajian' | 'mahasiswi') => {
    if (presetType === 'ramadan') {
      setCopyForm((prev) => ({
        ...prev,
        hero: {
          ...prev.hero,
          announcement: '🌙 Spesial Ramadan & Umroh: Diskon Bundle Kaus Kaki Thawaf Anti-Slip!',
          badge: '✦ Edisi Spesial Ibadah Nyaman • Anti-Slip & Wudhu Friendly',
          headline: 'Kekhusyukan Langkah dalam Setiap Ibadah Terbaikmu.',
          subheadline:
            'Koleksi kaus kaki jempol & anti-slip premium untuk kenyamanan maksimal saat thawaf, sholat tarawih, maupun aktivitas silaturahmi Idul Fitri.',
          ctaText: 'Pilih Koleksi Ibadah',
          trustBadge1: 'Aman untuk Sajadah & Marmer',
        },
      }));
      showSuccess('Preset "Ramadan & Umroh" diterapkan ke form!');
    } else if (presetType === 'gajian') {
      setCopyForm((prev) => ({
        ...prev,
        hero: {
          ...prev.hero,
          announcement: '⚡ PAYDAY SALE: Beli 3 Pasang Gratis 1 Pouch Eksklusif + Bebas Ongkir!',
          badge: '✦ Promo Gajian Spesial • Stok Terbatas Hari Ini',
          headline: 'Upgrade Koleksi Kaus Kaki Favoritmu Sekarang.',
          subheadline:
            'Nikmati kelembutan katun combed grade A dan teknologi split-toe anti-gerah dengan penawaran bundle hemat terbatas khusus periode payday.',
          ctaText: 'Serbu Promo Gajian',
          trustBadge1: 'Garansi 100% Original',
        },
      }));
      showSuccess('Preset "Payday Sale" diterapkan ke form!');
    } else if (presetType === 'mahasiswi') {
      setCopyForm((prev) => ({
        ...prev,
        hero: {
          ...prev.hero,
          announcement: '🎒 Campus Ready Bundle: 4 Pasang Kaus Kaki Kuliah Anti-Noda Cuma 120 Ribu!',
          badge: '✦ Pilihan Favorit Mahasiswi & Muslimah Aktif',
          headline: 'Langkah Percaya Diri dari Ruang Kuliah hingga Hangout.',
          subheadline:
            'Alas hitam anti-noda debu jalanan berpadu warna earth-tone aesthetic. Nyaman dipakai seharian dengan sepatu sneakers maupun flatshoes.',
          ctaText: 'Lihat Paket Kuliah',
          trustBadge1: 'Sol Bawah Anti-Noda',
        },
      }));
      showSuccess('Preset "Mahasiswi & Kuliah" diterapkan ke form!');
    }
  };

  // ========== ORDER HELPERS ==========
  const generateCustomerChatUrl = (order: Order) => {
    let cleanPhone = order.customerInfo.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('62')) {
      cleanPhone = '62' + cleanPhone;
    }
    const message = `Halo Kak ${order.customerInfo.name},\n\nTerima kasih telah berbelanja di Luvira! ✨\nPesanan Kakak dengan No. Invoice *${order.invoiceNumber}* sebesar *${formatCurrency(order.totalPrice)}* saat ini berstatus: *${order.status}*.\n\nApakah ada hal yang ingin ditanyakan seputar pengiriman kaus kaki Luvira Kakak? 😊`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const confirmClearOrders = () => {
    clearOrders();
    showSuccess('Seluruh riwayat pesanan berhasil dibersihkan!');
    setShowClearOrdersConfirm(false);
  };

  return (
    <div className="min-h-screen bg-warm-cream text-muted-charcoal">
      {/* ========== SUCCESS TOAST NOTIFICATION ========== */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="bg-leaf-olive text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold border border-leaf-olive/50">
            <Check className="w-4 h-4" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* ========== TOP NAVIGATION BAR ========== */}
      <div className="bg-deep-forest text-warm-cream p-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" theme="dark" asLink />
            <div>
              <h1 className="font-extrabold text-sm sm:text-base tracking-wide uppercase flex items-center gap-2">
                Admin Portal
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-dusty-rose text-white tracking-wider uppercase">
                  CMS
                </span>
              </h1>
              <p className="text-[11px] text-warm-cream/70 hidden sm:block">
                Kelola produk, varian warna, harga, copywriting & riwayat pesanan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/admin/changelog"
              className="px-4 py-2 text-xs font-bold text-warm-cream border border-warm-cream/20 hover:bg-white/10 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Audit Trail</span>
            </Link>
            <Link
              href="/"
              className="px-4 py-2 text-xs font-bold text-deep-forest bg-warm-cream hover:bg-white rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lihat Storefront</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-xs font-bold text-white bg-dusty-rose hover:bg-dusty-rose/90 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========== TAB SWITCHER ========== */}
      <div className="bg-white border-b border-deep-forest/10 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex items-center gap-2 py-2 overflow-x-auto">
          {/* TAB 1: Products */}
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'bg-deep-forest text-warm-cream shadow-sm'
                : 'text-muted-charcoal/70 hover:bg-warm-cream hover:text-deep-forest'
            }`}
          >
            <Package className="w-4 h-4 text-dusty-rose" />
            <span>Manajemen Produk & Varian</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 ml-1">
              {totalProducts}
            </span>
          </button>

          {/* TAB 2: Copywriting */}
          <button
            onClick={() => setActiveTab('copywriting')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'copywriting'
                ? 'bg-deep-forest text-warm-cream shadow-sm'
                : 'text-muted-charcoal/70 hover:bg-warm-cream hover:text-deep-forest'
            }`}
          >
            <FileText className="w-4 h-4 text-leaf-olive" />
            <span>Editor Copywriting & Konten</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-leaf-olive text-white ml-1">
              CMS
            </span>
          </button>

          {/* TAB 3: Orders History */}
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-deep-forest text-warm-cream shadow-sm'
                : 'text-muted-charcoal/70 hover:bg-warm-cream hover:text-deep-forest'
            }`}
          >
            <Receipt className="w-4 h-4 text-dusty-rose" />
            <span>Riwayat Pesanan Masuk</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-deep-forest/20 text-deep-forest font-mono ml-1 font-bold">
              {mounted ? orders.length : 0}
            </span>
          </button>
        </div>
      </div>

      {/* ========== MAIN CONTENT CONTAINER ========== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 space-y-8">
        {/* ========================================================= */}
        {/* TAB 1: PRODUCT & VARIANT MANAGEMENT                       */}
        {/* ========================================================= */}
        {activeTab === 'products' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Quick Stats Grid */}
            {mounted && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-deep-forest/10 shadow-xs flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-deep-forest/10">
                    <Package className="w-6 h-6 text-deep-forest" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-deep-forest">{totalProducts}</div>
                    <div className="text-xs text-muted-charcoal/60 font-medium">
                      Total Produk Aktif
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-deep-forest/10 shadow-xs flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-leaf-olive/10">
                    <Palette className="w-6 h-6 text-leaf-olive" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-leaf-olive">{totalVariants}</div>
                    <div className="text-xs text-muted-charcoal/60 font-medium">
                      Total Varian Warna
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-deep-forest/10 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-dusty-rose/10">
                      <Settings className="w-6 h-6 text-dusty-rose" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-muted-charcoal">Quick Action</div>
                      <div className="text-[11px] text-muted-charcoal/60">Reset seed data</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="px-3 py-2 text-xs font-bold text-dusty-rose bg-dusty-rose/10 hover:bg-dusty-rose/20 rounded-xl border border-dusty-rose/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Produk</span>
                  </button>
                </div>
              </div>
            )}

            {/* Add / Edit Form Section */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-lg font-extrabold text-deep-forest flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-leaf-olive" />
                  <span>{editingProductId ? 'Edit Produk' : 'Tambah Produk Baru'}</span>
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCategoryModal(true)}
                    className="px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 bg-white border border-leaf-olive text-leaf-olive hover:bg-leaf-olive hover:text-white shadow-xs"
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>Kelola Kategori</span>
                  </button>
                  <button
                    onClick={() => {
                      if (showForm && editingProductId) {
                        setEditingProductId(null);
                        setFormData(createEmptyForm());
                        setFormErrors({});
                      }
                      setShowForm(!showForm);
                    }}
                    className="px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 bg-deep-forest text-warm-cream hover:bg-deep-forest/90 shadow-xs"
                  >
                    {showForm ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>Tutup Form</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Produk</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {showForm && (
                <form
                  onSubmit={handleProductSubmit}
                  className="bg-white p-6 rounded-3xl border border-deep-forest/10 shadow-sm space-y-6 animate-in fade-in slide-in-from-top-2 duration-300"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Nama Produk *"
                      placeholder="Contoh: Emboss Split Toe Socks"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      error={formErrors.name}
                    />
                    <div className="w-full space-y-1.5">
                      <label className="block text-xs font-semibold text-muted-charcoal">
                        Model Kategori *
                      </label>
                      <select
                        value={formData.model}
                        onChange={(e) =>
                          setFormData({ ...formData, model: e.target.value as ModelType })
                        }
                        className="w-full px-4 py-3 bg-white border border-muted-charcoal/20 rounded-2xl text-sm text-muted-charcoal focus:outline-none focus:ring-2 focus:ring-deep-forest/40 focus:border-deep-forest transition-all duration-200 cursor-pointer"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Input
                      label="Harga (IDR) *"
                      placeholder="35000"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      error={formErrors.price}
                    />
                    <Input
                      label="Harga Coret (IDR)"
                      placeholder="45000"
                      type="number"
                      value={formData.originalPrice}
                      onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                    />
                    <Input
                      label="Rating (1-5)"
                      placeholder="4.9"
                      type="number"
                      value={formData.rating}
                      onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                    />
                    <Input
                      label="Jumlah Review"
                      placeholder="128"
                      type="number"
                      value={formData.reviewsCount}
                      onChange={(e) => setFormData({ ...formData, reviewsCount: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Input
                      label="Badge Promosi (Opsional)"
                      placeholder="Ketik custom atau klik preset di bawah"
                      value={formData.badge}
                      onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {BADGE_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setFormData({ ...formData, badge: preset })}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                            formData.badge === preset
                              ? 'bg-dusty-rose text-white border-dusty-rose'
                              : 'bg-warm-cream text-muted-charcoal/70 border-gray-200 hover:bg-white'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Textarea
                    label="Deskripsi Produk *"
                    placeholder="Tulis deskripsi produk yang menarik..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    error={formErrors.description}
                  />

                  {/* Dynamic Features List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-muted-charcoal">
                        Fitur Keunggulan
                      </label>
                      <button
                        type="button"
                        onClick={addFeatureToForm}
                        className="text-[11px] font-bold text-leaf-olive hover:text-deep-forest flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Tambah Fitur
                      </button>
                    </div>
                    {formData.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={feat}
                          onChange={(e) => updateFeature(idx, e.target.value)}
                          placeholder={`Fitur #${idx + 1}, misal: Split-Toe Ergonomis`}
                          className="flex-1 px-3 py-2 bg-warm-cream border border-muted-charcoal/15 rounded-xl text-xs text-muted-charcoal placeholder-muted-charcoal/40 focus:outline-none focus:ring-1 focus:ring-deep-forest/30 transition-all"
                        />
                        {formData.features.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeFeatureFromForm(idx)}
                            className="p-1.5 text-dusty-rose hover:bg-dusty-rose/10 rounded-lg cursor-pointer transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Dynamic Variant Color Manager */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-t border-deep-forest/10 pt-4">
                      <label className="text-xs font-bold text-deep-forest flex items-center gap-1.5">
                        <Palette className="w-4 h-4 text-leaf-olive" />
                        Varian Warna Produk *
                      </label>
                      <button
                        type="button"
                        onClick={addVariantToForm}
                        className="px-3 py-1.5 text-[11px] font-bold text-deep-forest bg-deep-forest/5 hover:bg-deep-forest/10 rounded-lg border border-deep-forest/15 cursor-pointer transition-all flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Tambah Varian
                      </button>
                    </div>

                    {formErrors.variants && (
                      <p className="text-xs text-rose-500 font-medium">{formErrors.variants}</p>
                    )}

                    {formData.variants.map((variant, idx) => (
                      <div
                        key={variant.id}
                        className="p-4 bg-warm-cream rounded-2xl border border-deep-forest/10 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-deep-forest">
                            Varian #{idx + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-deep-forest/10 shadow-xs">
                              <label className="text-[10px] font-bold text-deep-forest">Stok:</label>
                              <input
                                type="number"
                                min="0"
                                value={variant.stock}
                                onChange={(e) => updateVariantField(idx, 'stock', parseInt(e.target.value) || 0)}
                                className="w-14 px-2 py-0.5 text-xs text-center border-b border-muted-charcoal/20 focus:outline-none focus:border-deep-forest"
                              />
                            </div>
                            {formData.variants.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeVariantFromForm(idx)}
                                className="p-1 text-dusty-rose hover:bg-dusty-rose/10 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-muted-charcoal/70">
                              Nama Warna
                            </label>
                            <input
                              type="text"
                              value={variant.name}
                              onChange={(e) => updateVariantField(idx, 'name', e.target.value)}
                              placeholder="Sage Green"
                              className="w-full px-3 py-2 bg-white border border-muted-charcoal/15 rounded-xl text-xs text-muted-charcoal placeholder-muted-charcoal/40 focus:outline-none focus:ring-1 focus:ring-deep-forest/30 transition-all"
                            />
                            {formErrors[`variant-name-${idx}`] && (
                              <p className="text-[10px] text-rose-500">
                                {formErrors[`variant-name-${idx}`]}
                              </p>
                            )}
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-muted-charcoal/70">
                              Hex Color
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={variant.hex}
                                onChange={(e) => updateVariantField(idx, 'hex', e.target.value)}
                                className="w-10 h-10 rounded-xl border border-muted-charcoal/15 cursor-pointer overflow-hidden"
                              />
                              <input
                                type="text"
                                value={variant.hex}
                                onChange={(e) => updateVariantField(idx, 'hex', e.target.value)}
                                placeholder="#E8D5C4"
                                className="flex-1 px-3 py-2 bg-white border border-muted-charcoal/15 rounded-xl text-xs font-mono text-muted-charcoal focus:outline-none focus:ring-1 focus:ring-deep-forest/30 transition-all"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-muted-charcoal/70">
                              Foto Produk
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={
                                  variant.image.startsWith('data:')
                                    ? '📷 Uploaded File'
                                    : variant.image
                                }
                                onChange={(e) => updateVariantField(idx, 'image', e.target.value)}
                                placeholder="URL atau upload file"
                                className="flex-1 px-3 py-2 bg-white border border-muted-charcoal/15 rounded-xl text-xs text-muted-charcoal placeholder-muted-charcoal/40 focus:outline-none focus:ring-1 focus:ring-deep-forest/30 transition-all"
                                readOnly={variant.image.startsWith('data:')}
                              />
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={(el) => {
                                  if (el) fileInputRefs.current.set(variant.id, el);
                                }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageUpload(idx, file);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => fileInputRefs.current.get(variant.id)?.click()}
                                className="p-2 text-deep-forest bg-deep-forest/5 hover:bg-deep-forest/10 rounded-xl border border-deep-forest/15 cursor-pointer transition-all"
                                title="Upload file gambar lokal (Base64)"
                              >
                                <Upload className="w-3.5 h-3.5" />
                              </button>
                              {/* FIX: Tombol clear agar user bisa switch dari Base64 kembali ke URL */}
                              {variant.image && (
                                <button
                                  type="button"
                                  onClick={() => updateVariantField(idx, 'image', '')}
                                  className="p-2 text-dusty-rose bg-dusty-rose/5 hover:bg-dusty-rose/10 rounded-xl border border-dusty-rose/15 cursor-pointer transition-all"
                                  title="Hapus gambar — ketik URL baru atau upload ulang"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            {formErrors[`variant-image-${idx}`] && (
                              <p className="text-[10px] text-rose-500">
                                {formErrors[`variant-image-${idx}`]}
                              </p>
                            )}
                            {variant.image && (
                              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-warm-cream border border-deep-forest/10 mt-1">
                                <Image
                                  src={variant.image}
                                  alt={variant.name || 'Preview'}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-deep-forest/10">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="flex-1 font-bold py-3.5"
                    >
                      <Save className="w-4 h-4" />
                      <span>{editingProductId ? 'Simpan Perubahan' : 'Tambah Produk'}</span>
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditingProductId(null);
                        setFormData(createEmptyForm());
                        setFormErrors({});
                      }}
                      className="px-4 py-3.5 text-sm font-bold text-muted-charcoal/70 bg-muted-charcoal/5 hover:bg-muted-charcoal/10 rounded-2xl transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Catalog Table Section */}
            {mounted && (
              <div className="space-y-4">
                <h2 className="text-lg font-extrabold text-deep-forest flex items-center gap-2">
                  <Package className="w-5 h-5 text-leaf-olive" />
                  <span>Katalog Produk ({totalProducts} produk)</span>
                </h2>

                {products.length === 0 ? (
                  <div className="bg-white p-8 rounded-3xl border border-deep-forest/10 shadow-xs text-center space-y-3">
                    <div className="w-14 h-14 bg-deep-forest/10 rounded-full flex items-center justify-center mx-auto">
                      <Package className="w-7 h-7 text-deep-forest" />
                    </div>
                    <p className="text-sm font-bold text-muted-charcoal">
                      Belum ada produk di katalog
                    </p>
                    <p className="text-xs text-muted-charcoal/60">
                      Tambah produk baru atau reset ke data default.
                    </p>
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        onClick={() => setShowForm(true)}
                        className="px-4 py-2 text-xs font-bold text-warm-cream bg-deep-forest rounded-xl cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Produk
                      </button>
                      <button
                        onClick={() => setShowResetConfirm(true)}
                        className="px-4 py-2 text-xs font-bold text-dusty-rose bg-dusty-rose/10 border border-dusty-rose/20 rounded-xl cursor-pointer flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset Default
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="group bg-white p-4 sm:p-5 rounded-2xl border border-deep-forest/10 shadow-xs hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-warm-cream overflow-hidden shrink-0 border border-deep-forest/10">
                            {product.variants[0]?.image ? (
                              <Image
                                src={product.variants[0].image}
                                alt={product.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-muted-charcoal/30" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-sm text-muted-charcoal truncate">
                                {product.name}
                              </h3>
                              {product.badge && (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-dusty-rose/15 text-dusty-rose border border-dusty-rose/20">
                                  {product.badge}
                                </span>
                              )}
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-deep-forest/10 text-deep-forest">
                                {categories.find((c) => c.id === product.model)?.label}
                              </span>
                            </div>

                            {/* Price with Inline Edit */}
                            <div className="flex items-center gap-2">
                              {inlineEditId === product.id ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    value={inlinePrice}
                                    onChange={(e) => setInlinePrice(e.target.value)}
                                    className="w-28 px-2 py-1 text-xs border border-deep-forest/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-deep-forest/30"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveInlinePrice(product.id);
                                      if (e.key === 'Escape') setInlineEditId(null);
                                    }}
                                  />
                                  <button
                                    onClick={() => saveInlinePrice(product.id)}
                                    className="p-1 text-leaf-olive hover:bg-leaf-olive/10 rounded cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setInlineEditId(null)}
                                    className="p-1 text-dusty-rose hover:bg-dusty-rose/10 rounded cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setInlineEditId(product.id);
                                    setInlinePrice(product.price.toString());
                                  }}
                                  className="text-sm font-extrabold text-deep-forest hover:text-leaf-olive transition-colors cursor-pointer flex items-center gap-1"
                                  title="Klik untuk edit cepat harga"
                                >
                                  {formatCurrency(product.price)}
                                  <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                                </button>
                              )}
                              {product.originalPrice && (
                                <span className="text-xs text-muted-charcoal/40 line-through">
                                  {formatCurrency(product.originalPrice)}
                                </span>
                              )}
                            </div>

                            {/* Swatches with Stock Toggle */}
                            <div className="flex items-center gap-1.5 flex-wrap pt-1">
                              {product.variants.map((v) => (
                                <button
                                  key={v.id}
                                  onClick={() => {
                                    const val = window.prompt(`Update stok untuk ${v.name}:`, v.stock.toString());
                                    if (val !== null) {
                                      const newStock = parseInt(val, 10);
                                      if (!isNaN(newStock)) {
                                        updateVariantStock(product.id, v.id, newStock);
                                      }
                                    }
                                  }}
                                  title={`${v.name} — ${v.stock > 0 ? `Stok: ${v.stock}` : 'Habis'} (klik untuk ubah)`}
                                  className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer relative ${
                                    v.stock > 0
                                      ? 'border-leaf-olive/40 shadow-xs'
                                      : 'border-dusty-rose/40 opacity-40'
                                  }`}
                                  style={{ backgroundColor: v.hex }}
                                >
                                  {v.stock === 0 && (
                                    <span className="absolute inset-0 flex items-center justify-center">
                                      <X className="w-3 h-3 text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
                                    </span>
                                  )}
                                </button>
                              ))}
                              <span className="text-[10px] text-muted-charcoal/50 ml-1">
                                {product.variants.filter((v) => v.stock > 0).length}/
                                {product.variants.length} aktif
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                            <button
                              onClick={() => handleEditProduct(product)}
                              className="px-3 py-2 text-xs font-bold text-deep-forest bg-deep-forest/5 hover:bg-deep-forest/10 rounded-xl border border-deep-forest/15 cursor-pointer transition-all flex items-center gap-1.5"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(product.id)}
                              className="px-3 py-2 text-xs font-bold text-dusty-rose bg-dusty-rose/5 hover:bg-dusty-rose/10 rounded-xl border border-dusty-rose/15 cursor-pointer transition-all flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: COPYWRITING & CONTENT CMS                          */}
        {/* ========================================================= */}
        {activeTab === 'copywriting' && (
          <form
            onSubmit={handleSaveCopywriting}
            className="space-y-8 animate-in fade-in duration-300"
          >
            {/* Action Bar: Presets & Controls */}
            <div className="bg-white p-5 rounded-3xl border border-deep-forest/10 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-extrabold text-deep-forest flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-leaf-olive" />
                  <span>Preset Tema Copywriting Instan</span>
                </h2>
                <p className="text-xs text-muted-charcoal/70 mt-0.5">
                  Pilih salah satu template tema di bawah atau sesuaikan teks per bagian secara manual.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => applySeasonalPreset('ramadan')}
                  className="px-3 py-1.5 text-xs font-bold text-deep-forest bg-deep-forest/10 hover:bg-deep-forest/20 rounded-xl transition-all cursor-pointer"
                >
                  🌙 Tema Ramadan / Umroh
                </button>
                <button
                  type="button"
                  onClick={() => applySeasonalPreset('gajian')}
                  className="px-3 py-1.5 text-xs font-bold text-dusty-rose bg-dusty-rose/10 hover:bg-dusty-rose/20 rounded-xl transition-all cursor-pointer"
                >
                  ⚡ Tema Payday Sale
                </button>
                <button
                  type="button"
                  onClick={() => applySeasonalPreset('mahasiswi')}
                  className="px-3 py-1.5 text-xs font-bold text-leaf-olive bg-leaf-olive/10 hover:bg-leaf-olive/20 rounded-xl transition-all cursor-pointer"
                >
                  🎒 Tema Mahasiswi Aktif
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetContentConfirm(true)}
                  className="px-3 py-1.5 text-xs font-bold text-muted-charcoal/70 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Teks
                </button>
              </div>
            </div>

            {/* Section 1: Hero & Announcement */}
            <div className="bg-white p-6 rounded-3xl border border-deep-forest/10 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-deep-forest/10">
                <Sparkles className="w-5 h-5 text-dusty-rose" />
                <h3 className="font-extrabold text-sm text-deep-forest uppercase tracking-wider">
                  1. Hero Section & Banner Promo
                </h3>
              </div>

              <Input
                label="Teks Banner Promo Berjalan (Top Strip) *"
                value={copyForm.hero.announcement}
                onChange={(e) =>
                  setCopyForm({
                    ...copyForm,
                    hero: { ...copyForm.hero, announcement: e.target.value },
                  })
                }
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Tagline Brand di Bawah Logo *"
                  value={copyForm.hero.tagline}
                  onChange={(e) =>
                    setCopyForm({
                      ...copyForm,
                      hero: { ...copyForm.hero, tagline: e.target.value },
                    })
                  }
                />
                <Input
                  label="Badge Pill di Atas Headline *"
                  value={copyForm.hero.badge}
                  onChange={(e) =>
                    setCopyForm({
                      ...copyForm,
                      hero: { ...copyForm.hero, badge: e.target.value },
                    })
                  }
                />
              </div>

              <Input
                label="Headline Utama (H1) *"
                value={copyForm.hero.headline}
                onChange={(e) =>
                  setCopyForm({
                    ...copyForm,
                    hero: { ...copyForm.hero, headline: e.target.value },
                  })
                }
              />

              <Textarea
                label="Sub-headline / Deskripsi Hero *"
                value={copyForm.hero.subheadline}
                onChange={(e) =>
                  setCopyForm({
                    ...copyForm,
                    hero: { ...copyForm.hero, subheadline: e.target.value },
                  })
                }
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Teks Tombol CTA Utama *"
                  value={copyForm.hero.ctaText}
                  onChange={(e) =>
                    setCopyForm({
                      ...copyForm,
                      hero: { ...copyForm.hero, ctaText: e.target.value },
                    })
                  }
                />
                <Input
                  label="Trust Badge 1 (Kiri)"
                  value={copyForm.hero.trustBadge1}
                  onChange={(e) =>
                    setCopyForm({
                      ...copyForm,
                      hero: { ...copyForm.hero, trustBadge1: e.target.value },
                    })
                  }
                />
                <Input
                  label="Trust Badge 2 (Kanan)"
                  value={copyForm.hero.trustBadge2}
                  onChange={(e) =>
                    setCopyForm({
                      ...copyForm,
                      hero: { ...copyForm.hero, trustBadge2: e.target.value },
                    })
                  }
                />
              </div>
            </div>

            {/* Section 2: About Luvira (3 Pillars) */}
            <div className="bg-white p-6 rounded-3xl border border-deep-forest/10 shadow-xs space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-deep-forest/10">
                <HeartHandshake className="w-5 h-5 text-leaf-olive" />
                <h3 className="font-extrabold text-sm text-deep-forest uppercase tracking-wider">
                  2. Filosofi Brand & 3 Pilar (About Luvira)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Badge Section About *"
                  value={copyForm.about.badge}
                  onChange={(e) =>
                    setCopyForm({
                      ...copyForm,
                      about: { ...copyForm.about, badge: e.target.value },
                    })
                  }
                />
                <Input
                  label="Judul Utama Section About *"
                  value={copyForm.about.title}
                  onChange={(e) =>
                    setCopyForm({
                      ...copyForm,
                      about: { ...copyForm.about, title: e.target.value },
                    })
                  }
                />
              </div>

              <Textarea
                label="Deskripsi Pengantar Filosofi *"
                value={copyForm.about.description}
                onChange={(e) =>
                  setCopyForm({
                    ...copyForm,
                    about: { ...copyForm.about, description: e.target.value },
                  })
                }
              />

              {/* 3 Pillars Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* Pillar 1: Modest */}
                <div className="p-4 bg-warm-cream rounded-2xl border border-deep-forest/10 space-y-2.5">
                  <span className="text-xs font-black text-deep-forest uppercase">
                    Pilar 1 — Modest
                  </span>
                  <Input
                    label="Judul Pilar"
                    value={copyForm.about.pillars.modest.title}
                    onChange={(e) =>
                      setCopyForm({
                        ...copyForm,
                        about: {
                          ...copyForm.about,
                          pillars: {
                            ...copyForm.about.pillars,
                            modest: {
                              ...copyForm.about.pillars.modest,
                              title: e.target.value,
                            },
                          },
                        },
                      })
                    }
                  />
                  <Input
                    label="Sub-judul Catchphrase"
                    value={copyForm.about.pillars.modest.subtitle}
                    onChange={(e) =>
                      setCopyForm({
                        ...copyForm,
                        about: {
                          ...copyForm.about,
                          pillars: {
                            ...copyForm.about.pillars,
                            modest: {
                              ...copyForm.about.pillars.modest,
                              subtitle: e.target.value,
                            },
                          },
                        },
                      })
                    }
                  />
                  <Textarea
                    label="Penjelasan Narasi"
                    value={copyForm.about.pillars.modest.description}
                    onChange={(e) =>
                      setCopyForm({
                        ...copyForm,
                        about: {
                          ...copyForm.about,
                          pillars: {
                            ...copyForm.about.pillars,
                            modest: {
                              ...copyForm.about.pillars.modest,
                              description: e.target.value,
                            },
                          },
                        },
                      })
                    }
                  />
                </div>

                {/* Pillar 2: Comfortable */}
                <div className="p-4 bg-warm-cream rounded-2xl border border-deep-forest/10 space-y-2.5">
                  <span className="text-xs font-black text-leaf-olive uppercase">
                    Pilar 2 — Comfortable
                  </span>
                  <Input
                    label="Judul Pilar"
                    value={copyForm.about.pillars.comfortable.title}
                    onChange={(e) =>
                      setCopyForm({
                        ...copyForm,
                        about: {
                          ...copyForm.about,
                          pillars: {
                            ...copyForm.about.pillars,
                            comfortable: {
                              ...copyForm.about.pillars.comfortable,
                              title: e.target.value,
                            },
                          },
                        },
                      })
                    }
                  />
                  <Input
                    label="Sub-judul Catchphrase"
                    value={copyForm.about.pillars.comfortable.subtitle}
                    onChange={(e) =>
                      setCopyForm({
                        ...copyForm,
                        about: {
                          ...copyForm.about,
                          pillars: {
                            ...copyForm.about.pillars,
                            comfortable: {
                              ...copyForm.about.pillars.comfortable,
                              subtitle: e.target.value,
                            },
                          },
                        },
                      })
                    }
                  />
                  <Textarea
                    label="Penjelasan Narasi"
                    value={copyForm.about.pillars.comfortable.description}
                    onChange={(e) =>
                      setCopyForm({
                        ...copyForm,
                        about: {
                          ...copyForm.about,
                          pillars: {
                            ...copyForm.about.pillars,
                            comfortable: {
                              ...copyForm.about.pillars.comfortable,
                              description: e.target.value,
                            },
                          },
                        },
                      })
                    }
                  />
                </div>

                {/* Pillar 3: Chic */}
                <div className="p-4 bg-warm-cream rounded-2xl border border-deep-forest/10 space-y-2.5">
                  <span className="text-xs font-black text-dusty-rose uppercase">
                    Pilar 3 — Chic
                  </span>
                  <Input
                    label="Judul Pilar"
                    value={copyForm.about.pillars.chic.title}
                    onChange={(e) =>
                      setCopyForm({
                        ...copyForm,
                        about: {
                          ...copyForm.about,
                          pillars: {
                            ...copyForm.about.pillars,
                            chic: {
                              ...copyForm.about.pillars.chic,
                              title: e.target.value,
                            },
                          },
                        },
                      })
                    }
                  />
                  <Input
                    label="Sub-judul Catchphrase"
                    value={copyForm.about.pillars.chic.subtitle}
                    onChange={(e) =>
                      setCopyForm({
                        ...copyForm,
                        about: {
                          ...copyForm.about,
                          pillars: {
                            ...copyForm.about.pillars,
                            chic: {
                              ...copyForm.about.pillars.chic,
                              subtitle: e.target.value,
                            },
                          },
                        },
                      })
                    }
                  />
                  <Textarea
                    label="Penjelasan Narasi"
                    value={copyForm.about.pillars.chic.description}
                    onChange={(e) =>
                      setCopyForm({
                        ...copyForm,
                        about: {
                          ...copyForm.about,
                          pillars: {
                            ...copyForm.about.pillars,
                            chic: {
                              ...copyForm.about.pillars.chic,
                              description: e.target.value,
                            },
                          },
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Feature Highlights (100% Dynamic with custom names, e.g. 100% Premium Nylon) */}
            <div className="bg-white p-6 rounded-3xl border border-deep-forest/10 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-deep-forest/10 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Footprints className="w-5 h-5 text-deep-forest" />
                  <h3 className="font-extrabold text-sm text-deep-forest uppercase tracking-wider">
                    3. Fitur Teknologi & Material Kaus Kaki
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={addTechFeature}
                  className="px-3 py-1.5 text-xs font-bold text-deep-forest bg-deep-forest/5 hover:bg-deep-forest/10 rounded-xl border border-deep-forest/15 cursor-pointer transition-all flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Poin Fitur
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Badge Section Fitur *"
                  value={copyForm.features.badge}
                  onChange={(e) =>
                    setCopyForm({
                      ...copyForm,
                      features: { ...copyForm.features, badge: e.target.value },
                    })
                  }
                />
                <Input
                  label="Judul Utama Section Fitur *"
                  value={copyForm.features.title}
                  onChange={(e) =>
                    setCopyForm({
                      ...copyForm,
                      features: { ...copyForm.features, title: e.target.value },
                    })
                  }
                />
              </div>

              <Textarea
                label="Deskripsi Pengantar Fitur *"
                value={copyForm.features.description}
                onChange={(e) =>
                  setCopyForm({
                    ...copyForm,
                    features: { ...copyForm.features, description: e.target.value },
                  })
                }
              />

              {/* Dynamic Feature Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                {(Array.isArray(copyForm.features.items)
                  ? copyForm.features.items
                  : DEFAULT_SITE_CONTENT.features.items
                ).map((feature, idx) => (
                  <div
                    key={feature.id || idx}
                    className="p-4 bg-warm-cream rounded-2xl border border-deep-forest/10 space-y-2.5 flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-deep-forest uppercase">
                          Fitur #{idx + 1}
                        </span>
                        {(Array.isArray(copyForm.features.items)
                          ? copyForm.features.items
                          : DEFAULT_SITE_CONTENT.features.items
                        ).length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTechFeature(idx)}
                            className="p-1 text-dusty-rose hover:bg-dusty-rose/10 rounded-lg cursor-pointer"
                            title="Hapus Poin Fitur"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <Input
                        label="Nama Fitur / Material"
                        placeholder="Contoh: 100% Premium Nylon"
                        value={feature.title}
                        onChange={(e) => updateTechFeatureField(idx, 'title', e.target.value)}
                      />
                      <Input
                        label="Sub-badge / Tagline"
                        placeholder="Contoh: Serat Kuat & Adem"
                        value={feature.subtitle}
                        onChange={(e) => updateTechFeatureField(idx, 'subtitle', e.target.value)}
                      />
                      <Textarea
                        label="Manfaat & Penjelasan"
                        placeholder="Jelaskan keunggulan fitur ini..."
                        value={feature.description}
                        onChange={(e) => updateTechFeatureField(idx, 'description', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4: Microcopy & Cart */}
            <div className="bg-white p-6 rounded-3xl border border-deep-forest/10 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-deep-forest/10">
                <ShoppingBag className="w-5 h-5 text-dusty-rose" />
                <h3 className="font-extrabold text-sm text-deep-forest uppercase tracking-wider">
                  4. Microcopy Keranjang & Katalog
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Pesan Promo Subsidi Ongkir di Keranjang"
                  value={copyForm.microcopy.cartPromo}
                  onChange={(e) =>
                    setCopyForm({
                      ...copyForm,
                      microcopy: { ...copyForm.microcopy, cartPromo: e.target.value },
                    })
                  }
                />
                <Input
                  label="Tombol Belanja Saat Keranjang Kosong"
                  value={copyForm.microcopy.cartCta}
                  onChange={(e) =>
                    setCopyForm({
                      ...copyForm,
                      microcopy: { ...copyForm.microcopy, cartCta: e.target.value },
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Judul Saat Keranjang Kosong"
                  value={copyForm.microcopy.cartEmptyTitle}
                  onChange={(e) =>
                    setCopyForm({
                      ...copyForm,
                      microcopy: { ...copyForm.microcopy, cartEmptyTitle: e.target.value },
                    })
                  }
                />
                <Input
                  label="Pesan Dorongan Saat Keranjang Kosong"
                  value={copyForm.microcopy.cartEmptySubtitle}
                  onChange={(e) =>
                    setCopyForm({
                      ...copyForm,
                      microcopy: { ...copyForm.microcopy, cartEmptySubtitle: e.target.value },
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Badge Katalog Produk"
                  value={copyForm.microcopy.catalogBadge}
                  onChange={(e) =>
                    setCopyForm({
                      ...copyForm,
                      microcopy: { ...copyForm.microcopy, catalogBadge: e.target.value },
                    })
                  }
                />
                <Input
                  label="Judul Heading Katalog Produk"
                  value={copyForm.microcopy.catalogTitle}
                  onChange={(e) =>
                    setCopyForm({
                      ...copyForm,
                      microcopy: { ...copyForm.microcopy, catalogTitle: e.target.value },
                    })
                  }
                />
                <Input
                  label="Sub-judul Deskripsi Katalog"
                  value={copyForm.microcopy.catalogSubtitle}
                  onChange={(e) =>
                    setCopyForm({
                      ...copyForm,
                      microcopy: { ...copyForm.microcopy, catalogSubtitle: e.target.value },
                    })
                  }
                />
              </div>
            </div>

            {/* Sticky Floating Save Bar */}
            <div className="sticky bottom-4 z-40 bg-deep-forest text-warm-cream p-4 rounded-2xl shadow-2xl border border-white/20 flex items-center justify-between gap-4">
              <div className="text-xs">
                <strong className="block text-sm text-white">Simpan Perubahan Copywriting?</strong>
                <span className="text-warm-cream/70">
                  Perubahan akan langsung tampil di etalase publik dan tersimpan di browser Anda.
                </span>
              </div>
              <Button type="submit" variant="rose" size="md" className="font-bold shrink-0">
                <Save className="w-4 h-4" />
                <span>Simpan Semua Teks</span>
              </Button>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* TAB 3: ORDER HISTORY & DIGITAL RECEIPTS                   */}
        {/* ========================================================= */}
        {activeTab === 'orders' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Quick Stats for Orders */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-deep-forest/10 shadow-xs flex items-center gap-4">
                <div className="p-3 rounded-xl bg-deep-forest/10">
                  <Receipt className="w-6 h-6 text-deep-forest" />
                </div>
                <div>
                  <div className="text-2xl font-black text-deep-forest">{mounted ? orders.length : 0}</div>
                  <div className="text-xs text-muted-charcoal/60 font-medium">Total Pesanan Masuk</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-deep-forest/10 shadow-xs flex items-center gap-4">
                <div className="p-3 rounded-xl bg-leaf-olive/10">
                  <Sparkles className="w-6 h-6 text-leaf-olive" />
                </div>
                <div>
                  <div className="text-2xl font-black text-leaf-olive">
                    {mounted ? formatCurrency(getTotalRevenue()) : 'Rp 0'}
                  </div>
                  <div className="text-xs text-muted-charcoal/60 font-medium">Total Omset Sandbox</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-deep-forest/10 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-dusty-rose/10">
                    <Clock className="w-6 h-6 text-dusty-rose" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-muted-charcoal">Perlu Diproses</div>
                    <div className="text-xs font-black text-dusty-rose">
                      {mounted ? orders.filter((o) => o.status !== 'Selesai').length : 0} Pesanan
                    </div>
                  </div>
                </div>
                {mounted && orders.length > 0 && (
                  <button
                    onClick={() => setShowClearOrdersConfirm(true)}
                    className="px-3 py-2 text-xs font-bold text-dusty-rose bg-dusty-rose/10 hover:bg-dusty-rose/20 rounded-xl border border-dusty-rose/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Semua</span>
                  </button>
                )}
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-3xl border border-deep-forest/10 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-deep-forest/10 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-base font-extrabold text-deep-forest flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-leaf-olive" />
                    <span>Daftar Pesanan Pelanggan</span>
                  </h2>
                  <p className="text-xs text-muted-charcoal/70 mt-0.5">
                    Data transaksi sandbox yang otomatis tersimpan di browser tanpa server eksternal.
                  </p>
                </div>
              </div>

              {mounted && orders.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-16 h-16 bg-deep-forest/5 rounded-full flex items-center justify-center mx-auto text-deep-forest/40">
                    <Receipt className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-muted-charcoal">Belum Ada Riwayat Pesanan</h3>
                  <p className="text-xs text-muted-charcoal/60 max-w-sm mx-auto">
                    Lakukan checkout simulasi di halaman /checkout untuk melihat data pesanan dan struk digital muncul di sini secara otomatis.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-warm-cream/80 text-deep-forest font-bold border-b border-deep-forest/10 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3.5 px-4">Invoice & Waktu</th>
                        <th className="py-3.5 px-4">Pelanggan</th>
                        <th className="py-3.5 px-4">Item Kaus Kaki</th>
                        <th className="py-3.5 px-4">Total & Metode</th>
                        <th className="py-3.5 px-4">Status Pesanan</th>
                        <th className="py-3.5 px-4 text-center">Aksi Cepat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {mounted &&
                        orders.map((order) => (
                          <tr key={order.id} className="hover:bg-warm-cream/30 transition-colors">
                            {/* Invoice & Date */}
                            <td className="py-3.5 px-4 align-top">
                              <span className="font-mono font-extrabold text-deep-forest text-xs block">
                                {order.invoiceNumber}
                              </span>
                              <span className="text-[10px] text-muted-charcoal/60 block mt-0.5">
                                {order.createdAt}
                              </span>
                              <span className={`inline-block mt-1 px-1.5 py-0.5 text-[9px] font-bold rounded-md uppercase ${order.paymentMethod === 'midtrans' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                {order.paymentMethod === 'midtrans' ? 'Midtrans' : 'Manual'}
                              </span>
                            </td>

                            {/* Customer */}
                            <td className="py-3.5 px-4 align-top space-y-0.5">
                              <strong className="text-muted-charcoal block">{order.customerInfo.name}</strong>
                              <span className="font-mono text-[11px] text-muted-charcoal/70 block">
                                {order.customerInfo.phone}
                              </span>
                              {order.customerInfo.address && (
                                <p className="text-[10px] text-muted-charcoal/60 line-clamp-1 max-w-xs">
                                  {order.customerInfo.address}
                                </p>
                              )}
                            </td>

                            {/* Items */}
                            <td className="py-3.5 px-4 align-top space-y-1">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                                  <span
                                    className="w-2 h-2 rounded-full border border-black/10 shrink-0 inline-block"
                                    style={{ backgroundColor: item.selectedVariant.hex }}
                                  />
                                  <span className="font-medium text-muted-charcoal truncate max-w-[150px]">
                                    {item.product.name} ({item.selectedVariant.name})
                                  </span>
                                  <span className="font-bold text-deep-forest">x{item.quantity}</span>
                                </div>
                              ))}
                            </td>

                            {/* Total & Payment */}
                            <td className="py-3.5 px-4 align-top">
                              <span className="font-extrabold text-deep-forest text-xs block">
                                {formatCurrency(order.totalPrice)}
                              </span>
                              <span className="text-[10px] text-muted-charcoal/70 block mt-0.5">
                                {order.paymentMethod}
                              </span>
                            </td>

                            {/* Status Dropdown — mendukung status Sandbox + Midtrans */}
                            <td className="py-3.5 px-4 align-top">
                              <select
                                value={order.status}
                                onChange={(e) => {
                                  updateOrderStatus(order.id, e.target.value as OrderStatus);
                                  showSuccess(`Status pesanan ${order.invoiceNumber} diubah ke "${e.target.value}"`);
                                }}
                                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer focus:outline-none ${
                                  order.status === 'selesai'
                                    ? 'bg-deep-forest text-white border-deep-forest'
                                    : order.status === 'dikonfirmasi'
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : order.status === 'diproses'
                                    ? 'bg-amber-600 text-white border-amber-600'
                                    : order.status === 'menunggu_verifikasi'
                                    ? 'bg-blue-500/15 text-blue-700 border-blue-500/30'
                                    : order.status === 'menunggu_transfer'
                                    ? 'bg-amber-500/15 text-amber-700 border-amber-500/30'
                                    : order.status === 'dibatalkan'
                                    ? 'bg-dusty-rose/15 text-dusty-rose border-dusty-rose/30'
                                    : 'bg-leaf-olive/15 text-leaf-olive border-leaf-olive/30'
                                }`}
                              >
                                <option value="menunggu_transfer" className="bg-white text-muted-charcoal">
                                  ⏳ Menunggu Transfer
                                </option>
                                <option value="menunggu_verifikasi" className="bg-white text-muted-charcoal">
                                  👀 Menunggu Verifikasi
                                </option>
                                <option value="dikonfirmasi" className="bg-white text-muted-charcoal">
                                  ✅ Dikonfirmasi
                                </option>
                                <option value="diproses" className="bg-white text-muted-charcoal">
                                  📦 Diproses
                                </option>
                                <option value="selesai" className="bg-white text-muted-charcoal">
                                  🎉 Selesai
                                </option>
                                <option value="dibatalkan" className="bg-white text-muted-charcoal">
                                  ❌ Dibatalkan
                                </option>
                              </select>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 align-top text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* View Receipt */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedReceiptOrder(order)}
                                  className="p-1.5 text-deep-forest bg-deep-forest/5 hover:bg-deep-forest/15 rounded-lg transition-all cursor-pointer"
                                  title="Lihat & Cetak Struk Digital"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>

                                {/* Phase 13: View Payment Proof */}
                                {order.paymentProofUrl && (
                                  <a
                                    href={order.paymentProofUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all cursor-pointer"
                                    title="Lihat Bukti Transfer"
                                  >
                                    <ImageIcon className="w-4 h-4" />
                                  </a>
                                )}

                                {/* Phase 13: Verifikasi Pembayaran */}
                                {order.status === 'menunggu_verifikasi' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Verifikasi pembayaran untuk pesanan ${order.invoiceNumber}?`)) {
                                        updateOrderStatus(order.id, 'dikonfirmasi');
                                        showSuccess(`Pembayaran ${order.invoiceNumber} diverifikasi!`);
                                      }
                                    }}
                                    className="p-1.5 text-leaf-olive bg-leaf-olive/10 hover:bg-leaf-olive/20 rounded-lg transition-all cursor-pointer"
                                    title="Verifikasi Pembayaran"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                )}

                                {/* Direct WhatsApp Chat */}
                                <a
                                  href={generateCustomerChatUrl(order)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all cursor-pointer"
                                  title="Kirim Pesan Konfirmasi ke WhatsApp Pelanggan"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </a>

                                {/* FIX: Delete Order dengan konfirmasi (sebelumnya langsung hapus) */}
                                <button
                                  type="button"
                                  onClick={() => setDeleteOrderConfirmId(order.id)}
                                  className="p-1.5 text-dusty-rose bg-dusty-rose/5 hover:bg-dusty-rose/15 rounded-lg transition-all cursor-pointer"
                                  title="Hapus dari Riwayat"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========== DELETE CONFIRMATION MODAL ========== */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-warm-cream p-6 rounded-3xl shadow-2xl border border-deep-forest/15 max-w-sm w-full space-y-4 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-dusty-rose/15 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-dusty-rose" />
            </div>
            <h3 className="text-base font-bold text-muted-charcoal">Hapus Produk?</h3>
            <p className="text-xs text-muted-charcoal/70">
              Produk &quot;{products.find((p) => p.id === deleteConfirmId)?.name}&quot; akan dihapus
              permanen dari katalog.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-muted-charcoal bg-muted-charcoal/5 hover:bg-muted-charcoal/10 rounded-2xl cursor-pointer transition-all"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-dusty-rose hover:bg-dusty-rose/90 rounded-2xl cursor-pointer transition-all shadow-sm"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== RESET PRODUCTS CONFIRMATION MODAL ========== */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-warm-cream p-6 rounded-3xl shadow-2xl border border-deep-forest/15 max-w-sm w-full space-y-4 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-deep-forest/10 flex items-center justify-center mx-auto">
              <RotateCcw className="w-7 h-7 text-deep-forest" />
            </div>
            <h3 className="text-base font-bold text-muted-charcoal">Reset ke Produk Default?</h3>
            <p className="text-xs text-muted-charcoal/70">
              Semua produk custom akan dikembalikan ke data bawaan awal (4 produk default Luvira).
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-muted-charcoal bg-muted-charcoal/5 hover:bg-muted-charcoal/10 rounded-2xl cursor-pointer transition-all"
              >
                Batal
              </button>
              <button
                onClick={confirmResetProducts}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-deep-forest hover:bg-deep-forest/90 rounded-2xl cursor-pointer transition-all shadow-sm"
              >
                Ya, Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== RESET CONTENT CONFIRMATION MODAL ========== */}
      {showResetContentConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-warm-cream p-6 rounded-3xl shadow-2xl border border-deep-forest/15 max-w-sm w-full space-y-4 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-dusty-rose/10 flex items-center justify-center mx-auto">
              <RotateCcw className="w-7 h-7 text-dusty-rose" />
            </div>
            <h3 className="text-base font-bold text-muted-charcoal">Reset Copywriting?</h3>
            <p className="text-xs text-muted-charcoal/70">
              Seluruh teks promosi, headline, about, dan fitur akan dikembalikan ke copywriting asli
              Luvira.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowResetContentConfirm(false)}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-muted-charcoal bg-muted-charcoal/5 hover:bg-muted-charcoal/10 rounded-2xl cursor-pointer transition-all"
              >
                Batal
              </button>
              <button
                onClick={confirmResetCopywriting}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-deep-forest hover:bg-deep-forest/90 rounded-2xl cursor-pointer transition-all shadow-sm"
              >
                Ya, Reset Teks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== CLEAR ORDERS CONFIRMATION MODAL ========== */}
      {showClearOrdersConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-warm-cream p-6 rounded-3xl shadow-2xl border border-deep-forest/15 max-w-sm w-full space-y-4 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-dusty-rose/10 flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7 text-dusty-rose" />
            </div>
            <h3 className="text-base font-bold text-muted-charcoal">Hapus Semua Pesanan?</h3>
            <p className="text-xs text-muted-charcoal/70">
              Seluruh riwayat transaksi sandbox lokal akan dihapus permanen dari browser ini.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowClearOrdersConfirm(false)}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-muted-charcoal bg-muted-charcoal/5 hover:bg-muted-charcoal/10 rounded-2xl cursor-pointer transition-all"
              >
                Batal
              </button>
              <button
                onClick={confirmClearOrders}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-dusty-rose hover:bg-dusty-rose/90 rounded-2xl cursor-pointer transition-all shadow-sm"
              >
                Ya, Bersihkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== DELETE ORDER CONFIRMATION MODAL ========== */}
      {/* FIX: Sebelumnya tombol hapus order langsung delete tanpa konfirmasi */}
      {deleteOrderConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-warm-cream p-6 rounded-3xl shadow-2xl border border-deep-forest/15 max-w-sm w-full space-y-4 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-dusty-rose/15 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-dusty-rose" />
            </div>
            <h3 className="text-base font-bold text-muted-charcoal">Hapus Pesanan?</h3>
            <p className="text-xs text-muted-charcoal/70">
              Pesanan &quot;{orders.find((o) => o.id === deleteOrderConfirmId)?.invoiceNumber}&quot; akan dihapus
              permanen dari riwayat.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeleteOrderConfirmId(null)}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-muted-charcoal bg-muted-charcoal/5 hover:bg-muted-charcoal/10 rounded-2xl cursor-pointer transition-all"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  const order = orders.find((o) => o.id === deleteOrderConfirmId);
                  deleteOrder(deleteOrderConfirmId);
                  showSuccess(`Pesanan ${order?.invoiceNumber} berhasil dihapus.`);
                  setDeleteOrderConfirmId(null);
                }}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-dusty-rose hover:bg-dusty-rose/90 rounded-2xl cursor-pointer transition-all shadow-sm"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== CATEGORY MANAGEMENT MODAL ========== */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-deep-forest/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 border border-deep-forest/10 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-deep-forest flex items-center gap-2">
                <Folder className="w-5 h-5 text-leaf-olive" />
                Kelola Kategori Model
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="p-2 bg-warm-cream text-muted-charcoal/60 hover:text-deep-forest hover:bg-leaf-olive/20 rounded-full transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 mb-8">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-4 rounded-xl bg-warm-cream border border-deep-forest/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg text-dusty-rose">
                      <Tag className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-deep-forest">{cat.label}</div>
                      <div className="text-[10px] font-mono text-muted-charcoal/60">ID: {cat.id}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if(window.confirm(`Yakin ingin menghapus kategori ${cat.label}?`)) {
                        deleteCategory(cat.id);
                        showSuccess(`Kategori ${cat.label} dihapus!`);
                      }
                    }}
                    className="p-2 text-dusty-rose hover:bg-dusty-rose/10 rounded-lg transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-deep-forest/10 pt-6 space-y-4">
              <h4 className="font-bold text-sm text-deep-forest">Tambah Kategori Baru</h4>
              <Input
                label="Nama Kategori (Label)"
                placeholder="Contoh: Sport Socks"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <div className="w-full space-y-1.5">
                <label className="block text-xs font-semibold text-muted-charcoal">
                  Pilih Ikon Default
                </label>
                <select
                  value={newCategoryIcon}
                  onChange={(e) => setNewCategoryIcon(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-muted-charcoal/20 rounded-2xl text-sm text-muted-charcoal focus:outline-none focus:ring-2 focus:ring-deep-forest/40 focus:border-deep-forest transition-all cursor-pointer"
                >
                  <option value="Tag">Tag</option>
                  <option value="Folder">Folder</option>
                  <option value="Sparkles">Sparkles</option>
                  <option value="Layers">Layers</option>
                  <option value="ShieldCheck">Shield</option>
                  <option value="Flame">Flame</option>
                </select>
              </div>
              <Button
                onClick={() => {
                  if(!newCategoryName.trim()) return;
                  const newId = newCategoryName.toLowerCase().replace(/[^a-z0-9]/g, '-');
                  addCategory({ id: newId, label: newCategoryName, iconName: newCategoryIcon });
                  setNewCategoryName('');
                  showSuccess(`Kategori ${newCategoryName} berhasil ditambahkan!`);
                }}
                disabled={!newCategoryName.trim()}
                className="w-full"
              >
                Tambah Kategori
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========== DIGITAL RECEIPT MODAL FOR ADMIN ========== */}
      <DigitalReceiptModal
        isOpen={!!selectedReceiptOrder}
        onClose={() => setSelectedReceiptOrder(null)}
        order={selectedReceiptOrder}
      />

      {/* ========== FOOTER ========== */}
      <footer className="p-6 text-center text-xs text-muted-charcoal/60 border-t border-deep-forest/10 mt-8">
        <div className="flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-deep-forest" />
          <span>Luvira Admin CMS • 100% Zero-Cost LocalStorage Persistence</span>
        </div>
      </footer>
    </div>
  );
}
