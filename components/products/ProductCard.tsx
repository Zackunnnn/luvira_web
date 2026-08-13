'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Product, ColorVariant } from '@/types/product';
import { ColorSelector } from './ColorSelector';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Star, Plus, Check, Info } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [selectedVariant, setSelectedVariant] = useState<ColorVariant>(product.variants[0]);
  const [added, setAdded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { addItem } = useCartStore();

  const handleAddToCart = () => {
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
    <div className="bg-white border border-deep-forest/10 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
      <div>
        {/* Product Image Container */}
        <div className="relative aspect-square w-full bg-warm-cream overflow-hidden">
          <Image
            src={selectedVariant.image}
            alt={`${product.name} - ${selectedVariant.name}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            unoptimized
          />

          {/* Badges Overlay */}
          <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
            {product.badge && <Badge variant="rose">{product.badge}</Badge>}
          </div>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-xs text-deep-forest hover:bg-white transition-all shadow-xs cursor-pointer"
            title="Info Detail Produk"
            aria-label="Info Detail Produk"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Detailed Features Dropdown / Toggle Overlay */}
          {showDetails && (
            <div className="absolute inset-0 bg-deep-forest/95 text-warm-cream p-5 z-20 overflow-y-auto animate-fadeIn flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-sm">{product.name}</h4>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="text-warm-cream/80 hover:text-white text-xs font-bold px-2 py-1 rounded bg-white/10"
                  >
                    Tutup
                  </button>
                </div>
                <p className="text-xs text-warm-cream/80 mb-3 leading-relaxed">
                  {product.description}
                </p>
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-leaf-olive uppercase tracking-wider">
                    Fitur Keunggulan:
                  </span>
                  <ul className="text-xs space-y-1 text-warm-cream/90">
                    {product.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-dusty-rose shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
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
            <span className="text-[11px] font-semibold text-leaf-olive bg-leaf-olive/10 px-2 py-0.5 rounded-full">
              Stok Tersedia
            </span>
          </div>

          {/* Product Title */}
          <h3 className="font-bold text-sm sm:text-base text-muted-charcoal leading-snug line-clamp-1 group-hover:text-deep-forest transition-colors">
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
          variant={added ? 'secondary' : 'primary'}
          fullWidth
          size="md"
          className="shadow-sm font-bold text-xs sm:text-sm py-3"
        >
          {added ? (
            <>
              <Check className="w-4 h-4" /> Masuk Keranjang!
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" /> + Tambah ke Keranjang
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
