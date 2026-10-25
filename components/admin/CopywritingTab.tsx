'use client';

import React, { useState, useEffect } from 'react';
import { useContentStore } from '@/store/useContentStore';
import { DEFAULT_SITE_CONTENT } from '@/data/defaultContent';
import { SiteContent } from '@/types/content';
import { Input, Textarea } from '@/components/ui/Input';
import { Wand2, RotateCcw, Save, CheckCircle2, Sparkles, Layers, ShoppingBag } from 'lucide-react';

export const CopywritingTab: React.FC = () => {
  const { content, updateHeroContent, resetToDefaultContent, fetchContent } = useContentStore();
  const [copyForm, setCopyForm] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  useEffect(() => {
    if (content) {
      setCopyForm(content);
    }
  }, [content]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateHeroContent(copyForm.hero);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  const applySeasonalPreset = (preset: 'ramadan' | 'gajian' | 'mahasiswi') => {
    const updated = { ...copyForm };
    if (preset === 'ramadan') {
      updated.hero = {
        ...updated.hero,
        announcement: '🌙 Berkah Ramadan & Idul Fitri: Gratis Ongkir Khusus Pembelian Kaus Kaki Modest!',
        tagline: 'Kemewahan Langkah Ibadah',
        headline: 'Langkah Suci Penuh Kenyamanan',
        subheadline: 'Kaus kaki split toe jempol lembut, adem, dan menutup aurat dengan sempurna untuk tarawih dan silaturahmi.',
      };
    } else if (preset === 'gajian') {
      updated.hero = {
        ...updated.hero,
        announcement: '⚡ Promo Gajian: Diskon Spesial Bundle Kaus Kaki Pilihan!',
        tagline: 'Self Reward Terbaik',
        headline: 'Manjakan Kaki Anda dengan Sentuhan Halus',
        subheadline: 'Koleksi premium Luvira untuk menemani produktivitas kerja dan kenyamanan harian.',
      };
    } else {
      updated.hero = {
        ...updated.hero,
        announcement: '🎒 Back to Campus: Kaus Kaki Modest Awet & Nyaman Seharian!',
        tagline: 'Sahabat Langkah Aktif',
        headline: 'Langkah Percaya Diri di Setiap Aktivitas',
        subheadline: 'Anti lecet, elastisitas prima, dan warna-warna earth tone elegan untuk gaya busana santun.',
      };
    }
    setCopyForm(updated);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 animate-in fade-in duration-300">
      {/* Preset Bar */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-deep-forest" />
            <span>Preset Tema Copywriting Cepat</span>
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Gunakan template musiman atau sesuaikan teks per bagian halaman website.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => applySeasonalPreset('ramadan')}
            className="px-3 py-1.5 text-xs font-bold text-deep-forest bg-deep-forest/10 hover:bg-deep-forest/20 rounded-xl transition-all cursor-pointer"
          >
            🌙 Tema Ramadan
          </button>
          <button
            type="button"
            onClick={() => applySeasonalPreset('gajian')}
            className="px-3 py-1.5 text-xs font-bold text-dusty-rose bg-dusty-rose/10 hover:bg-dusty-rose/20 rounded-xl transition-all cursor-pointer"
          >
            ⚡ Tema Gajian
          </button>
          <button
            type="button"
            onClick={() => applySeasonalPreset('mahasiswi')}
            className="px-3 py-1.5 text-xs font-bold text-leaf-olive bg-leaf-olive/10 hover:bg-leaf-olive/20 rounded-xl transition-all cursor-pointer"
          >
            🎒 Tema Mahasiswi
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm('Kembalikan ke teks default bawaan?')) {
                resetToDefaultContent();
                setCopyForm(DEFAULT_SITE_CONTENT);
              }
            }}
            className="px-3 py-1.5 text-xs font-bold text-stone-500 hover:bg-stone-100 rounded-xl transition-all cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />
          <span>Perubahan copywriting dan konten berhasil disimpan ke database!</span>
        </div>
      )}

      {/* Hero Section */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
          <Sparkles className="w-4 h-4 text-dusty-rose" />
          <h4 className="font-extrabold text-xs text-stone-900 uppercase tracking-wider">
            1. Hero Section & Pengumuman
          </h4>
        </div>

        <Input
          label="Teks Banner Pengumuman Berjalan (Top Bar):"
          value={copyForm.hero.announcement}
          onChange={(e) =>
            setCopyForm({
              ...copyForm,
              hero: { ...copyForm.hero, announcement: e.target.value },
            })
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Tagline Brand:"
            value={copyForm.hero.tagline}
            onChange={(e) =>
              setCopyForm({
                ...copyForm,
                hero: { ...copyForm.hero, tagline: e.target.value },
              })
            }
          />
          <Input
            label="Headline Utama:"
            value={copyForm.hero.headline}
            onChange={(e) =>
              setCopyForm({
                ...copyForm,
                hero: { ...copyForm.hero, headline: e.target.value },
              })
            }
          />
        </div>

        <Textarea
          label="Subheadline Penjelasan:"
          value={copyForm.hero.subheadline}
          onChange={(e) =>
            setCopyForm({
              ...copyForm,
              hero: { ...copyForm.hero, subheadline: e.target.value },
            })
          }
          rows={3}
        />
      </div>

      {/* Submit Button */}
      <div className="sticky bottom-6 z-20 flex justify-end">
        <button
          type="submit"
          className="px-6 py-3 bg-deep-forest hover:bg-deep-forest/90 text-white font-extrabold text-xs rounded-2xl shadow-xl hover:shadow-2xl transition-all flex items-center gap-2 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Simpan Seluruh Perubahan Copywriting</span>
        </button>
      </div>
    </form>
  );
};
