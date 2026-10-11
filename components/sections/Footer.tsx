'use client';

import React from 'react';
import { Mail, MapPin } from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';

/**
 * Global Storefront Footer Component for Luvira Socks
 * Features official brand logo, core brand positioning, official business contact (mailto link),
 * business location indicator, and copyright notice in a clean, minimalist D2C aesthetic.
 */
export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-12 bg-deep-forest text-warm-cream py-12 px-4 sm:px-6 lg:px-12 text-center space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Footer official brand logo */}
        <div className="flex justify-center items-center">
          <BrandLogo size="lg" theme="dark" />
        </div>

        {/* Footer tagline & brand mission */}
        <p className="text-xs sm:text-sm text-warm-cream/80 max-w-md mx-auto leading-relaxed">
          Solusi Kaus Kaki Modest & Ergonomis Pilihan Muslimah Indonesia. 100% Produk Original Berkualitas High-Grade.
        </p>

        {/* Official Business Contact & Location */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-warm-cream/80 pt-2">
          {/* Business Location */}
          <div className="inline-flex items-center gap-1.5 transition-colors">
            <MapPin className="w-4 h-4 text-dusty-rose shrink-0" aria-hidden="true" />
            <span className="font-medium">Based in Depok, Indonesia</span>
          </div>

          {/* Desktop divider bullet */}
          <span className="hidden sm:inline text-warm-cream/30 select-none" aria-hidden="true">
            •
          </span>

          {/* Business Email with interactive mailto link */}
          <div className="inline-flex items-center gap-1.5">
            <Mail className="w-4 h-4 text-dusty-rose shrink-0" aria-hidden="true" />
            <a
              href="mailto:admin@luvira.id"
              className="font-medium text-warm-cream/90 hover:text-white underline underline-offset-4 decoration-warm-cream/30 hover:decoration-dusty-rose transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-dusty-rose/50 rounded-sm"
              aria-label="Kirim email ke admin@luvira.id"
            >
              admin@luvira.id
            </a>
          </div>
        </div>

        {/* Copyright notice */}
        <div className="pt-4 border-t border-warm-cream/10 text-xs text-warm-cream/60 tracking-wide">
          © {currentYear} Luvira Socks. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
