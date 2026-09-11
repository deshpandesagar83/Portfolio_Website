import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useScrollSpy } from './useScrollSpy';

type Entry = { target: { id: string }; isIntersecting: boolean; intersectionRatio: number };

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  callback: (entries: Entry[]) => void;
  observed: Element[] = [];
  disconnected = false;

  constructor(callback: (entries: Entry[]) => void) {
    this.callback = callback;
    FakeIntersectionObserver.instances.push(this);
  }

  observe(element: Element) {
    this.observed.push(element);
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }
  takeRecords() {
    return [];
  }
}

const IDS = ['hero', 'comments'];

function Probe() {
  const active = useScrollSpy(IDS);
  return (
    <>
      <div id="hero" />
      <div id="comments" />
      <output>{active ?? 'none'}</output>
    </>
  );
}

function fire(entries: Entry[]) {
  const observer = FakeIntersectionObserver.instances.at(-1);
  if (!observer) throw new Error('no observer was constructed');
  act(() => observer.callback(entries));
}

describe('useScrollSpy', () => {
  beforeEach(() => {
    FakeIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  });

  it('defaults to the first id before anything intersects', () => {
    render(<Probe />);
    expect(screen.getByRole('status').textContent).toBe('hero');
  });

  it('observes every element whose id was passed', () => {
    render(<Probe />);
    expect(FakeIntersectionObserver.instances.at(-1)?.observed).toHaveLength(2);
  });

  it('activates the section that comes into view', () => {
    render(<Probe />);
    fire([{ target: { id: 'comments' }, isIntersecting: true, intersectionRatio: 0.9 }]);
    expect(screen.getByRole('status').textContent).toBe('comments');
  });

  it('prefers the section with the greater visible ratio', () => {
    render(<Probe />);
    fire([
      { target: { id: 'comments' }, isIntersecting: true, intersectionRatio: 0.8 },
      { target: { id: 'hero' }, isIntersecting: true, intersectionRatio: 0.2 },
    ]);
    expect(screen.getByRole('status').textContent).toBe('comments');
  });

  it('falls back to the remaining visible section when one leaves view', () => {
    render(<Probe />);
    fire([
      { target: { id: 'hero' }, isIntersecting: true, intersectionRatio: 0.9 },
      { target: { id: 'comments' }, isIntersecting: true, intersectionRatio: 0.1 },
    ]);
    expect(screen.getByRole('status').textContent).toBe('hero');

    fire([{ target: { id: 'hero' }, isIntersecting: false, intersectionRatio: 0 }]);
    expect(screen.getByRole('status').textContent).toBe('comments');
  });

  it('disconnects the observer on unmount', () => {
    const { unmount } = render(<Probe />);
    const observer = FakeIntersectionObserver.instances.at(-1);
    unmount();
    expect(observer?.disconnected).toBe(true);
  });
});
