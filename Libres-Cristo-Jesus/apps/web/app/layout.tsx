import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { ServiceWorkerRegistration } from '@/components/pwa/service-worker-registration';

/**
 * doc18 §4: "Inter only, never a second family." `tokens.css` already names
 * Inter in `--font-sans`, but a design token cannot fetch a webfont — without
 * this the app silently fell back to the system UI font on every machine
 * without Inter installed. `next/font` self-hosts it (no request to Google at
 * runtime) and `globals.css` binds the generated variable back onto the token.
 */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const APP_NAME = 'LCJ Connect';
const APP_DESCRIPTION =
  'Plataforma de gestión de Casas de Paz de la Iglesia Cristiana Libres en Cristo Jesús.';

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    // Screens set their own `title`; this keeps the product name on every tab.
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: 'default',
  },
  // Internal tool behind a login: there is nothing here for a crawler.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Matches the manifest's `theme_color` — a mismatch shows as a colour seam
  // between the browser chrome and the installed app's status bar.
  themeColor: '#0b3d6d',
  // Lets the layout reach under the notch/home indicator once installed.
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
