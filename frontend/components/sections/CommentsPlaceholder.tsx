import Image from 'next/image';
import { siteContent } from '@/content/site';
import { Section } from '@/components/ui/Section';

export function CommentsPlaceholder() {
  const { comments } = siteContent;

  return (
    <Section id="comments" className="py-20 md:py-28">
      <div className="grid items-center gap-12 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Image
          src={comments.photo.src}
          alt={comments.photo.alt}
          width={comments.photo.width}
          height={comments.photo.height}
          sizes="(min-width: 768px) 40vw, 100vw"
          className="w-full max-w-sm rounded-sm border border-line"
        />

        <div>
          <h2 className="font-display text-3xl tracking-tight md:text-4xl">
            {comments.heading}
          </h2>

          {/* Sized and styled as though populated, so the two-column layout is
              already proven against realistic height. */}
          <div className="mt-8 min-h-56 rounded-sm border border-dashed border-line bg-surface p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-accent">
              Coming soon
            </p>
            <p className="mt-4 max-w-prose leading-relaxed text-muted">
              {comments.message}
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}
