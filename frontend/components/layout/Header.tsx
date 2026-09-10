'use client';

import { useState } from 'react';
import { siteContent } from '@/content/site';
import { useScrollSpy } from '@/lib/useScrollSpy';
import { Logo } from './Logo';
import { Menu } from './Menu';
import { Socials } from './Socials';

// Module scope, so the array identity is stable across renders and the
// observer in useScrollSpy subscribes once.
const SECTION_IDS = siteContent.menu.map((item) => item.id);

export function Header() {
  const activeId = useScrollSpy(SECTION_IDS);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-4 md:px-12">
        <Logo />

        <nav aria-label="Section navigation" className="hidden md:block">
          <Menu activeId={activeId} className="flex items-center gap-8" />
        </nav>

        <div className="flex items-center gap-4">
          <nav aria-label="Social links">
            <Socials className="flex items-center gap-4" />
          </nav>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="text-muted transition-colors hover:text-text md:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
              className="h-6 w-6 stroke-current"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
            >
              {isMobileMenuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <nav
          id="mobile-menu"
          aria-label="Mobile section navigation"
          className="border-t border-line px-6 py-4 md:hidden"
        >
          <Menu
            activeId={activeId}
            onNavigate={() => setIsMobileMenuOpen(false)}
            className="flex flex-col gap-4"
          />
        </nav>
      )}
    </header>
  );
}
