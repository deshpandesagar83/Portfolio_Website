// ---------------------------------------------------------------------------
// TODO: replace before launch.
//   1. contactEmail — a real address you monitor. It is the named point of
//      contact PIPEDA's accountability principle asks for.
//   2. lastUpdated — bump it whenever the text below changes.
// Keep this page true to the infra: the retention figure must match the
// ExpireCloudFrontLogs lifecycle rule in infra/cloudformation/s3.yaml, and the
// region must match the bucket's region. Update both together.
// ---------------------------------------------------------------------------

export type PrivacySection = {
  heading: string;
  paragraphs?: string[];
  items?: string[];
};

export type PrivacyContent = {
  meta: { title: string; description: string };
  heading: string;
  lastUpdated: string;
  contactEmail: string;
  sections: PrivacySection[];
};

export const privacyContent: PrivacyContent = {
  meta: {
    title: 'Privacy Policy',
    description: 'What this site logs about visitors, why, and for how long.',
  },
  heading: 'Privacy Policy',
  lastUpdated: 'November 7, 2026',
  contactEmail: 'deshpandesagar83@gmail.com',
  sections: [
    {
      heading: 'What this site collects',
      paragraphs: [
        'This is a personal portfolio website. It has no accounts, no forms, no analytics, and no advertising. The only information collected is the access log that the content delivery network (Amazon CloudFront) writes each time a page or file is requested. Each entry contains:',
      ],
      items: [
        'Your IP address, which is personal information under Canadian privacy law',
        'The date and time of the request',
        'The address of the page or file requested',
        'Your browser and device type (the user agent)',
        'The page that linked you here, if your browser sent it (the referrer)',
        'The response status and size, and which CloudFront location served you',
      ],
    },
    {
      heading: 'Why it is collected',
      paragraphs: [
        'Logs are used only to keep the site secure, to troubleshoot problems, and to understand roughly how much traffic it receives. They are not used to identify individual visitors, build profiles, or advertise to you.',
      ],
    },
    {
      heading: 'Cookies and tracking',
      paragraphs: [
        'This site does not set cookies and does not use third-party trackers. If that changes, this policy will be updated first.',
      ],
    },
    {
      heading: 'How long it is kept',
      paragraphs: [
        'Log files are deleted automatically after 90 days.',
      ],
    },
    {
      heading: 'Where it is stored and who can see it',
      paragraphs: [
        'Logs are stored in a private Amazon Web Services (AWS) S3 bucket in the Canada (Central) region. AWS acts as a service provider and handles the data on my behalf; as with any cloud provider, foreign courts or authorities may be able to demand access under their own laws. The bucket is not publicly readable, and only I can access the logs. I do not sell or share this information.',
      ],
    },
    {
      heading: 'Your rights',
      paragraphs: [
        'You can ask me what log information, if any, is held about you, and ask for it to be deleted. Because logs are keyed by IP address, I may need you to tell me the IP address and approximate dates in question. I will respond within 30 days.',
        'If you are not satisfied with my response, you can contact the Office of the Privacy Commissioner of Canada at priv.gc.ca.',
      ],
    },
    {
      heading: 'Changes to this policy',
      paragraphs: [
        'Any changes will be posted on this page with a new "last updated" date.',
      ],
    },
  ],
};
