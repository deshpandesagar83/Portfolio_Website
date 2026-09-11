import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { siteContent } from '@/content/site';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteContent.meta.siteUrl),
  title: siteContent.meta.title,
  description: siteContent.meta.description,
  openGraph: {
    type: 'profile',
    title: siteContent.meta.title,
    description: siteContent.meta.description,
    url: siteContent.meta.siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: siteContent.meta.title,
    description: siteContent.meta.description,
  },
};

const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: siteContent.identity.name,
  description: siteContent.identity.tagline,
  url: siteContent.meta.siteUrl,
  sameAs: siteContent.socials.map((social) => social.href),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="font-sans">
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(personJsonLd).replace(/</g, '\\u003c'),
          }}
        />
      </body>
    </html>
  );
}
