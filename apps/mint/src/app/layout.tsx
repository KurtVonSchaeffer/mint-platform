import type { Metadata } from 'next';
import { Instrument_Serif, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const serif = Instrument_Serif({
  subsets:  ['latin'],
  style:    ['normal', 'italic'],
  weight:   '400',
  variable: '--font-serif',
  display:  'swap',
});

const sans = DM_Sans({
  subsets:  ['latin'],
  weight:   ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display:  'swap',
});

const mono = JetBrains_Mono({
  subsets:  ['latin'],
  weight:   ['400', '600'],
  variable: '--font-mono',
  display:  'swap',
});

export const metadata: Metadata = {
  title:       'Mint — Find Your Best Business Loan',
  description: 'One application. Every lender. The best rate in seconds.',
  openGraph: {
    title:       'Mint — Business Loan Comparison',
    description: 'One credit check. Multiple lender offers. Ranked by best deal.',
    type:        'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
