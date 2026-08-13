// product.ts — Core TypeScript type definitions for the Luvira product catalog.
// Defines the shape of all product, variant, cart, and customer data structures
// used throughout the application. Shared by components, store, and API helpers.

// ModelType — Defines the 4 available sock model categories.
// Used as the value for product filter tabs and product categorization.
export type ModelType = 'emboss' | 'black-sole' | 'anti-slip' | 'classic';

// FilterCategory — Extends ModelType with 'all' option for the filter tabs.
// 'all' shows every product regardless of model type.
export type FilterCategory = 'all' | ModelType;

// ColorVariant — Represents a single color option for a product.
// Each product has multiple color variants, each with its own image and stock status.
export interface ColorVariant {
  id: string; // Unique identifier for this variant (e.g., 'emb-nude')
  name: string; // Display name for the color (e.g., "Nude Cream", "Sage Green")
  hex: string; // Hex color code for the swatch circle (e.g., "#E8D5C4")
  image: string; // Image URL (data URI or remote URL) for this variant's product photo
  inStock: boolean; // Whether this specific variant is currently in stock
}

// Product — Represents a single product in the Luvira catalog.
// Contains all data needed to render a product card and add to cart.
export interface Product {
  id: string; // Unique product identifier (e.g., 'luv-emboss-split')
  name: string; // Full product name (e.g., "Emboss Split Toe Socks")
  model: ModelType; // Which model category this product belongs to
  price: number; // Current selling price in IDR (e.g., 35000 = Rp 35.000)
  originalPrice?: number; // Original price before discount (optional, for strikethrough)
  rating: number; // Product rating out of 5 (e.g., 4.9)
  reviewsCount: number; // Total number of customer reviews
  badge?: string; // Optional promotional badge text (e.g., "Best Seller", "New")
  description: string; // Full product description in Bahasa Indonesia
  features: string[]; // Array of key feature bullet points for this product
  variants: ColorVariant[]; // Array of available color variants
}

// CartItem — Represents a product + specific color variant added to the shopping cart.
// Each unique product+variant combination is a separate cart item.
export interface CartItem {
  product: Product; // The full product object (for accessing name, price, etc.)
  selectedVariant: ColorVariant; // The specific color variant the customer chose
  quantity: number; // How many of this product+variant the customer wants
}

// CustomerInfo — Represents the customer delivery information collected at checkout.
// Submitted as part of the structured WhatsApp order message.
export interface CustomerInfo {
  name: string; // Customer's full name (Nama Lengkap)
  phone: string; // Customer's WhatsApp number (No. HP/WA)
  address: string; // Full delivery address (Alamat Lengkap)
  notes?: string; // Optional order notes (Catatan Pesanan), e.g., "titip di satpam"
}
