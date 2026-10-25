'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, BookOpen, Sparkles, Heart, Clock, User, 
  Share2, ChevronRight, CheckCircle2, ShoppingBag, Loader2 
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';

interface AdviceItem {
  id: string;
  title: string;
  slug: string;
  content: string;
  publishedAt: string;
  createdAt: string;
  author: {
    name: string;
    role: string;
  };
}

export default function NasihatPage() {
  const [advices, setAdvices] = useState<AdviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<AdviceItem | null>(null);

  useEffect(() => {
    async function loadAdvices() {
      try {
        const res = await fetch('/api/advice');
        const json = await res.json();
        if (json.success && Array.isArray(json.advices)) {
          setAdvices(json.advices);
        }
      } catch (err) {
        console.error('Failed to load advices', err);
      } finally {
        setLoading(false);
      }
    }
    loadAdvices();
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-800 flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-white border border-stone-200 text-stone-600 hover:text-deep-forest hover:border-deep-forest/40 transition-all shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <BrandLogo size="sm" theme="light" />
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/#catalog"
              className="px-3.5 py-1.5 rounded-xl bg-deep-forest text-warm-cream font-bold text-xs hover:bg-deep-forest/90 transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-dusty-rose" />
              <span>Belanja Sekarang</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-gradient-to-b from-deep-forest to-[#1A3326] text-warm-cream py-12 px-4 sm:px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-3xl mx-auto space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-dusty-rose">
            <Sparkles className="w-3.5 h-3.5 text-dusty-rose" />
            <span>Panduan & Hikmah Muslimah</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-black tracking-tight text-warm-cream">
            Nasihat & Hikmah Kaus Kaki Syar&apos;i
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 max-w-xl mx-auto leading-relaxed">
            Menemani setiap langkah muslimah dengan panduan menutup aurat, adab berpakaian modest, dan perawatan busana muslimah sesuai sunnah.
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-deep-forest" />
            <span className="text-xs font-bold text-stone-500">Memuat artikel nasihat...</span>
          </div>
        ) : advices.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 p-8 max-w-md mx-auto space-y-3">
            <BookOpen className="w-10 h-10 text-stone-300 mx-auto" />
            <h3 className="font-bold text-base text-stone-800">Belum Ada Artikel Nasihat</h3>
            <p className="text-xs text-stone-500">Artikel hikmah dan panduan syar&apos;i akan segera diterbitkan oleh tim Luvira.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {advices.map((article) => (
              <article
                key={article.id}
                className="bg-white rounded-3xl border border-stone-200/80 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-stone-400">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 font-semibold text-stone-600">
                      <BookOpen className="w-3 h-3 text-leaf-olive" />
                      Hikmah Syar&apos;i
                    </span>
                    <span className="flex items-center gap-1 text-[11px]">
                      <Clock className="w-3 h-3" />
                      {new Date(article.publishedAt || article.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-stone-900 group-hover:text-deep-forest transition-colors leading-snug">
                    {article.title}
                  </h2>

                  <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed">
                    {article.content}
                  </p>
                </div>

                <div className="pt-6 mt-4 border-t border-stone-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-deep-forest/10 text-deep-forest flex items-center justify-center font-bold text-xs">
                      {article.author.name[0] || 'L'}
                    </div>
                    <span className="text-xs font-semibold text-stone-600">{article.author.name}</span>
                  </div>

                  <button
                    onClick={() => setSelectedArticle(article)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-deep-forest group-hover:text-leaf-olive transition-colors cursor-pointer"
                  >
                    <span>Baca Selengkapnya</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Modal Baca Artikel Lengkap */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-stone-100 flex items-start justify-between bg-stone-50/50">
              <div className="space-y-1.5 pr-4">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-leaf-olive bg-leaf-olive/10 px-2.5 py-0.5 rounded-full">
                  Nasihat Luvira
                </span>
                <h3 className="text-lg sm:text-xl font-serif font-black text-stone-900">
                  {selectedArticle.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-stone-500 pt-1">
                  <span>Oleh: <strong>{selectedArticle.author.name}</strong></span>
                  <span>•</span>
                  <span>
                    {new Date(selectedArticle.publishedAt || selectedArticle.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-sm text-stone-700 leading-relaxed font-normal">
              {selectedArticle.content.split('\n\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-stone-500 italic">
                Luvira — Kemewahan Langkah Kaus Kaki Modest & Syar&apos;i
              </span>
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-4 py-2 rounded-xl bg-deep-forest text-warm-cream font-bold text-xs hover:bg-deep-forest/90 transition-all cursor-pointer"
              >
                Tutup Bacaan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer minimal */}
      <footer className="bg-white border-t border-stone-200 py-6 text-center text-xs text-stone-500">
        <p>© {new Date().getFullYear()} Luvira. Kemewahan Langkah Kaus Kaki Modest & Syar&apos;i.</p>
      </footer>
    </div>
  );
}
