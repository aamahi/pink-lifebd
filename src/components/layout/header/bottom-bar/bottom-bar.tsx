'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/core/utils/cn';
import { Icon } from '@/components/shared/icons/icon';
import { BOTTOM_BAR_LINKS, isLinkActive } from '../nav-links';

function iconFor(path: string): string {
  if (path === '/') return 'home';
  if (path === '/shop') return 'storefront';
  if (path === '/cart') return 'cart';
  return 'person';
}

/**
 * Fixed bottom nav for small screens -- the app-like tab bar pattern most demo
 * clients recognise from a phone, and the reason `--bottom-bar-height`
 * (`src/styles/tokens.css`) already exists as a token: this is its one consumer.
 *
 * `Icon` falls back to a Material Symbols ligature for any name that is not
 * one of the hand-drawn glyphs in `icon-registry.ts` (`icon.tsx`'s own header
 * comment). `home`, `storefront` and `person` below take that fallback path -- a
 * `console.warn` in dev mode is the intended behaviour for a name that was never
 * meant to hit the registry, not a defect to silence. `cart` is the one path
 * left on the registry's own hand-drawn glyph, now that `/cart` (shard 3B) has
 * its own bottom-bar entry and no longer shares an icon with `/shop`.
 *
 * The root carries the Angular host's classes and its `padding-bottom` inline style.
 */
export function BottomBar() {
  const pathname = usePathname();

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-(--color-border) bg-(--color-surface) md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {BOTTOM_BAR_LINKS.map((link) => (
        <Link
          key={link.path}
          href={link.path}
          className={cn(
            'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium text-(--color-text-muted)',
            isLinkActive(link.path, pathname, link.path === '/') && 'text-primary',
          )}
        >
          <Icon name={iconFor(link.path)} size={20} />
          {link.label}
        </Link>
      ))}
    </div>
  );
}
