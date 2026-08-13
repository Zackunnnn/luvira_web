import React from 'react';
import { HeartHandshake, Feather, Sparkles } from 'lucide-react';

const PILLARS = [
  {
    icon: HeartHandshake,
    title: 'Modest',
    subtitle: 'Daya Tutup Sempurna',
    description: 'Desain presisi yang menutup aurat kaki dengan sempurna, mendukung penampilan wudhu-friendly dan santun di segala suasana.',
    badgeColor: 'bg-deep-forest/10 text-deep-forest',
  },
  {
    icon: Feather,
    title: 'Comfortable',
    subtitle: 'Ultra-Soft Combed Cotton',
    description: 'Serat katun combed pilihan yang sangat lembut di kulit, dingin, menyerap keringat dengan baik, dan anti-bau sepanjang hari.',
    badgeColor: 'bg-leaf-olive/15 text-leaf-olive',
  },
  {
    icon: Sparkles,
    title: 'Chic',
    subtitle: 'Aesthetically Minimalist',
    description: 'Pilihan palet warna earth tone dan pastel yang elegan, mudah dipadukan dengan berbagai gaya busana dan sandal favoritmu.',
    badgeColor: 'bg-dusty-rose/20 text-dusty-rose-hover',
  },
];

export const AboutLuvira: React.FC = () => {
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-12 bg-white border-y border-deep-forest/10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Title */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-extrabold tracking-widest text-leaf-olive uppercase bg-leaf-olive/10 px-3 py-1 rounded-full inline-block">
            Tentang Luvira
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-deep-forest tracking-tight">
            Filosofi Kenikmatan Melangkah
          </h2>
          <p className="text-xs sm:text-sm text-muted-charcoal/70 leading-relaxed">
            Luvira hadir dari pemahaman mendalam akan kebutuhan muslimah modern yang mendambakan kaus kaki berkualitas tinggi — menghadirkan harmoni sempurna antara estetika, fungsi ergonomis, dan keanggunan.
          </p>
        </div>

        {/* 3 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {PILLARS.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className="p-6 bg-warm-cream rounded-3xl border border-deep-forest/10 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl ${pillar.badgeColor} flex items-center justify-center`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold text-muted-charcoal/40 uppercase tracking-widest">
                      0{idx + 1}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-deep-forest">{pillar.title}</h3>
                    <span className="text-xs font-semibold text-leaf-olive block mt-0.5">
                      {pillar.subtitle}
                    </span>
                  </div>

                  <p className="text-xs text-muted-charcoal/80 leading-relaxed">
                    {pillar.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-deep-forest/5 flex items-center gap-1.5 text-[11px] font-bold text-deep-forest">
                  <span>Standard Kualitas Luvira</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-dusty-rose"></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
