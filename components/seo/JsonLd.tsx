// JsonLd.tsx — Unified Schema.org Structured Data (JSON-LD) for Luvira.
// Combines Organization, WebSite, and ItemList into a single @graph array inside one script tag with unique id to prevent hydration mismatch.

import React from 'react';
import { MOCK_PRODUCTS } from '@/data/products';

export const JsonLd: React.FC = () => {
  // Unified Schema.org using @graph structure
  const unifiedSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      // 1. Organization Schema
      {
        '@type': 'Organization',
        '@id': 'https://luvira.id/#organization',
        name: 'Luvira Official',
        url: 'https://luvira.id',
        logo: {
          '@type': 'ImageObject',
          url: 'https://luvira.id/logo.png',
          caption: 'Luvira Official Logo',
        },
        description:
          'Brand kaus kaki modest syar’i premium Indonesia dengan inovasi split-toe, anti-dirty black sole, dan anti-slip grip.',
        sameAs: [
          'https://www.instagram.com/luvira.official',
          'https://www.tiktok.com/@luvira.socks',
          'https://wa.me/6281234567890',
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: '+62-812-3456-7890',
          contactType: 'customer service',
          areaServed: 'ID',
          availableLanguage: ['Indonesian', 'English'],
        },
      },

      // 2. WebSite Schema
      {
        '@type': 'WebSite',
        '@id': 'https://luvira.id/#website',
        url: 'https://luvira.id',
        name: 'Luvira Storefront',
        publisher: {
          '@id': 'https://luvira.id/#organization',
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://luvira.id/?filter={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      },

      // 3. ItemList / Product Catalog Schema
      {
        '@type': 'ItemList',
        '@id': 'https://luvira.id/#itemlist',
        name: 'Koleksi Kaus Kaki Modest Syar’i Luvira',
        description: 'Daftar produk kaus kaki premium wudhu-friendly dan ergonomic split-toe Luvira.',
        numberOfItems: MOCK_PRODUCTS.length,
        itemListElement: MOCK_PRODUCTS.map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Product',
            name: product.name,
            description: product.description,
            image: `https://luvira.id${product.variants[0]?.image || '/products/classic-cream.png'}`,
            brand: {
              '@type': 'Brand',
              name: 'Luvira',
            },
            offers: {
              '@type': 'Offer',
              url: 'https://luvira.id/#products',
              priceCurrency: 'IDR',
              price: product.price,
              availability: 'https://schema.org/InStock',
              itemCondition: 'https://schema.org/NewCondition',
              seller: {
                '@id': 'https://luvira.id/#organization',
              },
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: product.rating,
              reviewCount: product.reviewsCount || 128,
            },
          },
        })),
      },
    ],
  };

  return (
    <script
      id="luvira-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(unifiedSchema) }}
    />
  );
};
