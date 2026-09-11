# Workflow Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/workflow/` page of collapsible project panels, and move the header nav from in-page anchors to two real routes, `Home` and `Workflow`.

**Architecture:** Projects are stacked on one statically exported page as native `<details>` panels, so the collapse needs no JavaScript and `Header` stays the site's only client component. Each project is its own module under `content/projects/`, collected by a registry, and its body is a typed block union (`para`, `steps`, `note`) rather than plain strings. The nav marks the current page via `usePathname()` instead of scroll position, which retires `useScrollSpy`.

**Tech Stack:** Next.js 16.3.4 (App Router, `output: 'export'`), React 19.2.8, TypeScript, Tailwind CSS v4 (CSS-first `@theme`), Vitest 5 + React Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-11-workflow-page-design.md`

## Global Constraints

- **Working directory is `frontend/`.** Every path in this plan is relative to it unless it starts with `docs/`. Run every command from `frontend/`.
- **No new dependencies.** Not one. If a task seems to need a package, it is the wrong task — stop and escalate.
- **Static export.** `output: 'export'` is set. No route handlers, server actions, middleware, ISR, cookies, rewrites, redirects, or headers — the build fails on all of them.
- **`components/layout/Header.tsx` is the only `'use client'` component.** Nothing else gains the directive.
- **`trailingSlash: true`.** Every menu `href` ends in `/`, including the root `/`.
- **Commit messages carry NO attribution trailers.** No `Co-Authored-By`, no `Claude-Session`. This repo is public and its history was rewritten once already to strip them. Use the exact message given in each task's commit step.
- **Accessible names are a contract** asserted verbatim by the Playwright specs. After this work the five are: `Primary navigation`, `Mobile navigation`, `Social links`, `Open menu`, `Close menu`.
- **Tailwind v4, CSS-first.** Tokens live in `app/globals.css` under `@theme`. There is no `tailwind.config.js` and none is to be created. Available color tokens: `ink`, `surface`, `line`, `muted`, `text`, `accent`. Font tokens: `font-sans`, `font-display`.
- **No `globals: true` in Vitest.** Import `describe`, `it`, `expect`, `vi` from `vitest` in every test file.
- **Verification gate**, all five must pass before a task is done:
  ```
  npm run lint
  npx tsc --noEmit
  npm test
  npm run build
  npx playwright test
  ```
  Tasks 1–5 may run the first four; Task 6 must run all five.

## Two environment facts that will bite you

These were verified empirically in this repo. Both are counter-intuitive and both change how tests must be written.

1. **`<Link href="/workflow/">` renders `href="/workflow"` under Vitest.** `next.config.ts` is not loaded in the test environment, so `next/link` normalizes with the default `trailingSlash: false` and strips the slash. The real exported build renders `/workflow/`. **Never assert a rendered `href` equals the content value verbatim** — compare on the slash-less form, or assert the trailing slash in a content test where no component is involved.

2. **`usePathname()` returns `null` in jsdom when unmocked.** Not `'/'`, not `''` — `null`. Any code reading it must tolerate `null`, and `Header`'s own tests must mock `next/navigation`.

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `content/types.ts` | Modify | Add `WorkflowBlock`, `WorkflowProject`, `WorkflowContent`; change `MenuItem` from `id` to `href` |
| `content/projects/portfoliowebsite.ts` | Create | One project. Nothing else |
| `content/projects/index.ts` | Create | The registry — imports each project, exports `projects` |
| `content/workflow.ts` | Create | Page chrome: `meta`, `heading`, and the registry |
| `content/workflow.test.ts` | Create | Workflow content invariants |
| `content/images.test.ts` | Create | Every `ImageRef` on the site, from both content modules |
| `content/site.ts` | Modify | `menu` entries become hrefs |
| `content/site.test.ts` | Modify | Menu href invariants + route guard; image assertions move out |
| `public/images/placeholder-workflow.svg` | Create | Landscape 1600×900 placeholder diagram |
| `components/ui/WorkflowBody.tsx` | Create | Renders a `WorkflowBlock[]` |
| `components/ui/WorkflowBody.test.tsx` | Create | Block rendering, list semantics, ordering |
| `components/sections/ProjectPanel.tsx` | Create | One project as one `<details>` |
| `components/sections/ProjectPanel.test.tsx` | Create | Disclosure structure, open state, image, body |
| `app/workflow/page.tsx` | Create | The `/workflow/` route |
| `app/workflow/page.test.tsx` | Create | Heading, panels, landmarks, anchors |
| `lib/activePath.ts` | Create | Trailing-slash-tolerant path comparison |
| `lib/activePath.test.ts` | Create | Normalisation and matching |
| `lib/useScrollSpy.ts` | **Delete** | Nothing imports it once the nav tracks routes |
| `lib/useScrollSpy.test.tsx` | **Delete** | Goes with the hook |
| `components/layout/Menu.tsx` | Modify | Renders `next/link` route links, marks `aria-current="page"` |
| `components/layout/Menu.test.tsx` | Create | Link set, active marking, navigate callback |
| `components/layout/Header.tsx` | Modify | `usePathname()` replaces `useScrollSpy`; nav labels renamed |
| `components/layout/Header.test.tsx` | Modify | Mocks `next/navigation`; asserts page-level active state |
| `components/layout/Logo.tsx` | Modify | `href="#hero"` becomes a `next/link` to `/` |
| `app/sitemap.ts` | Modify | Derives entries from the menu |
| `app/page.test.tsx` | Modify | Dead-anchor guard removed |
| `app/not-found.tsx` | Modify | Copy claiming one page is no longer true |
| `e2e/site.spec.ts` | Modify | Page navigation replaces scroll-to-section |
| `README.md` | Modify | Document the second page and the content layout |

---

### Task 1: Workflow content model, registry, and the image check that covers it

**Files:**
- Modify: `content/types.ts`
- Create: `content/projects/portfoliowebsite.ts`
- Create: `content/projects/index.ts`
- Create: `content/workflow.ts`
- Create: `public/images/placeholder-workflow.svg`
- Test: `content/workflow.test.ts`
- Test: `content/images.test.ts`
- Modify: `content/site.test.ts` (remove the image block that moves to `images.test.ts`)

**Interfaces:**
- Consumes: `ImageRef` from `content/types.ts`; `readImageDimensions(filePath: string): { width: number; height: number }` from `test/imageDimensions.ts`.
- Produces: `WorkflowBlock`, `WorkflowProject`, `WorkflowContent` types; `projects: WorkflowProject[]` from `content/projects/index.ts`; `workflowContent: WorkflowContent` from `content/workflow.ts`.

- [ ] **Step 1: Add the workflow types**

Append to `content/types.ts` (leave `ImageRef`, `MenuItem`, `SocialLink`, `SiteContent` exactly as they are — `MenuItem` changes in Task 5, not here):

```ts
/** A unit of a project's explanation. `steps` is a real ordered sequence:
 *  a workflow's numbering is meaning, not decoration. */
export type WorkflowBlock =
  | { kind: 'para'; text: string }
  | { kind: 'steps'; items: string[] }
  | { kind: 'note'; text: string };

export type WorkflowProject = {
  /** Anchor id and React key — /workflow/#slug. Lowercase, digits, hyphens. */
  slug: string;
  /** The panel's title: the project name. */
  name: string;
  /** The diagram or gif. Landscape, unlike the site's portrait photos. */
  image: ImageRef;
  body: WorkflowBlock[];
};

export type WorkflowContent = {
  meta: { title: string; description: string };
  /** The page <h1>. */
  heading: string;
  projects: WorkflowProject[];
};
```

- [ ] **Step 2: Write the failing content tests**

Create `content/workflow.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { siteContent } from './site';
import { workflowContent } from './workflow';

describe('workflowContent', () => {
  it('has at least one project', () => {
    expect(workflowContent.projects.length).toBeGreaterThan(0);
  });

  it('gives every project a unique, URL-safe slug', () => {
    const slugs = workflowContent.projects.map((project) => project.slug);

    for (const slug of slugs) {
      expect(slug, `"${slug}" must be lowercase letters, digits, and hyphens only`).toMatch(
        /^[a-z0-9-]+$/,
      );
    }

    expect(new Set(slugs).size, 'two projects share a slug, so one anchor is unreachable').toBe(
      slugs.length,
    );
  });

  it('gives every project a name and at least one block', () => {
    for (const project of workflowContent.projects) {
      expect(project.name.trim(), `project "${project.slug}" has no name`).not.toBe('');
      expect(project.body.length, `project "${project.slug}" has an empty body`).toBeGreaterThan(0);
    }
  });

  it('gives every steps block at least one non-blank item', () => {
    for (const project of workflowContent.projects) {
      for (const block of project.body) {
        if (block.kind !== 'steps') continue;
        expect(block.items.length, `a steps block in "${project.slug}" is empty`).toBeGreaterThan(0);
        for (const item of block.items) {
          expect(item.trim(), `a step in "${project.slug}" is blank`).not.toBe('');
        }
      }
    }
  });

  it('gives every para and note block non-blank text', () => {
    for (const project of workflowContent.projects) {
      for (const block of project.body) {
        if (block.kind === 'steps') continue;
        expect(block.text.trim(), `a ${block.kind} block in "${project.slug}" is blank`).not.toBe('');
      }
    }
  });

  it('keeps the workflow page metadata distinct and non-empty', () => {
    // Two pages shipping an identical <title> is an SEO own-goal.
    expect(workflowContent.meta.title).not.toBe(siteContent.meta.title);
    expect(workflowContent.meta.title.trim()).not.toBe('');
    expect(workflowContent.meta.description.trim()).not.toBe('');
    expect(workflowContent.heading.trim()).not.toBe('');
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `npx vitest run content/workflow.test.ts`
Expected: FAIL — `Failed to resolve import "./workflow"`.

- [ ] **Step 4: Create the placeholder diagram**

Create `public/images/placeholder-workflow.svg`. It is authored at a true 16:9 so the layout is never tuned against a stand-in of the wrong shape:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900" role="img" aria-label="Placeholder workflow diagram">
  <rect width="1600" height="900" fill="#141417"/>
  <rect x="8" y="8" width="1584" height="884" fill="none" stroke="#3a3a44" stroke-width="4" stroke-dasharray="24 16"/>
  <g fill="#1a1a1f" stroke="#3a3a44" stroke-width="3">
    <rect x="180" y="380" width="240" height="140" rx="8"/>
    <rect x="680" y="380" width="240" height="140" rx="8"/>
    <rect x="1180" y="380" width="240" height="140" rx="8"/>
  </g>
  <g stroke="#c8a24a" stroke-width="4">
    <path d="M420 450h220" fill="none"/>
    <path d="M920 450h220" fill="none"/>
  </g>
  <g fill="#c8a24a">
    <path d="M640 435l40 15-40 15z"/>
    <path d="M1140 435l40 15-40 15z"/>
  </g>
  <text x="800" y="700" fill="#6f6f7d" font-family="system-ui, sans-serif" font-size="44" text-anchor="middle">PLACEHOLDER WORKFLOW 16:9</text>
</svg>
```

- [ ] **Step 5: Create the project module**

Create `content/projects/portfoliowebsite.ts`:

```ts
import type { WorkflowProject } from '../types';

// ---------------------------------------------------------------------------
// TODO: replace before launch. Everything below is placeholder content.
// Required from Sagar:
//   1. The real diagram or gif in public/images/. It must be LANDSCAPE, and
//      image.width/height must match the file exactly — content/images.test.ts
//      reads the file header and fails if they disagree.
//   2. The step copy — the real pipeline, in order.
//   3. The summary paragraph and the closing note.
// ---------------------------------------------------------------------------
export const portfoliowebsite: WorkflowProject = {
  slug: 'portfoliowebsite',
  name: 'Portfolio Website',
  image: {
    src: '/images/placeholder-workflow.svg',
    alt: 'Placeholder workflow diagram',
    width: 1600,
    height: 900,
  },
  body: [
    {
      kind: 'para',
      text: 'Placeholder summary. One or two sentences on what this project is and why it exists.',
    },
    {
      kind: 'steps',
      items: [
        'Placeholder step one — replace with the first stage of the real workflow.',
        'Placeholder step two — replace with the second stage.',
        'Placeholder step three — replace with the third stage.',
      ],
    },
    {
      kind: 'note',
      text: 'Placeholder note. Use this for a caveat, a constraint, or what is deliberately out of scope.',
    },
  ],
};
```

- [ ] **Step 6: Create the registry**

Create `content/projects/index.ts`:

```ts
import type { WorkflowProject } from '../types';
import { portfoliowebsite } from './portfoliowebsite';

/** Every project shown on /workflow/, in display order.
 *
 *  Adding a project: create its module beside this file, import it above, and
 *  append it here. Nothing else changes — no component edits, no new route. */
export const projects: WorkflowProject[] = [portfoliowebsite];
```

- [ ] **Step 7: Create the page content module**

Create `content/workflow.ts`:

```ts
import type { WorkflowContent } from './types';
import { projects } from './projects';

/** Page chrome only. Project copy lives in content/projects/, one file each. */
export const workflowContent: WorkflowContent = {
  meta: {
    // TODO: replace before launch, alongside the project copy.
    title: 'Workflow — Sagar Deshpande',
    description:
      'How these projects are built: the architecture and the pipeline behind each one.',
  },
  heading: 'Workflow',
  projects,
};
```

- [ ] **Step 8: Run the content tests**

Run: `npx vitest run content/workflow.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 9: Move the image checks into a module that spans both content files**

Create `content/images.test.ts`:

```ts
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
```

- [ ] **Step 10: Delete the assertions that moved, from `content/site.test.ts`**

Remove these from `content/site.test.ts`, and nothing else:

1. The whole `describe('siteContent image files', …)` block at the bottom, and the `publicPathOf` helper below it.
2. The `it('uses portrait photos in both sections', …)` test inside `describe('siteContent', …)` — `content/images.test.ts` now covers portrait orientation and alt text for both photos.
3. The now-unused imports and constants at the top: `existsSync`, `join`, `readImageDimensions`, `ImageRef`, `PUBLIC_DIR`, and `imageRefs`.

Keep everything else — menu ids, https socials, `meta.siteUrl` parsing, hero body, `meta.title` name sync, and the social icon check all stay.

- [ ] **Step 11: Run the whole suite and the typechecker**

Run: `npm test`
Expected: PASS for `content/workflow.test.ts` (6) and every pre-existing file.

`content/images.test.ts` reports **17** cases with today's content — 1 public-dir + 1 collector + 3 `it.each(allRefs)` blocks × 4 refs + 2 portrait + 1 landscape — of which **one fails**: `site.hero.photo` declares 900x1200 against a 1544x1600 file. **That failure is pre-existing and out of scope** (see the Out of scope section). Do not edit `content/site.ts` to silence it and do not weaken the check.

Run: `npx tsc --noEmit` and `npm run lint`
Expected: both clean, no output.

- [ ] **Step 12: Commit**

```bash
git add content/types.ts content/projects content/workflow.ts content/workflow.test.ts content/images.test.ts content/site.test.ts public/images/placeholder-workflow.svg
git commit -m "feat(content): add the workflow content model and project registry"
```

---

### Task 2: WorkflowBody — rendering a block list

**Files:**
- Create: `components/ui/WorkflowBody.tsx`
- Test: `components/ui/WorkflowBody.test.tsx`

**Interfaces:**
- Consumes: `WorkflowBlock` from `content/types.ts`.
- Produces: `WorkflowBody({ blocks, className }: { blocks: WorkflowBlock[]; className?: string })`.

- [ ] **Step 1: Write the failing tests**

Create `components/ui/WorkflowBody.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkflowBody } from './WorkflowBody';

describe('WorkflowBody', () => {
  it('renders a para block as a paragraph', () => {
    const { container } = render(
      <WorkflowBody blocks={[{ kind: 'para', text: 'A summary line.' }]} />,
    );

    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0]).toHaveTextContent('A summary line.');
  });

  it('renders a steps block as one ordered list, one item per step, in order', () => {
    const { container } = render(
      <WorkflowBody blocks={[{ kind: 'steps', items: ['First', 'Second', 'Third'] }]} />,
    );

    const lists = container.querySelectorAll('ol');
    expect(lists).toHaveLength(1);

    const items = Array.from(lists[0].querySelectorAll('li')).map((li) => li.textContent);
    expect(items).toEqual(['First', 'Second', 'Third']);
  });

  it('renders steps as an ordered list, never an unordered one', () => {
    // A workflow's numbering is meaning, not decoration. <ul> would look
    // almost right and be wrong.
    const { container } = render(
      <WorkflowBody blocks={[{ kind: 'steps', items: ['Only step'] }]} />,
    );

    expect(container.querySelector('ol')).not.toBeNull();
    expect(container.querySelector('ul')).toBeNull();
  });

  it('renders a note block with its text', () => {
    render(<WorkflowBody blocks={[{ kind: 'note', text: 'One caveat.' }]} />);
    expect(screen.getByText('One caveat.')).toBeInTheDocument();
  });

  it('renders mixed blocks in the order given', () => {
    const { container } = render(
      <WorkflowBody
        blocks={[
          { kind: 'para', text: 'Intro' },
          { kind: 'steps', items: ['Step'] },
          { kind: 'note', text: 'Caveat' },
        ]}
      />,
    );

    const rendered = container.firstElementChild;
    expect(rendered).not.toBeNull();
    const tags = Array.from(rendered!.children).map((element) => element.tagName);
    expect(tags).toEqual(['P', 'OL', 'ASIDE']);
  });

  it('renders nothing for an empty body, without throwing', () => {
    const { container } = render(<WorkflowBody blocks={[]} />);
    expect(container.firstElementChild?.children).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npx vitest run components/ui/WorkflowBody.test.tsx`
Expected: FAIL — `Failed to resolve import "./WorkflowBody"`.

- [ ] **Step 3: Write the component**

Create `components/ui/WorkflowBody.tsx`:

```tsx
import type { WorkflowBlock } from '@/content/types';

type WorkflowBodyProps = {
  blocks: WorkflowBlock[];
  className?: string;
};

/** Renders a project's body blocks.
 *
 *  Blocks are keyed by index: their order is their identity, the list is static
 *  at build time, and keying on text would collide the moment two paragraphs
 *  matched.
 *
 *  The default branch assigns to `never`, so adding a kind to WorkflowBlock
 *  without writing its renderer fails `tsc` rather than rendering nothing. */
export function WorkflowBody({ blocks, className = '' }: WorkflowBodyProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {blocks.map((block, index) => {
        const key = `${block.kind}-${index}`;

        switch (block.kind) {
          case 'para':
            return (
              <p key={key} className="max-w-prose leading-relaxed">
                {block.text}
              </p>
            );

          case 'steps':
            return (
              <ol
                key={key}
                className="ml-5 max-w-prose list-decimal space-y-2 leading-relaxed marker:text-accent"
              >
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>{item}</li>
                ))}
              </ol>
            );

          case 'note':
            return (
              <aside
                key={key}
                className="max-w-prose border-l-2 border-accent bg-surface py-3 pl-4 text-sm leading-relaxed text-muted"
              >
                {block.text}
              </aside>
            );

          default: {
            const exhaustive: never = block;
            return exhaustive;
          }
        }
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run components/ui/WorkflowBody.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Prove the exhaustiveness guard actually guards**

This is a one-minute check that the `never` branch is real, not decorative.

Temporarily add a fourth member to `WorkflowBlock` in `content/types.ts`:

```ts
  | { kind: 'quote'; text: string };
```

Run: `npx tsc --noEmit`
Expected: FAIL in `components/ui/WorkflowBody.tsx` — `Type '{ kind: "quote"; text: string; }' is not assignable to type 'never'`.

**Then remove the `quote` member again** and re-run `npx tsc --noEmit`, expecting it clean. Do not commit the temporary member.

- [ ] **Step 6: Commit**

```bash
git add components/ui/WorkflowBody.tsx components/ui/WorkflowBody.test.tsx
git commit -m "feat(ui): render workflow blocks as prose, ordered steps, and notes"
```

---

### Task 3: ProjectPanel — one project as one disclosure

**Files:**
- Create: `components/sections/ProjectPanel.tsx`
- Test: `components/sections/ProjectPanel.test.tsx`

**Interfaces:**
- Consumes: `WorkflowProject` from `content/types.ts`; `WorkflowBody` from `components/ui/WorkflowBody.tsx`.
- Produces: `ProjectPanel({ project, isFirst }: { project: WorkflowProject; isFirst?: boolean })`.

- [ ] **Step 1: Write the failing tests**

Create `components/sections/ProjectPanel.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { WorkflowProject } from '@/content/types';
import { ProjectPanel } from './ProjectPanel';

const project: WorkflowProject = {
  slug: 'example-project',
  name: 'Example Project',
  image: {
    src: '/images/placeholder-workflow.svg',
    alt: 'Example workflow diagram',
    width: 1600,
    height: 900,
  },
  body: [{ kind: 'steps', items: ['First step', 'Second step'] }],
};

describe('ProjectPanel', () => {
  it('renders a details element whose id is the project slug', () => {
    // The id is what makes /workflow/#example-project resolve.
    const { container } = render(<ProjectPanel project={project} />);

    const details = container.querySelector('details');
    expect(details).not.toBeNull();
    expect(details).toHaveAttribute('id', 'example-project');
  });

  it('puts the project name in a level-2 heading inside the summary', () => {
    const { container } = render(<ProjectPanel project={project} />);

    const heading = screen.getByRole('heading', { level: 2, name: 'Example Project' });
    expect(heading).toBeInTheDocument();

    const summary = container.querySelector('summary');
    expect(summary).not.toBeNull();
    expect(summary!.contains(heading)).toBe(true);
  });

  it('renders open when it is the first panel', () => {
    const { container } = render(<ProjectPanel project={project} isFirst />);
    expect(container.querySelector('details')).toHaveAttribute('open');
  });

  it('renders closed when it is not the first panel', () => {
    const { container } = render(<ProjectPanel project={project} />);
    expect(container.querySelector('details')).not.toHaveAttribute('open');
  });

  it('renders the diagram with its alt text and declared dimensions', () => {
    render(<ProjectPanel project={project} />);

    const image = screen.getByAltText('Example workflow diagram');
    expect(image).toHaveAttribute('width', '1600');
    expect(image).toHaveAttribute('height', '900');
  });

  it('renders the body through, keeping list semantics', () => {
    const { container } = render(<ProjectPanel project={project} />);

    const list = container.querySelector('ol');
    expect(list).not.toBeNull();
    expect(list!.querySelectorAll('li')).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npx vitest run components/sections/ProjectPanel.test.tsx`
Expected: FAIL — `Failed to resolve import "./ProjectPanel"`.

- [ ] **Step 3: Write the component**

Create `components/sections/ProjectPanel.tsx`:

```tsx
import Image from 'next/image';
import type { WorkflowProject } from '@/content/types';
import { WorkflowBody } from '@/components/ui/WorkflowBody';

type ProjectPanelProps = {
  project: WorkflowProject;
  /** The first panel renders open, so the page never loads looking empty. */
  isFirst?: boolean;
};

/** One project, as one native disclosure.
 *
 *  <details> is deliberate: the browser owns the open state, so this needs no
 *  JavaScript, keeps Header as the site's only client component, and gets
 *  keyboard operation, disclosure semantics, and find-in-page expansion for
 *  free. The <h2> sits inside <summary> so the heading outline survives while
 *  the summary stays the control. */
export function ProjectPanel({ project, isFirst = false }: ProjectPanelProps) {
  return (
    <details
      id={project.slug}
      open={isFirst}
      className="group scroll-mt-24 border-b border-line py-8"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-6 [&::-webkit-details-marker]:hidden">
        <h2 className="font-display text-2xl tracking-tight md:text-3xl">{project.name}</h2>

        {/* Decorative: the summary already announces its own state. */}
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
          className="h-5 w-5 shrink-0 stroke-current text-muted transition-transform group-open:rotate-180"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>

      {/* Diagram takes the wider column — the inverse of Home's split, which
          is sized for a portrait photo. */}
      <div className="mt-8 grid items-start gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Image
          src={project.image.src}
          alt={project.image.alt}
          width={project.image.width}
          height={project.image.height}
          priority={isFirst}
          sizes="(min-width: 768px) 55vw, 100vw"
          className="mx-auto w-full rounded-sm border border-line md:mx-0"
        />

        <WorkflowBody blocks={project.body} />
      </div>
    </details>
  );
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run components/sections/ProjectPanel.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add components/sections/ProjectPanel.tsx components/sections/ProjectPanel.test.tsx
git commit -m "feat(sections): add the collapsible project panel"
```

---

### Task 4: The /workflow/ route

**Files:**
- Create: `app/workflow/page.tsx`
- Test: `app/workflow/page.test.tsx`

**Interfaces:**
- Consumes: `workflowContent` from `content/workflow.ts`; `ProjectPanel`; `Header`, `Footer`, `Section`.
- Produces: the `/workflow/` route, emitting `out/workflow/index.html`.

> **Expected transient state.** After this task the site has two pages, but the header menu still points at `#hero` and `#comments` — anchors that do not exist on `/workflow/`. That is resolved in Task 5. Do not "fix" the nav here; it is a separate reviewable unit.

- [ ] **Step 1: Write the failing tests**

Create `app/workflow/page.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { workflowContent } from '@/content/workflow';
import Workflow from './page';

/** This page renders <Header />, which still calls useScrollSpy until Task 5
 *  retires it, and jsdom has no IntersectionObserver. Task 5 deletes this stub
 *  from here and from app/page.test.tsx in the same step as the hook. */
class NoopIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

describe('Workflow page', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', NoopIntersectionObserver);
  });

  it('renders the workflow heading as the page h1', () => {
    render(<Workflow />);
    expect(
      screen.getByRole('heading', { level: 1, name: workflowContent.heading }),
    ).toBeInTheDocument();
  });

  it('renders exactly one h1', () => {
    render(<Workflow />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders one panel per registry entry', () => {
    const { container } = render(<Workflow />);
    expect(container.querySelectorAll('details')).toHaveLength(
      workflowContent.projects.length,
    );
  });

  it('opens the first panel and leaves the rest closed', () => {
    const { container } = render(<Workflow />);
    const panels = Array.from(container.querySelectorAll('details'));

    expect(panels[0]).toHaveAttribute('open');
    for (const panel of panels.slice(1)) {
      expect(panel).not.toHaveAttribute('open');
    }
  });

  it('exposes every project slug as an element id', () => {
    // The anchor guard: /workflow/#slug must land somewhere.
    const { container } = render(<Workflow />);

    for (const project of workflowContent.projects) {
      expect(
        container.querySelector(`#${project.slug}`),
        `project "${project.name}" has slug "${project.slug}", which nothing on the page carries`,
      ).not.toBeNull();
    }
  });

  it('renders the page landmarks', () => {
    render(<Workflow />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npx vitest run app/workflow/page.test.tsx`
Expected: FAIL — `Failed to resolve import "./page"`.

- [ ] **Step 3: Write the page**

Create `app/workflow/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProjectPanel } from '@/components/sections/ProjectPanel';
import { Section } from '@/components/ui/Section';
import { workflowContent } from '@/content/workflow';

/** metadataBase in app/layout.tsx resolves the relative openGraph url. */
export const metadata: Metadata = {
  title: workflowContent.meta.title,
  description: workflowContent.meta.description,
  openGraph: {
    type: 'website',
    title: workflowContent.meta.title,
    description: workflowContent.meta.description,
    url: '/workflow/',
  },
  twitter: {
    card: 'summary_large_image',
    title: workflowContent.meta.title,
    description: workflowContent.meta.description,
  },
};

export default function Workflow() {
  return (
    <>
      <Header />
      <main>
        <Section id="workflow" className="py-20 md:py-24">
          <h1 className="font-display text-4xl leading-tight tracking-tight md:text-5xl">
            {workflowContent.heading}
          </h1>

          <div className="mt-12">
            {workflowContent.projects.map((project, index) => (
              <ProjectPanel key={project.slug} project={project} isFirst={index === 0} />
            ))}
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run app/workflow/page.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Confirm the route actually exports**

Run: `npm run build`
Expected: build succeeds, and the route list includes `/workflow`.

Run: `ls out/workflow/index.html`
Expected: the file exists.

- [ ] **Step 6: Commit**

```bash
git add app/workflow
git commit -m "feat(app): add the workflow route"
```

---

### Task 5: Route-aware navigation

This is the task that flips the nav from anchors to routes. It is one unit because the `MenuItem` type change breaks `Menu`, `Header`, `Logo`, and three test files simultaneously — splitting it would leave the build red between tasks.

**Files:**
- Create: `lib/activePath.ts`
- Test: `lib/activePath.test.ts`
- Delete: `lib/useScrollSpy.ts`, `lib/useScrollSpy.test.tsx`
- Modify: `content/types.ts` (`MenuItem`)
- Modify: `content/site.ts` (`menu`)
- Modify: `content/site.test.ts` (menu invariants + route guard)
- Modify: `components/layout/Menu.tsx`
- Test: `components/layout/Menu.test.tsx` (new)
- Modify: `components/layout/Header.tsx`, `components/layout/Header.test.tsx`
- Modify: `components/layout/Logo.tsx`
- Modify: `app/sitemap.ts`
- Modify: `app/page.test.tsx`

**Interfaces:**
- Consumes: `usePathname` from `next/navigation`; `Link` from `next/link`.
- Produces: `MenuItem = { href: string; label: string }`; `normalizePath(path: string | null | undefined): string | null`; `isActivePath(pathname: string | null | undefined, href: string): boolean`; `Menu({ activePath, onNavigate, className })`.

- [ ] **Step 1: Write the failing path-matching tests**

Create `lib/activePath.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isActivePath, normalizePath } from './activePath';

describe('normalizePath', () => {
  it('strips a trailing slash', () => {
    expect(normalizePath('/workflow/')).toBe('/workflow');
  });

  it('leaves the root as a single slash', () => {
    expect(normalizePath('/')).toBe('/');
  });

  it('returns null for a missing pathname', () => {
    // usePathname() returns null before the router is ready, and in jsdom.
    expect(normalizePath(null)).toBeNull();
    expect(normalizePath(undefined)).toBeNull();
    expect(normalizePath('')).toBeNull();
  });
});

describe('isActivePath', () => {
  it('matches regardless of trailing slashes on either side', () => {
    // next.config.ts sets trailingSlash: true, but usePathname and next/link
    // do not agree about the slash in every environment.
    expect(isActivePath('/workflow/', '/workflow/')).toBe(true);
    expect(isActivePath('/workflow', '/workflow/')).toBe(true);
    expect(isActivePath('/workflow/', '/workflow')).toBe(true);
    expect(isActivePath('/', '/')).toBe(true);
  });

  it('does not match a different route', () => {
    expect(isActivePath('/', '/workflow/')).toBe(false);
    expect(isActivePath('/workflow/', '/')).toBe(false);
  });

  it('does not treat a prefix as a match', () => {
    expect(isActivePath('/workflow-archive/', '/workflow/')).toBe(false);
  });

  it('matches nothing when the pathname is unknown', () => {
    expect(isActivePath(null, '/')).toBe(false);
    expect(isActivePath(null, '/workflow/')).toBe(false);
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npx vitest run lib/activePath.test.ts`
Expected: FAIL — `Failed to resolve import "./activePath"`.

- [ ] **Step 3: Write the helper**

Create `lib/activePath.ts`:

```ts
/** Trailing-slash-tolerant comparison between a live pathname and a menu href.
 *
 *  The slash is not stable across environments. next.config.ts sets
 *  `trailingSlash: true`, so the exported site serves /workflow/ — but
 *  `usePathname()` may report /workflow, and `next/link` renders the href
 *  without the slash anywhere that config is not loaded (Vitest, for one).
 *  Normalising both sides makes the comparison true everywhere. */
export function normalizePath(path: string | null | undefined): string | null {
  if (!path) return null;

  const trimmed = path.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

/** Whether `href` is the page currently being viewed.
 *
 *  An unknown pathname — what `usePathname()` returns before the router is
 *  ready, and in jsdom — matches nothing, so no item is marked current. */
export function isActivePath(
  pathname: string | null | undefined,
  href: string,
): boolean {
  const current = normalizePath(pathname);
  return current !== null && current === normalizePath(href);
}
```

- [ ] **Step 4: Run the helper tests**

Run: `npx vitest run lib/activePath.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Change the menu type and content**

In `content/types.ts`, replace the `MenuItem` type:

```ts
/** `href` must be a root-relative path with a trailing slash, matching
 *  next.config.ts's `trailingSlash: true`, and must resolve to a page that
 *  exists. content/site.test.ts enforces both. */
export type MenuItem = {
  href: string;
  label: string;
};
```

In `content/site.ts`, replace the `menu` array:

```ts
  menu: [
    { href: '/', label: 'Home' },
    { href: '/workflow/', label: 'Workflow' },
  ],
```

Also update the `TODO: replace before launch` header in `content/site.ts` — item 2 currently says `hero.body — the brief, 2-3 short paragraphs`; leave it. No TODO item mentions the menu, so nothing there needs editing.

- [ ] **Step 6: Replace the menu invariants in `content/site.test.ts`**

Add these imports at the top of `content/site.test.ts`:

```ts
import { existsSync } from 'node:fs';
import { join } from 'node:path';
```

Delete the existing `it('gives every menu entry a non-empty id and label', …)` and `it('has unique menu ids', …)` tests, and add in their place:

```ts
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
```

- [ ] **Step 7: Write the failing Menu tests**

Create `components/layout/Menu.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { siteContent } from '@/content/site';
import { Menu } from './Menu';

/** next/link strips the trailing slash under Vitest, because next.config.ts
 *  (trailingSlash: true) is not loaded there. The exported build keeps it.
 *  Comparing on the slash-less form makes the assertion true in both. */
function withoutTrailingSlash(path: string): string {
  return path === '/' ? path : path.replace(/\/+$/, '');
}

describe('Menu', () => {
  it('renders exactly one link per menu entry, pointing at its route', () => {
    render(<Menu activePath="/" />);

    for (const item of siteContent.menu) {
      const link = screen.getByRole('link', { name: item.label });
      expect(link).toHaveAttribute('href', withoutTrailingSlash(item.href));
    }

    expect(screen.getAllByRole('link')).toHaveLength(siteContent.menu.length);
  });

  it('marks the entry matching the active path as the current page', () => {
    render(<Menu activePath="/workflow/" />);

    const workflow = screen.getByRole('link', { name: 'Workflow' });
    expect(workflow).toHaveAttribute('aria-current', 'page');
  });

  it('marks no other entry as current', () => {
    // Separate from the test above on purpose: "marks the right one" and
    // "marks only one" fail independently.
    render(<Menu activePath="/workflow/" />);

    const current = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page');

    expect(current).toHaveLength(1);
  });

  it('marks nothing current when the path is unknown', () => {
    // usePathname() returns null before the router is ready.
    render(<Menu activePath={null} />);

    const current = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page');

    expect(current).toHaveLength(0);
  });

  it('calls onNavigate when a link is followed', async () => {
    // This is what closes the mobile menu.
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<Menu activePath="/" onNavigate={onNavigate} />);

    await user.click(screen.getByRole('link', { name: 'Workflow' }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 8: Run them to confirm they fail**

Run: `npx vitest run components/layout/Menu.test.tsx`
Expected: FAIL — `Menu` still takes `activeId` and renders `#`-anchors, so the href and `aria-current` assertions fail.

- [ ] **Step 9: Rewrite Menu**

Replace `components/layout/Menu.tsx` entirely:

```tsx
import Link from 'next/link';
import { siteContent } from '@/content/site';
import { isActivePath } from '@/lib/activePath';

type MenuProps = {
  /** The current pathname, or null when it is not known yet. */
  activePath: string | null;
  onNavigate?: () => void;
  className?: string;
};

export function Menu({ activePath, onNavigate, className = '' }: MenuProps) {
  return (
    <ul className={className}>
      {siteContent.menu.map((item) => {
        const isActive = isActivePath(activePath, item.href);

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              // "page" is the correct token for a page link; "true" was right
              // for the section anchors this replaced.
              aria-current={isActive ? 'page' : undefined}
              className={`text-sm tracking-wide transition-colors hover:text-text ${
                isActive ? 'text-accent' : 'text-muted'
              }`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 10: Run the Menu tests**

Run: `npx vitest run components/layout/Menu.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 11: Rewrite Header**

Replace the top of `components/layout/Header.tsx` — the imports, the module-scope constant, and the hook call:

```tsx
'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import { Menu } from './Menu';
import { Socials } from './Socials';

export function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
```

Delete the `import { siteContent } from '@/content/site';`, the `import { useScrollSpy } from '@/lib/useScrollSpy';`, the `SECTION_IDS` constant and its comment, and the `const activeId = useScrollSpy(SECTION_IDS);` line.

Then make these four edits in the JSX:

1. `aria-label="Section navigation"` → `aria-label="Primary navigation"`
2. `<Menu activeId={activeId} className="flex items-center gap-8" />` → `<Menu activePath={pathname} className="flex items-center gap-8" />`
3. `aria-label="Mobile section navigation"` → `aria-label="Mobile navigation"`
4. In the mobile `<Menu>`, `activeId={activeId}` → `activePath={pathname}`

Everything else — the sticky wrapper, the toggle button, the chevron SVG, `Socials` — stays exactly as it is.

- [ ] **Step 12: Point the logo at the home route**

Replace `components/layout/Logo.tsx`:

```tsx
import Image from 'next/image';
import Link from 'next/link';
import { siteContent } from '@/content/site';

export function Logo() {
  const { logo, name } = siteContent.identity;

  return (
    <Link href="/" className="flex items-center gap-3">
      <Image
        src={logo.src}
        alt={logo.alt}
        width={logo.width}
        height={logo.height}
        priority
        className="h-9 w-9"
      />
      <span className="font-display text-lg tracking-tight">{name}</span>
    </Link>
  );
}
```

- [ ] **Step 13: Rewrite the Header tests**

Replace `components/layout/Header.test.tsx` entirely:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { siteContent } from '@/content/site';
import { Header } from './Header';

/** usePathname() returns null in jsdom when unmocked, so every test that cares
 *  about active state has to drive it. vi.hoisted runs before vi.mock, which
 *  is itself hoisted above the imports. */
const pathnameRef = vi.hoisted(() => ({ current: '/' as string | null }));

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameRef.current,
}));

describe('Header', () => {
  it('renders exactly one link per menu entry in the primary nav', () => {
    pathnameRef.current = '/';
    render(<Header />);

    const nav = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(within(nav).getAllByRole('link')).toHaveLength(siteContent.menu.length);

    for (const item of siteContent.menu) {
      expect(within(nav).getByRole('link', { name: item.label })).toBeInTheDocument();
    }
  });

  it('marks Home as the current page at the site root', () => {
    pathnameRef.current = '/';
    render(<Header />);

    const nav = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(within(nav).getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Workflow' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('marks Workflow as the current page on the workflow route', () => {
    pathnameRef.current = '/workflow/';
    render(<Header />);

    const nav = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(within(nav).getByRole('link', { name: 'Workflow' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('marks Workflow current even without the trailing slash', () => {
    // The export serves /workflow/, but the pathname can arrive either way.
    pathnameRef.current = '/workflow';
    render(<Header />);

    const nav = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(within(nav).getByRole('link', { name: 'Workflow' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('opens social links safely in a new tab', () => {
    pathnameRef.current = '/';
    render(<Header />);

    const nav = screen.getByRole('navigation', { name: 'Social links' });
    for (const social of siteContent.socials) {
      const link = within(nav).getByRole('link', { name: social.label });
      expect(link).toHaveAttribute('href', social.href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('renders the logo with its alt text', () => {
    pathnameRef.current = '/';
    render(<Header />);
    expect(screen.getByAltText(siteContent.identity.logo.alt)).toBeInTheDocument();
  });

  it('toggles the mobile menu open and closed', async () => {
    pathnameRef.current = '/';
    const user = userEvent.setup();
    render(<Header />);

    const toggle = screen.getByRole('button', { name: 'Open menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('closes the mobile menu after a link inside it is followed', async () => {
    pathnameRef.current = '/';
    const user = userEvent.setup();
    render(<Header />);

    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    const mobileNav = screen.getByRole('navigation', { name: 'Mobile navigation' });
    await user.click(within(mobileNav).getByRole('link', { name: 'Workflow' }));

    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
```

- [ ] **Step 14: Drop the dead-anchor guard from the Home page test**

`useScrollSpy` is gone, so the `IntersectionObserver` stub is dead weight in **two** files.

In `app/workflow/page.test.tsx`, delete the `NoopIntersectionObserver` class, its explanatory comment, the `beforeEach` that stubs it, and the now-unused `beforeEach` and `vi` imports. Every test in that file stays.

In `app/page.test.tsx`, delete the `NoopIntersectionObserver` class, the `beforeEach` that stubs it, the `it('renders a section for every menu entry', …)` test, and the now-unused `beforeEach`, `vi`, and `siteContent` imports.

The file becomes:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from './page';

describe('Home page', () => {
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

- [ ] **Step 15: Derive the sitemap from the menu**

Replace `app/sitemap.ts`:

```ts
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
```

- [ ] **Step 16: Delete the scroll-spy hook**

```bash
git rm lib/useScrollSpy.ts lib/useScrollSpy.test.tsx
```

Nothing imports it once the nav tracks routes. It stays recoverable from git if in-page sub-navigation ever returns.

- [ ] **Step 17: Run the full gate**

Run: `npm run lint`
Expected: clean. If it reports `siteContent` or `vi` as unused anywhere, a deletion in Steps 11 or 14 was incomplete.

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npm test`
Expected: PASS, everything. No file references `activeId`, `menu[].id`, or `useScrollSpy` any more.

Run: `npm run build`
Expected: succeeds. Then confirm the sitemap carries both routes:

```bash
cat out/sitemap.xml
```
Expected: two `<url>` entries, one ending in the origin and one ending `/workflow/`.

- [ ] **Step 18: Commit**

Stage explicit paths. **Never `git add -A` in this repo** — the owner has
uncommitted work in the tree (`content/site.ts` edits, an untracked photo) that
must not be swept into an implementation commit.

```bash
git add lib/activePath.ts lib/activePath.test.ts         content/types.ts content/site.ts content/site.test.ts         components/layout/Menu.tsx components/layout/Menu.test.tsx         components/layout/Header.tsx components/layout/Header.test.tsx         components/layout/Logo.tsx         app/sitemap.ts app/page.test.tsx app/workflow/page.test.tsx
git commit -m "feat(nav): navigate between Home and Workflow as real routes"
```

The `git rm` in Step 16 already staged the two deleted `useScrollSpy` files.

> `content/site.ts` carries the owner's in-progress placeholder edits. The menu
> lives in that file, so those edits land in this commit. That is expected and
> was surfaced before execution — do not try to split them out.

---

### Task 6: End-to-end coverage and the docs that describe the old shape

**Files:**
- Modify: `e2e/site.spec.ts`
- Modify: `app/not-found.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: the exported `out/` bundle, served by `npx serve out -l 4173` (already configured in `playwright.config.ts`).

- [ ] **Step 1: Fix the 404 copy, which is now false**

`app/not-found.tsx` currently reads "The link may be out of date. Everything lives on one page." There are two pages now. Replace that one paragraph:

```tsx
        <p className="mt-4 text-muted">
          The link may be out of date.
        </p>
```

Leave the rest of the file — the `404` label, the `<h1>`, and the `Link` back to `/` — untouched. The E2E test asserts the `<h1>` still contains `does not exist`.

- [ ] **Step 2: Replace the navigation specs**

In `e2e/site.spec.ts`, replace the two `test.describe` blocks at the bottom — `desktop navigation` and `mobile navigation` — with the following. Leave the first `test.describe` (`portfolio site, served from the static export`) exactly as it is:

```ts
test.describe('the workflow page', () => {
  test('loads with no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/workflow/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('opens the first panel and collapses it on click', async ({ page }) => {
    // The disclosure is native <details>: this proves it works in the exported
    // bundle with none of our JavaScript.
    await page.goto('/workflow/');

    const panel = page.locator('details').first();
    await expect(panel).toHaveAttribute('open', '');

    await panel.locator('summary').click();
    await expect(panel).not.toHaveAttribute('open', '');
  });
});

test.describe('desktop navigation', () => {
  test.skip(({ isMobile }) => !!isMobile, 'desktop menu is hidden on mobile');

  test('navigates between the two pages and marks the current one', async ({ page }) => {
    await page.goto('/');

    const nav = page.getByRole('navigation', { name: 'Primary navigation' });
    await expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await nav.getByRole('link', { name: 'Workflow' }).click();

    await expect(page).toHaveURL(/\/workflow\/?$/);
    await expect(page.locator('#workflow')).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Workflow' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await nav.getByRole('link', { name: 'Home' }).click();

    await expect(page.locator('#hero')).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});

test.describe('mobile navigation', () => {
  test.skip(({ isMobile }) => !isMobile, 'toggle only exists on mobile');

  test('opens the menu, navigates to Workflow, and closes', async ({ page }) => {
    await page.goto('/');

    const toggle = page.getByRole('button', { name: 'Open menu' });
    await expect(toggle).toBeVisible();
    await toggle.click();

    const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' });
    await expect(mobileNav).toBeVisible();

    await mobileNav.getByRole('link', { name: 'Workflow' }).click();

    await expect(page).toHaveURL(/\/workflow\/?$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(mobileNav).toHaveCount(0);
  });
});
```

- [ ] **Step 3: Run the E2E suite against a fresh export**

Run: `npm run test:e2e`
Expected: PASS. This rebuilds `out/` first, then runs both Playwright projects.

- [ ] **Step 4: Update the README**

Two edits in `README.md`.

First, replace the opening description (currently "Static Next.js site: one page, a hero section (portrait photo + brief) and a comments placeholder, linked by an anchor menu."):

```markdown
Static Next.js site with two pages: **Home** (hero + comments placeholder) and
**Workflow** (collapsible project panels). Builds to a plain `out/` directory
for S3 + CloudFront hosting.

Design specs: `../docs/superpowers/specs/2026-09-10-portfolio-frontend-v1-design.md`
and `../docs/superpowers/specs/2026-09-11-workflow-page-design.md`
```

Second, in the **Where the copy lives** section, replace item 1 and the item-2 list of hardcoded names:

```markdown
1. **Owner copy** lives in `content/`:
   - `content/site.ts` — identity, site metadata, menu, socials, hero, comments
   - `content/workflow.ts` — the Workflow page's title and heading
   - `content/projects/*.ts` — one file per project; `content/projects/index.ts`
     is the registry that orders them
2. **Fixed UI chrome** is hardcoded in its component, because it never varies
   with the owner's identity: the `Coming soon` label and the empty-state copy
   in `components/sections/CommentsPlaceholder.tsx`, the entire 404 page in
   `app/not-found.tsx`, and the accessible names `Primary navigation`,
   `Social links`, `Open menu` / `Close menu`, and `Mobile navigation` in
   `components/layout/Header.tsx`.
```

Then add this subsection immediately after the **Replacing the placeholder content** numbered list:

```markdown
### Adding a project to the Workflow page

1. Create `content/projects/<name>.ts` exporting a `WorkflowProject`. Copy
   `portfoliowebsite.ts` as the template.
2. Import it in `content/projects/index.ts` and append it to `projects`.
3. Drop the diagram or gif into `public/images/`. **It must be landscape**, and
   the declared `width`/`height` must match the file — `content/images.test.ts`
   reads the real header and fails if they disagree. GIFs need no config;
   `images.unoptimized` is already set, so the file is served byte-for-byte.
4. Body blocks are `{ kind: 'para' | 'steps' | 'note' }`. Adding a new kind
   means adding its renderer in `components/ui/WorkflowBody.tsx` — the
   exhaustiveness check fails `tsc` until you do.

No component or route changes are needed. The panel, its anchor
(`/workflow/#<slug>`), and its place on the page all follow from the registry.
```

- [ ] **Step 5: Run the complete verification gate**

```
npm run lint
npx tsc --noEmit
npm test
npm run build
npx playwright test
```

Expected: all five clean. Then confirm the export shape by hand:

```bash
ls out/index.html out/workflow/index.html out/404.html out/sitemap.xml
```

- [ ] **Step 6: Commit**

```bash
git add e2e/site.spec.ts app/not-found.tsx README.md
git commit -m "test(e2e): cover page navigation and the native disclosure"
```

---

## Self-Review

**1. Spec coverage.** Every section of the spec maps to a task:

| Spec section | Task |
|---|---|
| Routing table | 4 (route), 5 (menu hrefs) |
| Navigation, `aria-current="page"`, `usePathname` | 5 |
| `useScrollSpy` deletion | 5, Step 16 |
| Accessible-name renames | 5, Step 11 (asserted in 5 and 6) |
| Sitemap derived from menu | 5, Step 15 |
| Content model and block union | 1 |
| Content files and registry | 1 |
| `WorkflowBody`, `never` check | 2 (guard proven in Step 5) |
| `ProjectPanel`, `<details>`, h2-in-summary | 3 |
| `app/workflow/page.tsx`, metadata | 4 |
| Layout, flipped grid ratio, first panel open | 3, 4 |
| Placeholder discipline, 1600×900 | 1 |
| Error-handling table | 1 (slugs, images), 2 (`never`), 5 (hrefs, routes) |
| Accessibility | 3 (disclosure, `<ol>`, aria-hidden chevron), 5 (`aria-current`), 4 (one `h1`) |
| SEO | 4 (metadata), 5 (sitemap) |
| Unit test list | 1, 2, 3, 4, 5 |
| E2E list | 6 |
| Verification gate | every task; all five in 6 |

**Test count:** the spec budgeted 41 new-or-changed unit tests. This plan writes 40 test blocks across 9 files, which expand to **65 cases** because `content/images.test.ts` uses `it.each` over the collected refs (17 cases from 7 blocks). The one addition beyond the spec's list is `lib/activePath.test.ts` (7 cases), which the spec folded into the Header and Menu tests. Splitting it out is better: the trailing-slash normalisation is the subtlest logic in this change, and it deserves direct tests rather than being exercised only through two components.

**2. Placeholder scan.** No `TBD`, no "add error handling", no "similar to Task N". The only `TODO` strings are the deliberate `TODO: replace before launch` markers in shipped content files, which the spec requires. Every code step carries complete, runnable code.

**3. Type consistency.** `WorkflowBlock`, `WorkflowProject`, `WorkflowContent` are defined in Task 1 Step 1 and used unchanged in Tasks 2, 3, and 4. `projects` (Task 1) is consumed by `content/workflow.ts` (Task 1) and read via `workflowContent.projects` in Task 4. `ProjectPanel`'s `{ project, isFirst }` (Task 3) matches its call site (Task 4). `isActivePath` / `normalizePath` (Task 5 Step 3) match their use in `Menu` (Step 9) and their tests (Step 1). `Menu`'s prop is `activePath` in the component, its tests, and both `Header` call sites.

**One ordering note for the executor:** Task 4 leaves the header pointing at `#hero` and `#comments` from `/workflow/`, where neither exists. That is called out in Task 4's preamble and fixed in Task 5. A reviewer seeing it between those tasks should not treat it as a defect.

## Out of scope

`content/site.ts` carries in-progress placeholder edits, and `hero.photo` declares `900x1200` against a `1544x1600` file, so `content/images.test.ts` will report that as a failure from Task 1 onward. **That failure is pre-existing and is the owner's to settle** — by cropping the photo to 3:4 or by correcting the declared numbers. Do not "fix" it by editing `content/site.ts` inside these tasks, and do not weaken the check to make it pass.
