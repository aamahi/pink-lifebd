'use client';

import { Suspense, useEffect, useRef, useState, type RefObject } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import { Icon } from '@/components/shared/icons/icon';
import { SITE } from '@/core/config/site.config';
import { useCart } from '@/core/stores/cart.store';
import { useWishlist } from '@/core/stores/wishlist.store';
import { assetUrl } from '@/core/utils/asset-url';
import { cn } from '@/core/utils/cn';
import { AnnouncementBar } from './announcement-bar/announcement-bar';
import { MobileDrawer } from './mobile-drawer/mobile-drawer';
import { HEADER_MENU_LINKS, filterLinkHref, type FilterLink } from './nav-links';

/** The design's 24px button: 4px padding around an 18px glyph. */
const ICON_BUTTON =
  'flex size-6 shrink-0 items-center justify-center rounded-sm p-1 text-(--color-header-text) hover:opacity-70 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-(--color-header-text)';

/** The design's bag badge (Figma 15:87), shared by the wishlist count. */
const BADGE_CLASS =
  'absolute left-[14px] top-[-4px] flex size-4 items-center justify-center rounded-full bg-(--color-header-text) text-[10px] font-medium leading-[1.64] text-(--color-header-badge-text)';

/** A 16px badge holds two digits at 10px; past that it would overflow its circle. */
function badgeLabel(n: number): string | null {
  return n === 0 ? null : n > 9 ? '9+' : String(n);
}

/**
 * Pop a badge when its count goes up. Adding from the hero's detail panel
 * otherwise changes one 10px digit in a corner, which reads as nothing.
 */
function useBadgePop(count: number, badge: RefObject<HTMLElement | null>): void {
  const last = useRef(count);
  useEffect(() => {
    const el = badge.current;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (count > last.current && el && !reduced && typeof el.animate === 'function') {
      el.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.45)' }, { transform: 'scale(1)' }],
        { duration: 360, easing: 'cubic-bezier(.3,1.6,.5,1)' },
      );
    }
    last.current = count;
  }, [count, badge]);
}

/**
 * An entry is current on `/shop` when its collection is the URL's, whatever other filters are set:
 * a subset match, so `?collection=bras&size=M` still matches the Bras entry. Every entry shares the
 * `/shop` path, so the path alone would underline all of them at once. (The Angular
 * `routerLinkActiveOptions`: `paths: 'exact'`, `queryParams: 'subset'`.)
 */
function isMenuLinkActive(link: FilterLink, pathname: string, search: URLSearchParams): boolean {
  const here = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (here !== link.path) return false;
  return Object.entries(link.query ?? {}).every(([key, value]) => search.get(key) === value);
}

/**
 * The desktop menu's links. `active` is `null` when the URL is not known yet (the Suspense
 * fallback) -- nothing is underlined then, which is also what a visitor on `/` sees.
 */
function MenuLinks({ active }: { active: ((link: FilterLink) => boolean) | null }) {
  return (
    <>
      {HEADER_MENU_LINKS.map((link) => {
        const isActive = active?.(link) ?? false;
        return (
          <Link
            key={link.label}
            href={filterLinkHref(link)}
            className={cn(
              'relative whitespace-nowrap text-[14px] leading-[1.64] text-(--color-header-text) hover:text-(--color-header-text) hover:opacity-70',
              isActive && 'font-medium',
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            {link.label}
            {isActive ? (
              <span
                className="absolute left-0 top-[calc(100%+2px)] block h-[0.6px] w-full bg-(--color-header-text) [mask:url(/icons/nav-active-underline.svg)_center/100%_100%_no-repeat]"
                aria-hidden="true"
              ></span>
            ) : null}
          </Link>
        );
      })}
    </>
  );
}

/**
 * Split out of `Header` because `useSearchParams()` makes the nearest `<Suspense>` boundary
 * client-render on a statically prerendered page. Left in `Header`, that boundary would be the whole
 * app; here it is two links' worth of underline.
 */
function ActiveMenuLinks() {
  const pathname = usePathname();
  const search = useSearchParams();
  return <MenuLinks active={(link) => isMenuLinkActive(link, pathname, search)} />;
}

/**
 * Site header: announcement bar, then the main bar from Figma node 15:58 --
 * logo, centred menu, and the search / account / wishlist / bag icon group.
 *
 * Geometry is the design's, measured at a 1440px frame:
 * - Side padding is 80px from `lg` up, matching the announcement bar, and the
 *   row is fluid rather than capped -- a deliberate change from the design's
 *   100px / 1240px column, asked for after the first build. The menu is
 *   absolutely centred so it sits on the page's centre line; in flow it would
 *   centre on whatever the logo and icon group happen to leave over.
 * - The menu text sits 9.3px below the row top, not 8px: in the design the
 *   active item is a column (text, 2px gap, 0.6px rule) 2.6px taller than the
 *   others and `items-center` pushes the others down 1.3px. Here the rule is
 *   absolutely positioned so no item moves when the active one changes, and
 *   9.3px keeps the inactive items -- four of the five -- where the design has
 *   them.
 * - The logo frame is 144x51 inside a 40px row, centred 0.5px low; `mt-px` on a
 *   flex-centred item moves its centre by half that. The image is fitted inside
 *   that frame (`object-contain`, left-aligned), so a logo drawn on the frame's
 *   own 144x51 proportions fills it; the design's original logo was a square PNG
 *   cropped by percentages, which pushed any other logo out of the frame.
 *
 * Icons are the design's SVGs applied as CSS masks over a token colour rather
 * than as `<img>`, because their stroke is a literal `#0B0B0B` and would vanish
 * on the dark header.
 *
 * The heart opens `/wishlist` and carries the same badge as the bag, counting
 * the wishlist.
 *
 * The root `<header>` is a direct child of `MainLayout`'s flex column (the Angular `<app-header>`
 * host element sat between them), which is what lets `sticky top-0` actually stick: a sticky
 * element only moves inside its parent's box, and the host was exactly as tall as the header.
 * `data-site-header` is the stable hook for code that needs the header's box (the hero rail's
 * lifted-piece overlay measures its bottom edge) -- it replaces the `app-header header` selector.
 */
export function Header() {
  const cart = useCart();
  const wishlist = useWishlist();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const cartBadge = useRef<HTMLSpanElement>(null);
  const wishlistBadge = useRef<HTMLSpanElement>(null);
  useBadgePop(cart.itemCount, cartBadge);
  useBadgePop(wishlist.count, wishlistBadge);

  const cartBadgeLabel = badgeLabel(cart.itemCount);
  const wishlistBadgeLabel = badgeLabel(wishlist.count);

  return (
    <header className="sticky top-0 z-40" data-site-header="">
      <AnnouncementBar />

      <div className="h-14 border-b-[0.8px] border-(--color-header-border) bg-(--color-header-bg) px-4 pt-2 lg:px-20 font-jakarta text-(--color-header-text)">
        <div className="relative flex h-10 w-full items-center">
          <Link
            href="/"
            className="relative mt-px block h-[51px] w-[144px] min-w-0 shrink overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- an SVG logo: nothing for the image optimiser to do */}
            <img
              src={assetUrl(SITE.logo.src)}
              alt={SITE.logo.alt}
              className="h-full w-full object-contain object-left"
            />
          </Link>

          <nav
            className="absolute left-1/2 top-[9.3px] hidden -translate-x-1/2 items-center gap-12 lg:flex"
            aria-label="Primary"
          >
            <Suspense fallback={<MenuLinks active={null} />}>
              <ActiveMenuLinks />
            </Suspense>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-3 sm:gap-4">
            <Link href="/search" className={ICON_BUTTON}>
              <span
                className="block size-[18px] shrink-0 bg-(--color-header-text) [mask:url(/icons/search.svg)_center/100%_100%_no-repeat]"
                aria-hidden="true"
              ></span>
              <span className="sr-only">Search</span>
            </Link>
            <Link href="/account/portal" className={ICON_BUTTON}>
              <span
                className="block size-[18px] shrink-0 bg-(--color-header-text) [mask:url(/icons/account.svg)_center/100%_100%_no-repeat]"
                aria-hidden="true"
              ></span>
              <span className="sr-only">Account</span>
            </Link>
            <Link href="/wishlist" className={`${ICON_BUTTON} relative`}>
              <span
                className="block size-[18px] shrink-0 bg-(--color-header-text) [mask:url(/icons/heart.svg)_center/100%_100%_no-repeat]"
                aria-hidden="true"
              ></span>
              {wishlistBadgeLabel ? (
                <span ref={wishlistBadge} className={BADGE_CLASS} aria-hidden="true">
                  {wishlistBadgeLabel}
                </span>
              ) : null}
              <span className="sr-only">Wishlist, {wishlist.count} items</span>
            </Link>
            <Link href="/cart" className={`${ICON_BUTTON} relative`}>
              <span
                className="block size-[18px] shrink-0 bg-(--color-header-text) [mask:url(/icons/bag.svg)_center/100%_100%_no-repeat]"
                aria-hidden="true"
              ></span>
              {cartBadgeLabel ? (
                <span ref={cartBadge} className={BADGE_CLASS} aria-hidden="true">
                  {cartBadgeLabel}
                </span>
              ) : null}
              <span className="sr-only">Cart, {cart.itemCount} items</span>
            </Link>

            <button
              type="button"
              className={`${ICON_BUTTON} lg:hidden`}
              aria-expanded={drawerOpen}
              aria-controls="mobile-nav"
              onClick={() => setDrawerOpen(!drawerOpen)}
            >
              <span className="sr-only">{drawerOpen ? 'Close menu' : 'Open menu'}</span>
              <Icon name={drawerOpen ? 'close' : 'menu'} size={18} />
            </button>
          </div>
        </div>
      </div>

      <MobileDrawer open={drawerOpen} onClosed={() => setDrawerOpen(false)} />
    </header>
  );
}
