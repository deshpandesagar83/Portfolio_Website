/** A referenced image. width/height are required: they reserve layout space
 *  and prevent shift while the image loads. Both site photos are portrait. */
export type ImageRef = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

/** `href` must be a root-relative path with a trailing slash, matching
 *  next.config.ts's `trailingSlash: true`, and must resolve to a page that
 *  exists. content/site.test.ts enforces both. */
export type MenuItem = {
  href: string;
  label: string;
};

export type SocialLink = {
  platform: string;
  /** Accessible name for the link, e.g. "GitHub profile". */
  label: string;
  href: string;
};

export type SiteContent = {
  identity: {
    name: string;
    tagline: string;
    logo: ImageRef;
  };
  meta: {
    title: string;
    description: string;
    /** Absolute origin, used for metadataBase, OG urls, and the sitemap. */
    siteUrl: string;
  };
  menu: MenuItem[];
  socials: SocialLink[];
  /** The hero has no heading of its own — its heading is the page <h1>,
   *  composed from identity.name and identity.tagline. */
  hero: {
    photo: ImageRef;
    body: string[];
  };
  comments: {
    heading: string;
    photo: ImageRef;
    message: string;
  };
};

/** A unit of a project's explanation. `steps` is a real ordered sequence:
 *  a workflow's numbering is meaning, not decoration. */
export type WorkflowBlock =
  | { kind: 'para'; text: string }
  | { kind: 'steps'; items: string[] }
  | { kind: 'note'; text: string };

export type WorkflowProject = {
  /** Anchor id and React key — /workflow/#slug. Lowercase, digits, hyphens. */
  slug: string;
  /** The panel's title: the project name. */
  name: string;
  /** The diagram or gif. Landscape, unlike the site's portrait photos. */
  image: ImageRef;
  body: WorkflowBlock[];
};

export type WorkflowContent = {
  meta: { title: string; description: string };
  /** The page <h1>. */
  heading: string;
  projects: WorkflowProject[];
};
