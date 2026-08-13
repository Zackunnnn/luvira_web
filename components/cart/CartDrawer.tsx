// CartDrawer.tsx — Slide-over cart panel that displays selected items,
// quantity controls, subtotal, and a checkout navigation link.
// Opens from the right edge of the screen on top of all other content.

'use client'; // Required for client-side Zustand state and onClick handlers

import React from 'react'; // React core
import Image from 'next/image'; // Next.js optimized image component
import Link from 'next/link'; // Next.js client-side navigation link
import { useCartStore } from '@/store/useCartStore'; // Zustand cart store
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Truck } from 'lucide-react'; // Icon imports
import { Button } from '@/components/ui/Button'; // Reusable Button component

export const CartDrawer: React.FC = () => {
  // Destructure all required cart state and actions from Zustand store
  const { items, isOpen, closeCart, updateQuantity, removeItem, getTotalPrice, getTotalItems } =
    useCartStore();

  // Early return: don't render anything if drawer is closed
  if (!isOpen) return null;

  // Compute derived values from cart state
  const totalPrice = getTotalPrice(); // Sum of all item prices * quantities
  const totalItems = getTotalItems(); // Sum of all item quantities

  // Currency formatter for Indonesian Rupiah (IDR) — no decimal places
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    // Full-screen overlay container with high z-index to appear above all content
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Dark backdrop overlay — clicking it closes the drawer */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={closeCart}
      />

      {/* Drawer panel container — slides in from the right */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        {/* Inner drawer with max width to prevent stretching on large screens */}
        <div className="w-screen max-w-md bg-warm-cream flex flex-col shadow-2xl">
          
          {/* Drawer Header — deep forest green bar with title and close button */}
          <div className="p-4 bg-deep-forest text-warm-cream flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-dusty-rose" /> {/* Cart icon in rose */}
              <h2 className="font-bold text-base tracking-wide">
                Keranjang Belanja ({totalItems}) {/* Show total item count */}
              </h2>
            </div>
            {/* Close button (X icon) */}
            <button
              onClick={closeCart}
              className="p-1 rounded-full hover:bg-white/10 text-warm-cream transition-all cursor-pointer"
              aria-label="Tutup Keranjang"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Shipping Promo Banner — informational strip below header */}
          <div className="bg-leaf-olive/15 px-4 py-2 text-xs font-semibold text-deep-forest flex items-center gap-2 border-b border-leaf-olive/20">
            <Truck className="w-4 h-4 text-leaf-olive shrink-0" /> {/* Truck icon */}
            <span>Promo Subsidi Ongkir Otomatis untuk Semua Pesanan!</span>
          </div>

          {/* Scrollable Items List — flex-1 to fill remaining vertical space */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 ? (
              // Empty cart state — informational message with CTA to continue shopping
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                {/* Empty cart illustration placeholder */}
                <div className="w-20 h-20 bg-deep-forest/5 rounded-full flex items-center justify-center text-deep-forest/40">
                  <ShoppingBag className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-muted-charcoal">
                    Keranjang Masih Kosong
                  </h3>
                  <p className="text-xs text-muted-charcoal/60 mt-1">
                    Yuk pilih koleksi kaos kaki favoritmu dan rasakan kenyamanannya!
                  </p>
                </div>
                {/* Button to close drawer so user can browse products */}
                <Button onClick={closeCart} variant="primary" size="sm">
                  Mulai Belanja Now
                </Button>
              </div>
            ) : (
              // Map through each cart item and render a compact card
              items.map((item) => (
                <div
                  key={`${item.product.id}-${item.selectedVariant.id}`} // Unique key per product+variant combo
                  className="bg-white p-3 rounded-2xl border border-deep-forest/10 flex gap-3 shadow-xs items-center"
                >
                  {/* Product Thumbnail Image */}
                  <div className="relative w-16 h-16 rounded-xl bg-warm-cream overflow-hidden shrink-0">
                    <Image
                      src={item.selectedVariant.image} // Variant-specific image
                      alt={item.product.name}
                      fill // Fill the 16x16 container
                      className="object-cover"
                      unoptimized // SVG data URIs don't need optimization
                    />
                  </div>

                  {/* Item Info: name, variant, price, and quantity controls */}
                  <div className="flex-1 min-w-0">
                    {/* Top row: product name + delete button */}
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-bold text-xs text-muted-charcoal truncate">
                        {item.product.name}
                      </h4>
                      {/* Delete/remove item button */}
                      <button
                        onClick={() => removeItem(item.product.id, item.selectedVariant.id)}
                        className="text-muted-charcoal/40 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                        aria-label="Hapus Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Color variant indicator: small swatch dot + name */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-black/10 inline-block"
                        style={{ backgroundColor: item.selectedVariant.hex }} // Dynamic color swatch
                      />
                      <span className="text-[11px] font-medium text-muted-charcoal/70">
                        {item.selectedVariant.name}
                      </span>
                    </div>

                    {/* Bottom row: line total price + quantity adjuster */}
                    <div className="flex items-center justify-between mt-2">
                      {/* Line item total (price × quantity) */}
                      <span className="font-bold text-xs text-deep-forest">
                        {formatCurrency(item.product.price * item.quantity)}
                      </span>

                      {/* Quantity Selector — minus / count / plus */}
                      <div className="flex items-center gap-2 bg-warm-cream border border-deep-forest/10 rounded-xl px-2 py-0.5">
                        {/* Decrease quantity button (removes item when reaching 0) */}
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.product.id,
                              item.selectedVariant.id,
                              item.quantity - 1
                            )
                          }
                          className="text-muted-charcoal/70 hover:text-deep-forest p-0.5 cursor-pointer"
                          aria-label="Kurangi Jumlah"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        {/* Current quantity display */}
                        <span className="text-xs font-bold text-muted-charcoal min-w-4 text-center">
                          {item.quantity}
                        </span>
                        {/* Increase quantity button */}
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.product.id,
                              item.selectedVariant.id,
                              item.quantity + 1
                            )
                          }
                          className="text-muted-charcoal/70 hover:text-deep-forest p-0.5 cursor-pointer"
                          aria-label="Tambah Jumlah"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Checkout Summary — only shown when cart has items */}
          {items.length > 0 && (
            <div className="p-4 bg-white border-t border-deep-forest/10 space-y-3">
              {/* Price breakdown rows */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-muted-charcoal/70">
                  <span>Subtotal ({totalItems} pasang)</span>
                  <span className="font-semibold">{formatCurrency(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-muted-charcoal/70">
                  <span>Estimasi Ongkir</span>
                  <span className="text-leaf-olive font-semibold">Dihitung di WA</span>
                </div>
                {/* Bold total line */}
                <div className="flex justify-between text-sm font-extrabold text-deep-forest pt-2 border-t border-deep-forest/10">
                  <span>Total Sementara</span>
                  <span>{formatCurrency(totalPrice)}</span>
                </div>
              </div>

              {/* FIX: Use Link styled as button instead of nesting <button> inside <a> */}
              {/* This avoids the "Invalid HTML tag nesting" hydration error */}
              <Link
                href="/checkout"
                onClick={closeCart} // Close drawer before navigating
                className="flex items-center justify-center gap-2.5 w-full px-6 py-3.5 text-base font-semibold rounded-2xl bg-deep-forest text-warm-cream hover:bg-deep-forest-hover shadow-sm shadow-deep-forest/20 transition-all duration-200 active:scale-95"
              >
                <span>Lanjut ke Checkout</span>
                <ArrowRight className="w-4 h-4" /> {/* Arrow icon */}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
