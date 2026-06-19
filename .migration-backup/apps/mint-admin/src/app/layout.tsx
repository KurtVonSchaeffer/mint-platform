import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets:  ['latin'],
  weight:   ['300', '400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display:  'swap',
});

const jetbrains = JetBrains_Mono({
  subsets:  ['latin'],
  weight:   ['400', '600'],
  variable: '--font-jetbrains',
  display:  'swap',
});

export const metadata: Metadata = {
  title:       'AlgoLend — Admin Console',
  description: 'Internal platform management for Mint Platforms',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%237C3AED'/><path d='M8 24 L16 8 L24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linejoin='round'/></svg>",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      {/* No-flash: apply stored theme before first paint */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('mint-theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}` }} />
      </head>
      <body className="antialiased">
        <a href="#main" className="skip-nav">Skip to main content</a>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
