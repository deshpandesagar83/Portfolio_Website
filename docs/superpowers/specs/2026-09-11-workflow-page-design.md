# Workflow Page — Design

**Date:** 2026-09-11
**Status:** Approved for implementation planning
**Scope:** Frontend only. No AWS, no backend.
**Builds on:** `docs/superpowers/specs/2026-09-10-portfolio-frontend-v1-design.md`

## Context

V1 shipped a single route with two anchor-linked sections, `#hero` (labelled
"About") and `#comments`. The menu *was* the section list, and `useScrollSpy`
marked whichever section was in view.

This change turns the site into two pages. "About" and "Comments" stop being
navigation items and become unlabelled sections of a page called **Home**. A
second page, **Workflow**, presents projects — each a title, a diagram or gif,
and an explanation — with one project now and more later.

Everything V1 established still holds: static export to `out/`, Tailwind v4
CSS-first tokens, content isolated from components, and the AWS side out of
scope as the owner's own work.

### Decisions taken in the design interview

| Question | Decision |
|---|---|
| Menu shape | Two top-level items, `Home` and `Workflow`. About and Comments keep no nav label |
| Active state | Marks the current **page**, not scroll position |
| Project nesting | Flat — one project is one workflow. One project now, more later |
| Routing | One `/workflow/` page, projects stacked, each anchor-addressable |
| Collapse mechanism | Native `<details>`/`<summary>`. No JavaScript, no new client component |
| Body content | A typed block union (`para`, `steps`, `note`), not plain strings |
| Content storage | One module per project, collected by a registry |
| First project name | `portfoliowebsite` — the site documents its own build |

## Goals

1. Two pages, navigable both ways, with the nav marking which one is current.
2. A Workflow page whose structure makes adding a project a new file plus one
   import line.
3. A body format that can express an ordered workflow, not just prose.
4. No increase in shipped JavaScript: `Header` remains the only client
   component.

## Non-goals

Per-project routes or per-project OG cards; MDX or any markdown pipeline; a CMS;
project filtering, tags, search, or sort; animating the disclosure; nested
workflows beneath a project; anything from the V1 non-goals list, which still
stands.

## Architecture

### Routing

| Route | File | Emits |
|---|---|---|
| `/` | `app/page.tsx` | `index.html` |
| `/workflow/` | `app/workflow/page.tsx` | `workflow/index.html` |

`trailingSlash: true` is already set, so nested routes emit as directories with
`index.html`. No config change is needed.

### Navigation

`MenuItem` changes from an anchor id to a route:

```ts
export type MenuItem = { href: string; label: string };
```

```ts
menu: [
  { href: '/',          label: 'Home' },
  { href: '/workflow/', label: 'Workflow' },
]
```

Trailing slashes are required in `href`. Omitting one costs a redirect hop that
CloudFront would have to be configured to handle, and the export serves the
directory form.

`Menu` renders `next/link` rather than a bare anchor, which gives prefetch
between the two pages. The active item is marked `aria-current="page"` — the
correct token for a page link, where V1's `"true"` was correct for a section
anchor.

`Header` determines the active item from `usePathname()`, comparing paths with
a trailing slash normalisation so `/workflow` and `/workflow/` both match.

**`lib/useScrollSpy.ts` and its test are deleted.** Nothing imports the hook
once the nav tracks routes, and dead code that looks maintained is worse than
no code. It remains recoverable from git if in-page sub-navigation returns.

**Two accessible names change**, because the nav no longer navigates sections:

| V1 | Now |
|---|---|
| `Section navigation` | `Primary navigation` |
| `Mobile section navigation` | `Mobile navigation` |

`Social links`, `Open menu`, and `Close menu` are unchanged. All five are
asserted verbatim by the Playwright specs and listed in `frontend/README.md`;
both are updated in the same change.

`app/sitemap.ts` currently hardcodes one URL. It derives its entries from
`siteContent.menu` instead, so a page cannot be added to the nav and silently
miss the sitemap.

### Content model

Types in `content/types.ts`:

```ts
export type WorkflowBlock =
  | { kind: 'para';  text: string }
  | { kind: 'steps'; items: string[] }
  | { kind: 'note';  text: string };

export type WorkflowProject = {
  slug: string;              // anchor id and React key — /workflow/#slug
  name: string;              // the title: the project name
  image: ImageRef;           // diagram or gif, landscape
  body: WorkflowBlock[];
};

export type WorkflowContent = {
  meta: { title: string; description: string };
  heading: string;           // the page <h1>
  projects: WorkflowProject[];
};
```

`ImageRef` is reused unchanged, so workflow diagrams inherit the existing
file-existence and dimension checks.

The block union exists because a workflow is naturally an ordered sequence.
`body: string[]` could not express a numbered list, and rendering steps as
prose paragraphs would look plausible and be wrong.

### Content files

| File | Responsibility |
|---|---|
| `content/projects/portfoliowebsite.ts` | One project. Nothing else |
| `content/projects/index.ts` | The registry — imports each project, exports `projects` |
| `content/workflow.ts` | Page chrome: `meta`, `heading`, and the registry, as `workflowContent` |

Adding a project means adding a file and one import line, and never editing a
file that holds another project's copy.

`content/site.ts` keeps identity, site metadata, menu, socials, hero, and
comments. It does not grow with projects.

### Components

`components/ui/WorkflowBody.tsx` renders a `WorkflowBlock[]`: a switch on
`kind` producing `<p>`, an `<ol>` of `<li>`, or an accented aside. The default
branch assigns the block to `never`, so **adding a block kind without writing
its renderer fails `tsc`** rather than rendering nothing at runtime. That check
is what makes the union safe to extend.

Blocks are keyed by array index. Their order is their identity, the list is
static at build time, and keying on text content would collide the moment two
paragraphs matched.

`components/sections/ProjectPanel.tsx` renders one project as one `<details>`:

```tsx
<details id={project.slug} open={isFirst} className="scroll-mt-24 …">
  <summary>
    <h2>{project.name}</h2>
    <Chevron />
  </summary>
  <div className="grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
    <Image … />
    <WorkflowBody blocks={project.body} />
  </div>
</details>
```

The `<h2>` sits inside `<summary>` so the heading outline stays intact while
the summary remains the disclosure control. The native marker is suppressed and
replaced with a chevron rotated by CSS on `[open]` — no state, no JavaScript.

`app/workflow/page.tsx` composes `Header`, the `<h1>`, the mapped panels, and
`Footer`, and exports `metadata` from `workflowContent.meta`. No section
registry and no abstraction over the list, consistent with V1's
"composition, not indirection" decision.

## Layout

| Band | Composition | Mobile (`< md`) |
|---|---|---|
| Header (sticky) | Logo left · `Home` `Workflow` center · Socials right | Logo + hamburger |
| Page heading | `<h1>` from `workflowContent.heading` | Same |
| Project panel | Summary row, then diagram left · text right | Stacked: diagram, then text |
| Footer | Unchanged from V1 | Same |

The project grid is **1.15fr image / 0.85fr text** — the inverse of Home's
split. Home's narrower image column suits a portrait photo; a workflow diagram
is wide and needs the wider column. Below `md` both stack, with the
`mx-auto md:mx-0` centering that V1's final review established.

The first project renders open and the rest closed, so the page never loads
looking empty. The first project's image carries `priority` as that page's LCP
element.

## Placeholder discipline

`public/images/placeholder-workflow.svg` at **1600 × 900** — landscape, so the
layout is never tuned against a stand-in of the wrong shape.

`content/projects/portfoliowebsite.ts` carries a `TODO: replace before launch`
block naming exactly what is required: the diagram or gif, the project name,
and the step copy. This matches the discipline already in `content/site.ts`.

GIFs need no configuration. `images.unoptimized: true` is already set for S3, so
the file is served byte-for-byte and animates.

## Error handling

| Failure | Handling |
|---|---|
| A menu `href` pointing at a route that does not exist | Unit test failure |
| A menu `href` missing its trailing slash | Unit test failure |
| A new `WorkflowBlock` kind with no renderer | TypeScript build failure via the `never` check |
| A project slug that is duplicated or not URL-safe | Unit test failure |
| A workflow image that is portrait, missing, or wrongly sized | Unit test failure |
| JavaScript disabled or failed | Both pages render and read fully; links work; `<details>` opens and closes. Only the mobile toggle and the prefetch degrade |
| Unknown URL | `app/not-found.tsx` continues to emit `404.html` |

## Accessibility

Everything V1 required still holds. Specific to this change:

- Exactly one `<h1>` per page — `identity.name` on Home, `heading` on Workflow
- `aria-current="page"` on the active nav item, and on no other
- `<details>`/`<summary>` gives keyboard operation, disclosure semantics, and
  find-in-page expansion of collapsed content without custom code
- `steps` renders a real `<ol>`, so the count and order are announced
- The chevron is decorative and `aria-hidden`

## SEO

`/workflow/` carries its own `<title>` and description from
`workflowContent.meta`, distinct from the site title. `metadataBase` in the root
layout resolves its OG URL. `sitemap.xml` lists both routes, derived from the
menu. The `schema.org/Person` JSON-LD in the root layout is unchanged and
applies to both pages.

## Testing

### Unit — 41 new or changed tests across 8 files

The counts below are tests this change adds or rewrites. V1's other invariants
in `content/site.test.ts` — https socials, `meta.title` containing the identity
name, an icon for every social platform — remain as they are and are not
recounted here. V1's menu-id tests are superseded by the href invariants below,
since `menu[].id` no longer exists.

**Menu content invariants** (`content/site.test.ts`) — 5: at least one entry;
`href` and `label` non-empty; every `href` root-relative and trailing-slashed;
`href`s and labels each unique; every `href` maps to a page file on disk.

**Menu component** (`components/layout/Menu.test.tsx`, new) — 5: one link per
entry with the right href and text; the active path marked `aria-current`;
**no other item marked**, asserted separately because "marks the right one" and
"marks only one" fail independently; an unrecognised path marks nothing;
clicking fires `onNavigate`.

**Header** (`components/layout/Header.test.tsx`, changed) — 4: `/` marks Home;
`/workflow/` marks Workflow; `/workflow` without the slash also marks Workflow;
the toggle flips `aria-expanded` and its label, and a mobile link closes the
menu.

**WorkflowBody** (`components/ui/WorkflowBody.test.tsx`, new) — 6: `para` → `<p>`;
`steps` → exactly one `<ol>` with one `<li>` per item in order; the list is
ordered, not `<ul>`; `note` → its aside; a mixed body renders in order; an empty
body renders nothing without throwing.

**ProjectPanel** (`components/sections/ProjectPanel.test.tsx`, new) — 6: renders
a `<details>` whose `id` is the slug; the `<h2>` carries the name and sits inside
the `<summary>`; `open` present for the first panel and absent otherwise; the
image renders with the ref's alt, width, and height; a `steps` block renders
through as a list.

**Workflow page** (`app/workflow/page.test.tsx`, new) — 4: exactly one `<h1>`
reading from `heading`; one `<details>` per registry entry; all three landmarks;
every slug resolves to an element id on the page.

**Workflow content invariants** (`content/workflow.test.ts`, new) — 6: at least
one project; slugs unique and matching `/^[a-z0-9-]+$/`; non-empty name and at
least one block per project; `steps` non-empty with no blank items; `para` and
`note` text non-empty; `workflow.meta.title` differs from `site.meta.title`.

**Images** (`content/images.test.ts`) — 5: the image assertions move here from
`content/site.test.ts` and enumerate every `ImageRef` from **both** content
modules — src root-relative and present; declared dimensions equal to the file's
real dimensions; Home photos portrait and workflow diagrams landscape; alt
non-empty; **and the collector itself non-empty with at least one ref from each
module**, without which a collector returning `[]` would pass every check above
while testing nothing.

`app/page.test.tsx` loses the dead-anchor guard, which no longer has an
invariant to assert, and keeps its one-`h1` and landmark tests.
`lib/useScrollSpy.test.tsx` is deleted with the hook.

**Not tested, deliberately:** Tailwind class strings, markup snapshots, and the
chevron rotation. They assert styling rather than behaviour, and break on every
cosmetic edit while catching nothing.

### E2E — Playwright, against the exported `out/`

- Clicking **Workflow** navigates to `/workflow/`, renders its `<h1>`, and marks
  that item `aria-current="page"`; clicking **Home** returns
- `/workflow/` loads with no console errors
- The first panel is open on load, and clicking its summary collapses it —
  proving the native disclosure works in the exported bundle with none of our JS
- Mobile: open the menu, tap Workflow, the menu closes and the page changes

The existing Home, 404, and no-console-error tests are retained; the
scroll-to-section navigation tests are replaced by the page-navigation tests
above.

## Verification

Unchanged from V1. All five must pass:

```
npm run lint
npx tsc --noEmit
npm test
npm run build      # must emit out/, now including workflow/index.html
npx playwright test
```

## Open items

- Real workflow content — the diagram or gif, the project name, and the step
  copy — is not yet available. The page ships with marked placeholders. The
  diagram should be landscape; a portrait diagram would need the project grid
  revisited.
- `content/site.ts` currently carries in-progress placeholder edits, and its
  `hero.photo` dimension check is failing against the real photo. That is
  independent of this work and is the owner's to settle.
- Domain, hosting, and CI/CD remain the owner's work and are unaddressed here.
