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
  authors: [{ name: 'Mint Platforms (Pty) Ltd' }],
  creator: 'Mint Platforms (Pty) Ltd',
  openGraph: {
    type:        'website',
    locale:      'en_ZA',
    url:         'https://algolend.co.za',
    siteName:    'AlgoLend',
    title:       'AlgoLend — End-to-End Lending Platform for South African Credit Providers',
    description: 'A fully branded, end-to-end credit management platform for South African corporate lenders. Credit engine, KYC, open banking, e-contracts, and SACRRA reporting — configured to your exact credit policy.',
    images: [{
      url:    'https://algolend.co.za/og.png',
      width:  1200,
      height: 630,
      alt:    'AlgoLend — Lending Platform',
    }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'AlgoLend — Lending Platform for SA Credit Providers',
    description: 'End-to-end credit management platform — branded to you, compliant by default.',
    images:      ['https://algolend.co.za/og.png'],
  },
  robots: {
    index:  true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: 'https://algolend.co.za',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '16x16', type: 'image/x-icon' },
    ],
    shortcut: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
