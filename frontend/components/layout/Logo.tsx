import Image from 'next/image';
import Link from 'next/link';
import { siteContent } from '@/content/site';

export function Logo() {
  const { logo, name } = siteContent.identity;

  return (
    <Link href="/" className="flex items-center gap-3">
      <Image
        src={logo.src}
        alt={logo.alt}
        width={logo.width}
        height={logo.height}
        priority
        className="h-9 w-9"
      />
      <span className="font-display text-lg tracking-tight">{name}</span>
    </Link>
  );
}
