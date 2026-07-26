import type { Metadata, Viewport } from 'next';
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
  title: 'Admin Console — India Healthcare Coordination Platform',
  description: 'Sahayak internal Admin Console — internal staff only',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={notoSans.variable}>
      <body style={{ fontFamily: 'var(--font-noto), "Noto Sans", sans-serif' }}>{children}</body>
    </html>
  );
}
