import Image from 'next/image';
import type { WorkflowProject } from '@/content/types';
import { WorkflowBody } from '@/components/ui/WorkflowBody';

type ProjectPanelProps = {
  project: WorkflowProject;
  /** The first panel renders open, so the page never loads looking empty. */
  isFirst?: boolean;
};

/** One project, as one native disclosure.
 *
 *  <details> is deliberate: the browser owns the open state, so this needs no
 *  JavaScript, keeps Header as the site's only client component, and gets
 *  keyboard operation, disclosure semantics, and find-in-page expansion for
 *  free. The <h2> sits inside <summary> so the heading outline survives while
 *  the summary stays the control. */
export function ProjectPanel({ project, isFirst = false }: ProjectPanelProps) {
  return (
    <details
      id={project.slug}
      open={isFirst}
      className="group scroll-mt-24 border-b border-line py-8"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-6 [&::-webkit-details-marker]:hidden">
        <h2 className="font-display text-2xl tracking-tight md:text-3xl">{project.name}</h2>

        {/* Decorative: the summary already announces its own state. */}
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
          className="h-5 w-5 shrink-0 stroke-current text-muted transition-transform group-open:rotate-180"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>

      {/* Diagram takes the wider column — the inverse of Home's split, which
          is sized for a portrait photo. */}
      <div className="mt-8 grid items-start gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Image
          src={project.image.src}
          alt={project.image.alt}
          width={project.image.width}
          height={project.image.height}
          priority={isFirst}
          sizes="(min-width: 768px) 55vw, 100vw"
          className="mx-auto w-full rounded-sm border border-line md:mx-0"
        />

        <WorkflowBody blocks={project.body} />
      </div>
    </details>
  );
}
