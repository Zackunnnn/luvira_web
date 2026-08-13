# Changelog - Luvira Sock Brand Public Storefront

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.4.0 - Premium UI & Responsive Refactor] - 2026-08-13

### Added
- Created `components/sections/AboutLuvira.tsx` brand philosophy overview highlighting Luvira's three pillars: **Modest** (Daya tutup sempurna & syar'i), **Comfortable** (Ultra-soft combed cotton), and **Chic** (Aesthetically minimalist earth tones).

### Changed
- **Responsive Layout Adaptation**:
  - Expanded layout containers from mobile-only frame constraints to responsive `max-w-7xl mx-auto px-4 sm:px-6 lg:px-12` supporting Mobile (320px-640px), Tablet (768px), and Desktop (1024px+).
- **Section Sequence Alignment**:
  1. **Hero Section**: Upgraded to 2-column split layout on desktop with copywriting (`✦ 100% Premium Cotton • Wudhu & Activity Friendly`, *"Kemewahan Langkah dalam Setiap Pasang Kaus Kaki."*) and high-res interactive product spotlight showcase card with variant color switcher.
  2. **About Luvira**: Positioned directly after hero section.
  3. **Product Catalog Grid**: Moved up directly after brand overview with responsive 4-column desktop grid (`sm:grid-cols-2 lg:grid-cols-4 gap-6`).
  4. **Sock Technology & Features Showcase**: Deep dive cards grid detailing *Ergonomic Split Toe*, *Anti-Dirty Black Sole*, *Silicon Anti-Slip Grid*, and *Breathable Combed Cotton*.
  5. **Cart Drawer & Checkout Form Integration**.
- **Product Card & CTA Upgrades**:
  - Updated action button to prominent `+ Tambah ke Keranjang` CTA.
  - Enhanced cards with soft luxury shadows (`shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300`).
- **Checkout Page Redesign (`/checkout`)**:
  - Refactored into a 2-column desktop split layout with customer form on the left and sticky order summary card on the right.

## [1.0.0] - 2026-08-13

### Added
- **Design System & Foundation**:
  - Configured `tailwind.config.ts` with official Luvira brand palette (`deep-forest` `#1E4D48`, `leaf-olive` `#748E44`, `dusty-rose` `#D78A7E`, `warm-cream` `#FDFBF7`, `muted-charcoal` `#2D3748`).
  - Added `@theme` CSS custom properties and custom scrollbars in `app/globals.css`.
  - Configured `app/layout.tsx` with Google Font (*Plus Jakarta Sans*) and metadata SEO.
- **Types & Data Structures**:
  - Created `types/product.ts` defining `ModelType`, `ColorVariant`, `Product`, `CartItem`, and `CustomerInfo`.
  - Created `data/products.ts` with mock data for all 4 models (*Emboss Split Toe*, *Black Sole Split Toe*, *Anti Slip Split Toe*, *Classic*) with dynamic vector SVG sock image generators.
- **State Management**:
  - Created `store/useCartStore.ts` using Zustand with `localStorage` persistence middleware.
- **UI Components**:
  - Created `components/ui/Button.tsx` supporting primary, secondary, rose, outline, and ghost variants.
  - Created `components/ui/Badge.tsx` for promo tags, stock status, and ratings.
  - Created `components/ui/Input.tsx` for form inputs and textareas with error validation states.
- **Sections & Product Components**:
  - Created `components/sections/HeroSection.tsx` with Luvira logo, tagline *"Modest • Comfortable • Chic"*, promo banner, and header cart trigger button.
  - Created `components/sections/FeatureHighlight.tsx` showcasing sock features.
  - Created `components/products/ColorSelector.tsx` for interactive color swatch selection.
  - Created `components/products/ProductCard.tsx` with dynamic color variant switching.
  - Created `components/products/ProductFilter.tsx` for tabbed category filtering.
  - Created `components/cart/CartDrawer.tsx` slide-over cart drawer.
- **WhatsApp Integration & Pages**:
  - Created `lib/whatsapp.ts` with `generateWhatsAppUrl()` helper for structured order payload format.
  - Created `app/page.tsx` assembling mobile-first storefront layout with sticky bottom checkout action bar.
  - Created `app/checkout/page.tsx` with customer information form and WhatsApp order dispatching.
