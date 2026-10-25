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
        const json = await res.json();
        const rawOrders = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
        const mappedOrders: Order[] = rawOrders.map((ord: any) => ({
          id: ord.id,
          invoiceNumber: ord.code || ord.invoiceNumber || ord.id,
          customerInfo: ord.customerInfo || {
            fullName: ord.customerName || '',
            phone: ord.customerPhone || '',
            address: typeof ord.shippingAddress === 'object' && ord.shippingAddress 
              ? (ord.shippingAddress.address || ord.shippingAddress.fullAddress || JSON.stringify(ord.shippingAddress)) 
              : (ord.shippingAddress || ''),
            notes: ord.shippingAddress?.notes || ord.customerNotes || '',
          },
          items: ord.items || [],
          totalPrice: ord.totalPrice || 0,
          paymentMethod: ord.paymentMethod || 'MANUAL_TRANSFER',
          status: ord.status || 'menunggu_transfer',
          createdAt: ord.createdAt ? new Date(ord.createdAt).toLocaleString('id-ID') : '',
          ...ord,
        }));
        set({ orders: mappedOrders });
      }
    } catch (err) {
      console.error('Failed to fetch orders', err);
    }
  },

  addOrder: async (order) => {
    // Optimistic update
    set((state) => ({
      orders: [order, ...(Array.isArray(state.orders) ? state.orders : [])],
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
      orders: (Array.isArray(state.orders) ? state.orders : []).map((ord) =>
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
      orders: (Array.isArray(state.orders) ? state.orders : []).filter((ord) => ord.id !== id),
    }));
  },

  clearOrders: () => {
    set({ orders: [] });
  },

  getOrderById: (id) => {
    const list = Array.isArray(get().orders) ? get().orders : [];
    return list.find((ord) => ord.id === id || ord.invoiceNumber === id || (ord as any).code === id);
  },

  getTotalRevenue: () => {
    const list = Array.isArray(get().orders) ? get().orders : [];
    return list.reduce((sum, ord) => sum + (ord.totalPrice || 0), 0);
  },
}));
