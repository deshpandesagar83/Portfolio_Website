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
