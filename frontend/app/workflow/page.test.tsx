import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { workflowContent } from '@/content/workflow';
import type { WorkflowProject } from '@/content/types';
import Workflow from './page';

describe('Workflow page', () => {
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

describe('Workflow page — isFirst wiring', () => {
  // The registry above has only one project, so `panels.slice(1)` in "opens
  // the first panel and leaves the rest closed" is vacuous — it would stay
  // green even if isFirst were wired as bare `isFirst` (always true). Mock a
  // two-project registry to actually exercise the second panel.
  const mockProjects: WorkflowProject[] = [
    {
      slug: 'alpha',
      name: 'Alpha',
      image: {
        src: '/images/placeholder-workflow.svg',
        alt: 'Alpha workflow diagram',
        width: 1600,
        height: 900,
      },
      body: [{ kind: 'para', text: 'Alpha summary.' }],
    },
    {
      slug: 'beta',
      name: 'Beta',
      image: {
        src: '/images/placeholder-workflow.svg',
        alt: 'Beta workflow diagram',
        width: 1600,
        height: 900,
      },
      body: [{ kind: 'para', text: 'Beta summary.' }],
    },
  ];

  it('opens only the first of several panels', async () => {
    vi.resetModules();
    vi.doMock('@/content/workflow', () => ({
      workflowContent: {
        meta: { title: 'Workflow', description: 'Mocked workflow page for testing.' },
        heading: 'Workflow',
        projects: mockProjects,
      },
    }));

    try {
      const { default: MockedWorkflow } = await import('./page');
      const { container } = render(<MockedWorkflow />);
      const panels = Array.from(container.querySelectorAll('details'));

      expect(panels).toHaveLength(2);
      expect(panels[0]).toHaveAttribute('open');
      expect(panels[1]).not.toHaveAttribute('open');
    } finally {
      vi.doUnmock('@/content/workflow');
      vi.resetModules();
    }
  });
});
