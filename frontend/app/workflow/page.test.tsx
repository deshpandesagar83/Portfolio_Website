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
