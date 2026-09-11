import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { siteContent } from './site';
import { workflowContent } from './workflow';
import type { ImageRef } from './types';
import { readImageDimensions } from '@/test/imageDimensions';

/** Vitest runs with the package root as its working directory, so public/
 *  hangs directly off it. Asserted below rather than assumed. */
const PUBLIC_DIR = join(process.cwd(), 'public');

type LabelledRef = [label: string, ref: ImageRef];

/** Photographs of a person: portrait, because the Home layout is built around
 *  a 3:4 frame. */
const portraitRefs: LabelledRef[] = [
  ['site.hero.photo', siteContent.hero.photo],
  ['site.comments.photo', siteContent.comments.photo],
];

/** Diagrams: landscape, because the project grid gives the image the wide
 *  column. A portrait diagram is the mirror-image mistake. */
const landscapeRefs: LabelledRef[] = workflowContent.projects.map((project) => [
  `workflow.${project.slug}.image`,
  project.image,
]);

/** Images with no orientation rule of their own. */
const freeformRefs: LabelledRef[] = [['site.identity.logo', siteContent.identity.logo]];

const allRefs: LabelledRef[] = [...portraitRefs, ...landscapeRefs, ...freeformRefs];

function publicPathOf(ref: ImageRef): string {
  return join(PUBLIC_DIR, ref.src.replace(/^\//, ''));
}

describe('image references', () => {
  it('resolves public/ from the working directory', () => {
    expect(
      existsSync(PUBLIC_DIR),
      `Expected public/ at ${PUBLIC_DIR}. Every check below resolves paths against it.`,
    ).toBe(true);
  });

  it('collects references from every content module', () => {
    // Without this, a collector that silently returned [] would make every
    // it.each below vacuous — zero cases, all green.
    expect(portraitRefs.length, 'no portrait refs collected from content/site.ts').toBeGreaterThan(0);
    expect(landscapeRefs.length, 'no landscape refs collected from content/workflow.ts').toBeGreaterThan(0);
    expect(freeformRefs.length, 'no freeform refs collected').toBeGreaterThan(0);
  });

  it.each(allRefs)('%s resolves to a file under public/', (label, ref) => {
    expect(
      ref.src.startsWith('/'),
      `${label}.src is "${ref.src}". It must be a root-relative path such as ` +
        `"/images/diagram.svg" — public/ is the web root.`,
    ).toBe(true);

    expect(
      existsSync(publicPathOf(ref)),
      `${label}.src is "${ref.src}", but public${ref.src} does not exist. ` +
        `Add the file, or correct the path.`,
    ).toBe(true);
  });

  it.each(allRefs)('%s declares the real pixel dimensions of its file', (label, ref) => {
    const actual = readImageDimensions(publicPathOf(ref));

    expect(
      { width: ref.width, height: ref.height },
      `${label} declares ${ref.width}x${ref.height}, but ${ref.src} is really ` +
        `${actual.width}x${actual.height}. Either set the declared values to ` +
        `${actual.width} and ${actual.height}, or replace the file with one ` +
        `matching what is declared.`,
    ).toEqual(actual);
  });

  it.each(allRefs)('%s has alt text', (label, ref) => {
    expect(ref.alt.trim(), `${label}.alt is empty`).not.toBe('');
  });

  it.each(portraitRefs)('%s is portrait', (label, ref) => {
    expect(
      ref.height,
      `${label} is ${ref.width}x${ref.height}. Photos must be taller than wide — ` +
        `the Home layout is built around a 3:4 frame.`,
    ).toBeGreaterThan(ref.width);
  });

  it.each(landscapeRefs)('%s is landscape', (label, ref) => {
    expect(
      ref.width,
      `${label} is ${ref.width}x${ref.height}. Workflow diagrams must be wider ` +
        `than tall — the project grid gives the image the wide column.`,
    ).toBeGreaterThan(ref.height);
  });
});
