import Link from 'next/link';
import { siteContent } from '@/content/site';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-accent">404</p>
        <h1 className="mt-4 font-display text-3xl tracking-tight md:text-4xl">
          This page does not exist
        </h1>
        <p className="mt-4 text-muted">
          The link may be out of date.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block border border-line px-5 py-2 text-sm text-text transition-colors hover:border-accent hover:text-accent"
        >
          Back to {siteContent.identity.name}
        </Link>
      </div>
    </main>
  );
}
