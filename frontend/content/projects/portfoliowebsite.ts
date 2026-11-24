import type { WorkflowProject } from '../types';

// ---------------------------------------------------------------------------
// TODO: The image dimensions are set to the exact values. Update so they are generic.
// (Might need to remake those images from drawio to fit the desired dimentions 1920x1080)
// The work looks text heavy. Research with UI/UX perspective to come up with a better way of displaying the workflow.  
// ---------------------------------------------------------------------------
export const portfoliowebsite: WorkflowProject = {
  slug: 'portfoliowebsite',
  name: 'Portfolio Website',
  image: {
    src: '/images/Workflow-Inactive.jpg',
    alt: 'Simple Workflow',
    width: 861,
    height: 1111,
  },
  body: [
    {
      kind: 'para',
      text: 'Personal Website Project',
    },
    {
      kind: 'steps',
      items: [
        'Research a range of portfolio websites.',
        'Identify common patterns: portfolios typically include a home page with a personal photo and short introduction, a projects page, and social links.',
        'Research technologies suitable for building a basic website.',
        'Compare technologies on ease of use, build cost, performance optimization, and ability to scale to zero, factoring in my familiarity with each.',
        'Host the site on AWS, given my existing expertise with the platform.',
        'Budget: $16 USD per year for the domain. S3 storage costs are negligible, and CloudFront usage falls within the free tier (1M requests, 100 GB data transfer, 5 GB S3 storage).',
        'Set up AWS Budgets to monitor costs.',
        'Phase 1: Static hosting with Route 53, S3, and CloudFront. Phase 2: Add a database and backend layer.',
        'Have Claude generate an initial build. The design is unsatisfactory, provide additional context. A wireframe of the desired layout.',
        'Add relevant frontend design skills to Claude. The design can be refined later; the priority is to get a working version live first.',
        'Secure the domain using Route 53.',
        'Use CloudFormation to provision the S3 and CloudFront resources.',
        'Set up a GitHub Actions workflow for CI/CD.',
      ],
    },
    {
      kind: 'note',
      text: 'AWS Cost Anomaly Detection does not trigger alerts until it has enough historical data to establish a baseline of normal spending. AWS has recently introduced hard spending caps for budgets.',
    },
  ],
};
