// useProductStore.ts — Zustand state management store for the Luvira product catalog.
// Manages dynamic product data (CRUD operations) with localStorage persistence.
// Initializes from MOCK_PRODUCTS seed data on first load, then persists admin changes.
// Pattern mirrors useCartStore.ts for consistency across the codebase.

import { create } from 'zustand'; // Zustand core store creator
import { persist, createJSONStorage } from 'zustand/middleware'; // Persistence middleware
import { Product } from '@/types/product'; // TypeScript type imports
import { MOCK_PRODUCTS } from '@/data/products'; // Default seed data for initialization

// ProductState — Defines the complete shape of the product store state and actions.
interface ProductState {
  products: Product[]; // Array of all products in the catalog

  // CRUD Actions
  addProduct: (product: Product) => void; // Add a new product to the catalog
  updateProduct: (id: string, updatedData: Partial<Product>) => void; // Merge partial updates into a product
  deleteProduct: (id: string) => void; // Remove a product by ID
  toggleVariantStock: (productId: string, variantId: string) => void; // Toggle inStock for a variant

  // Utility Actions
  resetToDefaultProducts: () => void; // Restore catalog to MOCK_PRODUCTS seed data
  getProductById: (id: string) => Product | undefined; // Lookup a single product by ID
  getTotalVariants: () => number; // Count all color variants across all products
}

// Create the Zustand store with localStorage persistence middleware.
// On first visit (no localStorage key), products initialize from MOCK_PRODUCTS.
// All subsequent changes by admin persist across page refreshes automatically.
export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
      // Initialize with default mock products on first load
      // (persist middleware will override this with localStorage data if available)
      products: MOCK_PRODUCTS,

      // addProduct — Appends a new product to the catalog array.
      // Generates a unique ID if not provided to prevent collisions.
      addProduct: (product) => {
        set((state) => ({
          products: [...state.products, product],
        }));
      },

      // updateProduct — Merges partial data into an existing product by ID.
      // Supports updating any subset of Product fields (name, price, variants, etc.).
      // If updatedData includes a `variants` array, it fully replaces the existing variants.
      updateProduct: (id, updatedData) => {
        set((state) => ({
          products: state.products.map((product) => {
            if (product.id === id) {
              return { ...product, ...updatedData }; // Merge updates into matching product
            }
            return product; // Return other products unchanged
          }),
        }));
      },

      // deleteProduct — Removes a product from the catalog by filtering out its ID.
      deleteProduct: (id) => {
        set((state) => ({
          products: state.products.filter((product) => product.id !== id),
        }));
      },

      // toggleVariantStock — Flips the inStock boolean for a specific color variant.
      // Used by admin to quickly mark variants as available/unavailable without full edit.
      toggleVariantStock: (productId, variantId) => {
        set((state) => ({
          products: state.products.map((product) => {
            if (product.id === productId) {
              return {
                ...product,
                variants: product.variants.map((variant) => {
                  if (variant.id === variantId) {
                    return { ...variant, inStock: !variant.inStock }; // Toggle inStock
                  }
                  return variant;
                }),
              };
            }
            return product;
          }),
        }));
      },

      // resetToDefaultProducts — Replaces the entire catalog with the original MOCK_PRODUCTS seed.
      // Useful for testing or reverting admin changes back to factory defaults.
      resetToDefaultProducts: () => {
        set({ products: [...MOCK_PRODUCTS] }); // Spread to create fresh array reference
      },

      // getProductById — Finds and returns a single product by its unique ID.
      // Returns undefined if no product with that ID exists.
      getProductById: (id) => {
        return get().products.find((product) => product.id === id);
      },

      // getTotalVariants — Computes the total count of all color variants across all products.
      // Used for admin dashboard statistics display.
      getTotalVariants: () => {
        return get().products.reduce(
          (total, product) => total + product.variants.length,
          0
        );
      },
    }),
    {
      name: 'luvira-product-storage', // localStorage key name
      storage: createJSONStorage(() => localStorage), // Use browser localStorage
      partialize: (state) => ({ products: state.products }), // Only persist the products array
    }
  )
);
