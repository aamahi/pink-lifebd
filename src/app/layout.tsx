import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

// Self-hosted fonts (@fontsource, per-weight files) -- no Google Fonts request anywhere. A QUIC/HTTP-3
// interception failure at fonts.gstatic.com on some Bangladeshi ISPs once took font rendering down
// app-wide with no server-side signal, which is why these stay local.
import '@fontsource/noto-sans/400.css';
import '@fontsource/noto-sans/600.css';
import '@fontsource/noto-sans/700.css';
import '@fontsource/noto-sans-bengali/400.css';
import '@fontsource/noto-sans-bengali/700.css';
// The announcement bar's face. Only the two weights it uses.
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
// The home "Featured collection" title's display face. One weight.
import '@fontsource/bodoni-moda/500.css';
// Self-hosted icon font, for the same reason as the fonts above.
import 'material-symbols/outlined.css';

import './globals.css';

import { MainLayout } from '@/components/layout/main-layout';
import { environment } from '@/core/config/env';
import { SITE } from '@/core/config/site.config';

// The pre-boot title and description a link-preview crawler reads; pages override them with
// `pageMetadata()` (src/core/seo.ts). Keep these accurate to the site, not to any one page.
export const metadata: Metadata = {
  metadataBase: new URL(environment.siteUrl),
  title: SITE.name,
  description: SITE.description,
  // The SVG is what current browsers use (sharp at any size); the .ico covers the rest, and the
  // apple-touch-icon is the full-bleed 180px square iOS rounds itself. All three are the script "P"
  // of the logo, since the full "Pink / LIFE" lockup is unreadable at 16px.
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180' },
  },
};

// Light mode only, for now: `light-theme` on <html> is the class tokens.css's
// `prefers-color-scheme: dark` block is guarded against, and `colorScheme: 'light'` keeps native
// controls and scrollbars light to match. Delete both to follow the OS again.
export const viewport: Viewport = {
  themeColor: '#179d55',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="light-theme">
      <body className="antialiased">
        {/*
          The skip link is first in the DOM and only visible on focus. Without it every keyboard
          user tabs through the whole nav on every page before reaching content. Its target,
          `#main`, lives inside MainLayout.
        */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>

        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}
