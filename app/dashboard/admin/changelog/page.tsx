'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, CheckCircle2, Clock, Loader2, AlertCircle } from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
export interface ChangelogEntry {
  id: string;
  timestamp: string;
  adminName: string;
  productName: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  isSynced: boolean;
}

export default function ChangelogPage() {
  const [logs, setLogs] = useState<ChangelogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/changelog');
      if (!res.ok) throw new Error('Gagal memuat data');
      const data = await res.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setLogs(data);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const markAsSynced = async (id: string) => {
    try {
      setLogs(logs.map(log => log.id === id ? { ...log, isSynced: true } : log));
      await fetch('/api/changelog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_synced', id }),
      });
    } catch (e) {
      console.error(e);
      fetchLogs(); // Revert on failure
    }
  };

  const pendingCount = logs.filter(l => !l.isSynced).length;

  return (
    <div className="min-h-screen bg-warm-cream text-muted-charcoal">
      {/* HEADER */}
      <div className="bg-deep-forest text-warm-cream p-4 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href="/dashboard/admin"
            className="p-2 rounded-full hover:bg-white/10 text-warm-cream transition-all flex items-center gap-2 text-sm font-semibold"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Kembali ke Admin</span>
          </Link>
          <BrandLogo size="sm" theme="dark" asLink />
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-deep-forest/10 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-deep-forest flex items-center gap-3">
              <Clock className="w-7 h-7 text-leaf-olive" />
              Audit Trail & Changelog
            </h1>
            <p className="text-sm text-muted-charcoal/70 mt-1 max-w-2xl">
              Daftar perubahan yang dilakukan melalui dashboard admin di Vercel. 
              Gunakan log ini untuk menyalin perubahan (sync) ke dalam kode lokal Anda agar 
              bisa diterapkan pada deployment selanjutnya.
            </p>
          </div>
          
          <div className="bg-white px-4 py-3 rounded-2xl shadow-sm border border-deep-forest/10 flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-black text-dusty-rose">{pendingCount}</div>
              <div className="text-[10px] uppercase font-bold text-muted-charcoal/60 tracking-wider">Unsynced</div>
            </div>
            <div className="w-px h-8 bg-deep-forest/10"></div>
            <div className="text-center">
              <div className="text-2xl font-black text-leaf-olive">{logs.length}</div>
              <div className="text-[10px] uppercase font-bold text-muted-charcoal/60 tracking-wider">Total Logs</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-dusty-rose/10 border border-dusty-rose/20 text-dusty-rose rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-deep-forest/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-deep-forest/5 text-deep-forest font-bold border-b border-deep-forest/10">
                <tr>
                  <th className="px-6 py-4 whitespace-nowrap">Waktu (WIB)</th>
                  <th className="px-6 py-4">Produk</th>
                  <th className="px-6 py-4">Field Diubah</th>
                  <th className="px-6 py-4">Nilai Lama</th>
                  <th className="px-6 py-4">Nilai Baru</th>
                  <th className="px-6 py-4">Editor</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-deep-forest/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-charcoal/50">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-leaf-olive" />
                      Memuat data changelog dari Vercel KV...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-charcoal/50">
                      Belum ada log perubahan yang tercatat.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className={`transition-colors ${log.isSynced ? 'bg-gray-50/50 opacity-60' : 'hover:bg-deep-forest/5'}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-charcoal/80">
                        {log.timestamp}
                      </td>
                      <td className="px-6 py-4 font-semibold text-deep-forest">
                        {log.productName}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-deep-forest/10 text-deep-forest px-2 py-1 rounded-md text-xs font-bold">
                          {log.fieldName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-dusty-rose max-w-[200px] truncate" title={log.oldValue}>
                        <del>{log.oldValue}</del>
                      </td>
                      <td className="px-6 py-4 text-leaf-olive font-medium max-w-[200px] truncate" title={log.newValue}>
                        {log.newValue}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-charcoal/60">
                        {log.adminName}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {log.isSynced ? (
                          <div className="inline-flex items-center gap-1 text-leaf-olive text-xs font-bold bg-leaf-olive/10 px-2.5 py-1.5 rounded-full">
                            <CheckCircle2 className="w-4 h-4" />
                            Synced
                          </div>
                        ) : (
                          <button
                            onClick={() => markAsSynced(log.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-deep-forest hover:bg-deep-forest/90 px-3 py-1.5 rounded-full transition-all active:scale-95 shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Mark Synced
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
