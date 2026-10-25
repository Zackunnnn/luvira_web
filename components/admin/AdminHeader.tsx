'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { 
  Bell, 
  ExternalLink, 
  LogOut, 
  Shield, 
  MapPin, 
  CheckCheck,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface AdminHeaderProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    regionId: string | null;
    region?: {
      id: string;
      name: string;
      code: string;
      type: string;
    } | null;
  } | null;
  notifications: any[];
  unreadCount: number;
  onRefreshNotifications: () => void;
  onSelectOrder?: (orderId: string) => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  user,
  notifications,
  unreadCount,
  onRefreshNotifications,
  onSelectOrder,
}) => {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    router.push('/dashboard/login');
    router.refresh();
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      onRefreshNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const isWilayah = user?.role === 'ADMIN_WILAYAH';
  const roleLabel = isWilayah
    ? `Admin Wilayah - ${user?.region?.name || 'Yogyakarta (DIY)'}`
    : 'Admin Pusat (Depok)';

  return (
    <header className="bg-gradient-to-r from-deep-forest via-[#1E3A2F] to-deep-forest text-warm-cream border-b border-deep-forest/20 shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Brand & Role Tag */}
        <div className="flex items-center gap-3 sm:gap-4">
          <BrandLogo size="sm" asLink={false} theme="dark" />
          <div className="h-8 w-px bg-white/20 hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5" id="admin-role-badge">
                {isWilayah ? (
                  <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0" />
                ) : (
                  <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                )}
                {roleLabel}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isWilayah 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {user?.role?.replace('_', ' ') || 'ADMIN'}
              </span>
            </div>
            <p className="text-[11px] text-warm-cream/70 hidden sm:block">
              {user?.name} ({user?.email})
            </p>
          </div>
        </div>

        {/* Actions & Notifications */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-warm-cream transition-all relative cursor-pointer border border-white/10"
              title="Notifikasi Masuk"
              id="admin-notification-bell"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-dusty-rose text-white text-[10px] font-black rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center border-2 border-deep-forest animate-pulse" id="admin-notification-badge">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white text-stone-800 rounded-2xl shadow-xl border border-stone-200 z-50 overflow-hidden animate-in fade-in zoom-in-95">
                <div className="p-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-deep-forest" />
                    <span className="text-xs font-bold text-stone-900">Notifikasi Masuk</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-dusty-rose/10 text-dusty-rose">
                        {unreadCount} baru
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-semibold text-deep-forest hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Tandai Dibaca
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-stone-500">
                      Tidak ada notifikasi baru saat ini.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          setShowNotifications(false);
                          if (n.linkUrl && onSelectOrder) {
                            const match = n.linkUrl.match(/orderId=([^&]+)/);
                            if (match && match[1]) onSelectOrder(match[1]);
                          }
                        }}
                        className={`p-3.5 text-xs transition-colors cursor-pointer hover:bg-stone-50 flex items-start gap-3 ${
                          !n.isRead ? 'bg-emerald-50/50' : ''
                        }`}
                      >
                        <div className="mt-0.5 p-1.5 rounded-lg bg-deep-forest/10 text-deep-forest flex-shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-stone-900 text-xs flex items-center justify-between">
                            <span>{n.title}</span>
                            {!n.isRead && (
                              <span className="h-2 w-2 rounded-full bg-dusty-rose flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-stone-600 text-[11px] mt-0.5 leading-relaxed">
                            {n.message}
                          </p>
                          <span className="text-[10px] text-stone-400 mt-1 block">
                            {new Date(n.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • {new Date(n.createdAt).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <Link
            href="/dashboard/admin/changelog"
            className="px-3 py-1.5 text-xs font-bold text-warm-cream border border-white/20 hover:bg-white/10 rounded-xl transition-all hidden md:flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </Link>

          <Link
            href="/"
            target="_blank"
            className="px-3 py-1.5 text-xs font-bold text-deep-forest bg-warm-cream hover:bg-white rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <span className="hidden sm:inline">Storefront</span>
            <ExternalLink className="w-3 h-3" />
          </Link>

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-xs font-bold text-white bg-dusty-rose hover:bg-dusty-rose/90 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            id="admin-logout-button"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
