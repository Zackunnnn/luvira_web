// app/page.tsx — Main landing page for the Luvira e-commerce storefront.
// Assembles all page sections in the required order:
// 1. Hero Section → 2. About Luvira → 3. Product Catalog Grid → 4. Feature Showcase → 5. Footer & Cart
// Uses 'use client' because it relies on useState and Zustand hooks.

'use client'; // Enable client-side rendering for state management and interactivity

import React, { useState, useEffect } from 'react'; // React core + hooks
import { HeroSection } from '@/components/sections/HeroSection'; // Sticky nav + hero split section
import { AboutLuvira } from '@/components/sections/AboutLuvira'; // Brand philosophy overview section
import { FeatureHighlight } from '@/components/sections/FeatureHighlight'; // Sock tech features section
import { ProductFilter } from '@/components/products/ProductFilter'; // Category tab filter component
import { ProductCard } from '@/components/products/ProductCard'; // Individual product card component
import { CartDrawer } from '@/components/cart/CartDrawer'; // Slide-over cart drawer panel
import { FilterCategory } from '@/types/product'; // TypeScript type for filter categories
import { useProductStore } from '@/store/useProductStore'; // Zustand dynamic product catalog store
import { useCartStore } from '@/store/useCartStore'; // Zustand cart store for totals
import { useContentStore } from '@/store/useContentStore'; // Zustand dynamic copywriting store
import { DEFAULT_SITE_CONTENT } from '@/data/defaultContent'; // Fallback seed content
import { BrandLogo } from '@/components/ui/BrandLogo'; // Universal official brand logo
import { ShoppingBag, Sparkles, Heart, ArrowRight } from 'lucide-react'; // Icon imports
import Link from 'next/link'; // Next.js client-side navigation

export default function Home() {
  // Track the currently active product filter category (default: 'all')
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  // Access cart state for the floating checkout bar
  const { openCart, getTotalItems, getTotalPrice } = useCartStore();
  // Access dynamic product catalog from the Zustand product store
  const { products, fetchProducts } = useProductStore();
  // Access dynamic site content from the Zustand content store
  const { content, fetchContent } = useContentStore();

  // FIX Issue #3: Prevent Zustand hydration mismatch by deferring client-only values
  // During SSR, cart is empty. On client mount, localStorage may have saved items,
  // causing a mismatch. We defer rendering cart-dependent UI until after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true); // Signal that client-side hydration is complete
    fetchProducts();
    fetchContent();
    
    // Persist rehydration removed because we migrated to DB!
    
    // ...
  }, []);

  // Read products only after mount to avoid hydration mismatch with localStorage data
  const catalogProducts = mounted ? products : [];
  const microcopy = mounted ? content.microcopy : DEFAULT_SITE_CONTENT.microcopy;

  // Filter products based on the currently selected category tab
  const filteredProducts = catalogProducts.filter((product) => {
    if (activeFilter === 'all') return true; // 'all' shows every product
    return product.model === activeFilter; // Match product model to filter
  });

  // Only compute cart totals on the client (after mount) to avoid hydration mismatch
  const totalItems = mounted ? getTotalItems() : 0;
  const totalPrice = mounted ? getTotalPrice() : 0;

  // Currency formatter for Indonesian Rupiah (IDR)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    // Full page container with warm cream background
    <div className="min-h-screen bg-warm-cream text-muted-charcoal flex flex-col justify-between">
      <div>
        {/* ========== SECTION 1: HERO ========== */}
        {/* Contains sticky nav bar + scrollable 2-column hero with product spotlight */}
        <HeroSection />

        {/* ========== SECTION 2: ABOUT LUVIRA (Brand Philosophy) ========== */}
        {/* Highlights Luvira's three pillars: Modest, Comfortable, Chic */}
        <section id="about">
          <AboutLuvira />
        </section>

        {/* ========== SECTION 3: PRODUCT CATALOG GRID ========== */}
        {/* Positioned directly after About section per layout directives */}
        <section id="catalog" className="py-12 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto space-y-6">
          {/* Catalog section header */}
          <div className="text-center max-w-2xl mx-auto space-y-2">
            {/* "Model Siap Order" badge pill */}
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-leaf-olive bg-leaf-olive/10 px-3 py-1 rounded-full uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{microcopy.catalogBadge}</span>
            </div>
            {/* Section title */}
            <h2 className="text-2xl sm:text-3xl font-extrabold text-deep-forest tracking-tight">
              {microcopy.catalogTitle}
            </h2>
            {/* Section subtitle */}
            <p className="text-xs sm:text-sm text-muted-charcoal/70">
              {microcopy.catalogSubtitle}
            </p>
          </div>

          {/* Category Filter Tabs — All, Emboss, Black Sole, Anti Slip, Classic */}
          <ProductFilter activeFilter={activeFilter} onFilterChange={setActiveFilter} />

          {/* Responsive Product Grid */}
          {/* 1 column on mobile, 2 columns on tablet, 4 columns on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        {/* ========== SECTION 4: SOCK TECHNOLOGY & FEATURES SHOWCASE ========== */}
        {/* Deep-dive into technical features: Split-Toe, Black Sole, Anti-Slip, Cotton */}
        <FeatureHighlight />

        {/* ========== FOOTER ========== */}
        {/* Brand guarantee, copyright, and official floral emblem */}
        <footer className="mt-12 bg-deep-forest text-warm-cream py-12 px-4 sm:px-6 lg:px-12 text-center space-y-4">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Footer official brand logo */}
            <div className="flex justify-center items-center">
              <BrandLogo size="lg" theme="dark" />
            </div>
            {/* Footer tagline */}
            <p className="text-xs sm:text-sm text-warm-cream/80 max-w-md mx-auto leading-relaxed">
              Solusi Kaus Kaki Modest & Ergonomis Pilihan Muslimah Indonesia. 100% Produk Original Berkualitas High-Grade.
            </p>
            {/* Copyright line */}
            <div className="pt-4 border-t border-warm-cream/10 text-xs text-warm-cream/60">
              © {new Date().getFullYear()} Luvira Official Store. All Rights Reserved.
            </div>
          </div>
        </footer>
      </div>

      {/* ========== FLOATING QUICK CHECKOUT BAR ========== */}
      {/* Sticky bottom bar optimized for mobile link-in-bio (320px–430px) with iOS safe area inset */}
      {/* Only rendered after client mount to prevent hydration mismatch */}
      {mounted && totalItems > 0 && (
        <div className="fixed bottom-4 pb-[env(safe-area-inset-bottom,0px)] left-1/2 -translate-x-1/2 w-full max-w-lg px-3 sm:px-4 z-40 animate-in slide-in-from-bottom-3 duration-300">
          <div className="bg-deep-forest text-warm-cream p-3 sm:p-3.5 rounded-2xl shadow-2xl border border-white/20 flex items-center justify-between gap-2.5">
            {/* Cart icon + count badge + total price */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="relative shrink-0">
                {/* Cart bag icon container with 44px min touch area */}
                <button
                  type="button"
                  onClick={openCart}
                  aria-label="Buka Keranjang"
                  className="w-11 h-11 rounded-xl bg-leaf-olive/30 hover:bg-leaf-olive/40 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-5 h-5 text-warm-cream" />
                </button>
                {/* Item count badge */}
                <span className="absolute -top-1 -right-1 bg-dusty-rose text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-deep-forest pointer-events-none">
                  {totalItems}
                </span>
              </div>
              {/* Total label and price */}
              <div className="truncate">
                <div className="text-[10px] sm:text-[11px] text-warm-cream/70 leading-tight">Total Keranjang</div>
                <div className="text-xs sm:text-sm font-black text-white truncate">
                  {formatCurrency(totalPrice)}
                </div>
              </div>
            </div>

            {/* Action buttons: Detail (opens cart drawer) + Checkout (Min 44px touch height) */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Open cart drawer button */}
              <button
                onClick={openCart}
                className="px-3 min-h-[44px] text-xs font-bold text-warm-cream bg-white/10 hover:bg-white/20 rounded-xl transition-all cursor-pointer flex items-center justify-center"
              >
                Detail
              </button>
              {/* Navigate to checkout page */}
              <Link
                href="/checkout"
                className="px-4 min-h-[44px] text-xs font-extrabold text-deep-forest bg-warm-cream hover:bg-white rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <span>Checkout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ========== CART DRAWER ========== */}
      {/* Slide-over panel opened by cart buttons; managed by Zustand isOpen state */}
      <CartDrawer />
    </div>
  );
}
