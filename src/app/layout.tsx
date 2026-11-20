import type { Metadata } from 'next';
import { Newsreader, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plus-jakarta-sans',
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
    <html lang="en" className={`${newsreader.variable} ${plusJakartaSans.variable}`}>
      <head>
        <link rel="preconnect" href="https://www.eastwest.lk" />
      </head>
      <body>{children}</body>
    </html>
  );
}
