import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { WorkflowProject } from '@/content/types';
import { ProjectPanel } from './ProjectPanel';

const project: WorkflowProject = {
  slug: 'example-project',
  name: 'Example Project',
  image: {
    src: '/images/placeholder-workflow.svg',
    alt: 'Example workflow diagram',
    width: 1600,
    height: 900,
  },
  body: [{ kind: 'steps', items: ['First step', 'Second step'] }],
};

describe('ProjectPanel', () => {
  it('renders a details element whose id is the project slug', () => {
    // The id is what makes /workflow/#example-project resolve.
    const { container } = render(<ProjectPanel project={project} />);

    const details = container.querySelector('details');
    expect(details).not.toBeNull();
    expect(details).toHaveAttribute('id', 'example-project');
  });

  it('puts the project name in a level-2 heading inside the summary', () => {
    const { container } = render(<ProjectPanel project={project} />);

    const heading = screen.getByRole('heading', { level: 2, name: 'Example Project' });
    expect(heading).toBeInTheDocument();

    const summary = container.querySelector('summary');
    expect(summary).not.toBeNull();
    expect(summary!.contains(heading)).toBe(true);
  });

  it('renders open when it is the first panel', () => {
    const { container } = render(<ProjectPanel project={project} isFirst />);
    expect(container.querySelector('details')).toHaveAttribute('open');
  });

  it('renders closed when it is not the first panel', () => {
    const { container } = render(<ProjectPanel project={project} />);
    expect(container.querySelector('details')).not.toHaveAttribute('open');
  });

  it('renders the diagram with its alt text and declared dimensions', () => {
    render(<ProjectPanel project={project} />);

    const image = screen.getByAltText('Example workflow diagram');
    expect(image).toHaveAttribute('width', '1600');
    expect(image).toHaveAttribute('height', '900');
  });

  it('renders the body through, keeping list semantics', () => {
    const { container } = render(<ProjectPanel project={project} />);

    const list = container.querySelector('ol');
    expect(list).not.toBeNull();
    expect(list!.querySelectorAll('li')).toHaveLength(2);
  });
});
