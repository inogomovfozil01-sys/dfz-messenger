import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppUpdates } from '../components/layout/AppUpdates';

export const metadata: Metadata = {
  title: 'Telegram Web Client',
  description: 'Telegram Web is a cloud-based mobile and desktop messaging app with a focus on security and speed.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Telegram Web Client',
    description: 'Fast, secure, and modern Telegram web messaging client.',
    type: 'website',
    siteName: 'Telegram Web',
    images: [{ url: '/icon.svg', width: 240, height: 240, alt: 'Telegram' }],
  },
  twitter: {
    card: 'summary',
    title: 'Telegram Web Client',
    description: 'Fast, secure, and modern Telegram web messaging client.',
    images: ['/icon.svg'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Telegram',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0e1621',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark">
      <head>
        <link rel="icon" href="/icon.svg?v=2" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/brand/apple-touch-icon.png" />
        <script src="https://telegram.org/js/telegram-web-app.js" async />
      </head>
      <body className="bg-dfz-bg text-dfz-text selection:bg-dfz-accent selection:text-white">
        {children}
        <AppUpdates />
      </body>
    </html>
  );
}
