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
