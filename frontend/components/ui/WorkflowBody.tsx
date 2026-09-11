import type { WorkflowBlock } from '@/content/types';

type WorkflowBodyProps = {
  blocks: WorkflowBlock[];
  className?: string;
};

/** Renders a project's body blocks.
 *
 *  Blocks are keyed by index: their order is their identity, the list is static
 *  at build time, and keying on text would collide the moment two paragraphs
 *  matched.
 *
 *  The default branch assigns to `never`, so adding a kind to WorkflowBlock
 *  without writing its renderer fails `tsc` rather than rendering nothing. */
export function WorkflowBody({ blocks, className = '' }: WorkflowBodyProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {blocks.map((block, index) => {
        const key = `${block.kind}-${index}`;

        switch (block.kind) {
          case 'para':
            return (
              <p key={key} className="max-w-prose leading-relaxed">
                {block.text}
              </p>
            );

          case 'steps':
            return (
              <ol
                key={key}
                className="ml-5 max-w-prose list-decimal space-y-2 leading-relaxed marker:text-accent"
              >
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>{item}</li>
                ))}
              </ol>
            );

          case 'note':
            return (
              <aside
                key={key}
                className="max-w-prose border-l-2 border-accent bg-surface py-3 pl-4 text-sm leading-relaxed text-muted"
              >
                {block.text}
              </aside>
            );

          default: {
            const exhaustive: never = block;
            return exhaustive;
          }
        }
      })}
    </div>
  );
}
