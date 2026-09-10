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
