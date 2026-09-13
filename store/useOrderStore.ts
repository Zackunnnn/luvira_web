import { create } from 'zustand';
import { Order, OrderStatus } from '@/types/order';

interface OrderState {
  orders: Order[];

  // Action methods
  fetchOrders: () => Promise<void>;
  addOrder: (order: Order) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  deleteOrder: (id: string) => void;
  clearOrders: () => void;
  getOrderById: (id: string) => Order | undefined;
  getTotalRevenue: () => number;
}

export const useOrderStore = create<OrderState>()((set, get) => ({
  orders: [],

  fetchOrders: async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const orders = await res.json();
        set({ orders });
      }
    } catch (err) {
      console.error('Failed to fetch orders', err);
    }
  },

  addOrder: async (order) => {
    // Optimistic update
    set((state) => ({
      orders: [order, ...state.orders],
    }));

    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
    } catch (err) {
      console.error('Failed to sync new order to server', err);
    }
  },

  updateOrderStatus: async (id, status) => {
    // Optimistic update
    set((state) => ({
      orders: state.orders.map((ord) =>
        ord.id === id ? { ...ord, status } : ord
      ),
    }));

    try {
      await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
    } catch (err) {
      console.error('Failed to sync updated status to server', err);
    }
  },

  deleteOrder: (id) => {
    set((state) => ({
      orders: state.orders.filter((ord) => ord.id !== id),
    }));
  },

  clearOrders: () => {
    set({ orders: [] });
  },

  getOrderById: (id) => {
    return get().orders.find((ord) => ord.id === id || ord.invoiceNumber === id);
  },

  getTotalRevenue: () => {
    return get().orders.reduce((sum, ord) => sum + ord.totalPrice, 0);
  },
}));
