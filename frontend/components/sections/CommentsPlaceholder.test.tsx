import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { siteContent } from '@/content/site';
import { CommentsPlaceholder } from './CommentsPlaceholder';

describe('CommentsPlaceholder', () => {
  it('renders its heading at level 2, below the page h1', () => {
    render(<CommentsPlaceholder />);
    expect(
      screen.getByRole('heading', { level: 2, name: siteContent.comments.heading }),
    ).toBeInTheDocument();
  });

  it('renders the placeholder message', () => {
    render(<CommentsPlaceholder />);
    expect(screen.getByText(siteContent.comments.message)).toBeInTheDocument();
  });

  it('renders the secondary photo with its alt text', () => {
    render(<CommentsPlaceholder />);
    expect(screen.getByAltText(siteContent.comments.photo.alt)).toBeInTheDocument();
  });

  it('offers no interactive controls, because there is no backend yet', () => {
    const { container } = render(<CommentsPlaceholder />);
    expect(container.querySelector('form')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('exposes the comments anchor id for the menu', () => {
    const { container } = render(<CommentsPlaceholder />);
    expect(container.querySelector('#comments')).not.toBeNull();
  });
});
