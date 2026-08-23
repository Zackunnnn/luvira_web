// useOrderStore.ts — Zustand state management for customer order history.
// Provides 100% Zero-Cost order logging with localStorage persistence (key: luvira-orders-storage).
// Records orders automatically from SandboxPaymentModal and surfaces them in Admin Dashboard.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Order, OrderStatus } from '@/types/order';

interface OrderState {
  orders: Order[];

  // Action methods
  addOrder: (order: Order) => void;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  deleteOrder: (id: string) => void;
  clearOrders: () => void;
  getOrderById: (id: string) => Order | undefined;
  getTotalRevenue: () => number;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: [],

      // addOrder — Appends new order to the beginning of the list (newest first)
      addOrder: (order) => {
        set((state) => ({
          orders: [order, ...state.orders],
        }));
      },

      // updateOrderStatus — Updates lifecycle status ('Sandbox Verified' | 'Diproses' | 'Selesai')
      updateOrderStatus: (id, status) => {
        set((state) => ({
          orders: state.orders.map((ord) =>
            ord.id === id ? { ...ord, status } : ord
          ),
        }));
      },

      // deleteOrder — Removes a specific order by ID
      deleteOrder: (id) => {
        set((state) => ({
          orders: state.orders.filter((ord) => ord.id !== id),
        }));
      },

      // clearOrders — Clears all order history
      clearOrders: () => {
        set({ orders: [] });
      },

      // getOrderById — Finds an order by unique ID or invoice number
      getOrderById: (id) => {
        return get().orders.find((ord) => ord.id === id || ord.invoiceNumber === id);
      },

      // getTotalRevenue — Sums total revenue across all logged orders
      getTotalRevenue: () => {
        return get().orders.reduce((sum, ord) => sum + ord.totalPrice, 0);
      },
    }),
    {
      name: 'luvira-orders-storage', // localStorage persistence key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ orders: state.orders }),
    }
  )
);
