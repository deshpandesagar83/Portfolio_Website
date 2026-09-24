import type { WorkflowContent } from './types';
import { projects } from './projects';

/** Page chrome only. Project copy lives in content/projects/, one file each. */
export const workflowContent: WorkflowContent = {
  meta: {
    // TODO: replace before launch, alongside the project copy.
    title: 'Workflow — Sagar Deshpande',
    description:
      'How these projects are built: the architecture and the pipeline behind each one.',
  },
  heading: 'Workflow',
  projects,
};
