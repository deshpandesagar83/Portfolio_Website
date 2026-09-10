# Portfolio Frontend V1 — Design

**Date:** 2026-09-10
**Status:** Approved for implementation planning
**Scope:** Local Next.js frontend only. No AWS, no backend.

## Context

`plan/Workflow.drawio` holds three pages: **Overall** (splash → portfolio wireframe),
**V1** (full AWS architecture, active and inactive variants), and **Inactive** (the
static-only variant). This spec builds the **Inactive** page and nothing else.

"Inactive" means the site is a pure static bundle: Route 53 → CloudFront → S3, with no
API Gateway, no Lambda, and no database. Comments therefore have no backend and are a
placeholder in this version.

The AWS side — Terraform, S3, CloudFront, Route 53, CI/CD — is the owner's work and is
out of scope here. This spec produces a `frontend/` app whose `next build` emits a static
`out/` directory ready to be uploaded.

`planning/archieve/PLAN_V3.md` describes a much larger "glass box" site (Postgres,
text-to-SQL, telemetry panel). It is archived and superseded for now by the scaled-back
Inactive target. It is not dropped, only deferred.

### Decisions taken in the design interview

| Question | Decision |
|---|---|
| Page 1 / Page 2 structure | One route, two anchor-linked scroll sections |
| Splash page | Not in scope |
| Comments block | Styled "coming soon" placeholder; no form, no mock data |
| Content available | None yet — placeholders, isolated in one file |
| Styling | Tailwind CSS |
| Testing | Vitest + React Testing Library unit tests, plus Playwright E2E |

## Goals

1. A working, locally runnable portfolio page matching the Inactive wireframe.
2. `next build` produces a clean static `out/` directory, verified locally.
3. Placeholder content confined to a single file so real content drops in without
   touching components.
4. Accessible and keyboard-navigable, with an SEO baseline in place from the start.

## Non-goals

Terraform or any infrastructure code; S3/CloudFront/Route 53 configuration; GitHub Actions;
any `backend/` code; live comments; the AI chat; the splash page; a CMS or MDX pipeline;
animation libraries; state management libraries; component libraries.

## Architecture

### Static export, from the first commit

`next.config.ts` sets `output: 'export'` and `images.unoptimized: true` before any feature
work. Configuring the export target up front means an incompatible construct — a server
action, a route handler, a dynamic server-rendered route — fails at `next build` on day one
rather than at deploy time. `images.unoptimized` is required because S3 + CloudFront has no
Next.js image optimizer behind it.

Consequences accepted: no server-side data fetching, no route handlers, no ISR, no Next
image optimization. None are needed for a static two-section page.

### Stack

- Next.js, App Router, TypeScript, React
- Tailwind CSS (v4 line — CSS-first configuration via `@theme` in `globals.css`)
- ESLint (Next.js config)
- Vitest + React Testing Library
- Playwright

Local toolchain confirmed present: Node 24.14.1, npm 11.11.0.

### Repository layout

The app is built in the existing empty `frontend/` directory. `backend/` is untouched.

```
frontend/
  app/
    layout.tsx           root layout, fonts, metadata, JSON-LD
    page.tsx             the single route — composes the sections
    not-found.tsx        emits 404.html in the export
    globals.css          Tailwind import + @theme design tokens
  components/
    layout/
      Header.tsx         'use client' — sticky header, scroll-spy, mobile toggle
      Logo.tsx
      Menu.tsx
      Socials.tsx
      Footer.tsx
    sections/
      Brief.tsx
      CommentsPlaceholder.tsx
    ui/
      Section.tsx        shared section wrapper (id, scroll-margin, spacing)
      SocialIcon.tsx
  content/
    site.ts              typed content object — ALL placeholder copy lives here
    types.ts             content types
  lib/
    useScrollSpy.ts      active-menu-item tracking
  public/
    images/              placeholder portrait, logo, favicon
    robots.txt
  e2e/                   Playwright specs
  next.config.ts
```

`components/layout` and `components/sections` map onto the two bands of the wireframe: the
Logo/Menu/Socials strip, and the Page 1 / Page 2 content blocks.

### Composition, not indirection

`app/page.tsx` renders the sections explicitly:

```tsx
<Header />
<main>
  <Brief />
  <CommentsPlaceholder />
</main>
<Footer />
```

A data-driven section registry was considered and rejected: with two sections the
indirection costs more to read than it saves, and each section still needs its own
component regardless.

An MDX content pipeline was considered and rejected: a parser, plugin chain, and prose
styling layer bought for a single paragraph. Revisit when long-form writing returns to
scope.

## Layout

Following the Inactive wireframe:

| Band | Composition | Mobile (`< md`) |
|---|---|---|
| Header (sticky) | Logo left · Menu center · Socials right | Logo + hamburger toggle |
| Section `#brief` | Photo left · Brief right | Stacked vertically |
| Section `#comments` | Photo left · Comments placeholder right | Stacked vertically |
| Footer | Name, year, quiet repo link | Same |

Mobile-first; the two-column arrangement engages at the `md` breakpoint.

There is no separate hero or splash band. The `#brief` section is the top of the page and
carries the page's single `<h1>` — `identity.name` with `identity.tagline` beneath it,
above the brief copy.

## Content model

One exported object in `content/site.ts`, typed by `content/types.ts`:

```ts
type ImageRef = { src: string; alt: string; width: number; height: number };

type SiteContent = {
  identity: { name: string; tagline: string; logo: ImageRef };
  meta:     { title: string; description: string };
  menu:     { id: string; label: string }[];
  socials:  { platform: string; label: string; href: string }[];
  brief:    { heading: string; photo: ImageRef; body: string[] };
  comments: { heading: string; photo: ImageRef; message: string };
};
```

`menu[].id` must equal the `id` of a section actually rendered on the page. This is the
single source of truth for navigation, and it is asserted by a unit test so a dead anchor
fails the build rather than shipping silently.

`meta` drives Next.js metadata, OG/Twitter tags, and the JSON-LD block — page metadata is
not duplicated in `layout.tsx`.

### Placeholder discipline

No real content exists yet. Every placeholder value lives in `content/site.ts` beneath a
`// TODO: replace before launch` header that lists exactly what is required: name, tagline,
brief copy, portrait image, logo, and social URLs.

Placeholder images are neutral gray SVGs named `placeholder-portrait.svg` and
`placeholder-logo.svg` — greppable by name, and visibly unfinished so nothing accidental
ships. Replacing content means editing one file and dropping files into `public/images/`;
no component changes.

## Data flow

There is none, by design. `content/site.ts` is a static import; sections are server
components rendered to HTML at build time.

The **only** client component is `Header` (`'use client'`), which needs `IntersectionObserver`
for the active-menu-item highlight and local state for the mobile menu toggle. Holding that
boundary tight keeps shipped JavaScript small and leaves the page fully readable with
JavaScript disabled.

### Navigation

Menu items are plain `<a href="#brief">` anchors — real links, not scroll handlers. Smooth
scrolling comes from CSS `scroll-behavior`, disabled under `prefers-reduced-motion`. Each
section carries `scroll-margin-top` so its heading is not hidden behind the sticky header.
`useScrollSpy` sets `aria-current="true"` on the link whose section is in view.

### Comments placeholder

A bordered empty-state card: heading, and one honest line stating that comments arrive in a
later version backed by an API. No form controls, no fake interactivity. It is sized and
styled as though populated so the two-column layout is already proven against realistic
height.

## Error handling

A static site has few failure modes, and all of them are handled explicitly:

| Failure | Handling |
|---|---|
| Missing or malformed content field | TypeScript build failure |
| Menu entry pointing at a nonexistent section | Unit test failure |
| JavaScript disabled or failed | Page renders and reads fully; anchors work. Only the active-link highlight and mobile toggle degrade |
| Missing image asset | Explicit `width`/`height` and alt text on every image, so a broken asset leaves a labelled gap rather than a collapsed layout |
| Unknown URL | `app/not-found.tsx` emits `404.html` for CloudFront to point at |
| External link tab-nabbing | `target="_blank"` always paired with `rel="noopener noreferrer"` |

## Visual direction

Design tokens — color, type scale, spacing rhythm — are defined once in `globals.css` via
Tailwind's `@theme`, so the look is a small set of deliberate decisions rather than scattered
utility guesses. Dark-first, matching the register of the source diagrams, with an
intentional type pairing.

Specific typography, palette, and spacing values are settled during implementation with a
real design pass. The explicit target to avoid is the default-template appearance that reads
as untouched `create-next-app` output.

## Accessibility

Non-negotiable, and verified rather than assumed:

- Semantic landmarks: `header`, `nav`, `main`, `footer`
- Exactly one `<h1>` on the page
- Visible focus rings on every interactive element
- Complete keyboard path through menu, mobile toggle, and social links
- Alt text on both photos and the logo
- Color contrast checked against the defined tokens
- `prefers-reduced-motion` honored for scroll behavior and any transition

## SEO baseline

Per-page metadata sourced from `content.meta`; OG and Twitter tags; `schema.org/Person`
JSON-LD; `robots.txt`; `sitemap.xml`. Cheap to include now, tedious to retrofit.

## Testing

### Unit — Vitest + React Testing Library

- Menu renders exactly one link per `content.menu` entry
- Every `menu[].id` resolves to a section actually rendered on the page (dead-anchor guard)
- Socials render the correct `href`, `target`, and `rel`
- Comments placeholder renders its message and contains no form controls
- `useScrollSpy` marks the correct entry active given observer callbacks

### E2E — Playwright

Run against the **exported `out/` directory served statically**, not `next dev`. This is the
deploy-fidelity check: the tests exercise the same bytes S3 will hold.

- Page loads with no console errors
- Clicking each menu item scrolls its section into view and sets `aria-current`
- Mobile viewport shows the hamburger; it opens and closes
- Both sections and the placeholder card render with visible content

## Verification

All five must pass before the work is called complete:

```
npm run lint
npx tsc --noEmit
npm test
npm run build      # must emit out/
npx playwright test
```

Additionally, `out/` is inspected once by hand to confirm it contains `index.html`,
`404.html`, and the static assets — the artifact handed to S3 is known-good before it
leaves the machine.

## Open items

- Real content — name, tagline, brief copy, portrait, logo, social URLs — is not yet
  available. The site ships with marked placeholders until supplied.
- Playwright browsers require a one-time `npx playwright install` on this machine.
- Domain, hosting, and CI/CD remain the owner's work and are deliberately unaddressed here.
