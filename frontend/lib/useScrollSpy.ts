'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks which section is currently in view.
 *
 * Pass a referentially stable `ids` array — build it once at module scope.
 * An inline array re-subscribes the observer on every render.
 */
export function useScrollSpy(ids: string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    if (elements.length === 0) return;

    // Visible ratio per section, updated as entries arrive. The observer only
    // reports what changed, so the running map is what makes "most visible"
    // answerable.
    const visibleRatios = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleRatios.set(entry.target.id, entry.intersectionRatio);
          } else {
            visibleRatios.delete(entry.target.id);
          }
        }

        let best: string | null = null;
        let bestRatio = -1;
        for (const id of ids) {
          const ratio = visibleRatios.get(id);
          if (ratio !== undefined && ratio > bestRatio) {
            best = id;
            bestRatio = ratio;
          }
        }

        if (best !== null) setActiveId(best);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [ids]);

  return activeId;
}
