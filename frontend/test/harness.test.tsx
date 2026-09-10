import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('unit test harness', () => {
  it('renders a React component into jsdom and applies jest-dom matchers', () => {
    render(<p>harness online</p>);
    expect(screen.getByText('harness online')).toBeInTheDocument();
  });
});
