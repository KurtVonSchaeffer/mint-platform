import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AlgoLend — End-to-End Lending Platform for South African Credit Providers',
  description:
    'A fully branded, end-to-end credit management platform for South African corporate lenders. Credit engine, KYC, open banking, e-contracts, SACRRA reporting — configured to your credit policy.',
  keywords: ['lending platform', 'credit management', 'South Africa', 'NCA compliance', 'SACRRA', 'corporate lending', 'white-label fintech'],
  authors: [{ name: 'MINT Platforms (Pty) Ltd' }],
  creator: 'MINT Platforms (Pty) Ltd',
  openGraph: {
    type:        'website',
    locale:      'en_ZA',
    url:         'https://algolend.co.za',
    siteName:    'AlgoLend',
    title:       'AlgoLend — End-to-End Lending Platform for South African Credit Providers',
    description: 'A fully branded, end-to-end credit management platform for South African corporate lenders. Credit engine, KYC, open banking, e-contracts, and SACRRA reporting — configured to your exact credit policy.',
    images: [{
      url:    'https://algolend.co.za/api/og',
      width:  1200,
      height: 630,
      alt:    'AlgoLend — Lending Platform',
    }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'AlgoLend — Lending Platform for SA Credit Providers',
    description: 'End-to-end credit management platform — branded to you, compliant by default.',
    images:      ['https://algolend.co.za/api/og'],
  },
  robots: {
    index:  true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: 'https://algolend.co.za',
  },
  verification: {
    google: 'n7kDIxVL-h_NQs9FbxmuJvrwe0vDi1Bd5IyykRdPvlI',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '16x16', type: 'image/x-icon' },
    ],
    shortcut: '/favicon.ico',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://algolend.co.za/#organization',
      name: 'MINT Platforms (Pty) Ltd',
      url: 'https://algolend.co.za',
      logo: {
        '@type': 'ImageObject',
        url: 'https://algolend.co.za/algolend-logo.svg',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'sales',
        areaServed: 'ZA',
        availableLanguage: 'English',
      },
      areaServed: 'ZA',
      description: 'End-to-end credit management platform for South African corporate lenders.',
    },
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://algolend.co.za/#software',
      name: 'AlgoLend',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      url: 'https://algolend.co.za',
      publisher: { '@id': 'https://algolend.co.za/#organization' },
      description: 'Fully branded lending platform — credit engine, KYC, open banking, e-contracts, and SACRRA reporting configured to your credit policy.',
      featureList: [
        'Credit Engine',
        'KYC & Identity Verification',
        'Open Banking (TruID)',
        'E-Contracts & Digital Signatures',
        'SACRRA Bureau Reporting',
        'NCA Compliance',
        'POPIA Data Protection',
      ],
      audience: {
        '@type': 'Audience',
        audienceType: 'Corporate Lenders',
        geographicArea: { '@type': 'Country', name: 'South Africa' },
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" className={`${geist.variable} ${geistMono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
