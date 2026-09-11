import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import nodeConsole from 'node:console';
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

    // Clicking a real <a> outside a Next.js router context makes jsdom emit
    // "Not implemented: navigation to another Document". jsdom's internal
    // VirtualConsole forwards that to the raw node:console singleton, not
    // the `console` global Vitest exposes to this file, so the spy has to
    // target node:console directly to actually silence it. Silenced here
    // because it's expected noise, not asserted on because pinning the
    // exact wording would couple the test to jsdom internals.
    const consoleErrorSpy = vi.spyOn(nodeConsole, 'error').mockImplementation(() => {});
    await user.click(within(mobileNav).getByRole('link', { name: 'Workflow' }));
    consoleErrorSpy.mockRestore();

    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('marks the current page inside the mobile nav too', async () => {
    pathnameRef.current = '/workflow/';
    const user = userEvent.setup();
    render(<Header />);

    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    const mobileNav = screen.getByRole('navigation', { name: 'Mobile navigation' });
    expect(within(mobileNav).getByRole('link', { name: 'Workflow' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(mobileNav).getByRole('link', { name: 'Home' })).not.toHaveAttribute(
      'aria-current',
    );
  });
});
