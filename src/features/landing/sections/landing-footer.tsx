import Link from 'next/link';
import { SITE } from '@/core/config/site.config';

/** The foot of every ad page: the promise again, and the only links that leave the page. */
export function LandingFooter() {
  return (
    <footer className="border-t border-(--color-rail-border) bg-white px-4 py-8 text-sm text-(--color-rail-muted) sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p>{SITE.name}. Cash on Delivery all over Bangladesh.</p>
        <nav aria-label="More from the shop" className="flex flex-wrap justify-center gap-x-5">
          <Link href="/shop" className="inline-block py-2 text-(--color-rail-fg) hover:underline">
            Shop everything
          </Link>
          <Link
            href="/contact-us"
            className="inline-block py-2 text-(--color-rail-fg) hover:underline"
          >
            Contact
          </Link>
          <Link
            href="/privacy-policy"
            className="inline-block py-2 text-(--color-rail-fg) hover:underline"
          >
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
