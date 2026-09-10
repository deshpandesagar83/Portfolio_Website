/** A referenced image. width/height are required: they reserve layout space
 *  and prevent shift while the image loads. Both site photos are portrait. */
export type ImageRef = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

/** `id` must match the anchor id of a section rendered on the page.
 *  app/page.test.tsx enforces this. */
export type MenuItem = {
  id: string;
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
