import Link from 'next/link';

import { BrandLogo } from '@/components/shared/brand-logo';
import { SITE } from '@/core/config/site.config';
import { FOOTER_LINKS, filterLinkHref } from '../header/nav-links';

/** Outline icons (24-unit box) for the social links, keyed by lower-cased label. */
const SOCIAL_ICONS: Readonly<Record<string, readonly string[]>> = {
  instagram: [
    'M7 2.5h10A4.5 4.5 0 0 1 21.5 7v10a4.5 4.5 0 0 1-4.5 4.5H7A4.5 4.5 0 0 1 2.5 17V7A4.5 4.5 0 0 1 7 2.5Z',
    'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    'M17.5 6.5h.01',
  ],
  youtube: [
    'M2.6 7.6a3 3 0 0 1 2.5-2.6C7 4.7 9.5 4.6 12 4.6s5 .1 6.9.4a3 3 0 0 1 2.5 2.6c.2 1.4.3 2.9.3 4.4s-.1 3-.3 4.4a3 3 0 0 1-2.5 2.6c-1.9.3-4.4.4-6.9.4s-5-.1-6.9-.4a3 3 0 0 1-2.5-2.6C2.4 15 2.3 13.5 2.3 12s.1-3 .3-4.4Z',
    'M10 9.2 15 12l-5 2.8Z',
  ],
  linkedin: [
    'M6 2.5h12A3.5 3.5 0 0 1 21.5 6v12a3.5 3.5 0 0 1-3.5 3.5H6A3.5 3.5 0 0 1 2.5 18V6A3.5 3.5 0 0 1 6 2.5Z',
    'M7.5 10.5V17M7.5 7.3v.01M11.5 17v-6.5M11.5 13.5a3 3 0 0 1 5 0V17',
  ],
  facebook: [
    'M14.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.6 1.6-1.6h1.5V4.3a19 19 0 0 0-2.3-.1c-2.3 0-3.8 1.4-3.8 3.9v2.4H8.9v3h2.6V21',
  ],
};

function socialIcon(label: string): readonly string[] | null {
  return SOCIAL_ICONS[label.toLowerCase()] ?? null;
}

const WORDMARK = SITE.logo.alt;

/**
 * Site footer, on black, as small as it can be: the store's name, one row of links, the social
 * icons, and the copyright line. No newsletter, no tagline, no contact block -- the Contact page
 * has those, and the footer is the last thing on every page, so a tall one only makes a phone
 * scroll for nothing.
 *
 * The name is `SITE.logo.alt`, the brand as the header logo spells it, and the social links come
 * from `SITE.social` (brand seam, rule 2). Links come from `nav-links.ts`; see `FOOTER_LINKS`.
 *
 * Room for the fixed phone bottom bar is not made here: `MainLayout` puts a spacer the bar's height
 * after the footer, so the copyright line is never covered.
 */
export function Footer() {
  // Read at render. A demo screenshotted across a New Year would show a stale year, which is a trade
  // nobody minds against re-evaluating this every tick. `suppressHydrationWarning` on the <p> below
  // covers the one real hazard of a render-time clock: a statically prerendered page whose HTML was
  // built in December and is hydrated in January.
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 bg-(--color-rail-fg) font-jakarta text-(--color-rail-bg)">
      <div className="mx-auto w-full max-w-[1320px] px-4 py-8 lg:px-20">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <Link
            href="/"
            className="block h-[51px] w-[144px] outline-none focus-visible:ring-2 focus-visible:ring-(--color-rail-ring)"
          >
            <BrandLogo onDark className="h-full w-full object-contain object-left" />
          </Link>

          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {FOOTER_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    className="text-white/75 outline-none transition-colors hover:text-white focus-visible:text-white focus-visible:underline"
                    href={filterLinkHref(link)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <ul className="flex gap-3">
            {SITE.social.map((s) => {
              const paths = socialIcon(s.label);
              return (
                <li key={s.href}>
                  <a
                    className="inline-flex size-9 items-center justify-center rounded-full border border-white/50 text-white outline-none transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white"
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                  >
                    {paths ? (
                      <svg
                        viewBox="0 0 24 24"
                        className="size-[18px]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        {paths.map((d, i) => (
                          <path key={i} d={d} />
                        ))}
                      </svg>
                    ) : (
                      <span className="text-xs font-semibold" aria-hidden="true">
                        {s.label.charAt(0)}
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        <p
          className="mt-6 border-t border-white/15 pt-5 text-xs text-white/60"
          suppressHydrationWarning
        >
          © {year} {WORDMARK}. All rights reserved
        </p>
      </div>
    </footer>
  );
}
