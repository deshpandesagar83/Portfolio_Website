import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { privacyContent } from '@/content/privacy';
import Privacy from './page';

describe('Privacy page', () => {
  it('renders the heading as the single page h1', () => {
    render(<Privacy />);
    expect(
      screen.getByRole('heading', { level: 1, name: privacyContent.heading }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders one h2 per section plus the contact section', () => {
    render(<Privacy />);
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(
      privacyContent.sections.length + 1,
    );
  });

  it('links the contact email', () => {
    render(<Privacy />);
    expect(
      screen.getByRole('link', { name: privacyContent.contactEmail }),
    ).toHaveAttribute('href', `mailto:${privacyContent.contactEmail}`);
  });

  it('renders the page landmarks', () => {
    render(<Privacy />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
