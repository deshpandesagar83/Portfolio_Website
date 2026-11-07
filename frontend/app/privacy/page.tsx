import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Section } from '@/components/ui/Section';
import { privacyContent } from '@/content/privacy';

/** metadataBase in app/layout.tsx resolves the relative openGraph url. */
export const metadata: Metadata = {
  title: privacyContent.meta.title,
  description: privacyContent.meta.description,
  openGraph: {
    type: 'website',
    title: privacyContent.meta.title,
    description: privacyContent.meta.description,
    url: '/privacy/',
  },
  twitter: {
    card: 'summary',
    title: privacyContent.meta.title,
    description: privacyContent.meta.description,
  },
};

export default function Privacy() {
  return (
    <>
      <Header />
      <main>
        <Section id="privacy" className="py-20 md:py-24">
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              {privacyContent.heading}
            </h1>
            <p className="mt-4 text-sm text-muted">
              Last updated {privacyContent.lastUpdated}
            </p>

            {privacyContent.sections.map((section) => (
              <section key={section.heading} className="mt-10">
                <h2 className="font-display text-xl font-semibold">{section.heading}</h2>
                {section.paragraphs?.map((text) => (
                  <p key={text} className="mt-3 leading-relaxed">
                    {text}
                  </p>
                ))}
                {section.items && (
                  <ul className="mt-3 list-disc space-y-1 pl-6 leading-relaxed">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <section className="mt-10">
              <h2 className="font-display text-xl font-semibold">Contact</h2>
              <p className="mt-3 leading-relaxed">
                Questions or requests about this policy:{' '}
                <a
                  href={`mailto:${privacyContent.contactEmail}`}
                  className="text-accent underline underline-offset-2"
                >
                  {privacyContent.contactEmail}
                </a>
              </p>
            </section>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
