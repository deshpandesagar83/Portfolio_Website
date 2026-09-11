import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { siteContent } from './site';
import type { ImageRef } from './types';
import { ICON_PATHS } from '@/components/layout/Socials';
import { readImageDimensions } from '@/test/imageDimensions';

/** Vitest runs with the package root as its working directory (the directory
 *  holding vitest.config.mts), so public/ hangs directly off it. Asserted
 *  below rather than assumed. */
const PUBLIC_DIR = join(process.cwd(), 'public');

/** Every image the site references, labelled by its path in siteContent so a
 *  failure names the field to edit. */
const imageRefs: [label: string, ref: ImageRef][] = [
  ['identity.logo', siteContent.identity.logo],
  ['hero.photo', siteContent.hero.photo],
  ['comments.photo', siteContent.comments.photo],
];

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

describe('siteContent image files', () => {
  it('resolves public/ from the working directory', () => {
    expect(
      existsSync(PUBLIC_DIR),
      `Expected public/ at ${PUBLIC_DIR}. The image checks below resolve paths ` +
        `against it, so they cannot run until this is right.`,
    ).toBe(true);
  });

  it.each(imageRefs)('%s resolves to a file under public/', (label, ref) => {
    expect(
      ref.src.startsWith('/'),
      `${label}.src is "${ref.src}". It must be a root-relative path such as ` +
        `"/images/portrait.jpg" — public/ is the web root, and next/image ` +
        `cannot size a remote URL at build time.`,
    ).toBe(true);

    expect(
      existsSync(publicPathOf(ref)),
      `${label}.src is "${ref.src}", but public${ref.src} does not exist. ` +
        `Add the file, or correct the path.`,
    ).toBe(true);
  });

  it.each(imageRefs)('%s declares the real pixel dimensions of its file', (label, ref) => {
    const actual = readImageDimensions(publicPathOf(ref));

    // width/height reserve layout space before the image loads. Numbers that
    // disagree with the file reintroduce exactly the shift they prevent, and
    // nothing else in the suite would notice.
    expect(
      { width: ref.width, height: ref.height },
      `${label} declares ${ref.width}x${ref.height}, but ${ref.src} is really ` +
        `${actual.width}x${actual.height}. Either set the declared values to ` +
        `${actual.width} and ${actual.height}, or replace the file with one ` +
        `matching what is declared.`,
    ).toEqual(actual);
  });
});

function publicPathOf(ref: ImageRef): string {
  return join(PUBLIC_DIR, ref.src.replace(/^\//, ''));
}
