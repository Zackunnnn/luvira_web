'use client';

import React, { useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';

export function DeveloperLogoutButton() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      window.location.href = '/dashboard/login';
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      id="btn-developer-logout"
      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
      <span>Keluar</span>
    </button>
  );
}
