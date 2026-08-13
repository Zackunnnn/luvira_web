// useCartStore.ts — Zustand state management store for the Luvira shopping cart.
// Handles all cart operations: add/remove items, update quantities, compute totals.
// Persists cart items to localStorage so the cart survives page refreshes.

import { create } from 'zustand'; // Zustand core store creator
import { persist, createJSONStorage } from 'zustand/middleware'; // Persistence middleware
import { Product, ColorVariant, CartItem } from '@/types/product'; // TypeScript type imports

// CartState — Defines the complete shape of the cart store state and actions.
interface CartState {
  items: CartItem[]; // Array of all items currently in the cart
  isOpen: boolean; // Whether the CartDrawer slide-over panel is visible
  openCart: () => void; // Action: opens the cart drawer
  closeCart: () => void; // Action: closes the cart drawer
  toggleCart: () => void; // Action: toggles the cart drawer open/closed
  addItem: (product: Product, selectedVariant: ColorVariant, quantity?: number) => void; // Action: add item to cart
  removeItem: (productId: string, variantId: string) => void; // Action: remove specific item
  updateQuantity: (productId: string, variantId: string, quantity: number) => void; // Action: set item quantity
  clearCart: () => void; // Action: remove all items from cart
  getTotalItems: () => number; // Derived: sum of all item quantities
  getTotalPrice: () => number; // Derived: sum of all (price × quantity)
}

// Create the Zustand store with localStorage persistence middleware.
// Only the `items` array is persisted; `isOpen` resets to false on page load.
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [], // Start with an empty cart
      isOpen: false, // Cart drawer starts closed

      // Open the cart drawer by setting isOpen to true
      openCart: () => set({ isOpen: true }),

      // Close the cart drawer by setting isOpen to false
      closeCart: () => set({ isOpen: false }),

      // Toggle the cart drawer between open and closed
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      // Add a product+variant to the cart.
      // If the same product+variant already exists, increment the quantity.
      // Otherwise, create a new cart item entry.
      // Also opens the cart drawer to show the newly added item.
      addItem: (product, selectedVariant, quantity = 1) => {
        set((state) => {
          // Check if this exact product+variant combo is already in the cart
          const existingIndex = state.items.findIndex(
            (item) => item.product.id === product.id && item.selectedVariant.id === selectedVariant.id
          );

          if (existingIndex > -1) {
            // Item exists: increment its quantity
            const updatedItems = [...state.items];
            updatedItems[existingIndex].quantity += quantity;
            return { items: updatedItems, isOpen: true }; // Open drawer to show update
          } else {
            // New item: append to the cart array
            return {
              items: [...state.items, { product, selectedVariant, quantity }],
              isOpen: true, // Open drawer to show new item
            };
          }
        });
      },

      // Remove a specific item from the cart by matching product ID + variant ID.
      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter(
            (item) => !(item.product.id === productId && item.selectedVariant.id === variantId)
          ),
        }));
      },

      // Update the quantity of a specific cart item.
      // If the new quantity is 0 or less, remove the item entirely.
      updateQuantity: (productId, variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId); // Delegate to removeItem
          return;
        }

        set((state) => ({
          items: state.items.map((item) => {
            // Find the matching item and update its quantity
            if (item.product.id === productId && item.selectedVariant.id === variantId) {
              return { ...item, quantity };
            }
            return item; // Return unchanged items as-is
          }),
        }));
      },

      // Clear the entire cart — removes all items
      clearCart: () => set({ items: [] }),

      // Compute the total number of items across all cart entries
      // (a product with quantity 3 counts as 3 items)
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      // Compute the total price of all cart items (price × quantity for each)
      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + item.product.price * item.quantity, 0);
      },
    }),
    {
      name: 'luvira-cart-storage', // localStorage key name
      storage: createJSONStorage(() => localStorage), // Use browser localStorage
      partialize: (state) => ({ items: state.items }), // Only persist the items array (not isOpen)
    }
  )
);
