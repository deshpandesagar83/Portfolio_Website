import type { SiteContent } from './types';

// ---------------------------------------------------------------------------
// TODO: replace before launch. Everything below is placeholder content.
// Required from Sagar:
//   1. identity.name and identity.tagline
//   2. hero.body — the brief, 2-3 short paragraphs
//   3. public/images/portrait.jpg — PORTRAIT orientation, at or near 3:4.
//      A landscape photo needs the hero grid revisited.
//   4. public/images/logo.svg — the personal logo
//   5. socials — real profile URLs
//   6. meta.siteUrl — the real domain once registered
//   7. app/icon.svg — the favicon. This is the one placeholder that does NOT
//      live under public/images/; replace the file in place.
// Replacing content means editing this file and adding files to
// public/images/. No component changes are needed.
// ---------------------------------------------------------------------------

const PLACEHOLDER_PORTRAIT = {
  src: '/images/placeholder-portrait.svg',
  alt: 'Placeholder portrait photograph',
  width: 900,
  height: 1200,
};

export const siteContent: SiteContent = {
  identity: {
    name: 'Sagar Deshpande',
    tagline: 'Pragmatic. Meticulous. Curious.',
    logo: {
      src: '/images/placeholder-logo.svg',
      alt: 'Placeholder personal logo',
      width: 64,
      height: 64,
    },
  },

  meta: {
    title: 'Sagar Deshpande',
    description:
      '',
    siteUrl: 'https://example.com',
  },

  menu: [
    { href: '/', label: 'Home' },
    { href: '/workflow/', label: 'Workflow' },
  ],

  socials: [
    { platform: 'github', label: 'GitHub profile', href: 'https://github.com/deshpandesagar83' },
    { platform: 'linkedin', label: 'LinkedIn profile', href: 'https://www.linkedin.com/in/sagar-deshpande-b0813b81/' },
  ],

  hero: {
    photo: { src: '/images/sagar_image.jpg', alt: 'Sagar Image', width: 1544, height: 1600 },
    body: [
      'An engineer who learns from every source: books, the internet, AI. Any tool, any era.',
      'Understand → Research → Iterate'
    ],
  },

  comments: {
    heading: 'Comments',
    photo: { ...PLACEHOLDER_PORTRAIT, alt: 'Placeholder secondary photograph' },
    message:
      'Comments are not live yet. A later version backs this section with a real API so visitors can leave a note.',
  },
};
