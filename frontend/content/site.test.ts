import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { siteContent } from './site';
import { ICON_PATHS } from '@/components/layout/Socials';

describe('siteContent', () => {
  it('gives every menu entry a non-empty href and label', () => {
    expect(siteContent.menu.length).toBeGreaterThan(0);
    for (const item of siteContent.menu) {
      expect(item.href.trim()).not.toBe('');
      expect(item.label.trim()).not.toBe('');
    }
  });

  it('points every menu entry at a root-relative path with a trailing slash', () => {
    // next.config.ts sets trailingSlash: true. A href without the slash costs
    // a redirect hop that CloudFront would have to be configured to handle.
    for (const item of siteContent.menu) {
      expect(item.href.startsWith('/'), `"${item.href}" is not root-relative`).toBe(true);
      expect(item.href.endsWith('/'), `"${item.href}" has no trailing slash`).toBe(true);
    }
  });

  it('has unique menu hrefs and labels', () => {
    const hrefs = siteContent.menu.map((item) => item.href);
    const labels = siteContent.menu.map((item) => item.label);

    expect(new Set(hrefs).size, 'two menu entries share an href').toBe(hrefs.length);
    // Two identical labels would make aria-current ambiguous to a screen reader.
    expect(new Set(labels).size, 'two menu entries share a label').toBe(labels.length);
  });

  it('maps every menu entry to a page file that exists', () => {
    // The route guard, replacing V1's dead-anchor guard: a typo here would
    // otherwise ship a nav item that 404s.
    for (const item of siteContent.menu) {
      const segments = item.href.split('/').filter(Boolean);
      const pageFile = join(process.cwd(), 'app', ...segments, 'page.tsx');

      expect(
        existsSync(pageFile),
        `menu item "${item.label}" points at ${item.href}, but ${pageFile} does not exist`,
      ).toBe(true);
    }
  });

  it('points every social link at an https url', () => {
    expect(siteContent.socials.length).toBeGreaterThan(0);
    for (const social of siteContent.socials) {
      expect(social.href.startsWith('https://')).toBe(true);
      expect(social.label).not.toBe('');
    }
  });

  it('defines an absolute site url for metadata and sitemap', () => {
    expect(() => new URL(siteContent.meta.siteUrl)).not.toThrow();
  });

  it('gives the hero at least one paragraph of copy', () => {
    expect(siteContent.hero.body.length).toBeGreaterThan(0);
  });

  it('keeps meta.title in sync with the identity name', () => {
    expect(siteContent.meta.title).toContain(siteContent.identity.name);
  });

  it('has an icon path for every social platform', () => {
    for (const social of siteContent.socials) {
      expect(Object.keys(ICON_PATHS)).toContain(social.platform);
    }
  });
});
