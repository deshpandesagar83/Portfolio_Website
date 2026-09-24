import type { WorkflowProject } from '../types';

// ---------------------------------------------------------------------------
// TODO: replace before launch. Everything below is placeholder content.
// Required from Sagar:
//   1. The real diagram or gif in public/images/. It must be LANDSCAPE, and
//      image.width/height must match the file exactly — content/images.test.ts
//      reads the file header and fails if they disagree.
//   2. The step copy — the real pipeline, in order.
//   3. The summary paragraph and the closing note.
// ---------------------------------------------------------------------------
export const portfoliowebsite: WorkflowProject = {
  slug: 'portfoliowebsite',
  name: 'Portfolio Website',
  image: {
    src: '/images/placeholder-workflow.svg',
    alt: 'Placeholder workflow diagram',
    width: 1600,
    height: 900,
  },
  body: [
    {
      kind: 'para',
      text: 'Placeholder summary. One or two sentences on what this project is and why it exists.',
    },
    {
      kind: 'steps',
      items: [
        'Placeholder step one — replace with the first stage of the real workflow.',
        'Placeholder step two — replace with the second stage.',
        'Placeholder step three — replace with the third stage.',
      ],
    },
    {
      kind: 'note',
      text: 'Placeholder note. Use this for a caveat, a constraint, or what is deliberately out of scope.',
    },
  ],
};
