import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { siteContent } from '@/content/site';
import Home from './page';

class NoopIntersectionObserver {
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
