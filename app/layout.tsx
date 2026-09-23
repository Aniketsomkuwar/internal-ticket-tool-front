import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import type { ReactNode } from 'react';

import './globals.css';

/**
 * IBM Plex carries true tabular figures, which the mono weight earns its place
 * through: amounts, ticket references, timestamps and staff ids are read
 * character by character. Exposed as `--font-plex-sans` / `--font-plex-mono`,
 * which `styles/tokens.css` composes into the interface stacks.
 */
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-plex-sans',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-plex-mono',
});

export const metadata: Metadata = {
  title: {
    default: 'Claim Desk',
    template: '%s | Claim Desk',
  },
  description: 'Ticketing and organizational work management for small development teams.',
};

/**
 * Set `data-theme` before first paint. Inline rather than a module because
 * anything deferred paints light first and then swaps - a white flash on every
 * navigation. Reads the stored choice and falls back to the system preference;
 * `styles/tokens.css` holds the only dark palette.
 */
const THEME_SCRIPT = `(function(){try{var s=window.localStorage.getItem('cd-theme');var t=s==='light'||s==='dark'?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // `suppressHydrationWarning` is required: the pre-paint script above owns the
    // `data-theme` attribute, so the DOM legitimately differs from the server
    // markup when the visitor's preference is dark.
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="bg-canvas text-fg">
        {/* First focusable element in the document; `<main>` carries
            `tabIndex={-1}` so the link moves focus, not only the scroll. */}
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        {/* The shell in T06 renders inside this main region. */}
        <main id="main" tabIndex={-1}>
          {children}
        </main>
      </body>
    </html>
  );
}
