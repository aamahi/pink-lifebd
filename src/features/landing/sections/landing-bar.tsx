'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/shared/brand-logo';
import { Icon } from '@/components/shared/icons/icon';
import { Button } from '@/components/ui/button';
import { SITE } from '@/core/config/site.config';
import { useCart } from '@/core/stores/cart.store';

/** True while the element with this id is on screen. False until it is known to be. */
function useOnScreen(id: string): boolean {
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    const el = document.getElementById(id);
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setOnScreen(entry.isIntersecting);
      },
      { threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [id]);
  return onScreen;
}

/**
 * The landing page's whole header: the logo, the cash-on-delivery promise, and the cart. Nothing
 * else, because every link here that leaves the page is a link away from the order.
 */
export function LandingBar() {
  const cart = useCart();
  return (
    <header className="sticky top-0 z-40 border-b border-(--color-rail-border) bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label={`${SITE.name}, home`} className="shrink-0">
          <BrandLogo className="h-11 w-auto" />
        </Link>

        <p className="hidden items-center gap-2 text-sm font-medium text-(--color-hero-ink) md:flex">
          <Icon name="local_shipping" size={20} />
          Cash on Delivery all over Bangladesh
        </p>

        <Link
          href="/cart"
          className="relative inline-flex size-10 items-center justify-center rounded-full text-(--color-rail-fg) outline-none transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-(--color-rail-fg)"
          aria-label={cart.itemCount > 0 ? `Cart, ${cart.itemCount} items` : 'Cart'}
        >
          <Icon name="cart" size={22} />
          {cart.itemCount > 0 && (
            <span className="absolute right-0 top-0 flex size-5 items-center justify-center rounded-full bg-(--color-lp-accent) text-[11px] font-semibold text-white">
              {cart.itemCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}

/**
 * The phone's order button, pinned to the foot of the screen. It steps aside while the picker
 * itself is on screen: there the tiles carry the order buttons, and a bar over them would cover
 * the one a thumb is reaching for.
 */
export function StickyOrderBar({ label }: { readonly label: string }) {
  const pickerVisible = useOnScreen('order');
  return (
    <>
      {/* Room for the bar, so it never covers the last line of the page. */}
      <div aria-hidden="true" className="h-20 md:hidden"></div>
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-(--color-rail-border) bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur transition-transform duration-200 motion-reduce:transition-none md:hidden ${
          pickerVisible ? 'translate-y-full' : ''
        }`}
        aria-hidden={pickerVisible}
      >
        <Button
          href="#order"
          variant="accent"
          size="lg"
          block
          tabIndex={pickerVisible ? -1 : undefined}
        >
          {label}
        </Button>
      </div>
    </>
  );
}
