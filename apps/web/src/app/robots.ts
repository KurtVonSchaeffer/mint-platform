import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/onboard/',
          '/sign/',
          '/apply',
          '/demo',
          '/admin-tour',
          '/api/',
        ],
      },
    ],
    sitemap: 'https://algolend.co.za/sitemap.xml',
  };
}
