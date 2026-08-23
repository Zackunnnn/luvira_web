// FeatureHighlight.tsx — Dynamically showcases sock technology and material features.
// Completely data-driven from useContentStore (featuresCopy.items array) — no hardcoded feature titles or limits.

'use client'; // Required for client-side Zustand store hydration

import React, { useState, useEffect } from 'react';
import { Footprints, Shield, Wind, Sparkles, Layers, CheckCircle2 } from 'lucide-react';
import { useContentStore } from '@/store/useContentStore';
import { DEFAULT_SITE_CONTENT } from '@/data/defaultContent';

// Available icons and vibrant palette for feature cards
const FEATURE_ICONS = [Footprints, Shield, Sparkles, Wind, Layers, CheckCircle2];
const FEATURE_COLORS = [
  'bg-leaf-olive/10 text-leaf-olive',
  'bg-deep-forest/10 text-deep-forest',
  'bg-dusty-rose/20 text-dusty-rose-hover',
  'bg-amber-500/10 text-amber-700',
  'bg-teal-500/10 text-teal-700',
  'bg-indigo-500/10 text-indigo-700',
];

export const FeatureHighlight: React.FC = () => {
  const { content } = useContentStore();
  const [mounted, setMounted] = useState(false);

  // FIX: Prevent Zustand hydration mismatch — defer dynamic copy until client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const featuresCopy = mounted ? content.features : DEFAULT_SITE_CONTENT.features;

  // Fallback to default items array if undefined or empty
  const items = Array.isArray(featuresCopy.items)
    ? featuresCopy.items
    : DEFAULT_SITE_CONTENT.features.items;

  return (
    <section id="features" className="py-12 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2 mb-8">
        <span className="text-xs font-extrabold tracking-widest text-deep-forest uppercase bg-deep-forest/10 px-3 py-1 rounded-full inline-block">
          {featuresCopy.badge}
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-deep-forest tracking-tight">
          {featuresCopy.title}
        </h2>
        <p className="text-xs sm:text-sm text-muted-charcoal/70">
          {featuresCopy.description}
        </p>
      </div>

      {/* Dynamic Feature Cards Grid — renders 100% data-driven from items array */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((feature, idx) => {
          const Icon = FEATURE_ICONS[idx % FEATURE_ICONS.length];
          const colorClass = FEATURE_COLORS[idx % FEATURE_COLORS.length];

          return (
            <div
              key={feature.id || idx}
              className="p-5 bg-white border border-deep-forest/10 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className={`w-11 h-11 rounded-2xl ${colorClass} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-deep-forest">
                    {feature.title}
                  </h3>
                  <span className="text-xs font-semibold text-leaf-olive block mt-0.5">
                    {feature.subtitle}
                  </span>
                </div>
                <p className="text-xs text-muted-charcoal/75 leading-relaxed">
                  {feature.description}
                </p>
              </div>

              <div className="pt-3 border-t border-deep-forest/5 flex items-center justify-between text-[11px] text-muted-charcoal/50 font-medium">
                <span>Fitur Keunggulan</span>
                <Sparkles className="w-3.5 h-3.5 text-dusty-rose" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
