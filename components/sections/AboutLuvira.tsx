'use client'; // Required for client-side Zustand store hydration

import React, { useState, useEffect } from 'react';
import { HeartHandshake, Feather, Sparkles } from 'lucide-react';
import { useContentStore } from '@/store/useContentStore';
import { DEFAULT_SITE_CONTENT } from '@/data/defaultContent';

export const AboutLuvira: React.FC = () => {
  const { content } = useContentStore();
  const [mounted, setMounted] = useState(false);

  // FIX: Prevent Zustand hydration mismatch — defer dynamic copy until client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const aboutCopy = mounted ? content.about : DEFAULT_SITE_CONTENT.about;

  const PILLARS_CONFIG = [
    {
      icon: HeartHandshake,
      title: aboutCopy.pillars.modest.title,
      subtitle: aboutCopy.pillars.modest.subtitle,
      description: aboutCopy.pillars.modest.description,
      badgeColor: 'bg-deep-forest/10 text-deep-forest',
    },
    {
      icon: Feather,
      title: aboutCopy.pillars.comfortable.title,
      subtitle: aboutCopy.pillars.comfortable.subtitle,
      description: aboutCopy.pillars.comfortable.description,
      badgeColor: 'bg-leaf-olive/15 text-leaf-olive',
    },
    {
      icon: Sparkles,
      title: aboutCopy.pillars.chic.title,
      subtitle: aboutCopy.pillars.chic.subtitle,
      description: aboutCopy.pillars.chic.description,
      badgeColor: 'bg-dusty-rose/20 text-dusty-rose-hover',
    },
  ];

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-12 bg-white border-y border-deep-forest/10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Title */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-extrabold tracking-widest text-leaf-olive uppercase bg-leaf-olive/10 px-3 py-1 rounded-full inline-block">
            {aboutCopy.badge}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-deep-forest tracking-tight">
            {aboutCopy.title}
          </h2>
          <p className="text-xs sm:text-sm text-muted-charcoal/70 leading-relaxed">
            {aboutCopy.description}
          </p>
        </div>

        {/* 3 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {PILLARS_CONFIG.map((pillar, idx) => {
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

