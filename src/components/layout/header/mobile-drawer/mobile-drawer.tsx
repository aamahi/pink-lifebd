'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/core/utils/cn';
import { NAV_LINKS, isLinkActive } from '../nav-links';

export interface MobileDrawerProps {
  open: boolean;
  /**
   * The Angular output was named `closed`, not `close` -- `@angular-eslint/no-output-native` rejects
   * an output aliased to a real DOM event name, which `close` is (the `<dialog>` element's own close
   * event). Kept as `onClosed` so the name still reads the same way across the port.
   */
  onClosed: () => void;
}

/**
 * The mobile nav panel, extracted out of `header.tsx` so the 500-line file cap does not force the
 * drawer and the desktop bar to fight over the same file's budget.
 *
 * Renders `NAV_LINKS` directly rather than accepting it as a prop, so it and the desktop bar stay
 * on one source of truth.
 *
 * Conditional rendering, not CSS-hidden: a drawer that stays in the DOM off-screen is still
 * focusable and still read out by a screen reader, so a keyboard user tabs through an invisible
 * menu on every page. Removing the panel from the DOM when closed is what makes that impossible
 * rather than merely unlikely.
 */
export function MobileDrawer({ open, onClosed }: MobileDrawerProps) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <nav
      id="mobile-nav"
      className="border-t border-(--color-border) lg:hidden"
      aria-label="Primary"
    >
      {NAV_LINKS.map((link) => (
        <Link
          key={link.path}
          href={link.path}
          onClick={onClosed}
          className={cn(
            'block px-4 py-3 text-sm font-medium text-(--color-text) hover:bg-black/5',
            isLinkActive(link.path, pathname, link.path === '/') && 'text-primary',
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
