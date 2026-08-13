# Product Requirement Document (PRD) - Luvira Sock Brand Public Storefront

## 1. Overview
Luvira is a premium modest sock brand delivering ergonomic, aesthetic, and ultra-comfortable socks tailored for modern lifestyle and active wear. Tagline: **"Modest • Comfortable • Chic"**.

The goal of this project is to build a high-conversion, mobile-first public e-commerce storefront for Luvira, optimized for Instagram link-in-bio traffic with seamless direct-to-WhatsApp checkout.

---

## 2. Target Audience & Mobile Viewport Requirements
- **Primary Viewport**: Mobile browsers (320px - 430px) as link-in-bio landing page.
- **Desktop Viewport**: Centered mobile frame container (`max-w-md` or `max-w-lg`) with rich background ambiance.

---

## 3. Product Catalog Specs

### Models:
1. **Emboss Split Toe**: Premium textured socks with split-toe thumb design, perfect for sandals & flip-flops.
2. **Black Sole Split Toe**: Split-toe design with stain-resistant dark sole for durability & daily wear.
3. **Anti Slip Split Toe**: Split-toe design with silicon anti-slip grips on bottom for stability on smooth floors & prayer mats.
4. **Classic**: Traditional full-coverage modest socks with soft ribbing & non-binding cuffs.

---

## 4. Brand Design System & Color Palette

### Colors:
- **Primary**: Deep Forest (`#1E4D48`) - Classy dark green for headers, primary buttons, branding
- **Accent/Secondary**: Leaf Olive (`#748E44`) - Eco olive green for badges, secondary highlights, tags
- **Highlight**: Dusty Rose (`#D78A7E`) - Warm muted rose for sales badges, active indicators, callouts
- **Background**: Warm Cream (`#FDFBF7`) - Soft off-white base for luxury cozy feel
- **Text**: Muted Charcoal (`#2D3748`) - Deep neutral for high-contrast readable typography

### UI Aesthetics:
- Rounded corners (`rounded-2xl` / `rounded-3xl`)
- Soft shadows (`shadow-sm`, `shadow-md`)
- Micro-interactions (hover, active press, color variant previews)

---

## 5. User Journey & Core Features
1. **Header & Hero**: Branding, logo, tagline, promo banner, search/filter quick access.
2. **Category Filter**: Tabbed filter by model (`All`, `Emboss`, `Black Sole`, `Anti Slip`, `Classic`).
3. **Interactive Product Card**:
   - High quality image preview
   - Color variant swatches (dynamic preview change)
   - Price, badge ("Best Seller", "New", "Must Have"), rating, stock status
   - Add to Cart button with feedback animation
4. **Feature Highlights Section**: Grid of sock benefits (Breathable Cotton Blend, Anti-Slip Ergonomics, Split-Toe Thumb, Odor Resistant).
5. **Cart Drawer**:
   - Floating cart icon button with total item counter badge
   - Slide-over drawer listing cart items, color variant, quantity adjust (+/-), subtotal, shipping note
   - "Lanjut ke Checkout" navigation button
6. **Checkout Page (`/checkout`)**:
   - Form fields: Nama Lengkap, Nomor WhatsApp, Alamat Lengkap, Catatan Pesanan
   - Order Summary breakdown
   - Structured WhatsApp message payload generator (`generateWhatsAppUrl`)
   - "Kirim Pesanan via WhatsApp" direct deep-link launcher

---

## 6. Data Structures (TypeScript Schemas)

```typescript
export type ModelType = 'emboss' | 'black-sole' | 'anti-slip' | 'classic';

export interface ColorVariant {
  id: string;
  name: string; // e.g., "Nude Cream", "Charcoal Grey", "Rose Dust", "Sage Green"
  hex: string;  // Color hex code for swatch
  image: string; // Image URL for this specific color variant
  inStock: boolean;
}

export interface Product {
  id: string;
  name: string;
  model: ModelType;
  price: number; // in IDR
  originalPrice?: number;
  rating: number;
  reviewsCount: number;
  badge?: string;
  description: string;
  features: string[];
  variants: ColorVariant[];
}

export interface CartItem {
  product: Product;
  selectedVariant: ColorVariant;
  quantity: number;
}
```

---

## 7. State Management
Zustand or React Context store (`/store/useCartStore.ts`):
- `items`: `CartItem[]`
- `addItem(product: Product, variant: ColorVariant)`
- `removeItem(productId: string, variantId: string)`
- `updateQuantity(productId: string, variantId: string, quantity: number)`
- `clearCart()`
- `getTotalItems()`
- `getTotalPrice()`
- Persistence via `localStorage`

---

## 8. WhatsApp Integration Specs
Structured text message format sent to Luvira store WhatsApp (+6281234567890):

```text
Halo Admin Luvira, saya ingin memesan:

📦 *DETAIL PESANAN:*
1. Emboss Split Toe - Nude Cream (2x) - Rp 70.000
2. Anti Slip Split Toe - Sage Green (1x) - Rp 38.000

💰 *TOTAL SPESIFIKASI:*
Total Items: 3 pasang
Total Harga: Rp 108.000 (Belum termasuk ongkir)

👤 *DATA PEMESAN:*
Nama: [Nama Input]
No. HP/WA: [No HP Input]
Alamat: [Alamat Input]
Catatan: [Catatan Input]

Terima kasih!
```

---

## 9. Verification & Quality Assurance
- Responsive on mobile screens (320px to 430px) and centered on desktop viewports.
- Color variant changes immediately update the product thumbnail card.
- Cart drawer properly syncs items, quantity, and total calculations.
- WhatsApp deep-link properly encodes characters and opens `https://wa.me/...`.
- Codebase builds cleanly with `npm run build` without TypeScript errors.

---

## 10. Development Roadmap
- **Phase 1**: Project initialization, Tailwind brand config, Types, Mock Data, Cart Store.
- **Phase 2**: Core UI Components (Buttons, Swatches, Cards, Hero, Features, Filter, CartDrawer).
- **Phase 3**: Page Assembly (Home & Checkout Page with WhatsApp URL helper).
- **Phase 4**: Verification & Automatic Changelog update.

---

## 16. Changelog

### [v0.4.0 - Premium UI & Responsive Refactor] - 2026-08-13

#### [Added]
- Created `components/sections/AboutLuvira.tsx` brand philosophy overview highlighting Luvira's three pillars: **Modest** (Daya tutup sempurna), **Comfortable** (Ultra-soft combed cotton), and **Chic** (Aesthetically minimalist earth tones).

#### [Changed]
- **Responsive Layout Adaptation**:
  - Expanded layout containers from mobile-only max-width to responsive `max-w-7xl mx-auto px-4 sm:px-6 lg:px-12` across mobile, tablet, and desktop viewports.
- **Section Sequence Alignment**:
  1. **Hero Section**: Upgraded to 2-column split layout on desktop with copywriting (`✦ 100% Premium Cotton • Wudhu & Activity Friendly`, *"Kemewahan Langkah dalam Setiap Pasang Kaus Kaki."*) and high-res interactive product spotlight showcase card with variant color switcher.
  2. **About Luvira**: Positioned directly after hero.
  3. **Product Catalog Grid**: Moved up directly after brand overview with responsive 4-column desktop grid (`sm:grid-cols-2 lg:grid-cols-4 gap-6`).
  4. **Sock Technology & Features Showcase**: Deep dive cards grid detailing *Ergonomic Split Toe*, *Anti-Dirty Black Sole*, *Silicon Anti-Slip Grid*, and *Breathable Combed Cotton*.
  5. **Cart Drawer & Checkout Form Integration**.
- **Product Card & CTA Upgrades**:
  - Updated action button to prominent `+ Tambah ke Keranjang` CTA.
  - Enhanced cards with soft luxury shadows (`shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300`).
- **Checkout Page Redesign (`/checkout`)**:
  - Refactored into a 2-column desktop split layout with form fields on the left and sticky order summary card on the right.

### [1.0.0] - 2026-08-13

#### [Added]
- **Design System & Foundation**:
  - Configured `tailwind.config.ts` with official Luvira brand palette (`deep-forest` `#1E4D48`, `leaf-olive` `#748E44`, `dusty-rose` `#D78A7E`, `warm-cream` `#FDFBF7`, `muted-charcoal` `#2D3748`).
  - Added `@theme` CSS custom properties and custom scrollbar styling in `app/globals.css`.
  - Configured `app/layout.tsx` with Google Font (Plus Jakarta Sans) and metadata SEO.
- **Type Definitions & Data Models**:
  - Created `types/product.ts` defining `ModelType`, `ColorVariant`, `Product`, `CartItem`, and `CustomerInfo`.
  - Created `data/products.ts` with mock data for all 4 models (*Emboss Split Toe*, *Black Sole Split Toe*, *Anti Slip Split Toe*, *Classic*) with dynamic vector SVG sock image generators.
- **State Management**:
  - Created `store/useCartStore.ts` using Zustand with `localStorage` persistence middleware.
- **UI Components**:
  - Created `components/ui/Button.tsx` supporting primary, secondary, rose, outline, and ghost variants.
  - Created `components/ui/Badge.tsx` for promo tags, stock status, and ratings.
  - Created `components/ui/Input.tsx` for form inputs and textareas with error states.
- **Section & Product Components**:
  - Created `components/sections/HeroSection.tsx` with Luvira logo, tagline *"Modest • Comfortable • Chic"*, promo banner, and header cart trigger button.
  - Created `components/sections/FeatureHighlight.tsx` showcasing sock features (Ergonomic Split-Toe, Anti-Slip Grid, Breathable Cotton, Comfort Cuff).
  - Created `components/products/ColorSelector.tsx` for interactive color swatch selection.
  - Created `components/products/ProductCard.tsx` with dynamic color variant switching, price formatting, stock status, ratings, features popover drawer, and cart action.
  - Created `components/products/ProductFilter.tsx` for tabbed category filtering (*Semua Koleksi*, *Emboss*, *Black Sole*, *Anti Slip*, *Classic*).
  - Created `components/cart/CartDrawer.tsx` slide-over cart drawer with quantity management, item removal, free shipping hint, subtotal, and checkout link.
- **WhatsApp Integration & Pages**:
  - Created `lib/whatsapp.ts` with `generateWhatsAppUrl()` helper for structured order payload format.
  - Created `app/page.tsx` assembling mobile-first storefront layout with sticky bottom checkout action bar.
  - Created `app/checkout/page.tsx` with customer information form, order summary breakdown, field validation, and direct-to-WhatsApp order dispatching.

