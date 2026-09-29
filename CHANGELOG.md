# Changelog - Luvira Sock Brand Public Storefront

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased - Planned v2.0] Backend Migration & Feature Expansion

### ⚠️ Urgent (found via codebase audit, 2026-09-16)
- **`/admin` has no authentication** — anyone with the URL can view all orders and edit the live product catalog/site content on production Neon DB. Fix independently of the roadmap below, before anything else.

### Corrected Architecture Baseline (audit, 2026-09-16)
- `Product`, `ColorVariant`, `SiteContent` are already live on Neon Postgres via Prisma (`/api/products`, `/api/content`) — earlier changelog entries below did not reflect that this had happened.
- A `ChangeLog` table already exists in `prisma/schema.prisma` (unused) — matches the planned audit-log feature; just needs to be called from API routes instead of building a new table.
- `/api/orders` and `/api/midtrans/notification` still use local JSON files (`data/orders.json`, `data/midtrans-notifications.json`) — these are the real remaining migration targets, not the whole app.
- `useCartStore` remains `localStorage`-only — intentional, not a gap.

### Planned
- Add a `User` table (username, passwordHash, role) and gate `/admin` with real per-user login (role: `admin`/`owner`).
- Migrate `Order`/`OrderItem` from `data/orders.json` onto Prisma models; backfill existing orders.
- Remove `/api/midtrans/*` routes; replace with manual bank transfer + buyer-uploaded proof + admin verification (dual confirmation).
- Checkout: shipping cost via ongkir aggregator (Biteship/RajaOngkir Pro/Komerce), PPN line item, buyer-facing promo codes (`PromoCode` model), WA redirect with structured order text.
- Auto-cancel unpaid orders past deadline with stock release (cron).
- Owner dashboard: sales/tax/cost/profit/packing-cost reports, stock control, gated to `owner` role. `Product.costPrice`/`packingCost` excluded from API responses to non-owner roles.
- Automatic shipping label printing via ongkir aggregator.
- Reseller ops: Google Sheets sync of promo-code usage/commissions, automatic WA notification to resellers on confirmed order.
- Wire up existing `ChangeLog` table for admin edit history (Pak Dimas access) with per-field revert.
- Brosur & training resource page.

## [v1.8.0 - Midtrans Snap Payment Integration & Admin Fixes] - 2026-08-27

### Added
- **Midtrans Snap Payment Gateway Integration**:
  - Installed official `midtrans-client` Node.js SDK for server-side Snap API calls with automatic auth/signature handling.
  - Environment variable configuration via `.env.local`: `MIDTRANS_SERVER_KEY` (server-only) and `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` (public), with validation that throws clear errors if not set during development.
  - Created `.env.local.example` template documenting all required environment variables.
- **API Route: `/api/midtrans/create-transaction` (`app/api/midtrans/create-transaction/route.ts`)**:
  - POST endpoint accepting `orderId`, `grossAmount`, `itemDetails`, and `customerDetails`.
  - Calls Midtrans Snap API to generate transaction token, returns `{ token, redirect_url }` to client.
  - Input validation and comprehensive error handling with informative messages.
- **API Route: `/api/midtrans/notification` (`app/api/midtrans/notification/route.ts`)**:
  - Webhook endpoint for Midtrans server-to-server payment status notifications.
  - **SHA512 signature verification** (`order_id + status_code + gross_amount + ServerKey`) — critical security measure to ensure notifications are authentic, not spoofed by external parties.
  - Maps `transaction_status` to Luvira order statuses: `settlement`/`capture` → Lunas, `pending` → Menunggu Pembayaran, `deny`/`cancel`/`expire` → Gagal.
  - Stores notifications to `data/midtrans-notifications.json` (simplest server-side storage without database).
- **API Route: `/api/midtrans/order-status/[orderId]` (`app/api/midtrans/order-status/[orderId]/route.ts`)**:
  - GET endpoint for frontend polling — reads confirmed status from webhook notification JSON file.
  - Returns mapped Luvira order status based on Midtrans transaction status.
- **Midtrans SDK Singleton (`lib/midtrans.ts`)**:
  - Server-only Snap and CoreApi instances with environment validation.
  - Detailed comments explaining why the official SDK is used over manual HTTP calls.
- **Type Definitions (`types/midtrans.ts`)**:
  - TypeScript interfaces for `CreateTransactionRequest`, `CreateTransactionResponse`, `MidtransNotificationPayload`, `MidtransTransactionStatus`, and `StoredNotification`.
  - Documentation for each field including security-critical `signature_key`.
- **Payment Mode Toggle (`NEXT_PUBLIC_PAYMENT_MODE`)**:
  - `'midtrans'` (default): Checkout uses real Midtrans Snap popup (currently Sandbox environment).
  - `'sandbox'`: Checkout uses existing SandboxPaymentModal for local UI testing without API calls.
  - Mode indicator badge displayed on checkout page for clarity.
- **Snap.js Frontend Integration (`app/checkout/page.tsx`)**:
  - Loads `snap.js` via Next.js `<Script>` component with `data-client-key` from environment variable.
  - `window.snap.pay(token)` triggers Midtrans payment popup with `onSuccess`, `onPending`, `onError`, `onClose` callbacks.
  - Successful payments create Order records in `useOrderStore` and show `DigitalReceiptModal`.
  - Pending payments are saved with "Menunggu Pembayaran" status.
  - Helper function `mapPaymentType()` converts Midtrans `payment_type` codes to user-friendly labels.
- **Admin Dashboard — Delete Order Confirmation Modal (`app/admin/page.tsx`)**:
  - Order deletion now requires explicit confirmation via modal dialog (previously deleted immediately on click).

### Changed
- **Stock Management Upgrade (`types/product.ts`, `data/products.ts`, `store/useProductStore.ts`)**:
  - Upgraded variant stock tracking from simple boolean (`inStock: boolean`) to exact numeric count (`stock: number`).
  - Added low stock indicators (<= 5) in `ProductCard` and `ProductDetailModal` for buyer urgency.
  - Updated admin dashboard to allow direct numeric stock input per variant.
- **Extended `OrderStatus` Type (`types/order.ts`)**:
  - Added Midtrans-specific statuses: `'Lunas'`, `'Menunggu Pembayaran'`, `'Gagal'` alongside existing `'Sandbox Verified'`, `'Diproses'`, `'Selesai'`.
  - Added optional `midtransOrderId` field to `Order` interface for Midtrans transaction tracking.
- **Admin Order Status Dropdown (`app/admin/page.tsx`)**:
  - Extended with new status options (✅ Lunas, ⏳ Menunggu Pembayaran, ❌ Gagal/Expired).
  - Color-coded dropdown styling for each status: emerald for Lunas, amber for Pending/Diproses, rose for Gagal.
- **Admin Product Card — Inline Price Edit Icon Fix (`app/admin/page.tsx`)**:
  - Added `group` class to product card container so `Edit3` pencil icon properly shows on hover via `group-hover:opacity-100`.
- **Admin Variant Image Manager — Clear Button (`app/admin/page.tsx`)**:
  - Added clear/remove button (✕) for variant images, allowing admin to switch from Base64 uploaded image back to external URL input mode.
- **Checkout Page Dynamic Rendering (`app/checkout/page.tsx`)**:
  - CTA button text, info notes, and footer text dynamically adjust based on active payment mode.
  - Loading state with spinner during Midtrans transaction creation.
  - Error banner for Midtrans-specific errors (connection, validation, payment failures).

### Technical Debt / Known Limitations
- **Webhook Storage**: Currently using `data/midtrans-notifications.json` for storing Midtrans server notifications to avoid database dependencies during MVP phase. This is prone to race conditions under high concurrent load. **Recommendation**: Migrate to a proper database (SQLite/PostgreSQL) when daily order volume increases significantly.

## [v1.7.0 - Native Vector Typography BrandLogo & Clean Layout] - 2026-08-23

### Added
- **Native Luxury Typography BrandLogo (`components/ui/BrandLogo.tsx`)**:
  - Implemented 100% native vector & CSS brand logo with serif typography, animated dusty-rose accent dot (`animate-pulse`), and brand tagline (`Modest • Comfortable • Chic`).
  - Zero external raster dependencies (100% free of checkerboard/PNG compression artifacts).
  - Theme-adaptive colors: `theme="light"` (Deep Forest `#1E4D48`) and `theme="dark"` (Warm Cream `#FDFBF7`).
  - Standardized scale tiers: `sm` (compact headers/modals), `md` (navbar), and `lg` (footer).
- **Hydration Immunity Safeguards (`app/layout.tsx`)**:
  - Relocated `<JsonLd />` into `<body>` before `{children}` with `suppressHydrationWarning` on `<html>` and `<body>`.

### Changed
- **Header Navigation & Hero (`HeroSection.tsx`)**:
  - Removed container wrappers and placed clean `<BrandLogo size="md" theme="light" />`.
- **Storefront Footer (`app/page.tsx`)**:
  - Upgraded footer brand header with `<BrandLogo size="lg" theme="dark" />`.
- **Checkout, Modals & Admin (`SandboxPaymentModal.tsx`, `DigitalReceiptModal.tsx`, `checkout/page.tsx`, `admin/page.tsx`)**:
  - Integrated theme-aware `<BrandLogo />` across all checkout flows and portal views.

## [v1.6.0 - Mobile Link-in-Bio & SEO Engine Optimization] - 2026-08-23

### Added
- **Comprehensive Metadata & Social Graph (`app/layout.tsx`)**:
  - Configured Next.js App Router metadata with custom title template, canonical URL, and detailed Indonesian brand keywords.
  - OpenGraph and Twitter Cards preview metadata targeting luxury modest sock aesthetics for Instagram, TikTok, and WhatsApp link sharing.
  - Mobile viewport optimization with `themeColor: '#1E4D48'` and `viewportFit: 'cover'`.
- **Dynamic XML Sitemap & Robots Engine (`app/sitemap.ts`, `app/robots.ts`)**:
  - Dynamic `sitemap.xml` providing search engines with priority-weighted indexing for `/`, `/checkout`, and `/admin`.
  - Automated `robots.txt` granting full access to public catalog while restricting crawler traffic from private `/admin` routes.
- **Web App Manifest PWA Support (`app/manifest.ts`)**:
  - Standalone PWA installation configuration for mobile Add-to-Home screen, branded in `#1E4D48` Deep Forest and `#FDFBF7` Warm Cream.
- **Schema.org Structured Data (`components/seo/JsonLd.tsx`)**:
  - Injected JSON-LD schemas for `Organization`, `WebSite`, and `ItemList / Product` for Google Search Rich Snippet indexing.

### Changed
- **Mobile Link-in-Bio UX (320px–430px) & Safe Area Padding (`app/page.tsx`)**:
  - Upgraded floating quick checkout bar with 44px minimum touch targets and iOS safe area padding (`env(safe-area-inset-bottom)`).
  - Eliminated horizontal layout overflows across small mobile displays.

## [v1.5.0 - Aesthetic Digital Receipt Generator & Admin Order History Log] - 2026-08-23

### Added
- **Order History State Store (`store/useOrderStore.ts`)**:
  - Zustand state management with `localStorage` persistence (`luvira-orders-storage`) for zero-cost client-side order logging.
  - Action methods: `addOrder`, `updateOrderStatus`, `deleteOrder`, `clearOrders`, `getOrderById`, and `getTotalRevenue`.
  - Seamless automatic hook into `SandboxPaymentModal.tsx` upon verified payment completion.
- **Aesthetic Digital Receipt Modal (`components/checkout/DigitalReceiptModal.tsx`)**:
  - Luxury invoice card styled with Luvira palette (`warm-cream`, `deep-forest`, `dusty-rose`).
  - Displays official brand banner, invoice number (`LVR-SBX-XXXX`), WIB timestamp, customer details, itemized socks breakdown with color swatch indicators, "LUNAS (SANDBOX)" verified status, and authenticity QR code.
  - Print/PDF export utility via native `@media print` CSS rules isolating the receipt card.
- **Admin Dashboard "Riwayat Pesanan Masuk" Tab (`app/admin/page.tsx`)**:
  - Quick KPI stats: Total Pesanan Masuk, Total Omset Sandbox (Rp), and Pesanan Perlu Diproses counter.
  - Interactive table with real-time status switcher dropdown (`Sandbox Verified`, `Diproses`, `Selesai`).
  - One-click actions: View & Print Digital Receipt modal, Direct WhatsApp Chat Link with prefilled confirmation template, and single/bulk deletion.

## [v1.4.1 - 100% Dynamic Feature Customization & Material Flexibility] - 2026-08-23

### Added
- **Dynamic Feature Items Array Architecture (`types/content.ts`, `data/defaultContent.ts`)**:
  - Refactored `features.items` into a fully dynamic `FeatureItem[]` array, removing hardcoded slot keys.
  - Allows full admin customization for any feature title (e.g., `"100% Premium Nylon"`, `"Ergonomic Split Toe"`), subtitle, and description.
- **Admin Tech Features CMS Manager (`app/admin/page.tsx`)**:
  - Added interactive buttons to dynamically add, edit, and delete tech feature cards without limitations.

### Changed
- **Feature Highlights & Product Detail Modal Refactoring (`FeatureHighlight.tsx`, `ProductDetailModal.tsx`)**:
  - Eliminated all hardcoded material/feature titles (such as `"Combed Cotton"` or fixed slot numbers).
  - Both components now dynamically render custom titles, badges, and benefits directly from store/product data.

## [v1.4.0 - Product Detail Modal & Dynamic Storytelling UX] - 2026-08-23

### Added
- **Interactive Product Detail Modal (`components/products/ProductDetailModal.tsx`)**:
  - High-resolution visual showcase with real-time color variant swatch switching.
  - Dynamic stock status indicator (`Ready Stock` vs `Stok Habis`) per color variant.
  - Data-driven storytelling accordions dynamically rendering `product.features` without hardcoding.
  - Syar'i material deep-dive (100% combed cotton, modesty coverage, wudhu-friendly).
  - Practical care guide for fabric elasticity and washing.
  - Sticky bottom action bar with quantity counter (+/-), subtotal calculation, and direct add-to-cart integration with `useCartStore`.
- **Product Card Storytelling Trigger (`components/products/ProductCard.tsx`)**:
  - Clickable thumbnail, title, and quick-view eye button opening the deep-dive storytelling modal.

### Changed
- **Polished Luxury Modest Copywriting (`data/defaultContent.ts`)**:
  - Elevated brand narratives across Hero, About 3 Pillars, and Features to reflect premium syar'i activewear positioning.

## [v1.3.0 - Dynamic Site Copywriting CMS] - 2026-08-23

### Added
- **Dynamic Site Copywriting Store (`store/useContentStore.ts`)**:
  - Zustand store with `localStorage` persistence (`luvira-site-content`) managing marketing text across the site.
  - Granular action methods: `updateHeroContent`, `updateAboutContent`, `updateFeaturesContent`, `updateMicrocopy`, and `resetToDefaultContent`.
  - Type definitions in `types/content.ts` and baseline default content seed in `data/defaultContent.ts`.
- **Copywriting Editor Tab in Admin Dashboard CMS (`app/admin/page.tsx`)**:
  - Tab Switcher: **[Manajemen Produk & Varian]** and **[Editor Copywriting & Konten]**.
  - Form sections for Hero & Promo Banner, About 3 Pillars, 4 Tech Features, and Cart/Catalog Microcopy.
  - 1-Click seasonal theme presets: *🌙 Ramadan / Umroh*, *⚡ Payday Sale*, and *🎒 Mahasiswi Aktif*.
  - Sticky bottom save bar with toast notification feedback and emergency reset dialog.

### Changed
- **Public Storefront Dynamic Copywriting Sync (`HeroSection`, `AboutLuvira`, `FeatureHighlight`, `CartDrawer`, `page.tsx`)**:
  - Replaced all hardcoded marketing copy across sections with reactive reads from `useContentStore`.
  - Hydration-safe guards implemented across all components to eliminate SSR/hydration mismatches.

## [v1.2.0 - Dynamic Catalog & Admin CMS] - 2026-08-23

### Added
- **Dynamic Product Catalog Store (`store/useProductStore.ts`)**:
  - Zustand store with `localStorage` persistence for managing the entire product catalog dynamically.
  - CRUD actions: `addProduct`, `updateProduct`, `deleteProduct`, `toggleVariantStock`, `resetToDefaultProducts`.
  - Utility methods: `getProductById`, `getTotalVariants`.
  - Initializes from `MOCK_PRODUCTS` seed data on first load; all subsequent admin changes persist in browser across page refreshes.
- **Admin Dashboard CMS (`app/admin/page.tsx`)**:
  - Quick stats panel displaying total active products and total color variants with link to public storefront.
  - Full product CRUD form: name, model category selector, price (IDR), original price (strikethrough), badge (with 6 presets + custom), description, and dynamic features list.
  - Dynamic variant color manager: variant name, hex color picker + text input, image input (external URL **and** local file upload via `FileReader.readAsDataURL` → Base64 Data URL), and stock toggle per variant.
  - Product catalog table with inline quick-edit price, per-variant stock toggle via color swatch buttons, and delete confirmation modal.
  - "Reset ke Data Default" functionality with confirmation dialog to restore original `MOCK_PRODUCTS` seed.

### Changed
- **Public Storefront Sync (`app/page.tsx`)**:
  - Replaced static `MOCK_PRODUCTS` import with dynamic `useProductStore` Zustand store reads.
  - Product catalog grid now reactively displays admin-managed products in real-time.
  - Added hydration-safe `mounted` guard for product data loaded from localStorage.
- **Hero Section Sync (`components/sections/HeroSection.tsx`)**:
  - Spotlight product now reads from `useProductStore` instead of static `MOCK_PRODUCTS[0]`.
  - Added empty catalog guard to prevent crash when no products exist.

## [v1.1.0 - Sandbox Payment Gateway] - 2026-08-23

### Added
- **Sandbox Payment Simulation Modal (`components/checkout/SandboxPaymentModal.tsx`)**:
  - Modal simulation dialog supporting **QRIS Luvira Instant** and **BCA/Mandiri Virtual Account (Sandbox)**.
  - Realistic QRIS visual mockup with an active 15-minute countdown expiration timer.
  - Virtual Account view featuring bank selector (BCA and Mandiri) and an interactive "Salin VA" button with real-time clipboard copy feedback.
  - 2.5-second realistic payment verification loading animation with progressive status messages.
  - Success state receipt featuring animated checkmark, randomized unique invoice ID (`LVR-SBX-XXXX`), payment method, transaction timestamp, and total payment.
  - Direct WhatsApp button ("Kirim Bukti & Validasi Pesanan ke WhatsApp") that forwards the order along with verified sandbox invoice data.
- **WhatsApp Verification Metadata (`lib/whatsapp.ts`)**:
  - Added `SandboxPaymentDetails` interface and upgraded `generateWhatsAppUrl` to embed `[SANDBOX VERIFIED - No. Invoice]` status header and payment metadata into the WhatsApp payload.

### Changed
- **Checkout Flow Integration (`app/checkout/page.tsx`)**:
  - Connected checkout form validation with the Sandbox Payment Gateway trigger.
  - Form validation is executed before opening the simulation modal, ensuring customer information and cart state are intact.
  - Updated primary checkout action to "Bayar via Sandbox Gateway".

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
