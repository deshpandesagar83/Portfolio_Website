import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { siteContent } from '@/content/site';
import { Hero } from './Hero';

describe('Hero', () => {
  it('renders the name as the page h1', () => {
    render(<Hero />);
    expect(
      screen.getByRole('heading', { level: 1, name: siteContent.identity.name }),
    ).toBeInTheDocument();
  });

  it('renders the tagline as text, not as a heading', () => {
    render(<Hero />);
    expect(screen.getByText(siteContent.identity.tagline)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: siteContent.identity.tagline }),
    ).toBeNull();
  });

  it('renders every paragraph of the brief', () => {
    render(<Hero />);
    for (const paragraph of siteContent.hero.body) {
      expect(screen.getByText(paragraph)).toBeInTheDocument();
    }
  });

  it('renders the portrait with its alt text', () => {
    render(<Hero />);
    expect(screen.getByAltText(siteContent.hero.photo.alt)).toBeInTheDocument();
  });

  it('exposes the hero anchor id for the menu', () => {
    const { container } = render(<Hero />);
    expect(container.querySelector('#hero')).not.toBeNull();
  });
});
