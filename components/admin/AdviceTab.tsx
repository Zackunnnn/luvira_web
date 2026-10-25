'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, Plus, Edit3, Trash2, CheckCircle2, 
  EyeOff, Loader2, RefreshCw, AlertCircle, FileText, Calendar 
} from 'lucide-react';

interface Advice {
  id: string;
  title: string;
  slug: string;
  content: string;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  author: {
    id: string;
    name: string;
    role: string;
  };
}

interface AdviceTabProps {
  user: any;
}

export function AdviceTab({ user }: AdviceTabProps) {
  const [advices, setAdvices] = useState<Advice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdvice, setEditingAdvice] = useState<Advice | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    isPublished: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAdvices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/advice');
      const json = await res.json();
      if (res.ok && json.advices) {
        setAdvices(json.advices);
      } else {
        setError(json.error || 'Gagal memuat artikel nasihat');
      }
    } catch (err: any) {
      setError(err.message || 'Koneksi bermasalah');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdvices();
  }, [fetchAdvices]);

  const handleOpenCreate = () => {
    setEditingAdvice(null);
    setFormData({ title: '', content: '', isPublished: true });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (advice: Advice) => {
    setEditingAdvice(advice);
    setFormData({
      title: advice.title,
      content: advice.content,
      isPublished: advice.isPublished,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Judul dan isi artikel wajib diisi!');
      return;
    }

    setSubmitting(true);
    try {
      const url = editingAdvice ? `/api/admin/advice?id=${editingAdvice.id}` : '/api/admin/advice';
      const method = editingAdvice ? 'PUT' : 'POST';
      const payload = editingAdvice
        ? { id: editingAdvice.id, ...formData }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        fetchAdvices();
      } else {
        alert(json.error || 'Gagal menyimpan artikel nasihat');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Hapus artikel "${title}"? Tindakan ini dicatat di audit log.`)) return;

    try {
      const res = await fetch(`/api/admin/advice?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok) {
        fetchAdvices();
      } else {
        alert(json.error || 'Gagal menghapus artikel');
      }
    } catch (err: any) {
      alert(err.message || 'Koneksi gagal');
    }
  };

  const isRegional = user?.role === 'ADMIN_WILAYAH';

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-leaf-olive/10 text-leaf-olive">
              <BookOpen className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-stone-900 font-serif">
              Kelola Nasihat & Artikel Syar&apos;i
            </h2>
          </div>
          <p className="text-xs text-stone-500 max-w-xl">
            {isRegional
              ? 'Sebagai Admin Wilayah, Anda dapat menulis dan mengelola artikel nasihat syar\'i karya Anda sendiri yang tayang secara nasional.'
              : 'Sebagai Admin Pusat/Owner, Anda memiliki wewenang penuh mengelola semua artikel nasihat Luvira.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAdvices}
            className="p-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            id="btn-tulis-nasihat"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-deep-forest text-warm-cream font-bold text-xs hover:bg-deep-forest/90 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-dusty-rose" />
            <span>Tulis Artikel Baru</span>
          </button>
        </div>
      </div>

      {/* Content Table / Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-3xl border border-stone-200">
          <Loader2 className="w-8 h-8 animate-spin text-deep-forest" />
          <span className="text-xs font-bold text-stone-500">Memuat artikel nasihat...</span>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-3xl text-red-700 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-xs font-bold">{error}</span>
        </div>
      ) : advices.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 p-8 space-y-3">
          <FileText className="w-10 h-10 text-stone-300 mx-auto" />
          <h3 className="font-bold text-base text-stone-800">Belum Ada Artikel Nasihat</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Mulailah menulis nasihat syar&apos;i atau panduan modest wear untuk menginspirasi pelanggan Luvira.
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-leaf-olive text-white rounded-xl text-xs font-bold hover:bg-leaf-olive/90 transition-all shadow-2xs"
          >
            Tulis Artikel Pertama
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Judul Artikel</th>
                  <th className="py-3.5 px-6">Penulis</th>
                  <th className="py-3.5 px-6">Status Publikasi</th>
                  <th className="py-3.5 px-6">Tanggal Rilis</th>
                  <th className="py-3.5 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                {advices.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-4 px-6 max-w-md">
                      <div className="font-bold text-stone-900 truncate">{item.title}</div>
                      <div className="text-[11px] text-stone-400 font-mono truncate">/nasihat#{item.slug}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-stone-800">{item.author.name}</div>
                      <div className="text-[10px] text-stone-400">{item.author.role}</div>
                    </td>
                    <td className="py-4 px-6">
                      {item.isPublished ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Terbit
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 font-bold text-[11px] border border-stone-200">
                          <EyeOff className="w-3 h-3 text-stone-400" />
                          Draf
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-stone-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span>
                          {new Date(item.publishedAt || item.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:text-deep-forest hover:bg-stone-100 transition-colors cursor-pointer"
                        title="Edit Artikel"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.title)}
                        className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Hapus Artikel"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL TULIS / EDIT NASIHAT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-serif font-black text-lg text-stone-900">
                {editingAdvice ? 'Edit Artikel Nasihat' : 'Tulis Artikel Nasihat Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Judul Artikel Nasihat *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Contoh: Keutamaan Menutup Kaki Saat Beribadah..."
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-deep-forest/20 focus:border-deep-forest outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Isi Artikel Nasihat *
                </label>
                <textarea
                  required
                  rows={6}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Tuliskan hikmah, adab busana muslimah, atau tata cara pemakaian dan perawatan kaus kaki syar'i..."
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-deep-forest/20 focus:border-deep-forest outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-publish"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                  className="w-4 h-4 rounded text-deep-forest focus:ring-deep-forest cursor-pointer"
                />
                <label htmlFor="chk-publish" className="text-xs font-bold text-stone-800 cursor-pointer">
                  Langsung publikasikan agar terbaca oleh pembeli di /nasihat
                </label>
              </div>

              <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-deep-forest text-warm-cream font-bold text-xs hover:bg-deep-forest/90 transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingAdvice ? 'Simpan Perubahan' : 'Terbitkan Artikel'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
