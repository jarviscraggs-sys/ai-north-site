import type { Metadata } from 'next';
import './globals.css';
import SessionProvider from '@/components/SessionProvider';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';

export const metadata: Metadata = {
  title: 'ClearClaim — Construction Invoice Management',
  description: 'Construction invoice management platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0a0f1e" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ClearClaim" />
      </head>
      <body>
        <ServiceWorkerRegistrar />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
