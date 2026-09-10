import { siteContent } from '@/content/site';

export function Footer() {
  return (
    <footer className="border-t border-line px-6 py-10 md:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <p>
          © {new Date().getFullYear()} {siteContent.identity.name}
        </p>
        <p>{siteContent.identity.tagline}</p>
      </div>
    </footer>
  );
}
