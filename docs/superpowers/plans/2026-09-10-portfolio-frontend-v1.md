# Portfolio Frontend V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Next.js portfolio site — one route, a hero section (portrait photo + brief) and a comments placeholder section, linked by an anchor menu — whose production build emits a static `out/` directory ready for S3.

**Architecture:** A statically exported Next.js App Router app in `frontend/`. All copy and image references live in one typed content module (`content/site.ts`) so placeholder content can be swapped for real content without touching components. Sections are server components rendered at build time; the sticky header is the single client component, because it alone needs `IntersectionObserver` and toggle state.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS v4, Vitest + React Testing Library, Playwright, npm.

**Spec:** `docs/superpowers/specs/2026-09-10-portfolio-frontend-v1-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **Working directory** for all commands is `frontend/` unless a step says otherwise. The repo root is `C:/Users/deshp/Documents/Projects/GetHired/Website`.
- **Toolchain:** Node 24.14.1, npm 11.11.0. Branch: `dev`.
- **Static export is non-negotiable:** `next.config.ts` sets `output: 'export'` and `images: { unoptimized: true }`. Anything requiring a server (route handlers, server actions, middleware, ISR, `next/image` optimization) is forbidden.
- **`content/site.ts` is the only place copy, names, URLs, or image paths may appear.** No hardcoded strings in components. The one exception is the copyright symbol and structural punctuation in `Footer`.
- **Exactly one `<h1>` on the page.** It lives in `Hero` and is composed from `identity.name`; `identity.tagline` sits beneath it as a `<p>`, not a heading.
- **Only `components/layout/Header.tsx` carries `'use client'`.** Every other component is a server component. Adding a second client component requires stopping and flagging it.
- **Both photos are portrait, 3:4** — `width` less than `height` in every `ImageRef`. The portrait placeholder is authored at 900 × 1200.
- **Placeholder assets are named `placeholder-portrait.svg` and `placeholder-logo.svg`** so they are greppable before launch.
- **Every external link** gets `target="_blank"` and `rel="noopener noreferrer"`.
- **`prefers-reduced-motion` is honored** — smooth scrolling and transitions are disabled under it.
- **No new runtime dependencies.** No state library, no animation library, no component library, no icon package. Dev dependencies are limited to those this plan names.
- **Every commit message ends with these two trailer lines**, separated from the body by a blank line:

  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01MMXk11WKi93RQJw75eoBuF
  ```

---

## File Structure

| File | Responsibility |
|---|---|
| `frontend/next.config.ts` | Static export configuration |
| `frontend/vitest.config.mts` | Unit test runner config (jsdom, React plugin, `@/` alias) |
| `frontend/vitest.setup.ts` | Registers jest-dom matchers |
| `frontend/playwright.config.ts` | E2E config; serves the exported `out/` |
| `frontend/content/types.ts` | Content types — the shape the site is built against |
| `frontend/content/site.ts` | The single content object (placeholder values for now) |
| `frontend/content/site.test.ts` | Content invariants (unique ids, portrait ratios, https socials) |
| `frontend/app/layout.tsx` | Root layout: fonts, `<html>`/`<body>`, metadata, JSON-LD |
| `frontend/app/page.tsx` | The single route — composes Header, sections, Footer |
| `frontend/app/page.test.tsx` | Dead-anchor guard: every menu id resolves to a rendered section |
| `frontend/app/not-found.tsx` | Emits `404.html` in the export |
| `frontend/app/robots.ts` | Generates `robots.txt` at build |
| `frontend/app/sitemap.ts` | Generates `sitemap.xml` at build |
| `frontend/app/globals.css` | Tailwind import + `@theme` design tokens + base styles |
| `frontend/components/ui/Section.tsx` | Shared section wrapper: anchor id, scroll offset, max width |
| `frontend/components/sections/Hero.tsx` | Portrait photo + name + tagline + brief |
| `frontend/components/sections/CommentsPlaceholder.tsx` | Portrait photo + empty-state card |
| `frontend/components/layout/Header.tsx` | Sticky header: logo, menu, socials, mobile toggle (client) |
| `frontend/components/layout/Logo.tsx` | Logo mark + name link |
| `frontend/components/layout/Menu.tsx` | Anchor list with `aria-current` |
| `frontend/components/layout/Socials.tsx` | External social links |
| `frontend/components/layout/Footer.tsx` | Name, year, repo link |
| `frontend/lib/useScrollSpy.ts` | Active-section tracking via `IntersectionObserver` |
| `frontend/lib/useScrollSpy.test.tsx` | Hook behavior against a fake observer |
| `frontend/public/images/*` | Placeholder SVG assets |
| `frontend/e2e/site.spec.ts` | E2E against the exported static bundle |

`robots.txt` and `sitemap.xml` are generated by `app/robots.ts` and `app/sitemap.ts` rather than dropped into `public/` — the spec listed them under `public/`, but generating them keeps the site URL defined once in `content/site.ts`. This is the only structural change from the spec.

---

### Task 1: Scaffold, static export, and the test harness

**Files:**
- Create: `frontend/` (entire Next.js scaffold)
- Modify: `frontend/next.config.ts`, `frontend/package.json`, `frontend/.gitignore`
- Create: `frontend/vitest.config.mts`, `frontend/vitest.setup.ts`
- Test: `frontend/test/harness.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `frontend/` app; npm scripts `dev`, `build`, `typecheck`, `test`, `test:watch`; the `@/*` import alias resolving to `frontend/`; a passing Vitest + React Testing Library setup that every later task's tests rely on.

- [ ] **Step 1: Scaffold the app**

Run from the repo root (`Website/`). The `frontend` directory already exists and is empty, which `create-next-app` accepts.

```bash
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --yes
```

If it prompts for anything not covered by the flags (e.g. Turbopack), accept the default.

- [ ] **Step 2: Confirm the scaffold runs its own build**

```bash
cd frontend
npm run build
```

Expected: build succeeds. There is no `out/` yet — that arrives in Step 4.

- [ ] **Step 3: Configure static export**

Replace `frontend/next.config.ts` entirely:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Emits a plain out/ directory for S3 + CloudFront hosting. Set before any
  // feature work so server-only constructs fail at build time, not deploy time.
  output: 'export',
  // No Next.js image optimizer exists behind static hosting.
  images: { unoptimized: true },
  // Emits nested routes as directories with index.html, which is what S3
  // static website hosting expects.
  trailingSlash: true,
};

export default nextConfig;
```

- [ ] **Step 4: Verify the export emits `out/`**

```bash
npm run build
ls out/index.html out/404.html
```

Expected: `npm run build` succeeds and both files exist. If `out/` is missing, `output: 'export'` did not take effect — stop and fix before continuing.

- [ ] **Step 5: Install the unit test toolchain**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 6: Configure Vitest**

Create `frontend/vitest.config.mts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**', 'out/**', 'e2e/**'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

Create `frontend/vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 7: Add npm scripts**

In `frontend/package.json`, add these to `"scripts"`. Leave the generated `dev`, `build`, `start`, and `lint` entries exactly as they are.

```json
"typecheck": "tsc --noEmit",
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 8: Write the failing harness test**

Create `frontend/test/harness.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('unit test harness', () => {
  it('renders a React component into jsdom and applies jest-dom matchers', () => {
    render(<p>harness online</p>);
    expect(screen.getByText('harness online')).toBeInTheDocument();
  });
});
```

- [ ] **Step 9: Run it**

```bash
npm test
```

Expected: PASS. This test exists to prove jsdom, the React plugin, and the jest-dom matchers are all wired — if it fails, the failure is in the config from Step 6, not the test.

- [ ] **Step 10: Ignore test artifacts**

Append to `frontend/.gitignore`:

```
# test artifacts
/test-results/
/playwright-report/
/blob-report/
/playwright/.cache/
```

Confirm `/out/` and `/.next/` are already listed by the scaffold; add them if not.

- [ ] **Step 11: Verify typecheck and lint pass**

```bash
npm run typecheck
npm run lint
```

Expected: both clean.

- [ ] **Step 12: Commit**

```bash
cd ..
git add frontend
git commit -m "feat(frontend): scaffold Next.js app with static export and test harness"
```

---

### Task 2: Content model and placeholder assets

**Files:**
- Create: `frontend/content/types.ts`
- Create: `frontend/content/site.ts`
- Create: `frontend/public/images/placeholder-portrait.svg`
- Create: `frontend/public/images/placeholder-logo.svg`
- Test: `frontend/content/site.test.ts`

**Interfaces:**
- Consumes: the `@/*` alias from Task 1.
- Produces:
  - `type ImageRef = { src: string; alt: string; width: number; height: number }`
  - `type MenuItem = { id: string; label: string }`
  - `type SocialLink = { platform: string; label: string; href: string }`
  - `type SiteContent` with fields `identity`, `meta`, `menu`, `socials`, `hero`, `comments`
  - `export const siteContent: SiteContent` from `@/content/site`

  Every later task imports `siteContent` and reads only its own slice.

- [ ] **Step 1: Write the failing content test**

Create `frontend/content/site.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { siteContent } from './site';

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
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test
```

Expected: FAIL — `Failed to resolve import "./site"`.

- [ ] **Step 3: Write the content types**

Create `frontend/content/types.ts`:

```ts
/** A referenced image. width/height are required: they reserve layout space
 *  and prevent shift while the image loads. Both site photos are portrait. */
export type ImageRef = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

/** `id` must match the anchor id of a section rendered on the page.
 *  app/page.test.tsx enforces this. */
export type MenuItem = {
  id: string;
  label: string;
};

export type SocialLink = {
  platform: string;
  /** Accessible name for the link, e.g. "GitHub profile". */
  label: string;
  href: string;
};

export type SiteContent = {
  identity: {
    name: string;
    tagline: string;
    logo: ImageRef;
  };
  meta: {
    title: string;
    description: string;
    /** Absolute origin, used for metadataBase, OG urls, and the sitemap. */
    siteUrl: string;
  };
  menu: MenuItem[];
  socials: SocialLink[];
  /** The hero has no heading of its own — its heading is the page <h1>,
   *  composed from identity.name and identity.tagline. */
  hero: {
    photo: ImageRef;
    body: string[];
  };
  comments: {
    heading: string;
    photo: ImageRef;
    message: string;
  };
};
```

- [ ] **Step 4: Write the placeholder content**

Create `frontend/content/site.ts`:

```ts
import type { SiteContent } from './types';

// ---------------------------------------------------------------------------
// TODO: replace before launch. Everything below is placeholder content.
// Required from Sagar:
//   1. identity.name and identity.tagline
//   2. hero.body — the brief, 2-3 short paragraphs
//   3. public/images/portrait.jpg — PORTRAIT orientation, at or near 3:4.
//      A landscape photo needs the hero grid revisited.
//   4. public/images/logo.svg — the personal logo
//   5. socials — real profile URLs
//   6. meta.siteUrl — the real domain once registered
// Replacing content means editing this file and adding files to
// public/images/. No component changes are needed.
// ---------------------------------------------------------------------------

const PLACEHOLDER_PORTRAIT = {
  src: '/images/placeholder-portrait.svg',
  alt: 'Placeholder portrait photograph',
  width: 900,
  height: 1200,
};

export const siteContent: SiteContent = {
  identity: {
    name: 'Your Name',
    tagline: 'Cloud, backend, and applied machine learning',
    logo: {
      src: '/images/placeholder-logo.svg',
      alt: 'Placeholder personal logo',
      width: 64,
      height: 64,
    },
  },

  meta: {
    title: 'Your Name — Cloud, backend, and applied machine learning',
    description:
      'Portfolio placeholder. Replace this description with a real one before launch.',
    siteUrl: 'https://example.com',
  },

  menu: [
    { id: 'hero', label: 'About' },
    { id: 'comments', label: 'Comments' },
  ],

  socials: [
    { platform: 'github', label: 'GitHub profile', href: 'https://github.com/' },
    { platform: 'linkedin', label: 'LinkedIn profile', href: 'https://www.linkedin.com/' },
  ],

  hero: {
    photo: { ...PLACEHOLDER_PORTRAIT },
    body: [
      'Placeholder brief. Two or three short paragraphs introducing who you are, what you build, and what you are looking for.',
      'Placeholder second paragraph. Replace this with something concrete — a system you designed, a problem you solved, a result you can point at.',
    ],
  },

  comments: {
    heading: 'Comments',
    photo: { ...PLACEHOLDER_PORTRAIT, alt: 'Placeholder secondary photograph' },
    message:
      'Comments are not live yet. A later version backs this section with a real API so visitors can leave a note.',
  },
};
```

- [ ] **Step 5: Create the portrait placeholder**

Create `frontend/public/images/placeholder-portrait.svg` — a true 3:4 frame so the hero layout is never tuned against a stand-in of the wrong orientation:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200" width="900" height="1200" role="img" aria-label="Placeholder portrait">
  <rect width="900" height="1200" fill="#1a1a1f"/>
  <rect x="8" y="8" width="884" height="1184" fill="none" stroke="#3a3a44" stroke-width="4" stroke-dasharray="24 16"/>
  <circle cx="450" cy="470" r="150" fill="#2a2a32"/>
  <path d="M180 1010c0-160 121-270 270-270s270 110 270 270z" fill="#2a2a32"/>
  <text x="450" y="1130" fill="#6f6f7d" font-family="system-ui, sans-serif" font-size="44" text-anchor="middle">PLACEHOLDER 3:4</text>
</svg>
```

- [ ] **Step 6: Create the logo placeholder**

Create `frontend/public/images/placeholder-logo.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="Placeholder logo">
  <rect width="64" height="64" rx="8" fill="#1a1a1f" stroke="#3a3a44" stroke-width="2"/>
  <path d="M20 44V20h10a8 8 0 0 1 0 16H20m14 8-8-8" fill="none" stroke="#c8a24a" stroke-width="4" stroke-linecap="square"/>
</svg>
```

- [ ] **Step 7: Run the tests**

```bash
npm test
```

Expected: PASS — all six content tests, plus the harness test.

- [ ] **Step 8: Commit**

```bash
cd ..
git add frontend
git commit -m "feat(frontend): add typed content model and placeholder assets"
```

---

### Task 3: Design tokens and root layout

**Files:**
- Modify: `frontend/app/globals.css` (replace entirely)
- Modify: `frontend/app/layout.tsx` (replace entirely)
- Create: `frontend/app/robots.ts`
- Create: `frontend/app/sitemap.ts`

**Interfaces:**
- Consumes: `siteContent` from Task 2.
- Produces: Tailwind theme utilities used by every later component — colors `bg-ink`, `bg-surface`, `text-text`, `text-muted`, `text-accent`, `border-line`; fonts `font-sans` (default) and `font-display`. Also produces the page `<html>`/`<body>` shell, metadata, and JSON-LD.

- [ ] **Step 1: Replace `app/globals.css`**

Delete the generated contents and write:

```css
@import "tailwindcss";

@theme {
  /* Dark-first palette. Chosen for the register of the source diagrams.
     Contrast against --color-ink: text 16.5:1, muted 6.4:1, accent 8.1:1. */
  --color-ink: #0b0b0d;
  --color-surface: #141417;
  --color-line: #26262b;
  --color-muted: #8a8a94;
  --color-text: #e8e8ea;
  --color-accent: #c8a24a;

  /* Editorial serif for display, neutral sans for everything else.
     Deliberately not the create-next-app default. */
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-fraunces), ui-serif, Georgia, serif;
}

html {
  scroll-behavior: smooth;
  background-color: var(--color-ink);
  color-scheme: dark;
}

body {
  background-color: var(--color-ink);
  color: var(--color-text);
  -webkit-font-smoothing: antialiased;
}

/* Focus is always visible, and always on the accent. */
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Replace `app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { siteContent } from '@/content/site';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteContent.meta.siteUrl),
  title: siteContent.meta.title,
  description: siteContent.meta.description,
  openGraph: {
    type: 'profile',
    title: siteContent.meta.title,
    description: siteContent.meta.description,
    url: siteContent.meta.siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: siteContent.meta.title,
    description: siteContent.meta.description,
  },
};

const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: siteContent.identity.name,
  description: siteContent.identity.tagline,
  url: siteContent.meta.siteUrl,
  sameAs: siteContent.socials.map((social) => social.href),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="font-sans">
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Create `app/robots.ts`**

```ts
import type { MetadataRoute } from 'next';
import { siteContent } from '@/content/site';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${siteContent.meta.siteUrl}/sitemap.xml`,
  };
}
```

- [ ] **Step 4: Create `app/sitemap.ts`**

```ts
import type { MetadataRoute } from 'next';
import { siteContent } from '@/content/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteContent.meta.siteUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
```

- [ ] **Step 5: Build and verify the generated files**

```bash
npm run build
ls out/robots.txt out/sitemap.xml
```

Expected: build succeeds and both files exist in the export.

- [ ] **Step 6: Verify the existing tests still pass**

```bash
npm test
npm run typecheck
npm run lint
```

Expected: all clean.

- [ ] **Step 7: Commit**

```bash
cd ..
git add frontend
git commit -m "feat(frontend): add design tokens, root layout, robots and sitemap"
```

---

### Task 4: Section primitive and the hero

**Files:**
- Create: `frontend/components/ui/Section.tsx`
- Create: `frontend/components/sections/Hero.tsx`
- Test: `frontend/components/sections/Hero.test.tsx`

**Interfaces:**
- Consumes: `siteContent` (Task 2), theme utilities (Task 3).
- Produces:
  - `export function Section(props: { id: string; children: React.ReactNode; className?: string }): JSX.Element` from `@/components/ui/Section` — renders `<section id={id}>` with `scroll-mt-24` and a centered max-width container. Used by every section.
  - `export function Hero(): JSX.Element` from `@/components/sections/Hero` — renders the `#hero` section containing the page's only `<h1>`.

- [ ] **Step 1: Write the failing hero test**

Create `frontend/components/sections/Hero.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { siteContent } from '@/content/site';
import { Hero } from './Hero';

describe('Hero', () => {
  it('renders the name as the page h1', () => {
    render(<Hero />);
    expect(
      screen.getByRole('heading', { level: 1, name: siteContent.identity.name }),
    ).toBeInTheDocument();
  });

  it('renders the tagline as text, not as a heading', () => {
    render(<Hero />);
    expect(screen.getByText(siteContent.identity.tagline)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: siteContent.identity.tagline }),
    ).toBeNull();
  });

  it('renders every paragraph of the brief', () => {
    render(<Hero />);
    for (const paragraph of siteContent.hero.body) {
      expect(screen.getByText(paragraph)).toBeInTheDocument();
    }
  });

  it('renders the portrait with its alt text', () => {
    render(<Hero />);
    expect(screen.getByAltText(siteContent.hero.photo.alt)).toBeInTheDocument();
  });

  it('exposes the hero anchor id for the menu', () => {
    const { container } = render(<Hero />);
    expect(container.querySelector('#hero')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test
```

Expected: FAIL — `Failed to resolve import "./Hero"`.

- [ ] **Step 3: Write the Section primitive**

Create `frontend/components/ui/Section.tsx`:

```tsx
import type { ReactNode } from 'react';

type SectionProps = {
  id: string;
  children: ReactNode;
  className?: string;
};

/** Shared wrapper for every page section. Owns the anchor id, the scroll
 *  offset that keeps headings clear of the sticky header, and the page's
 *  horizontal rhythm. */
export function Section({ id, children, className = '' }: SectionProps) {
  return (
    <section id={id} className={`scroll-mt-24 px-6 md:px-12 ${className}`}>
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}
```

- [ ] **Step 4: Write the Hero**

Create `frontend/components/sections/Hero.tsx`:

```tsx
import Image from 'next/image';
import { siteContent } from '@/content/site';
import { Section } from '@/components/ui/Section';

export function Hero() {
  const { identity, hero } = siteContent;

  return (
    <Section
      id="hero"
      className="flex items-center py-20 md:min-h-[85vh] md:py-24"
    >
      <div className="grid items-center gap-12 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Image
          src={hero.photo.src}
          alt={hero.photo.alt}
          width={hero.photo.width}
          height={hero.photo.height}
          priority
          sizes="(min-width: 768px) 40vw, 100vw"
          className="w-full max-w-sm rounded-sm border border-line"
        />

        <div>
          <h1 className="font-display text-4xl leading-tight tracking-tight md:text-6xl">
            {identity.name}
          </h1>
          <p className="mt-4 text-lg text-muted md:text-xl">{identity.tagline}</p>

          <div className="mt-8 space-y-5 text-base leading-relaxed md:text-lg">
            {hero.body.map((paragraph) => (
              <p key={paragraph} className="max-w-prose">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
```

- [ ] **Step 5: Run the tests**

```bash
npm test
```

Expected: PASS — all five Hero tests.

- [ ] **Step 6: Commit**

```bash
cd ..
git add frontend
git commit -m "feat(frontend): add section primitive and hero section"
```

---

### Task 5: Comments placeholder section

**Files:**
- Create: `frontend/components/sections/CommentsPlaceholder.tsx`
- Test: `frontend/components/sections/CommentsPlaceholder.test.tsx`

**Interfaces:**
- Consumes: `Section` (Task 4), `siteContent` (Task 2).
- Produces: `export function CommentsPlaceholder(): JSX.Element` from `@/components/sections/CommentsPlaceholder` — renders the `#comments` section.

- [ ] **Step 1: Write the failing test**

Create `frontend/components/sections/CommentsPlaceholder.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { siteContent } from '@/content/site';
import { CommentsPlaceholder } from './CommentsPlaceholder';

describe('CommentsPlaceholder', () => {
  it('renders its heading at level 2, below the page h1', () => {
    render(<CommentsPlaceholder />);
    expect(
      screen.getByRole('heading', { level: 2, name: siteContent.comments.heading }),
    ).toBeInTheDocument();
  });

  it('renders the placeholder message', () => {
    render(<CommentsPlaceholder />);
    expect(screen.getByText(siteContent.comments.message)).toBeInTheDocument();
  });

  it('renders the secondary photo with its alt text', () => {
    render(<CommentsPlaceholder />);
    expect(screen.getByAltText(siteContent.comments.photo.alt)).toBeInTheDocument();
  });

  it('offers no interactive controls, because there is no backend yet', () => {
    const { container } = render(<CommentsPlaceholder />);
    expect(container.querySelector('form')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('exposes the comments anchor id for the menu', () => {
    const { container } = render(<CommentsPlaceholder />);
    expect(container.querySelector('#comments')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test
```

Expected: FAIL — `Failed to resolve import "./CommentsPlaceholder"`.

- [ ] **Step 3: Write the component**

Create `frontend/components/sections/CommentsPlaceholder.tsx`:

```tsx
import Image from 'next/image';
import { siteContent } from '@/content/site';
import { Section } from '@/components/ui/Section';

export function CommentsPlaceholder() {
  const { comments } = siteContent;

  return (
    <Section id="comments" className="py-20 md:py-28">
      <div className="grid items-center gap-12 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Image
          src={comments.photo.src}
          alt={comments.photo.alt}
          width={comments.photo.width}
          height={comments.photo.height}
          sizes="(min-width: 768px) 40vw, 100vw"
          className="w-full max-w-sm rounded-sm border border-line"
        />

        <div>
          <h2 className="font-display text-3xl tracking-tight md:text-4xl">
            {comments.heading}
          </h2>

          {/* Sized and styled as though populated, so the two-column layout is
              already proven against realistic height. */}
          <div className="mt-8 min-h-56 rounded-sm border border-dashed border-line bg-surface p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-accent">
              Coming soon
            </p>
            <p className="mt-4 max-w-prose leading-relaxed text-muted">
              {comments.message}
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}
```

- [ ] **Step 4: Run the tests**

```bash
npm test
```

Expected: PASS — all five CommentsPlaceholder tests.

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend
git commit -m "feat(frontend): add comments placeholder section"
```

---

### Task 6: Scroll-spy hook

**Files:**
- Create: `frontend/lib/useScrollSpy.ts`
- Test: `frontend/lib/useScrollSpy.test.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `export function useScrollSpy(ids: string[]): string | null` from `@/lib/useScrollSpy`. Returns the id of the section currently most in view, defaulting to `ids[0]`. **Callers must pass a referentially stable array** — build it once at module scope, not inline in render, or the effect re-subscribes on every render.

- [ ] **Step 1: Write the failing hook test**

jsdom has no `IntersectionObserver`, so the test installs a fake one and drives it directly. Create `frontend/lib/useScrollSpy.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useScrollSpy } from './useScrollSpy';

type Entry = { target: { id: string }; isIntersecting: boolean; intersectionRatio: number };

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  callback: (entries: Entry[]) => void;
  observed: Element[] = [];
  disconnected = false;

  constructor(callback: (entries: Entry[]) => void) {
    this.callback = callback;
    FakeIntersectionObserver.instances.push(this);
  }

  observe(element: Element) {
    this.observed.push(element);
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }
  takeRecords() {
    return [];
  }
}

const IDS = ['hero', 'comments'];

function Probe() {
  const active = useScrollSpy(IDS);
  return (
    <>
      <div id="hero" />
      <div id="comments" />
      <output>{active ?? 'none'}</output>
    </>
  );
}

function fire(entries: Entry[]) {
  const observer = FakeIntersectionObserver.instances.at(-1);
  if (!observer) throw new Error('no observer was constructed');
  act(() => observer.callback(entries));
}

describe('useScrollSpy', () => {
  beforeEach(() => {
    FakeIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  });

  it('defaults to the first id before anything intersects', () => {
    render(<Probe />);
    expect(screen.getByRole('status').textContent).toBe('hero');
  });

  it('observes every element whose id was passed', () => {
    render(<Probe />);
    expect(FakeIntersectionObserver.instances.at(-1)?.observed).toHaveLength(2);
  });

  it('activates the section that comes into view', () => {
    render(<Probe />);
    fire([{ target: { id: 'comments' }, isIntersecting: true, intersectionRatio: 0.9 }]);
    expect(screen.getByRole('status').textContent).toBe('comments');
  });

  it('prefers the section with the greater visible ratio', () => {
    render(<Probe />);
    fire([
      { target: { id: 'hero' }, isIntersecting: true, intersectionRatio: 0.2 },
      { target: { id: 'comments' }, isIntersecting: true, intersectionRatio: 0.8 },
    ]);
    expect(screen.getByRole('status').textContent).toBe('comments');
  });

  it('falls back to the remaining visible section when one leaves view', () => {
    render(<Probe />);
    fire([
      { target: { id: 'hero' }, isIntersecting: true, intersectionRatio: 0.9 },
      { target: { id: 'comments' }, isIntersecting: true, intersectionRatio: 0.1 },
    ]);
    expect(screen.getByRole('status').textContent).toBe('hero');

    fire([{ target: { id: 'hero' }, isIntersecting: false, intersectionRatio: 0 }]);
    expect(screen.getByRole('status').textContent).toBe('comments');
  });

  it('disconnects the observer on unmount', () => {
    const { unmount } = render(<Probe />);
    const observer = FakeIntersectionObserver.instances.at(-1);
    unmount();
    expect(observer?.disconnected).toBe(true);
  });
});
```

Note: `<output>` has the implicit ARIA role `status`, which is why the assertions use `getByRole('status')`.

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test
```

Expected: FAIL — `Failed to resolve import "./useScrollSpy"`.

- [ ] **Step 3: Write the hook**

Create `frontend/lib/useScrollSpy.ts`:

```ts
'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks which section is currently in view.
 *
 * Pass a referentially stable `ids` array — build it once at module scope.
 * An inline array re-subscribes the observer on every render.
 */
export function useScrollSpy(ids: string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    if (elements.length === 0) return;

    // Visible ratio per section, updated as entries arrive. The observer only
    // reports what changed, so the running map is what makes "most visible"
    // answerable.
    const visibleRatios = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleRatios.set(entry.target.id, entry.intersectionRatio);
          } else {
            visibleRatios.delete(entry.target.id);
          }
        }

        let best: string | null = null;
        let bestRatio = -1;
        for (const id of ids) {
          const ratio = visibleRatios.get(id);
          if (ratio !== undefined && ratio > bestRatio) {
            best = id;
            bestRatio = ratio;
          }
        }

        if (best !== null) setActiveId(best);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [ids]);

  return activeId;
}
```

- [ ] **Step 4: Run the tests**

```bash
npm test
```

Expected: PASS — all six useScrollSpy tests.

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend
git commit -m "feat(frontend): add scroll-spy hook for active menu tracking"
```

---

### Task 7: Header — logo, menu, socials, mobile toggle

**Files:**
- Create: `frontend/components/layout/Logo.tsx`
- Create: `frontend/components/layout/Menu.tsx`
- Create: `frontend/components/layout/Socials.tsx`
- Create: `frontend/components/layout/Header.tsx`
- Test: `frontend/components/layout/Header.test.tsx`

**Interfaces:**
- Consumes: `siteContent` (Task 2), `useScrollSpy` (Task 6).
- Produces:
  - `export function Logo(): JSX.Element`
  - `export function Menu(props: { activeId: string | null; onNavigate?: () => void; className?: string }): JSX.Element`
  - `export function Socials(props: { className?: string }): JSX.Element`
  - `export function Header(): JSX.Element` from `@/components/layout/Header`

`Header` is the only component in the codebase marked `'use client'`. `Logo`, `Menu`, and `Socials` have no directive of their own — they are pulled into the client bundle by being imported from `Header`, which keeps the boundary declared in exactly one place.

- [ ] **Step 1: Write the failing header test**

Create `frontend/components/layout/Header.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { siteContent } from '@/content/site';
import { Header } from './Header';

class NoopIntersectionObserver {
  constructor(_callback: unknown) {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

describe('Header', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', NoopIntersectionObserver);
  });

  it('renders exactly one link per menu entry, pointing at its anchor', () => {
    render(<Header />);
    const nav = screen.getByRole('navigation', { name: /section/i });

    for (const item of siteContent.menu) {
      const link = within(nav).getByRole('link', { name: item.label });
      expect(link).toHaveAttribute('href', `#${item.id}`);
    }

    expect(within(nav).getAllByRole('link')).toHaveLength(siteContent.menu.length);
  });

  it('marks the first section active by default', () => {
    render(<Header />);
    const nav = screen.getByRole('navigation', { name: /section/i });
    const first = within(nav).getByRole('link', { name: siteContent.menu[0].label });
    expect(first).toHaveAttribute('aria-current', 'true');
  });

  it('opens social links safely in a new tab', () => {
    render(<Header />);
    const nav = screen.getByRole('navigation', { name: /social/i });

    for (const social of siteContent.socials) {
      const link = within(nav).getByRole('link', { name: social.label });
      expect(link).toHaveAttribute('href', social.href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('renders the logo with its alt text', () => {
    render(<Header />);
    expect(screen.getByAltText(siteContent.identity.logo.alt)).toBeInTheDocument();
  });

  it('toggles the mobile menu open and closed', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const toggle = screen.getByRole('button', { name: /menu/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the mobile menu after a link inside it is followed', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const toggle = screen.getByRole('button', { name: /menu/i });
    await user.click(toggle);

    const mobileNav = screen.getByRole('navigation', { name: /mobile/i });
    await user.click(
      within(mobileNav).getByRole('link', { name: siteContent.menu[1].label }),
    );

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test
```

Expected: FAIL — `Failed to resolve import "./Header"`.

- [ ] **Step 3: Write the Logo**

Create `frontend/components/layout/Logo.tsx`:

```tsx
import Image from 'next/image';
import { siteContent } from '@/content/site';

export function Logo() {
  const { logo, name } = siteContent.identity;

  return (
    <a href="#hero" className="flex items-center gap-3">
      <Image
        src={logo.src}
        alt={logo.alt}
        width={logo.width}
        height={logo.height}
        className="h-9 w-9"
      />
      <span className="font-display text-lg tracking-tight">{name}</span>
    </a>
  );
}
```

- [ ] **Step 4: Write the Menu**

Create `frontend/components/layout/Menu.tsx`:

```tsx
import { siteContent } from '@/content/site';

type MenuProps = {
  activeId: string | null;
  onNavigate?: () => void;
  className?: string;
};

export function Menu({ activeId, onNavigate, className = '' }: MenuProps) {
  return (
    <ul className={className}>
      {siteContent.menu.map((item) => {
        const isActive = item.id === activeId;
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={onNavigate}
              aria-current={isActive ? 'true' : undefined}
              className={`text-sm tracking-wide transition-colors hover:text-text ${
                isActive ? 'text-accent' : 'text-muted'
              }`}
            >
              {item.label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 5: Write the Socials**

Icons are inline SVG paths rather than an icon package, per the no-new-dependencies constraint.

```tsx
import { siteContent } from '@/content/site';

const ICON_PATHS: Record<string, string> = {
  github:
    'M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z',
  linkedin:
    'M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm6 0h3.8v1.71h.05c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.4c0-1.29-.02-2.95-1.8-2.95-1.8 0-2.08 1.4-2.08 2.85V21H9V9Z',
};

const FALLBACK_ICON_PATH = 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4v8m0 4h.01';

type SocialsProps = { className?: string };

export function Socials({ className = '' }: SocialsProps) {
  return (
    <ul className={className}>
      {siteContent.socials.map((social) => (
        <li key={social.platform}>
          <a
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.label}
            className="block text-muted transition-colors hover:text-accent"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
              className="h-5 w-5 fill-current"
            >
              <path d={ICON_PATHS[social.platform] ?? FALLBACK_ICON_PATH} />
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 6: Write the Header**

Create `frontend/components/layout/Header.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { siteContent } from '@/content/site';
import { useScrollSpy } from '@/lib/useScrollSpy';
import { Logo } from './Logo';
import { Menu } from './Menu';
import { Socials } from './Socials';

// Module scope, so the array identity is stable across renders and the
// observer in useScrollSpy subscribes once.
const SECTION_IDS = siteContent.menu.map((item) => item.id);

export function Header() {
  const activeId = useScrollSpy(SECTION_IDS);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-4 md:px-12">
        <Logo />

        <nav aria-label="Section navigation" className="hidden md:block">
          <Menu activeId={activeId} className="flex items-center gap-8" />
        </nav>

        <div className="flex items-center gap-4">
          <nav aria-label="Social links">
            <Socials className="flex items-center gap-4" />
          </nav>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="text-muted transition-colors hover:text-text md:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
              className="h-6 w-6 stroke-current"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
            >
              {isMobileMenuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <nav
          id="mobile-menu"
          aria-label="Mobile section navigation"
          className="border-t border-line px-6 py-4 md:hidden"
        >
          <Menu
            activeId={activeId}
            onNavigate={() => setIsMobileMenuOpen(false)}
            className="flex flex-col gap-4"
          />
        </nav>
      )}
    </header>
  );
}
```

- [ ] **Step 7: Run the tests**

```bash
npm test
```

Expected: PASS — all six Header tests.

- [ ] **Step 8: Commit**

```bash
cd ..
git add frontend
git commit -m "feat(frontend): add sticky header with menu, socials and mobile toggle"
```

---

### Task 8: Footer, 404 page, and the composed page

**Files:**
- Create: `frontend/components/layout/Footer.tsx`
- Modify: `frontend/app/page.tsx` (replace entirely)
- Create: `frontend/app/not-found.tsx`
- Test: `frontend/app/page.test.tsx`

**Interfaces:**
- Consumes: `Header` (Task 7), `Hero` (Task 4), `CommentsPlaceholder` (Task 5), `siteContent` (Task 2).
- Produces: `export function Footer(): JSX.Element`; the default-exported `Home` page; the default-exported `NotFound` page that becomes `out/404.html`.

The page test is the **dead-anchor guard** named in the spec: it proves every menu entry points at a section that actually renders.

- [ ] **Step 1: Write the failing page test**

Create `frontend/app/page.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { siteContent } from '@/content/site';
import Home from './page';

class NoopIntersectionObserver {
  constructor(_callback: unknown) {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

describe('Home page', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', NoopIntersectionObserver);
  });

  it('renders a section for every menu entry', () => {
    const { container } = render(<Home />);
    for (const item of siteContent.menu) {
      expect(
        container.querySelector(`#${item.id}`),
        `menu item "${item.label}" points at #${item.id}, which no section renders`,
      ).not.toBeNull();
    }
  });

  it('renders exactly one h1', () => {
    render(<Home />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders the page landmarks', () => {
    render(<Home />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test
```

Expected: FAIL — the scaffold's default `page.tsx` renders no matching section ids and no `banner`/`contentinfo` landmarks.

- [ ] **Step 3: Write the Footer**

Create `frontend/components/layout/Footer.tsx`:

```tsx
import { siteContent } from '@/content/site';

export function Footer() {
  return (
    <footer className="border-t border-line px-6 py-10 md:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <p>
          © {new Date().getFullYear()} {siteContent.identity.name}
        </p>
        <p>{siteContent.identity.tagline}</p>
      </div>
    </footer>
  );
}
```

`new Date().getFullYear()` runs at build time in a server component, so the exported HTML carries a fixed year. Rebuild in January.

- [ ] **Step 4: Compose the page**

Replace `frontend/app/page.tsx` entirely:

```tsx
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/components/sections/Hero';
import { CommentsPlaceholder } from '@/components/sections/CommentsPlaceholder';

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <CommentsPlaceholder />
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 5: Write the 404 page**

Create `frontend/app/not-found.tsx`:

```tsx
import { siteContent } from '@/content/site';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-accent">404</p>
        <h1 className="mt-4 font-display text-3xl tracking-tight md:text-4xl">
          This page does not exist
        </h1>
        <p className="mt-4 text-muted">
          The link may be out of date. Everything lives on one page.
        </p>
        <a
          href="/"
          className="mt-8 inline-block border border-line px-5 py-2 text-sm text-text transition-colors hover:border-accent hover:text-accent"
        >
          Back to {siteContent.identity.name}
        </a>
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Run the tests**

```bash
npm test
```

Expected: PASS — all three page tests, and every test from earlier tasks.

- [ ] **Step 7: Verify the whole site builds and exports**

```bash
npm run build
npm run typecheck
npm run lint
```

Expected: all clean, `out/index.html` and `out/404.html` present.

- [ ] **Step 8: Look at it**

```bash
npm run dev
```

Open `http://localhost:3000`. Confirm the hero fills most of the first screen with a portrait-shaped photo, the menu highlights the section you scroll to, and the mobile toggle works when the window is narrowed. Stop the server with Ctrl+C.

- [ ] **Step 9: Commit**

```bash
cd ..
git add frontend
git commit -m "feat(frontend): compose the page with footer and 404"
```

---

### Task 9: End-to-end tests against the exported bundle

**Files:**
- Create: `frontend/playwright.config.ts`
- Create: `frontend/e2e/site.spec.ts`
- Modify: `frontend/package.json` (add `test:e2e`)
- Modify: `frontend/eslint.config.mjs` (ignore `e2e/` and `out/`)

**Interfaces:**
- Consumes: the exported `out/` directory produced by `npm run build`.
- Produces: `npm run test:e2e`, which rebuilds the export and runs Playwright against the served static files.

These tests run against `out/` served statically, **not** `next dev`. That is the deploy-fidelity check: they exercise the same bytes S3 will hold.

- [ ] **Step 1: Install Playwright and a static server**

```bash
npm install -D @playwright/test serve
npx playwright install chromium
```

- [ ] **Step 2: Configure Playwright**

Create `frontend/playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  // Serves the exported static bundle — the same files that go to S3.
  webServer: {
    command: `npx serve out -l ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
```

- [ ] **Step 3: Add the script and lint ignores**

In `frontend/package.json`, add to `"scripts"`:

```json
"test:e2e": "next build && playwright test"
```

In `frontend/eslint.config.mjs`, add an ignores entry so the E2E specs and the export are not linted as app code. If the generated config is an array, append:

```js
{ ignores: ['out/**', 'e2e/**', 'playwright-report/**', 'test-results/**'] },
```

- [ ] **Step 4: Write the failing E2E spec**

Create `frontend/e2e/site.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('portfolio site, served from the static export', () => {
  test('loads with no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/');
    await expect(page.locator('#hero')).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('shows the hero content and exactly one h1', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('#hero img').first()).toBeVisible();
  });

  test('shows the comments placeholder with no form', async ({ page }) => {
    await page.goto('/');

    const comments = page.locator('#comments');
    await expect(comments).toBeAttached();
    await expect(comments.getByText('Coming soon')).toBeAttached();
    await expect(comments.locator('form')).toHaveCount(0);
    await expect(comments.locator('input, textarea, button')).toHaveCount(0);
  });

  test('serves a 404 page in the export', async ({ page }) => {
    await page.goto('/404.html');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'does not exist',
    );
  });
});

test.describe('desktop navigation', () => {
  test.skip(({ isMobile }) => !!isMobile, 'desktop menu is hidden on mobile');

  test('scrolls to a section and marks its menu item current', async ({ page }) => {
    await page.goto('/');

    const nav = page.getByRole('navigation', { name: 'Section navigation' });
    await nav.getByRole('link', { name: 'Comments' }).click();

    await expect(page.locator('#comments')).toBeInViewport();
    await expect(nav.getByRole('link', { name: 'Comments' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });
});

test.describe('mobile navigation', () => {
  test.skip(({ isMobile }) => !isMobile, 'toggle only exists on mobile');

  test('opens the menu, navigates, and closes it', async ({ page }) => {
    await page.goto('/');

    const toggle = page.getByRole('button', { name: 'Open menu' });
    await expect(toggle).toBeVisible();
    await toggle.click();

    const mobileNav = page.getByRole('navigation', {
      name: 'Mobile section navigation',
    });
    await expect(mobileNav).toBeVisible();

    await mobileNav.getByRole('link', { name: 'Comments' }).click();

    await expect(page.locator('#comments')).toBeInViewport();
    await expect(mobileNav).toHaveCount(0);
  });
});
```

- [ ] **Step 5: Run the E2E suite**

```bash
npm run test:e2e
```

Expected: PASS on both the `desktop` and `mobile` projects.

If the scroll-position assertions prove flaky because smooth scrolling is still animating, add `await page.waitForTimeout(600)` before the `toBeInViewport()` assertion — do **not** weaken the assertion itself, and do not remove smooth scrolling to make the test pass.

- [ ] **Step 6: Commit**

```bash
cd ..
git add frontend
git commit -m "test(frontend): add Playwright E2E against the static export"
```

---

### Task 10: Final verification and handover README

**Files:**
- Create: `frontend/README.md`
- Modify: `README.md` (repo root — add a pointer to the frontend)

**Interfaces:**
- Consumes: everything.
- Produces: a documented, verified `frontend/` and a green run of all five gate commands.

- [ ] **Step 1: Run the full verification gate**

From `frontend/`, run each and record the result. All five must pass:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
npx playwright test
```

If any fails, fix it before continuing. Do not proceed on a partial pass.

- [ ] **Step 2: Inspect the artifact by hand**

```bash
ls out
```

Confirm `out/` contains `index.html`, `404.html`, `robots.txt`, `sitemap.xml`, an `_next/` directory, and `images/` with both placeholder SVGs. This is the folder that goes to S3 — it is checked once before it leaves the machine.

- [ ] **Step 3: Confirm the placeholders are still findable**

```bash
grep -rn "placeholder" content/ public/images/ --include="*.ts" --include="*.svg" -l
```

Expected: `content/site.ts`, `public/images/placeholder-portrait.svg`, `public/images/placeholder-logo.svg`. Nothing under `components/` should match — copy belongs only in `content/site.ts`.

- [ ] **Step 4: Write the frontend README**

Create `frontend/README.md`:

```markdown
# Portfolio frontend — V1

Static Next.js site: one page, a hero section (portrait photo + brief) and a
comments placeholder, linked by an anchor menu. Builds to a plain `out/`
directory for S3 + CloudFront hosting.

Design spec: `../docs/superpowers/specs/2026-09-10-portfolio-frontend-v1-design.md`

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server on :3000 |
| `npm run build` | Production build; emits `out/` |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Rebuilds the export, then runs Playwright against it |

## Replacing the placeholder content

All copy, links, and image references live in `content/site.ts`. To go live:

1. Edit `content/site.ts` — the `TODO: replace before launch` block at the top
   lists everything required.
2. Add the real portrait to `public/images/`. **It must be portrait
   orientation, at or near 3:4.** A landscape photo needs the hero grid in
   `components/sections/Hero.tsx` revisited.
3. Add the real logo to `public/images/`.
4. Run `npm test` — content invariants (unique menu ids, portrait ratios,
   https socials) are asserted, and the dead-anchor guard in
   `app/page.test.tsx` fails if a menu item points at a missing section.

## Constraints worth knowing before changing anything

- `output: 'export'` in `next.config.ts`. No route handlers, server actions,
  middleware, or ISR — the build will fail.
- `components/layout/Header.tsx` is the only client component. Everything else
  renders at build time.
- E2E tests run against the exported `out/`, not the dev server, so they
  exercise the same files that get deployed.

## Not in this app

Terraform, S3/CloudFront/Route 53 configuration, CI/CD, any backend, live
comments, the AI chat. See the design spec for the full out-of-scope list.
```

- [ ] **Step 5: Point the root README at it**

Add this section to the repo root `README.md`, after the `## Goal` block:

```markdown
## Build status

Version 1 (Inactive) frontend lives in [`frontend/`](./frontend) — a static
Next.js site that builds to `out/` for S3 hosting. See
[`frontend/README.md`](./frontend/README.md) to run it, and
[the design spec](./docs/superpowers/specs/2026-09-10-portfolio-frontend-v1-design.md)
for what it does and does not cover. AWS infrastructure is not built yet.
```

- [ ] **Step 6: Commit**

```bash
cd ..
git add frontend/README.md README.md
git commit -m "docs(frontend): document setup, content replacement and constraints"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| Static export, `images.unoptimized` | 1 |
| Repository layout | 1–8 |
| Content model, `menu[].id` as source of truth | 2, 8 |
| Placeholder discipline, greppable names, 3:4 placeholder | 2, 10 |
| Hero is the top section, portrait photo, `min-h-[85vh]`, single `<h1>` | 4 |
| Second photo also portrait | 2, 5 |
| Comments placeholder, no form, sized as if populated | 5 |
| Header sticky, logo/menu/socials, mobile collapse | 7 |
| Only `Header` is a client component | 7 |
| Anchor navigation, `scroll-mt`, `aria-current` | 4, 6, 7 |
| `prefers-reduced-motion` | 3 |
| Footer | 8 |
| `not-found.tsx` → `404.html` | 8 |
| `rel="noopener noreferrer"` | 7 |
| Explicit image dimensions and alt text | 2, 4, 5 |
| Design tokens in `@theme`, dark-first, non-default type | 3 |
| Landmarks, one `<h1>`, focus rings, keyboard path, contrast | 3, 7, 8 |
| Metadata, OG/Twitter, JSON-LD, robots, sitemap | 3 |
| All five unit test assertions from the spec | 2, 5, 6, 7, 8 |
| All four E2E assertions, run against `out/` | 9 |
| Five-command verification gate + manual `out/` inspection | 10 |

No spec requirement is unassigned.

**Placeholder scan:** every code step carries complete, runnable code. The only occurrences of the word "placeholder" refer to placeholder *content*, which is a deliberate deliverable, not an unwritten step.

**Type consistency:** `ImageRef`, `MenuItem`, `SocialLink`, and `SiteContent` are defined in Task 2 and used unchanged thereafter. `useScrollSpy(ids: string[]): string | null` is defined in Task 6 and called with `SECTION_IDS` in Task 7. `Section({ id, children, className })` is defined in Task 4 and called with exactly those props in Tasks 4 and 5. `Menu({ activeId, onNavigate, className })` and `Socials({ className })` are defined and consumed within Task 7. Anchor ids `hero` and `comments` match `content/site.ts`, the section components, and both test suites.
