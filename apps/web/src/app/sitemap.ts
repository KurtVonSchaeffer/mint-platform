import type { MetadataRoute } from 'next';

const BASE = 'https://algolend.co.za';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE,               lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/privacy`,  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/terms`,    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];
}
