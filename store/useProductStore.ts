// useProductStore.ts — Zustand state management store for the Luvira product catalog.
// Manages dynamic product data (CRUD operations) with localStorage persistence.
// Initializes from MOCK_PRODUCTS seed data on first load, then persists admin changes.
// Pattern mirrors useCartStore.ts for consistency across the codebase.

import { create } from 'zustand'; // Zustand core store creator
import { persist, createJSONStorage } from 'zustand/middleware'; // Persistence middleware
import { Product, Category } from '@/types/product'; // TypeScript type imports
import { MOCK_PRODUCTS } from '@/data/products'; // Default seed data for initialization

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'emboss', label: 'Emboss Split Toe', iconName: 'Sparkles' },
  { id: 'black-sole', label: 'Black Sole Split Toe', iconName: 'Layers' },
  { id: 'anti-slip', label: 'Anti Slip Split Toe', iconName: 'ShieldCheck' },
];

// ProductState — Defines the complete shape of the product store state and actions.
interface ProductState {
  products: Product[]; // Array of all products in the catalog
  categories: Category[]; // Array of product categories

  // Product CRUD Actions
  addProduct: (product: Product) => void; // Add a new product to the catalog
  updateProduct: (id: string, updatedData: Partial<Product>) => void; // Merge partial updates into a product
  deleteProduct: (id: string) => void; // Remove a product by ID
  updateVariantStock: (productId: string, variantId: string, stock: number) => void; // Update specific variant stock

  // Category CRUD Actions
  addCategory: (category: Category) => void;
  updateCategory: (id: string, updatedData: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // Utility Actions
  resetToDefaultProducts: () => void; // Restore catalog and categories to default seed data
  getProductById: (id: string) => Product | undefined; // Lookup a single product by ID
  getTotalVariants: () => number; // Count all color variants across all products
}

// Create the Zustand store with localStorage persistence middleware.
// On first visit (no localStorage key), products initialize from MOCK_PRODUCTS.
// All subsequent changes by admin persist across page refreshes automatically.
export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
      // Initialize with default mock products and categories on first load
      // (persist middleware will override this with localStorage data if available)
      products: MOCK_PRODUCTS,
      categories: DEFAULT_CATEGORIES,

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

      // updateVariantStock — Updates the stock number for a specific color variant.
      // This is primarily used by the admin dashboard's quick-edit table features.
      updateVariantStock: (productId, variantId, stock) =>
        set((state) => ({
          products: state.products.map((product) =>
            product.id === productId
              ? {
                  ...product,
                  variants: product.variants.map((variant) =>
                    variant.id === variantId
                      ? { ...variant, stock: Math.max(0, stock) } // Ensure stock is never negative
                      : variant
                  ),
                }
              : product
          ),
        })),

      // addCategory
      addCategory: (category) => {
        set((state) => ({ categories: [...state.categories, category] }));
      },

      // updateCategory
      updateCategory: (id, updatedData) => {
        set((state) => ({
          categories: state.categories.map((c) => (c.id === id ? { ...c, ...updatedData } : c)),
        }));
      },

      // deleteCategory
      deleteCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        }));
      },

      // resetToDefaultProducts — Replaces the entire catalog and categories with the original seed.
      // Useful for testing or reverting admin changes back to factory defaults.
      resetToDefaultProducts: () => {
        set({ products: [...MOCK_PRODUCTS], categories: [...DEFAULT_CATEGORIES] }); // Spread to create fresh array reference
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
      partialize: (state) => ({ products: state.products, categories: state.categories }), // Only persist products and categories array
    }
  )
);
