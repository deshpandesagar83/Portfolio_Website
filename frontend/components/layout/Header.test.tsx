import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { siteContent } from '@/content/site';
import { Header } from './Header';

class NoopIntersectionObserver {
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
