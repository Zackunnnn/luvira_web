// HeroSection.tsx — Sticky navigation bar + scrollable hero content section
// Contains: Announcement strip, brand logo & nav, 2-column desktop hero with
// product spotlight & color switcher, and primary CTA button

'use client'; // Required for client-side interactivity (useState, onClick, etc.)

import React, { useState } from 'react'; // React core + state hook
import Image from 'next/image'; // Next.js optimized image component
import { ShoppingBag, Sparkles, ShieldCheck, Heart, ArrowDown } from 'lucide-react'; // Icon imports
import { useCartStore } from '@/store/useCartStore'; // Zustand cart store for cart state
import { MOCK_PRODUCTS } from '@/data/products'; // Mock product data for hero spotlight
import { Button } from '@/components/ui/Button'; // Reusable Button component

export const HeroSection: React.FC = () => {
  // Access cart state for header cart button badge count
  const { openCart, getTotalItems } = useCartStore();
  const totalItems = getTotalItems(); // Calculate total items currently in cart

  // Select the first product as the hero spotlight feature product
  const spotlightProduct = MOCK_PRODUCTS[0]; // Emboss Split Toe — best seller
  // Track which color variant is currently displayed in the spotlight card
  const [activeVariant, setActiveVariant] = useState(spotlightProduct.variants[0]);

  // Smooth scroll handler for "Pilih Koleksi Sekarang" CTA button
  const scrollToCatalog = () => {
    const catalogElement = document.getElementById('catalog'); // Find catalog section by ID
    if (catalogElement) {
      catalogElement.scrollIntoView({ behavior: 'smooth' }); // Animate scroll to catalog
    }
  };

  return (
    <>
      {/* ========== STICKY NAV SECTION (Only nav bar stays pinned on scroll) ========== */}
      <div className="w-full bg-warm-cream/95 border-b border-deep-forest/10 sticky top-0 z-30 backdrop-blur-md">
        {/* Announcement strip — promotional banner at the very top */}
        <div className="bg-deep-forest text-warm-cream text-center text-xs py-1.5 px-4 font-medium tracking-wide flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-dusty-rose animate-pulse" /> {/* Animated sparkle icon */}
          <span>Gratis Ongkir & Special Bundle Promo Kaos Kaki Premium Luvira</span>
          <Sparkles className="w-3.5 h-3.5 text-dusty-rose animate-pulse" />
        </div>

        {/* Main Navigation Bar — Logo, desktop links, and cart button */}
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-3.5 flex items-center justify-between">
          {/* Brand Logo & Tagline cluster */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              {/* Logo text "LUVIRA" with accent dot */}
              <div className="flex items-center gap-1.5">
                <span className="text-2xl sm:text-3xl font-black tracking-wider text-deep-forest font-serif">
                  LUVIRA
                </span>
                {/* Dusty rose accent dot beside logo */}
                <span className="w-2.5 h-2.5 rounded-full bg-dusty-rose inline-block"></span>
              </div>
              {/* Tagline below logo */}
              <span className="text-[10px] sm:text-xs tracking-widest uppercase font-semibold text-leaf-olive -mt-0.5">
                Modest • Comfortable • Chic
              </span>
            </div>
          </div>

          {/* Desktop Quick Nav Links — hidden on mobile, visible on md+ */}
          <div className="hidden md:flex items-center gap-8 text-xs font-bold text-muted-charcoal">
            {/* Scroll to catalog section via JS */}
            <button onClick={scrollToCatalog} className="hover:text-deep-forest transition-colors cursor-pointer">
              Koleksi Produk
            </button>
            {/* Anchor links to page sections */}
            <a href="#about" className="hover:text-deep-forest transition-colors">
              Filosofi Brand
            </a>
            <a href="#features" className="hover:text-deep-forest transition-colors">
              Keunggulan Fitur
            </a>
          </div>

          {/* Cart Trigger Button — opens the CartDrawer slide-over */}
          <button
            onClick={openCart}
            className="relative px-4 py-2 bg-white border border-deep-forest/15 rounded-2xl shadow-sm text-deep-forest hover:bg-deep-forest hover:text-warm-cream transition-all duration-200 cursor-pointer active:scale-95 flex items-center gap-2"
            aria-label="Keranjang Belanja"
          >
            <ShoppingBag className="w-5 h-5" /> {/* Cart icon */}
            {/* Label text only shown on sm+ screens */}
            <span className="hidden sm:inline text-xs font-bold">Keranjang</span>
            {/* Cart item count badge — conditionally rendered when items > 0 */}
            {totalItems > 0 && (
              <span className="bg-dusty-rose text-white text-[11px] font-bold px-2 py-0.5 rounded-full border border-warm-cream">
                {totalItems}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* ========== HERO CONTENT SECTION (Scrolls naturally with the page) ========== */}
      <section className="w-full bg-warm-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 lg:py-16">
          {/* 2-Column Grid: 7-col text / 5-col spotlight on desktop, stacked on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

            {/* LEFT COLUMN: Copywriting, badge, headline, sub-headline, and CTAs */}
            <div className="lg:col-span-7 space-y-5 text-left">
              {/* Feature badge pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-deep-forest/10 text-deep-forest text-xs font-bold border border-deep-forest/20 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-dusty-rose" />
                <span>✦ 100% Premium Cotton • Wudhu & Activity Friendly</span>
              </div>

              {/* Main headline — responsive sizing */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-deep-forest leading-tight tracking-tight">
                Kemewahan Langkah dalam Setiap Pasang Kaus Kaki.
              </h1>

              {/* Sub-headline paragraph */}
              <p className="text-xs sm:text-base text-muted-charcoal/80 leading-relaxed max-w-2xl">
                Inovasi Split-Toe & Anti-Slip berpadu dengan bahan serat katun ultra-lembut. Dirancang untuk kenyamanan sepanjang hari, estetika modest, dan gaya yang tetap chic.
              </p>

              {/* CTA button row + trust indicators */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                {/* Primary CTA — smooth scroll to catalog section */}
                <Button
                  onClick={scrollToCatalog}
                  variant="primary"
                  size="lg"
                  className="shadow-xl shadow-deep-forest/20 text-sm sm:text-base font-bold py-4 px-8"
                >
                  <span>Pilih Koleksi Sekarang</span>
                  <ArrowDown className="w-4 h-4 animate-bounce" /> {/* Animated arrow */}
                </Button>

                {/* Trust indicators / micro-badges */}
                <div className="flex items-center gap-4 text-xs font-semibold text-muted-charcoal/80 justify-center">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-dusty-rose" /> Garansi Anti-Meral
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-leaf-olive fill-leaf-olive/20" /> 10.000+ Muslimah Choice
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Interactive Product Spotlight Showcase Card */}
            <div className="lg:col-span-5">
              {/* Spotlight container with gradient border and shadow */}
              <div className="relative rounded-3xl bg-gradient-to-br from-white to-warm-cream p-4 sm:p-6 border border-deep-forest/15 shadow-xl mt-6 lg:mt-0">
                {/* Floating "Best Seller" badge in top-right corner */}
                <div className="absolute -top-3 right-4 sm:right-6 bg-dusty-rose text-white text-[11px] font-bold px-4 py-1.5 rounded-full shadow-md z-20">
                  Best Seller Showcase
                </div>

                {/* Product image — changes dynamically based on selected variant */}
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-warm-cream border border-deep-forest/10 mb-4 mt-2">
                  <Image
                    src={activeVariant.image} // Dynamic: updates when user clicks variant swatch
                    alt={spotlightProduct.name}
                    fill // Fill parent container (aspect-square)
                    className="object-cover transition-transform duration-500 hover:scale-105"
                    unoptimized // Bypass Next.js image optimization for SVG data URIs
                  />
                </div>

                {/* Product info: name, price, and color variant selector */}
                <div className="space-y-3">
                  {/* Name and price row */}
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-base text-deep-forest">
                      {spotlightProduct.name}
                    </h3>
                    <span className="font-extrabold text-sm text-leaf-olive">
                      Rp 35.000
                    </span>
                  </div>

                  {/* Color variant swatches — clicking changes the product image above */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-charcoal/70">Warna Tampil: <strong className="text-deep-forest">{activeVariant.name}</strong></span>
                    <div className="flex gap-1.5">
                      {spotlightProduct.variants.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setActiveVariant(v)} // Switch displayed variant
                          className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                            v.id === activeVariant.id ? 'border-deep-forest scale-110 shadow-sm' : 'border-white'
                          }`}
                          style={{ backgroundColor: v.hex }} // Apply variant color as background
                          title={v.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  );
};
