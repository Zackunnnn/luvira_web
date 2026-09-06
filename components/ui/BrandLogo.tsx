// BrandLogo.tsx

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  asLink?: boolean;
  theme?: 'light' | 'dark';
}

const heightMap = {
  sm: 40,
  md: 56,
  lg: 72,
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  className = '',
  asLink = true,
  theme = 'light',
}) => {
  const h = heightMap[size];
  const isDark = theme === 'dark';

  const content = (
    <div
      className={`inline-flex items-center justify-center ${isDark ? 'bg-white/95 rounded-xl px-3 py-1.5' : ''} ${className}`}
      style={{ height: h + (isDark ? 12 : 0) }}
    >
      <Image
        src="/logo-luvira.png"
        alt="Luvira"
        width={672}
        height={374}
        style={{ height: h, width: 'auto' }}
        className="object-contain"
        priority
      />
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