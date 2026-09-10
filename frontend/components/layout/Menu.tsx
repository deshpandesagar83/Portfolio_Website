import { siteContent } from '@/content/site';

type MenuProps = {
  activeId: string | null;
  onNavigate?: () => void;
  className?: string;
};

export function Menu({ activeId, onNavigate, className = '' }: MenuProps) {
  return (
    <ul className={className}>
      {siteContent.menu.map((item) => {
        const isActive = item.id === activeId;
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={onNavigate}
              aria-current={isActive ? 'true' : undefined}
              className={`text-sm tracking-wide transition-colors hover:text-text ${
                isActive ? 'text-accent' : 'text-muted'
              }`}
            >
              {item.label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
