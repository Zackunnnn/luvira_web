# Product Requirement Document (PRD) - Luvira Sock Brand Public Storefront

## 1. Overview
Luvira is a premium modest sock brand delivering ergonomic, aesthetic, and ultra-comfortable socks tailored for modern lifestyle and active wear. Tagline: **"Modest • Comfortable • Chic"**.

The goal of this project is to build a high-conversion, mobile-first public e-commerce storefront for Luvira, optimized for Instagram link-in-bio traffic with seamless direct-to-WhatsApp checkout and an interactive **Sandbox Payment Simulation Gateway**.

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

### Brand Visual Assets:
- **Official Floral Emblem Logo**: Transparent luxury emblem (`/brand/luvira-logo.png`).
- **Universal Logo Component (`components/ui/BrandLogo.tsx`)**: Aspect ratio preserved rendering across 4 size tiers (`sm`, `md`, `lg`, `xl`) with adaptive contrast wrapper for light and dark backgrounds.

### UI Aesthetics:
- Rounded corners (`rounded-2xl` / `rounded-3xl`)
- Soft shadows (`shadow-sm`, `shadow-md`)
- Micro-interactions (hover, active press, color variant previews, copy feedbacks, countdown timers)

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
   - Client-side validation for required inputs and phone format
   - Order Summary breakdown
   - "Bayar via Sandbox Gateway" action CTA button
7. **Sandbox Payment Simulation Gateway (`components/checkout/SandboxPaymentModal.tsx`)**:
   - Modal simulation dialog supporting **QRIS Luvira Instant** and **BCA/Mandiri Virtual Account (Sandbox)**.
   - **QRIS View**: Mockup QR code with dynamic 15-minute countdown expiration timer.
   - **VA View**: Bank switcher (BCA / Mandiri) with interactive "Salin VA" button and copied toast feedback.
   - **Verification State**: 2.5-second realistic processing loader with dynamic status feedback.
   - **Success Receipt**: Animated checkmark, unique sandbox invoice ID (`LVR-SBX-XXXX`), payment method, and transaction timestamp.
   - Direct WhatsApp forwarder dispatching the verified order payload.
8. **Admin Dashboard CMS (`/admin`)**:
   - Quick stats panel: total products, total variants, reset-to-default action.
   - Full CRUD form for adding/editing products: name, model, price, badge, description, features, and dynamic color variants.
   - Image upload via `FileReader.readAsDataURL()` for zero-cost Base64 image embedding.
   - Product catalog table with inline price editing, per-variant stock toggle, and delete confirmation modal.
   - All changes persist to `localStorage` and sync to the public storefront (`/`) in real-time.
9. **Dynamic Copywriting & Site Content CMS (`/admin` - Tab Editor Copywriting)**:
   - Dynamic control of Hero Section (announcement banner, logo tagline, badge, H1 headline, subheadline, CTA, trust badges).
   - Dynamic control of About Brand Section (badge, title, description, and 3 pillars: Modest, Comfortable, Chic).
   - Dynamic control of Feature Highlights (badge, title, description, and 4 tech features: Split Toe, Black Sole, Anti-Slip, Combed Cotton).
   - Dynamic control of Cart and Catalog Microcopy (promo banner, empty cart states, section headings).
   - 1-Click seasonal copywriting presets: *Ramadan/Umroh*, *Payday Sale*, and *Mahasiswi Aktif*.
   - 100% Zero-Cost persistence via `useContentStore` in `localStorage` (`luvira-site-content`).
10. **Product Detail Modal & Dynamic Storytelling UX (`components/products/ProductDetailModal.tsx`)**:
    - Interactive dialog triggered via product thumbnail, title, or quick-view eye icon.
    - Dynamic color swatch switcher updating high-resolution preview image and real-time stock indicator (`Ready Stock` vs `Stok Habis`).
    - Data-driven storytelling accordions dynamically rendering `product.features` array without hardcoding.
    - Syar'i material education (100% combed cotton, non-see-through modesty, wudhu-friendly fit).
    - Practical care guide for fabric and elasticity longevity.
    - Sticky action bar with quantity counter (+/-), dynamic subtotal calculation, and instant add-to-cart cart drawer synchronization.

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

export interface SiteContent {
  hero: HeroContent;
  about: AboutContent;
  features: FeaturesContent;
  microcopy: MicrocopyContent;
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

Dynamic Product Catalog store (`/store/useProductStore.ts`):
- `products`: `Product[]` (initialized from `MOCK_PRODUCTS` seed data)
- `addProduct(product: Product)`
- `updateProduct(id: string, updatedData: Partial<Product>)`
- `deleteProduct(id: string)`
- `toggleVariantStock(productId: string, variantId: string)`
- `resetToDefaultProducts()`
- `getProductById(id: string)`
- `getTotalVariants()`
- Persistence via `localStorage` (key: `luvira-product-storage`)
- Public storefront (`app/page.tsx`, `HeroSection.tsx`) reads from this store instead of static `data/products.ts`

Dynamic Site Copywriting store (`/store/useContentStore.ts`):
- `content`: `SiteContent` (initialized from `DEFAULT_SITE_CONTENT` seed data)
- `updateHeroContent(payload: Partial<HeroContent>)`
- `updateAboutContent(payload: Partial<AboutContent>)`
- `updateFeaturesContent(payload: Partial<FeaturesContent>)`
- `updateMicrocopy(payload: Partial<MicrocopyContent>)`
- `resetToDefaultContent()`
- Persistence via `localStorage` (key: `luvira-site-content`)
- Public storefront components (`HeroSection`, `AboutLuvira`, `FeatureHighlight`, `CartDrawer`, `page.tsx`) connect reactively with SSR hydration safeguards.

---

## 8. WhatsApp Integration Specs
Structured text message format sent to Luvira store WhatsApp (+6281234567890):

### Standard Format (Without Sandbox Verification):
```text
Halo Admin Luvira, saya ingin memesan:

📦 *DETAIL PESANAN:*
1. Emboss Split Toe - Nude Cream (2x) - Rp 70.000
2. Anti Slip Split Toe - Sage Green (1x) - Rp 38.000

💰 *TOTAL SPESIFIKASI:*
Total Items: 3 pasang
Total Harga: Rp 108.000 (Belum termasuk ongkir)

👤 *DATA PEMESAN:*
Nama: Siti Aisyah
No. HP/WA: 081234567890
Alamat: Jl. Melati No. 12, Kebayoran Baru, Jakarta Selatan
Catatan: Titip di pos satpam

Terima kasih!
```

### Sandbox Verified Format (With Simulation Receipt):
```text
Halo Admin Luvira, saya ingin memesan:

⚡ *STATUS PEMBAYARAN: [SANDBOX VERIFIED - LVR-SBX-7492]*
Metode: QRIS Luvira Instant (Lunas Simulasi)
Waktu: 23 Agu 2026, 08:45 WIB

📦 *DETAIL PESANAN:*
1. Emboss Split Toe - Nude Cream (2x) - Rp 70.000
2. Anti Slip Split Toe - Sage Green (1x) - Rp 38.000

💰 *TOTAL SPESIFIKASI:*
Total Items: 3 pasang
Total Harga: Rp 108.000 (Lunas via Sandbox)

👤 *DATA PEMESAN:*
Nama: Siti Aisyah
No. HP/WA: 081234567890
Alamat: Jl. Melati No. 12, Kebayoran Baru, Jakarta Selatan
Catatan: Titip di pos satpam

Terima kasih!
```

---

## 9. Verification & Quality Assurance
- Responsive on mobile screens (320px to 430px) and centered on desktop viewports.
- Color variant changes immediately update the product thumbnail card.
- Cart drawer properly syncs items, quantity, and total calculations.
- WhatsApp deep-link properly encodes characters and opens `https://wa.me/...`.
- Sandbox Payment Simulation executes with 2.5-second verification delay, generated invoice ID, and copied feedback.
- Codebase builds cleanly with `npm run build` without TypeScript errors.

---

## 10. Development Roadmap
- **Phase 1**: Project initialization, Tailwind brand config, Types, Mock Data, Cart Store.
- **Phase 2**: Core UI Components (Buttons, Swatches, Cards, Hero, Features, Filter, CartDrawer).
- **Phase 3**: Page Assembly (Home & Checkout Page with WhatsApp URL helper).
- **Phase 4**: Verification & Automatic Changelog update.
- **Phase 5**: Sandbox Payment Simulation Gateway & WhatsApp payload verification.
- **Phase 6**: Dynamic Product Catalog Store (`useProductStore`) & Admin Dashboard CMS (`/admin`).
- **Phase 7**: Dynamic Site Copywriting CMS (`useContentStore`) & seasonal preset manager.
- **Phase 8**: Product Detail Modal & Dynamic Storytelling UX (`ProductDetailModal.tsx`).
- **Phase 9**: Aesthetic Digital Receipt Generator (`DigitalReceiptModal.tsx`) & Local Order History Store (`useOrderStore`).
- **Phase 10**: Mobile Link-in-Bio & SEO Engine Optimization (`sitemap.ts`, `robots.ts`, `manifest.ts`, `JsonLd.tsx`, OpenGraph).
- **Phase 11**: Official Transparent Floral Logo Integration (`BrandLogo.tsx`, Favicon & Web App Icons).

---

## 16. Changelog

### [v1.7.0 - Official Transparent Floral Logo Integration] - 2026-08-23

#### [Added]
- **Universal BrandLogo Component (`components/ui/BrandLogo.tsx`)**:
  - Reusable logo component loading `/brand/luvira-logo.png` with 4 size variants and automatic light/dark contrast container.
- **Global Favicon & Web App Icon Integration (`app/layout.tsx`, `app/manifest.ts`)**:
  - Configured official floral logo as website favicon, apple icon, and PWA manifest icon.

#### [Changed]
- **Unified Visual Identity across Storefront**:
  - Integrated official emblem logo on Header Navbar (`HeroSection.tsx`), Storefront Footer (`app/page.tsx`), Sandbox Payment Modal (`SandboxPaymentModal.tsx`), Digital Receipt (`DigitalReceiptModal.tsx`), Checkout Page (`checkout/page.tsx`), and Admin Portal (`admin/page.tsx`).

### [v1.6.0 - Mobile Link-in-Bio & SEO Engine Optimization] - 2026-08-23

#### [Added]
- **SEO & Social OpenGraph Metadata (`app/layout.tsx`)**:
  - Configured title template, canonical URL, Indonesian keywords, and OpenGraph/Twitter Card previews.
- **Dynamic Sitemap & Robots Engine (`app/sitemap.ts`, `app/robots.ts`)**:
  - Dynamic XML sitemap generation and robots.txt crawler access control restricting `/admin`.
- **Web App Manifest (`app/manifest.ts`)**:
  - PWA Add-to-Home screen configuration with brand theme colors and icons.
- **Schema.org Structured Data (`components/seo/JsonLd.tsx`)**:
  - Injected `Organization`, `WebSite`, and `ItemList / Product` JSON-LD schemas for Google Rich Snippets.

#### [Changed]
- **Mobile Link-in-Bio UX (320px–430px) & Safe Area Padding (`app/page.tsx`)**:
  - Upgraded sticky checkout bar with 44px minimum touch targets and iOS safe area padding.

### [v1.5.0 - Aesthetic Digital Receipt Generator & Admin Order History Log] - 2026-08-23

#### [Added]
- **Order History Management (`store/useOrderStore.ts`)**:
  - Zero-cost client-side persistent storage (`luvira-orders-storage`) tracking customer orders, invoice codes, purchased items, and total prices.
  - Automatically receives order records from `SandboxPaymentModal.tsx` upon payment simulation completion.
- **Aesthetic Digital Receipt (`components/checkout/DigitalReceiptModal.tsx`)**:
  - Luxury branded invoice card with `window.print` PDF isolation styles, itemized breakdown, and verification QR code.
- **Admin Order History Dashboard (`app/admin/page.tsx`)**:
  - Order table with real-time status switcher, direct WhatsApp confirmation messaging, and digital receipt viewer.

### [v1.4.1 - 100% Dynamic Feature Customization & Material Flexibility] - 2026-08-23

#### [Added]
- **Dynamic Feature Items Array (`types/content.ts`, `data/defaultContent.ts`)**:
  - `features.items` converted into a flexible `FeatureItem[]` array, removing fixed slot keys.
  - Full admin freedom to rename any feature/material (e.g., `"100% Premium Nylon"`, `"Ergonomic Split Toe"`), set custom badges, and add/remove feature cards.
- **Admin Tech Features CMS Manager (`app/admin/page.tsx`)**:
  - Interactive controls to add, edit, and delete tech feature cards dynamically.

#### [Changed]
- **Zero-Hardcoded UI (`FeatureHighlight.tsx`, `ProductDetailModal.tsx`)**:
  - Cleaned all hardcoded material/feature titles from UI components; all content reads dynamically from product/content stores.

### [v1.4.0 - Product Detail Modal & Dynamic Storytelling UX] - 2026-08-23

#### [Added]
- **Interactive Product Detail Modal (`components/products/ProductDetailModal.tsx`)**:
  - High-resolution visual showcase with real-time color variant swatch switching.
  - Dynamic stock status indicator (`Ready Stock` vs `Stok Habis`) per color variant.
  - Data-driven storytelling accordions dynamically rendering `product.features` without hardcoded models.
  - Syar'i material deep-dive (100% combed cotton, modesty coverage, wudhu-friendly).
  - Practical care guide for fabric elasticity and washing.
  - Sticky bottom action bar with quantity counter (+/-), subtotal calculation, and direct add-to-cart integration with `useCartStore`.
- **Product Card Storytelling Trigger (`components/products/ProductCard.tsx`)**:
  - Clickable thumbnail, title, and quick-view eye button opening the deep-dive storytelling modal.

#### [Changed]
- **Polished Luxury Modest Copywriting (`data/defaultContent.ts`)**:
  - Elevated brand narratives across Hero, About 3 Pillars, and Features to reflect premium syar'i activewear positioning.

### [v1.3.0 - Dynamic Site Copywriting CMS] - 2026-08-23

#### [Added]
- **Dynamic Site Copywriting Store (`store/useContentStore.ts`)**:
  - Zustand store with `localStorage` persistence (`luvira-site-content`) managing marketing text across the site.
  - Action methods: `updateHeroContent`, `updateAboutContent`, `updateFeaturesContent`, `updateMicrocopy`, and `resetToDefaultContent`.
  - Initial seed data defined in `data/defaultContent.ts` and type contracts in `types/content.ts`.
- **Copywriting Editor Tab in Admin CMS (`app/admin/page.tsx`)**:
  - Tab Switcher: **[Manajemen Produk & Varian]** and **[Editor Copywriting & Konten]**.
  - Form sections for Hero & Promo Strip, About 3 Pillars, 4 Tech Features, and Cart/Catalog Microcopy.
  - 1-Click seasonal theme presets: *🌙 Ramadan / Umroh*, *⚡ Payday Sale*, and *🎒 Mahasiswi Aktif*.
  - Sticky bottom save bar with toast feedback and reset confirmation modal.

#### [Changed]
- **Public Storefront Reactivity (`HeroSection`, `AboutLuvira`, `FeatureHighlight`, `CartDrawer`, `page.tsx`)**:
  - All public storefront sections now consume dynamic copy from `useContentStore`.
  - Hydration safeguards ensure 0 SSR/hydration mismatch while updating immediately upon client edits.

### [v1.2.0 - Dynamic Catalog & Admin CMS] - 2026-08-23

#### [Added]
- **Dynamic Product Catalog Store (`store/useProductStore.ts`)**:
  - Zustand store with `localStorage` persistence for managing the entire product catalog dynamically.
  - CRUD actions: `addProduct`, `updateProduct`, `deleteProduct`, `toggleVariantStock`, `resetToDefaultProducts`.
  - Initializes from `MOCK_PRODUCTS` seed data; all admin changes persist in browser.
- **Admin Dashboard CMS (`app/admin/page.tsx`)**:
  - Quick stats panel displaying total active products and total color variants.
  - Full product form supporting name, model, price, original price, badge (with presets), description, and dynamic features list.
  - Dynamic variant manager with color name, hex picker, image upload (Base64 via `FileReader`), and stock toggle.
  - Product catalog table with inline price editing, per-variant stock toggle, and delete confirmation modal.
  - "Reset ke Data Default" functionality with confirmation dialog.

#### [Changed]
- **Public Storefront Sync (`app/page.tsx`, `HeroSection.tsx`)**:
  - Replaced static `MOCK_PRODUCTS` import with dynamic `useProductStore` reads.
  - All admin changes (add/edit/delete/stock) reflect instantly on the public storefront.
  - Added hydration-safe guards for product data loaded from localStorage.

### [v1.1.0 - Sandbox Payment Gateway] - 2026-08-23

#### [Added]
- **Interactive Sandbox Payment Modal (`components/checkout/SandboxPaymentModal.tsx`)**:
  - Modal simulation dialog supporting **QRIS Luvira Instant** and **BCA/Mandiri Virtual Account**.
  - QRIS view with realistic QR Code graphic and active 15-minute countdown expiration timer.
  - Virtual Account view with bank switching (BCA & Mandiri) and interactive "Salin VA" button with copied toast feedback.
  - 2.5-second realistic verification loading state with multi-step status feedback.
  - Success receipt displaying animated checkmark, unique randomized invoice ID format (`LVR-SBX-XXXX`), payment method, and formatted timestamp.
  - Direct WhatsApp button forwarding the verified order payload.
- **WhatsApp Verification Helper (`lib/whatsapp.ts`)**:
  - Added `SandboxPaymentDetails` interface and updated `generateWhatsAppUrl` to embed `[SANDBOX VERIFIED - No. Invoice]` status and transaction metadata into the WhatsApp payload.
- **Checkout Form Integration (`app/checkout/page.tsx`)**:
  - Updated submit action to validate required fields before launching the Sandbox modal.

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
