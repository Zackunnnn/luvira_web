// app/robots.ts — Dynamic Robots.txt Generator for Next.js App Router.
// Allows web crawlers to index storefront pages while restricting private admin paths.

import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://luvira.id';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
