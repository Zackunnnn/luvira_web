// useProductStore.ts — Zustand state management store for the Luvira product catalog.
// Now acts as a client-side cache and UI state manager, syncing with Postgres via API routes.

import { create } from 'zustand';
import { Product, Category } from '@/types/product';
import { MOCK_PRODUCTS } from '@/data/products';

export const CATEGORY_LABEL_MAP: Record<string, { label: string; iconName: string }> = {
  'emboss': { label: 'Emboss', iconName: 'Sparkles' },
  'emboss-split-toe': { label: 'Emboss Split Toe', iconName: 'Sparkles' },
  'black-sole': { label: 'Black Sole', iconName: 'Layers' },
  'black-sole-split-toe': { label: 'Black Sole Split Toe', iconName: 'Layers' },
  'anti-slip-split-toe': { label: 'Anti-Slip Split Toe', iconName: 'ShieldCheck' },
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'emboss', label: 'Emboss', iconName: 'Sparkles' },
  { id: 'emboss-split-toe', label: 'Emboss Split Toe', iconName: 'Sparkles' },
  { id: 'black-sole', label: 'Black Sole', iconName: 'Layers' },
  { id: 'black-sole-split-toe', label: 'Black Sole Split Toe', iconName: 'Layers' },
  { id: 'anti-slip-split-toe', label: 'Anti-Slip Split Toe', iconName: 'ShieldCheck' },
];

/**
 * Pengaman Awan: turunkan daftar kategori langsung dari model produk yang ada di katalog,
 * diurutkan sesuai urutan baku DEFAULT_CATEGORIES.
 */
export function deriveCategoriesFromProducts(products: Product[]): Category[] {
  if (!products || products.length === 0) {
    return DEFAULT_CATEGORIES;
  }
  const existingModels = new Set(products.map((p) => p.model).filter(Boolean));
  const categories: Category[] = [];

  for (const def of DEFAULT_CATEGORIES) {
    if (existingModels.has(def.id)) {
      categories.push(def);
    }
  }

  for (const model of existingModels) {
    if (!DEFAULT_CATEGORIES.some((c) => c.id === model)) {
      categories.push({
        id: model,
        label: CATEGORY_LABEL_MAP[model]?.label || model,
        iconName: CATEGORY_LABEL_MAP[model]?.iconName || 'Tag',
      });
    }
  }

  return categories.length > 0 ? categories : DEFAULT_CATEGORIES;
}

interface ProductState {
  products: Product[];
  categories: Category[];
  isLoading: boolean;

  fetchProducts: () => Promise<void>;
  
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (id: string, updatedData: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  updateVariantStock: (productId: string, variantId: string, stock: number) => Promise<void>;

  addCategory: (category: Category) => void;
  updateCategory: (id: string, updatedData: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  resetToDefaultProducts: () => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  getTotalVariants: () => number;
}

export const useProductStore = create<ProductState>()((set, get) => ({
  products: MOCK_PRODUCTS,
  categories: deriveCategoriesFromProducts(MOCK_PRODUCTS),
  isLoading: false,

  fetchProducts: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/products', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          const loadedProducts = json.warning ? MOCK_PRODUCTS : json.data;
          set({
            products: loadedProducts,
            categories: deriveCategoriesFromProducts(loadedProducts),
          });
        } else {
          set({
            products: MOCK_PRODUCTS,
            categories: deriveCategoriesFromProducts(MOCK_PRODUCTS),
          });
        }
      } else {
        set({
          products: MOCK_PRODUCTS,
          categories: deriveCategoriesFromProducts(MOCK_PRODUCTS),
        });
      }
    } catch (e) {
      console.warn('Failed to fetch products from API, using default catalog', e);
      set({
        products: MOCK_PRODUCTS,
        categories: deriveCategoriesFromProducts(MOCK_PRODUCTS),
      });
    } finally {
      set({ isLoading: false });
    }
  },

  addProduct: async (product) => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
      if (res.ok) {
        const { data } = await res.json();
        set((state) => {
          const nextProducts = [...state.products, data];
          return {
            products: nextProducts,
            categories: deriveCategoriesFromProducts(nextProducts),
          };
        });
      }
    } catch (e) {
      console.error(e);
    }
  },

  updateProduct: async (id, updatedData) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      if (res.ok) {
        const { data } = await res.json();
        set((state) => {
          const nextProducts = state.products.map((p) => (p.id === id ? data : p));
          return {
            products: nextProducts,
            categories: deriveCategoriesFromProducts(nextProducts),
          };
        });
      }
    } catch (e) {
      console.error(e);
    }
  },

  deleteProduct: async (id) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        set((state) => {
          const nextProducts = state.products.filter((p) => p.id !== id);
          return {
            products: nextProducts,
            categories: deriveCategoriesFromProducts(nextProducts),
          };
        });
      }
    } catch (e) {
      console.error(e);
    }
  },

  updateVariantStock: async (productId, variantId, stock) => {
    // Quick optimistic UI update
    set((state) => ({
      products: state.products.map((p) =>
        p.id === productId
          ? {
              ...p,
              variants: p.variants.map((v) =>
                v.id === variantId ? { ...v, stock: Math.max(0, stock) } : v
              ),
            }
          : p
      ),
    }));

    // In a real app we might just have a dedicated stock endpoint.
    // For now we re-send the whole product to our PUT endpoint
    const product = get().products.find((p) => p.id === productId);
    if (product) {
      try {
        await fetch(`/api/products/${productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variants: product.variants }),
        });
      } catch (e) {
        console.error(e);
      }
    }
  },

  addCategory: (category) => set((state) => ({ categories: [...state.categories, category] })),
  updateCategory: (id, updatedData) => set((state) => ({
    categories: state.categories.map((c) => (c.id === id ? { ...c, ...updatedData } : c)),
  })),
  deleteCategory: (id) => set((state) => ({
    categories: state.categories.filter((c) => c.id !== id),
  })),

  resetToDefaultProducts: async () => {
    await get().fetchProducts();
    set((state) => ({ categories: deriveCategoriesFromProducts(state.products) }));
  },

  getProductById: (id) => get().products.find((p) => p.id === id),
  getTotalVariants: () => get().products.reduce((total, p) => total + p.variants.length, 0),
}));
