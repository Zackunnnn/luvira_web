'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Receipt, 
  Package, 
  Tag, 
  Ticket, 
  Users, 
  FileText, 
  Loader2,
  AlertCircle,
  BookOpen
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { OrdersTab } from '@/components/admin/OrdersTab';
import { StockTab } from '@/components/admin/StockTab';
import { ProductsTab } from '@/components/admin/ProductsTab';
import { PromosTab } from '@/components/admin/PromosTab';
import { UsersTab } from '@/components/admin/UsersTab';
import { AdviceTab } from '@/components/admin/AdviceTab';
import { CopywritingTab } from '@/components/admin/CopywritingTab';

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialOrderId = searchParams.get('orderId');

  const [user, setUser] = useState<any | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'stock' | 'promos' | 'advice' | 'users' | 'copywriting'>('orders');

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(initialOrderId);

  // 1. Fetch current session / user profile
  const fetchAuthUser = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        router.push('/dashboard/login');
      }
    } catch (err) {
      console.error('Failed to authenticate admin session', err);
      router.push('/dashboard/login');
    } finally {
      setLoadingUser(false);
    }
  }, [router]);

  // 2. Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  }, []);

  useEffect(() => {
    fetchAuthUser();
    fetchNotifications();

    // Polling notifikasi setiap 15 detik (A9)
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchAuthUser, fetchNotifications]);

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-deep-forest" />
        <span className="text-xs font-bold text-stone-600">Menghubungkan ke Portal Admin Luvira 2.0...</span>
      </div>
    );
  }

  const isPusat = user?.role === 'ADMIN_PUSAT' || user?.role === 'OWNER';

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-800">
      {/* Real-time Header with Role & Region Badge */}
      <AdminHeader
        user={user}
        notifications={notifications}
        unreadCount={unreadCount}
        onRefreshNotifications={fetchNotifications}
        onSelectOrder={(ordId) => {
          setSelectedOrderId(ordId);
          setActiveTab('orders');
        }}
      />

      {/* Main Tab Navigation */}
      <div className="bg-white border-b border-stone-200 shadow-2xs sticky top-[61px] z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 py-2 overflow-x-auto">
          {/* TAB 1: Pesanan Masuk */}
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-deep-forest text-warm-cream shadow-xs'
                : 'text-stone-600 hover:bg-stone-100 hover:text-deep-forest'
            }`}
            id="tab-orders"
          >
            <Receipt className="w-4 h-4 text-dusty-rose" />
            <span>Pesanan Masuk</span>
            {unreadCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-dusty-rose text-white ml-1 font-black">
                {unreadCount}
              </span>
            )}
          </button>

          {/* TAB 2: Katalog & Harga */}
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'products'
                ? 'bg-deep-forest text-warm-cream shadow-xs'
                : 'text-stone-600 hover:bg-stone-100 hover:text-deep-forest'
            }`}
            id="tab-products"
          >
            <Package className="w-4 h-4 text-emerald-400" />
            <span>Katalog & Harga</span>
          </button>

          {/* TAB 3: Stok Gudang */}
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'stock'
                ? 'bg-deep-forest text-warm-cream shadow-xs'
                : 'text-stone-600 hover:bg-stone-100 hover:text-deep-forest'
            }`}
            id="tab-stock"
          >
            <Tag className="w-4 h-4 text-amber-400" />
            <span>Stok Gudang</span>
          </button>

          {/* TAB 4: Kode Promo */}
          <button
            onClick={() => setActiveTab('promos')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'promos'
                ? 'bg-deep-forest text-warm-cream shadow-xs'
                : 'text-stone-600 hover:bg-stone-100 hover:text-deep-forest'
            }`}
            id="tab-promos"
          >
            <Ticket className="w-4 h-4 text-leaf-olive" />
            <span>Kode Promo</span>
          </button>

          {/* TAB 5: Nasihat Syar'i (Asumsi A3) */}
          <button
            onClick={() => setActiveTab('advice')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'advice'
                ? 'bg-deep-forest text-warm-cream shadow-xs'
                : 'text-stone-600 hover:bg-stone-100 hover:text-deep-forest'
            }`}
            id="tab-advice"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Nasihat Syar&apos;i</span>
          </button>

          {/* TAB 6: Kelola Admin (Hanya Admin Pusat & Owner) */}
          {isPusat && (
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-deep-forest text-warm-cream shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-deep-forest'
              }`}
              id="tab-users"
            >
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Kelola Admin Wilayah</span>
            </button>
          )}

          {/* TAB 7: Copywriting & CMS */}
          <button
            onClick={() => setActiveTab('copywriting')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'copywriting'
                ? 'bg-deep-forest text-warm-cream shadow-xs'
                : 'text-stone-600 hover:bg-stone-100 hover:text-deep-forest'
            }`}
            id="tab-copywriting"
          >
            <FileText className="w-4 h-4 text-stone-400" />
            <span>Copywriting CMS</span>
          </button>
        </div>
      </div>

      {/* Main Container Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'orders' && (
          <OrdersTab
            user={user}
            selectedOrderIdFromNotification={selectedOrderId}
            onClearSelectedOrderId={() => setSelectedOrderId(null)}
          />
        )}

        {activeTab === 'products' && (
          <ProductsTab user={user} />
        )}

        {activeTab === 'stock' && (
          <StockTab user={user} />
        )}

        {activeTab === 'promos' && (
          <PromosTab user={user} />
        )}

        {activeTab === 'advice' && (
          <AdviceTab user={user} />
        )}

        {activeTab === 'users' && isPusat && (
          <UsersTab user={user} />
        )}

        {activeTab === 'copywriting' && (
          <CopywritingTab />
        )}
      </main>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-deep-forest" />
          <span className="text-xs font-bold text-stone-600">Menghubungkan ke Portal Admin Luvira 2.0...</span>
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}

