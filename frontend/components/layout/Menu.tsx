import Link from 'next/link';
import { siteContent } from '@/content/site';
import { isActivePath } from '@/lib/activePath';

type MenuProps = {
  /** The current pathname, or null when it is not known yet. */
  activePath: string | null;
  onNavigate?: () => void;
  className?: string;
};

export function Menu({ activePath, onNavigate, className = '' }: MenuProps) {
  return (
    <ul className={className}>
      {siteContent.menu.map((item) => {
        const isActive = isActivePath(activePath, item.href);

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              // "page" is the correct token for a page link; "true" was right
              // for the section anchors this replaced.
              aria-current={isActive ? 'page' : undefined}
              className={`text-sm tracking-wide transition-colors hover:text-text ${
                isActive ? 'text-accent' : 'text-muted'
              }`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
