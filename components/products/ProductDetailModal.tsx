// ProductDetailModal.tsx — Interactive Product Detail Modal & Dynamic Storytelling Drawer.
// Provides in-depth visual showcase, dynamic color swatch switching, data-driven feature accordions,
// syar'i material education, care guide, and sticky checkout action bar with quantity counter.

'use client'; // Required for client-side interactivity, accordion state, and Zustand hooks

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Product, ColorVariant } from '@/types/product';
import { useCartStore } from '@/store/useCartStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  X,
  Star,
  Plus,
  Minus,
  Check,
  Sparkles,
  ShieldCheck,
  Heart,
  Droplets,
  HelpCircle,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  initialVariantId?: string;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  initialVariantId,
}) => {
  // Access cart store action to add items directly from modal
  const { addItem, openCart } = useCartStore();

  // State: Currently selected color variant
  const [selectedVariant, setSelectedVariant] = useState<ColorVariant | null>(null);

  // State: Purchase quantity (minimum 1)
  const [quantity, setQuantity] = useState<number>(1);

  // State: Button animation feedback when item added
  const [isAdded, setIsAdded] = useState<boolean>(false);

  // State: Deep-dive accordion active sections
  const [activeAccordion, setActiveAccordion] = useState<string>('features');

  // Sync selected variant and reset quantity whenever product or modal opens
  useEffect(() => {
    if (product && product.variants.length > 0) {
      if (initialVariantId) {
        const found = product.variants.find((v) => v.id === initialVariantId);
        setSelectedVariant(found || product.variants[0]);
      } else {
        setSelectedVariant(product.variants[0]);
      }
      setQuantity(1);
      setIsAdded(false);
      setActiveAccordion('features');
    }
  }, [product, initialVariantId, isOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !product || !selectedVariant) return null;

  // Currency Formatter
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Subtotal Calculation
  const subtotal = product.price * quantity;

  // Calculate discount percentage if originalPrice exists
  const discountPercent = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  // Handle Add to Cart
  const handleAddToCart = () => {
    if (!selectedVariant.inStock) return;

    addItem(product, selectedVariant, quantity);
    setIsAdded(true);

    setTimeout(() => {
      setIsAdded(false);
      onClose();
      openCart(); // Automatically open CartDrawer to delight user with progress
    }, 900);
  };

  // Toggle Accordion Section
  const toggleAccordion = (sectionKey: string) => {
    setActiveAccordion((prev) => (prev === sectionKey ? '' : sectionKey));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Dialog Window */}
      <div className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-deep-forest/15 overflow-hidden z-10 my-auto flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Top Header Bar */}
        <div className="px-5 py-4 border-b border-deep-forest/10 flex items-center justify-between bg-warm-cream/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-dusty-rose"></span>
            <span className="text-xs font-black tracking-widest text-deep-forest uppercase">
              Detail Koleksi Luvira
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/80 hover:bg-white text-muted-charcoal hover:text-deep-forest border border-deep-forest/10 transition-all cursor-pointer shadow-2xs"
            aria-label="Tutup Dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* Top Section: Split 2-Column Showcase */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            
            {/* Left: Product Visual Gallery */}
            <div className="space-y-3">
              <div className="relative aspect-square w-full rounded-2xl bg-warm-cream overflow-hidden border border-deep-forest/10 shadow-xs group">
                <Image
                  src={selectedVariant.image}
                  alt={`${product.name} - ${selectedVariant.name}`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  unoptimized
                />
                
                {/* Floating Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                  {product.badge && <Badge variant="rose">{product.badge}</Badge>}
                  {discountPercent && (
                    <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-leaf-olive text-white shadow-xs">
                      Hemat {discountPercent}%
                    </span>
                  )}
                </div>

                {/* Stock Status Watermark / Pill */}
                <div className="absolute bottom-3 right-3 z-10">
                  {selectedVariant.inStock ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-white/90 backdrop-blur-xs text-leaf-olive px-2.5 py-1 rounded-full shadow-xs border border-leaf-olive/20">
                      <CheckCircle2 className="w-3 h-3" /> Ready Stock
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-dusty-rose text-white px-2.5 py-1 rounded-full shadow-xs">
                      <AlertCircle className="w-3 h-3" /> Stok Habis
                    </span>
                  )}
                </div>
              </div>

              {/* Color Swatch Interactive Picker */}
              <div className="p-3.5 bg-warm-cream rounded-2xl border border-deep-forest/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-charcoal/70 font-medium">Pilihan Varian Warna:</span>
                  <span className="font-extrabold text-deep-forest">{selectedVariant.name}</span>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  {product.variants.map((v) => {
                    const isSelected = v.id === selectedVariant.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(v)}
                        className={`relative w-8 h-8 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center ${
                          isSelected
                            ? 'border-deep-forest scale-110 shadow-md ring-2 ring-deep-forest/30'
                            : 'border-white shadow-2xs hover:scale-105'
                        } ${!v.inStock ? 'opacity-50' : ''}`}
                        style={{ backgroundColor: v.hex }}
                        title={`${v.name} ${v.inStock ? '(Ready)' : '(Habis)'}`}
                      >
                        {isSelected && (
                          <Check
                            className={`w-4 h-4 ${
                              v.hex.toUpperCase() === '#FFFDF9' ||
                              v.hex.toUpperCase() === '#F7FAFC' ||
                              v.hex.toUpperCase() === '#FDFBF7'
                                ? 'text-deep-forest'
                                : 'text-white'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Product Storytelling, Price, & Overview */}
            <div className="space-y-4">
              
              {/* Product Title & Model Badge */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-leaf-olive bg-leaf-olive/10 px-2.5 py-0.5 rounded-full">
                    Model: {product.model}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-muted-charcoal/80">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-bold">{product.rating}</span>
                    <span>({product.reviewsCount} Ulasan)</span>
                  </div>
                </div>
                
                <h3 className="text-xl sm:text-2xl font-black text-deep-forest tracking-tight">
                  {product.name}
                </h3>
              </div>

              {/* Price Display */}
              <div className="flex items-baseline gap-2.5 pb-2 border-b border-deep-forest/10">
                <span className="text-2xl sm:text-3xl font-black text-deep-forest">
                  {formatCurrency(product.price)}
                </span>
                {product.originalPrice && (
                  <span className="text-sm text-muted-charcoal/40 line-through">
                    {formatCurrency(product.originalPrice)}
                  </span>
                )}
              </div>

              {/* Product Core Narrative */}
              <p className="text-xs sm:text-sm text-muted-charcoal/85 leading-relaxed">
                {product.description}
              </p>

              {/* Quick Trust Highlights */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 bg-warm-cream rounded-xl border border-deep-forest/5 flex items-center gap-2 text-xs font-semibold text-deep-forest">
                  <ShieldCheck className="w-4 h-4 text-dusty-rose shrink-0" />
                  <span>Garansi Anti-Meral</span>
                </div>
                <div className="p-2.5 bg-warm-cream rounded-xl border border-deep-forest/5 flex items-center gap-2 text-xs font-semibold text-deep-forest">
                  <Heart className="w-4 h-4 text-leaf-olive shrink-0" />
                  <span>Serat Premium Pilihan</span>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Section: Dynamic Deep-Dive Storytelling Accordions */}
          <div className="border-t border-deep-forest/10 pt-4 space-y-2.5">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-charcoal/70 flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-dusty-rose" />
              <span>Eksplorasi Fitur & Informasi Kualitas</span>
            </h4>

            {/* Accordion 1: Data-Driven Features List (Maps product.features dynamically) */}
            <div className="border border-deep-forest/10 rounded-2xl overflow-hidden bg-warm-cream/50 transition-all">
              <button
                type="button"
                onClick={() => toggleAccordion('features')}
                className="w-full px-4 py-3 text-left font-bold text-xs sm:text-sm text-deep-forest flex items-center justify-between cursor-pointer hover:bg-warm-cream"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-leaf-olive" />
                  Keunggulan Model & Desain Ergonomis
                </span>
                {activeAccordion === 'features' ? (
                  <ChevronUp className="w-4 h-4 text-deep-forest" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-charcoal/60" />
                )}
              </button>

              {activeAccordion === 'features' && (
                <div className="px-4 pb-4 pt-1 space-y-2 border-t border-deep-forest/5 text-xs text-muted-charcoal/90 animate-in fade-in duration-200">
                  <ul className="space-y-2">
                    {/* IN-CODE LOGIC: Maps product.features array dynamically so any product model renders its custom features without hardcoding */}
                    {product.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-dusty-rose shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Accordion 2: Syar'i & Material Comfort */}
            <div className="border border-deep-forest/10 rounded-2xl overflow-hidden bg-warm-cream/50 transition-all">
              <button
                type="button"
                onClick={() => toggleAccordion('material')}
                className="w-full px-4 py-3 text-left font-bold text-xs sm:text-sm text-deep-forest flex items-center justify-between cursor-pointer hover:bg-warm-cream"
              >
                <span className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-dusty-rose" />
                  Standar Mutu Material & Kenyamanan Syar&apos;i
                </span>
                {activeAccordion === 'material' ? (
                  <ChevronUp className="w-4 h-4 text-deep-forest" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-charcoal/60" />
                )}
              </button>

              {activeAccordion === 'material' && (
                <div className="px-4 pb-4 pt-1 space-y-2.5 border-t border-deep-forest/5 text-xs text-muted-charcoal/85 leading-relaxed animate-in fade-in duration-200">
                  <p>
                    Kaus kaki Luvira diproduksi menggunakan <strong>Serat Tekstil Berkualitas Tinggi Grade A</strong> yang halus, kuat, dan dirajut presisi untuk memastikan sirkulasi udara optimal serta ketahanan jangka panjang.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="p-2.5 bg-white rounded-xl border border-deep-forest/10">
                      <strong className="block text-deep-forest">✦ Daya Tutup Sempurna:</strong>
                      Rajutan rapat tidak menerawang, menjaga aurat kaki muslimah tetap aman di segala posisi.
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-deep-forest/10">
                      <strong className="block text-leaf-olive">✦ Wudhu & Activity Friendly:</strong>
                      Elastisitas lembut yang mudah digulung atau dilepas saat berwudhu tanpa rasa sesak berbekas.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 3: Care Guide */}
            <div className="border border-deep-forest/10 rounded-2xl overflow-hidden bg-warm-cream/50 transition-all">
              <button
                type="button"
                onClick={() => toggleAccordion('care')}
                className="w-full px-4 py-3 text-left font-bold text-xs sm:text-sm text-deep-forest flex items-center justify-between cursor-pointer hover:bg-warm-cream"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-leaf-olive" />
                  Panduan Perawatan (Care Guide)
                </span>
                {activeAccordion === 'care' ? (
                  <ChevronUp className="w-4 h-4 text-deep-forest" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-charcoal/60" />
                )}
              </button>

              {activeAccordion === 'care' && (
                <div className="px-4 pb-4 pt-1 space-y-2 border-t border-deep-forest/5 text-xs text-muted-charcoal/85 leading-relaxed animate-in fade-in duration-200">
                  <ul className="space-y-1.5">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-leaf-olive"></span>
                      <span>Cuci dengan air suhu ruang (maks 30°C) menggunakan deterjen lembut.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-leaf-olive"></span>
                      <span>Hindari penggunaan pemutih klorin agar elastisitas karet rajut tetap awet.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-leaf-olive"></span>
                      <span>Jemur di tempat teduh dengan sirkulasi udara baik (hindari paparan matahari terik langsung).</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-leaf-olive"></span>
                      <span>Simpan dalam keadaan terlipat rapi tanpa ditarik paksa.</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Sticky Action Bar (Footer) */}
        <div className="p-4 sm:p-5 bg-white border-t border-deep-forest/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 sticky bottom-0 z-20 shadow-lg">
          
          {/* Quantity Controls & Dynamic Subtotal */}
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <div className="flex items-center gap-2 bg-warm-cream border border-deep-forest/15 rounded-2xl px-2 py-1">
              <button
                type="button"
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                disabled={quantity <= 1 || !selectedVariant.inStock}
                className="p-1.5 rounded-xl text-muted-charcoal hover:text-deep-forest hover:bg-white transition-all disabled:opacity-40 cursor-pointer"
                aria-label="Kurangi Jumlah"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              
              <span className="font-extrabold text-sm text-deep-forest min-w-6 text-center">
                {quantity}
              </span>

              <button
                type="button"
                onClick={() => setQuantity((prev) => prev + 1)}
                disabled={!selectedVariant.inStock}
                className="p-1.5 rounded-xl text-muted-charcoal hover:text-deep-forest hover:bg-white transition-all disabled:opacity-40 cursor-pointer"
                aria-label="Tambah Jumlah"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <div className="text-[10px] text-muted-charcoal/60 uppercase font-semibold">
                Subtotal ({quantity} pasang)
              </div>
              <div className="text-base font-black text-deep-forest">
                {formatCurrency(subtotal)}
              </div>
            </div>
          </div>

          {/* CTA Action Button */}
          <Button
            onClick={handleAddToCart}
            disabled={!selectedVariant.inStock}
            variant={isAdded ? 'secondary' : 'primary'}
            size="lg"
            className="flex-1 sm:max-w-xs font-bold text-sm py-3.5 shadow-md transition-all duration-300"
          >
            {isAdded ? (
              <>
                <Check className="w-4 h-4" /> Masuk Keranjang!
              </>
            ) : !selectedVariant.inStock ? (
              <>Varian Stok Habis</>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" /> Tambah ke Keranjang
              </>
            )}
          </Button>

        </div>

      </div>
    </div>
  );
};
