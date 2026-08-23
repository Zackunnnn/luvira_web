// BrandLogo.tsx — Luxurious Native Typography & Accent Dot Brand Logo for Luvira.
// 100% vector & CSS native without external image dependencies or checkerboard artifacts.
// Supports light & dark themes with responsive sizing.

import React from 'react';
import Link from 'next/link';

export interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  asLink?: boolean;
  theme?: 'light' | 'dark';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  className = '',
  asLink = true,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';

  const textSize = {
    sm: 'text-lg',
    md: 'text-2xl sm:text-3xl',
    lg: 'text-3xl sm:text-4xl',
  }[size];

  const subTextSize = {
    sm: 'text-[8px] tracking-[0.2em]',
    md: 'text-[10px] tracking-[0.25em]',
    lg: 'text-xs tracking-[0.3em]',
  }[size];

  const content = (
    <div className={`inline-flex flex-col items-center justify-center text-center select-none ${className}`}>
      <div className="flex items-center gap-1.5">
        <span className={`font-serif font-bold tracking-wider ${textSize} ${isDark ? 'text-[#FDFBF7]' : 'text-[#1E4D48]'}`}>
          LUVIRA
        </span>
        <span className="w-2 h-2 rounded-full bg-[#D78A7E] inline-block animate-pulse" />
      </div>
      <span className={`font-sans font-semibold uppercase mt-0.5 ${subTextSize} ${isDark ? 'text-[#748E44]/90' : 'text-[#748E44]'}`}>
        Modest • Comfortable • Chic
      </span>
    </div>
  );

  if (asLink) {
    return (
      <Link className="inline-block hover:opacity-90 transition-opacity cursor-pointer" href="/">
        {content}
      </Link>
    );
  }

  return content;
};
