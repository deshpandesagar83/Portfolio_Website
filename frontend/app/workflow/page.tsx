import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProjectPanel } from '@/components/sections/ProjectPanel';
import { Section } from '@/components/ui/Section';
import { workflowContent } from '@/content/workflow';

/** metadataBase in app/layout.tsx resolves the relative openGraph url. */
export const metadata: Metadata = {
  title: workflowContent.meta.title,
  description: workflowContent.meta.description,
  openGraph: {
    type: 'website',
    title: workflowContent.meta.title,
    description: workflowContent.meta.description,
    url: '/workflow/',
  },
  twitter: {
    card: 'summary_large_image',
    title: workflowContent.meta.title,
    description: workflowContent.meta.description,
  },
};

export default function Workflow() {
  return (
    <>
      <Header />
      <main>
        <Section id="workflow" className="py-20 md:py-24">
          <h1 className="font-display text-4xl leading-tight tracking-tight md:text-5xl">
            {workflowContent.heading}
          </h1>

          <div className="mt-12">
            {workflowContent.projects.map((project, index) => (
              <ProjectPanel key={project.slug} project={project} isFirst={index === 0} />
            ))}
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
