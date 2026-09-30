import { create } from 'zustand';

export interface PromoCode {
  id?: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  resellerName?: string | null;
  resellerWaNumber?: string | null;
  commissionType?: 'percentage' | 'fixed' | null;
  commissionValue?: number | null;
  quota: number;
  usedCount: number;
  expiresAt?: Date | string | null;
  isActive: boolean;
  isFreeShipping: boolean;
}

interface PromoState {
  promos: PromoCode[];
  isLoading: boolean;
  
  fetchPromos: () => Promise<void>;
  addPromo: (promo: PromoCode) => Promise<void>;
  updatePromo: (id: string, promo: Partial<PromoCode>) => Promise<void>;
  deletePromo: (id: string) => Promise<void>;
}

export const usePromoStore = create<PromoState>()((set, get) => ({
  promos: [],
  isLoading: false,

  fetchPromos: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/promos');
      if (res.ok) {
        const data = await res.json();
        set({ promos: data.data || [] });
      }
    } catch (err) {
      console.error('Failed to fetch promos', err);
    } finally {
      set({ isLoading: false });
    }
  },

  addPromo: async (promo) => {
    try {
      const res = await fetch('/api/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promo),
      });
      if (res.ok) {
        const newPromo = await res.json();
        set((state) => ({ promos: [newPromo.data, ...state.promos] }));
      }
    } catch (err) {
      console.error('Failed to add promo', err);
    }
  },

  updatePromo: async (id, promo) => {
    try {
      const res = await fetch(`/api/promos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promo),
      });
      if (res.ok) {
        const updatedPromo = await res.json();
        set((state) => ({
          promos: state.promos.map((p) => (p.id === id ? updatedPromo.data : p)),
        }));
      }
    } catch (err) {
      console.error('Failed to update promo', err);
    }
  },

  deletePromo: async (id) => {
    try {
      const res = await fetch(`/api/promos/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        set((state) => ({
          promos: state.promos.filter((p) => p.id !== id),
        }));
      }
    } catch (err) {
      console.error('Failed to delete promo', err);
    }
  },
}));
