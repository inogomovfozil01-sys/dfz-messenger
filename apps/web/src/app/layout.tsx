import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DFZ Messenger',
  description: 'Next-Generation Realtime Messenger',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DFZ Messenger',
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
        <link rel="icon" href="/icon.svg" />
      </head>
      <body className="bg-dfz-bg text-dfz-text selection:bg-dfz-accent selection:text-white">
        {children}
      </body>
    </html>
  );
}
