import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppUpdates } from '../components/layout/AppUpdates';

export const metadata: Metadata = {
  title: 'DFZ Messenger',
  description: 'DFZ Messenger is a cloud-based mobile and desktop messaging app with a focus on security and speed.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'DFZ Messenger',
    description: 'Fast, secure, and modern DFZ web messaging client.',
    type: 'website',
    siteName: 'DFZ Messenger',
    images: [{ url: '/icon.svg', width: 240, height: 240, alt: 'DFZ' }],
  },
  twitter: {
    card: 'summary',
    title: 'DFZ Messenger',
    description: 'Fast, secure, and modern DFZ web messaging client.',
    images: ['/icon.svg'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DFZ',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#101113',
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
