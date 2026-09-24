import type { MetadataRoute } from 'next';
import { siteContent } from '@/content/site';

export const dynamic = 'force-static';

/** Derived from the menu, so a page cannot be added to the nav and silently
 *  miss the sitemap. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const origin = siteContent.meta.siteUrl.replace(/\/+$/, '');

  return siteContent.menu.map((item, index) => ({
    url: item.href === '/' ? origin : `${origin}${item.href}`,
    lastModified,
    changeFrequency: 'monthly',
    priority: index === 0 ? 1 : 0.8,
  }));
}
