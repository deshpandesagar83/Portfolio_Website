import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkflowBody } from './WorkflowBody';

describe('WorkflowBody', () => {
  it('renders a para block as a paragraph', () => {
    const { container } = render(
      <WorkflowBody blocks={[{ kind: 'para', text: 'A summary line.' }]} />,
    );

    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0]).toHaveTextContent('A summary line.');
  });

  it('renders a steps block as one ordered list, one item per step, in order', () => {
    const { container } = render(
      <WorkflowBody blocks={[{ kind: 'steps', items: ['First', 'Second', 'Third'] }]} />,
    );

    const lists = container.querySelectorAll('ol');
    expect(lists).toHaveLength(1);

    const items = Array.from(lists[0].querySelectorAll('li')).map((li) => li.textContent);
    expect(items).toEqual(['First', 'Second', 'Third']);
  });

  it('renders steps as an ordered list, never an unordered one', () => {
    // A workflow's numbering is meaning, not decoration. <ul> would look
    // almost right and be wrong.
    const { container } = render(
      <WorkflowBody blocks={[{ kind: 'steps', items: ['Only step'] }]} />,
    );

    expect(container.querySelector('ol')).not.toBeNull();
    expect(container.querySelector('ul')).toBeNull();
  });

  it('renders a note block with its text', () => {
    render(<WorkflowBody blocks={[{ kind: 'note', text: 'One caveat.' }]} />);
    expect(screen.getByText('One caveat.')).toBeInTheDocument();
  });

  it('renders mixed blocks in the order given', () => {
    const { container } = render(
      <WorkflowBody
        blocks={[
          { kind: 'para', text: 'Intro' },
          { kind: 'steps', items: ['Step'] },
          { kind: 'note', text: 'Caveat' },
        ]}
      />,
    );

    const rendered = container.firstElementChild;
    expect(rendered).not.toBeNull();
    const tags = Array.from(rendered!.children).map((element) => element.tagName);
    expect(tags).toEqual(['P', 'OL', 'ASIDE']);
  });

  it('renders nothing for an empty body, without throwing', () => {
    const { container } = render(<WorkflowBody blocks={[]} />);
    expect(container.firstElementChild?.children).toHaveLength(0);
  });
});
