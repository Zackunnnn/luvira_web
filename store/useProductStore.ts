// useProductStore.ts — Zustand state management store for the Luvira product catalog.
// Now acts as a client-side cache and UI state manager, syncing with Postgres via API routes.

import { create } from 'zustand';
import { Product, Category } from '@/types/product';
import { MOCK_PRODUCTS } from '@/data/products';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'emboss', label: 'Emboss Split Toe', iconName: 'Sparkles' },
  { id: 'black-sole', label: 'Black Sole Split Toe', iconName: 'Layers' },
  { id: 'anti-slip', label: 'Anti Slip Split Toe', iconName: 'ShieldCheck' },
];

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
  products: [],
  categories: DEFAULT_CATEGORIES,
  isLoading: false,

  fetchProducts: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          set({ products: json.data });
        }
      }
    } catch (e) {
      console.error('Failed to fetch products', e);
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
        set((state) => ({ products: [...state.products, data] }));
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
        set((state) => ({
          products: state.products.map((p) => (p.id === id ? data : p)),
        }));
      }
    } catch (e) {
      console.error(e);
    }
  },

  deleteProduct: async (id) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        }));
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
    set({ categories: [...DEFAULT_CATEGORIES] });
  },

  getProductById: (id) => get().products.find((p) => p.id === id),
  getTotalVariants: () => get().products.reduce((total, p) => total + p.variants.length, 0),
}));
