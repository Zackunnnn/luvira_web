// ProductCard.tsx — Individual product card with quick-color swatch selector,
// direct add-to-cart, and interactive trigger for the deep-dive ProductDetailModal.

'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Product, ColorVariant } from '@/types/product';
import { ColorSelector } from './ColorSelector';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Star, Plus, Check, Eye, AlertCircle } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { ProductDetailModal } from './ProductDetailModal';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  // Active selected variant on the card
  const [selectedVariant, setSelectedVariant] = useState<ColorVariant>(product.variants[0]);
  const [added, setAdded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { addItem } = useCartStore();

  // Ensure selectedVariant is always valid even if admin removes/modifies variants
  useEffect(() => {
    if (product.variants.length > 0) {
      const exists = product.variants.find((v) => v.id === selectedVariant?.id);
      if (!exists) {
        setSelectedVariant(product.variants[0]);
      }
    }
  }, [product.variants, selectedVariant]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening modal when clicking quick-add
    if (selectedVariant.stock === 0) return;

    addItem(product, selectedVariant, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <>
      <div className="bg-white border border-deep-forest/10 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
        <div>
          {/* Product Image Container — Clicking opens Detail Storytelling Modal */}
          <div
            onClick={() => setShowModal(true)}
            className="relative aspect-square w-full bg-warm-cream overflow-hidden cursor-pointer"
          >
            <img
              key={selectedVariant.id}
              src={selectedVariant.image}
              alt={`${product.name} - ${selectedVariant.name}`}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
              decoding="async"
            />

            {/* Badges Overlay */}
            <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
              {product.badge && <Badge variant="rose">{product.badge}</Badge>}
            </div>

            {/* Stock indicator badge if out of stock */}
            {selectedVariant.stock === 0 && (
              <div className="absolute bottom-3 left-3 z-10">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-dusty-rose text-white px-2 py-0.5 rounded-full shadow-xs">
                  <AlertCircle className="w-3 h-3" /> Stok Habis
                </span>
              </div>
            )}

            {/* Low stock indicator */}
            {selectedVariant.stock > 0 && selectedVariant.stock <= 5 && (
              <div className="absolute bottom-3 left-3 z-10">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full shadow-xs">
                  <AlertCircle className="w-3 h-3" /> Sisa {selectedVariant.stock} pcs
                </span>
              </div>
            )}

            {/* Quick Detail Modal Eye Trigger */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowModal(true);
              }}
              className="absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-xs text-deep-forest hover:bg-deep-forest hover:text-white transition-all shadow-xs cursor-pointer group-hover:scale-110"
              title="Lihat Detail & Cerita Produk"
              aria-label="Lihat Detail Produk"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>

          {/* Product Details Section */}
          <div className="p-4 sm:p-5 space-y-3">
            {/* Rating & Reviews */}
            <div className="flex items-center justify-between text-xs text-muted-charcoal/70">
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="font-bold text-muted-charcoal">{product.rating}</span>
                <span>({product.reviewsCount})</span>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="text-[11px] font-semibold text-leaf-olive hover:underline cursor-pointer"
              >
                Lihat Cerita Fitur →
              </button>
            </div>

            {/* Product Title */}
            <h3
              onClick={() => setShowModal(true)}
              className="font-bold text-sm sm:text-base text-muted-charcoal leading-snug line-clamp-1 group-hover:text-deep-forest transition-colors cursor-pointer"
            >
              {product.name}
            </h3>

            {/* Color Selector */}
            <ColorSelector
              variants={product.variants}
              selectedVariant={selectedVariant}
              onSelect={setSelectedVariant}
            />

            {/* Price Breakdown */}
            <div className="pt-1 flex items-baseline gap-2">
              <span className="text-base sm:text-lg font-extrabold text-deep-forest">
                {formatCurrency(product.price)}
              </span>
              {product.originalPrice && (
                <span className="text-xs text-muted-charcoal/40 line-through">
                  {formatCurrency(product.originalPrice)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="px-4 sm:px-5 pb-4 sm:pb-5">
          <Button
            onClick={handleAddToCart}
            disabled={selectedVariant.stock === 0}
            variant={added ? 'secondary' : 'primary'}
            fullWidth
            size="md"
            className="shadow-sm font-bold text-xs sm:text-sm py-3 transition-all"
          >
            {added ? (
              <>
                <Check className="w-4 h-4" /> Masuk Keranjang!
              </>
            ) : selectedVariant.stock === 0 ? (
              <>Varian Stok Habis</>
            ) : (
              <>
                <Plus className="w-4 h-4" /> + Tambah ke Keranjang
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Deep Dive Storytelling Modal */}
      <ProductDetailModal
        product={product}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        initialVariantId={selectedVariant.id}
      />
    </>
  );
};
