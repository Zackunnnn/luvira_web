// app/manifest.ts — Web App Manifest for Next.js App Router (PWA / Add to Home Screen).
// Configures standalone display, brand theme colors, and icons for mobile app-like experience.

import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Luvira Storefront',
    short_name: 'Luvira',
    description: 'Toko Resmi Kaus Kaki Modest & Syar’i Luvira',
    start_url: '/',
    display: 'standalone',
    background_color: '#FDFBF7',
    theme_color: '#1E4D48',
    orientation: 'portrait',
    icons: [
      {
        src: '/brand/luvira-logo.png',
        sizes: '192x192 512x512',
        type: 'image/png',
      },
      {
        src: '/brand/luvira-logo.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
