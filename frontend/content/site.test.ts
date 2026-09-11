import { describe, it, expect } from 'vitest';
import { siteContent } from './site';
import { ICON_PATHS } from '@/components/layout/Socials';

describe('siteContent', () => {
  it('gives every menu entry a non-empty id and label', () => {
    expect(siteContent.menu.length).toBeGreaterThan(0);
    for (const item of siteContent.menu) {
      expect(item.id).not.toBe('');
      expect(item.label).not.toBe('');
    }
  });

  it('has unique menu ids', () => {
    const ids = siteContent.menu.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses portrait photos in both sections', () => {
    for (const photo of [siteContent.hero.photo, siteContent.comments.photo]) {
      expect(photo.width).toBeLessThan(photo.height);
      expect(photo.alt).not.toBe('');
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
