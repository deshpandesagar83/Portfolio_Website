import Image from 'next/image';
import { siteContent } from '@/content/site';
import { Section } from '@/components/ui/Section';

export function Hero() {
  const { identity, hero } = siteContent;

  return (
    <Section
      id="hero"
      className="flex items-center py-20 md:min-h-[85vh] md:py-24"
    >
      <div className="grid items-center gap-12 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Image
          src={hero.photo.src}
          alt={hero.photo.alt}
          width={hero.photo.width}
          height={hero.photo.height}
          priority
          sizes="(min-width: 768px) 40vw, 100vw"
          className="mx-auto w-full max-w-sm rounded-sm border border-line md:mx-0"
        />

        <div>
          <h1 className="font-display text-4xl leading-tight tracking-tight md:text-6xl">
            {identity.name}
          </h1>
          <p className="mt-4 text-lg text-muted md:text-xl">{identity.tagline}</p>

          <div className="mt-8 space-y-5 text-base leading-relaxed md:text-lg">
            {hero.body.map((paragraph) => (
              <p key={paragraph} className="max-w-prose">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
