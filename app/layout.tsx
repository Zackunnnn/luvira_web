// app/layout.tsx — Global root layout for Luvira web application.
// Configures comprehensive SEO metadata, OpenGraph, Twitter Cards, Web App theme, viewport, fonts, and Schema.org JSON-LD structured data.

import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { JsonLd } from '@/components/seo/JsonLd';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
});

// Viewport configuration for mobile devices and iPhone safe area insets
export const viewport: Viewport = {
  themeColor: '#1E4D48',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

// Comprehensive SEO Metadata & Social Sharing Graph
export const metadata: Metadata = {
  metadataBase: new URL('https://luvira.id'),
  title: {
    default: "Luvira | Kemewahan Langkah Kaus Kaki Modest & Syar'i",
    template: '%s | Luvira Official',
  },
  description:
    'Toko resmi Luvira Sock Brand. Koleksi kaus kaki syar’i premium dengan 3 pilar: Modest (wudhu & activity friendly), Comfortable (ultra-soft combed cotton & premium nylon), dan Chic (warna bumi minimalis).',
  keywords: [
    'kaus kaki wudhu',
    'kaus kaki split toe',
    'kaus kaki anti slip',
    'kaus kaki jempol',
    'modest sock brand',
    'luvira',
    'kaos kaki muslimah',
    'kaos kaki premium',
    'alas hitam anti noda',
    'kaos kaki thawaf',
    'kaos kaki umroh',
    'kaos kaki wanita',
  ],
  authors: [{ name: 'Luvira Official', url: 'https://luvira.id' }],
  creator: 'Luvira Official',
  publisher: 'Luvira Official',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Luvira | Kemewahan Langkah Kaus Kaki Modest & Syar'i",
    description:
      'Koleksi kaus kaki split-toe, anti-dirty black sole, dan anti-slip grip premium untuk muslimah aktif. Modest, Comfortable, and Chic.',
    url: 'https://luvira.id',
    siteName: 'Luvira Official',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Luvira Modest Sock Brand Collection',
      },
    ],
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Luvira | Kemewahan Langkah Kaus Kaki Modest & Syar'i",
    description:
      'Koleksi kaus kaki split-toe, anti-dirty black sole, dan anti-slip grip premium untuk muslimah aktif.',
    images: ['/og-image.jpg'],
    creator: '@luvira_official',
  },
  category: 'fashion',
  icons: {
    icon: '/brand/luvira-logo.png',
    shortcut: '/brand/luvira-logo.png',
    apple: '/brand/luvira-logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Luvira',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} scroll-smooth h-full antialiased font-sans`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-[#FDFBF7] text-[#2D3748] selection:bg-dusty-rose selection:text-white overflow-x-hidden antialiased"
      >
        {/* Schema.org JSON-LD Structured Data inside body to avoid SSR head hydration mismatch */}
        <JsonLd />
        {children}
      </body>
    </html>
  );
}
