import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import nodeConsole from 'node:console';
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
    // Clicking a real <a> outside a Next.js router context makes jsdom emit
    // "Not implemented: navigation to another Document". jsdom's internal
    // VirtualConsole forwards that to the raw node:console singleton, not
    // the `console` global Vitest exposes to this file, so the spy has to
    // target node:console directly to actually silence it. Silenced here
    // because it's expected noise, not asserted on because pinning the
    // exact wording would couple the test to jsdom internals.
    const consoleErrorSpy = vi.spyOn(nodeConsole, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<Menu activePath="/" onNavigate={onNavigate} />);

    await user.click(screen.getByRole('link', { name: 'Workflow' }));
    consoleErrorSpy.mockRestore();

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
