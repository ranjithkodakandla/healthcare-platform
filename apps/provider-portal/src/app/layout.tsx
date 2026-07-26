import type { Metadata } from 'next';
import { Noto_Sans } from 'next/font/google';
import './globals.css';

const notoSans = Noto_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-noto',
});

export const metadata: Metadata = {
  title: 'Sahayak Provider Portal',
  description: 'India Healthcare Coordination Platform — Provider Portal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={notoSans.variable}>
      <body style={{ fontFamily: 'var(--font-noto), "Noto Sans", sans-serif' }}>{children}</body>
    </html>
  );
}
