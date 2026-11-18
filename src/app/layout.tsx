import type { Metadata } from 'next';
import { DM_Sans, Italiana } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const italiana = Italiana({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-italiana',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Eng. Nahil Wijesuriya FIMarEST | Endowment Fund',
  description:
    'The Eng. Nahil Wijesuriya FIMarEST Endowment Fund — honouring a legacy of vision, service, and opportunity.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${italiana.variable}`}>
      <head>
        <link rel="preconnect" href="https://www.eastwest.lk" />
      </head>
      <body>{children}</body>
    </html>
  );
}
