import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppUpdates } from '../components/layout/AppUpdates';

export const metadata: Metadata = {
  title: 'Telegram Web',
  description: 'Telegram Web is a cloud-based mobile and desktop messaging app with a focus on security and speed.',
  manifest: '/manifest.json',
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
  themeColor: '#0b0f19',
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
      </head>
      <body className="bg-dfz-bg text-dfz-text selection:bg-dfz-accent selection:text-white">
        {children}
        <AppUpdates />
      </body>
    </html>
  );
}
