import type { ReactNode } from 'react';

type SectionProps = {
  id: string;
  children: ReactNode;
  className?: string;
};

/** Shared wrapper for every page section. Owns the anchor id, the scroll
 *  offset that keeps headings clear of the sticky header, and the page's
 *  horizontal rhythm. */
export function Section({ id, children, className = '' }: SectionProps) {
  return (
    <section id={id} className={`scroll-mt-24 px-6 md:px-12 ${className}`}>
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}
