'use client';

import type { Product } from '@/core/data/catalog.model';
import { useCart } from '@/core/stores/cart.store';
import { useToast } from '@/core/stores/toast.store';
import { useWishlist } from '@/core/stores/wishlist.store';
import { formatMoney } from '@/core/utils/money';
import { PageHeader } from '@/components/shared/navigation/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Img } from '@/components/ui/image';

/**
 * Wishlist, at `/wishlist`: everything saved with a heart, each with Add to
 * cart and Remove. A top-level page, so no Back control.
 *
 * Two states, not four. The wishlist store is in-memory and never requests
 * anything, so there is no loading to show and nothing that can fail; a
 * loading or failed branch here would be one no visitor could ever reach,
 * which is the kind `.claude/rules/demo-craft.md` rule 4 says is never tested.
 * When a backend owns the wishlist, it gains a load and both branches with it,
 * the way the cart's `hydrate()` gives `/cart` its own.
 *
 * Moving to the cart keeps the item saved, as most shops do; Remove is the
 * one way off the list.
 */
export function Wishlist() {
  const wishlist = useWishlist();
  const cart = useCart();
  const toast = useToast();

  function moveToCart(product: Product): void {
    cart.add(product);
    toast.show(`${product.name} added to cart`, { tone: 'success' });
  }

  return (
    <section className="page-shell max-w-3xl py-10">
      <PageHeader
        title="Wishlist"
        subtitle={wishlist.count === 1 ? '1 saved item' : wishlist.count + ' saved items'}
      />

      {wishlist.items.length === 0 ? (
        <EmptyState
          className="mt-6 block"
          title="Your wishlist is empty"
          hint="Tap the heart on any piece to save it here for later."
        >
          <Button href="/">Browse the rail</Button>
        </EmptyState>
      ) : (
        <ul className="mt-6 flex flex-col divide-y divide-(--color-border)">
          {wishlist.items.map((product) => (
            <li key={product.id} className="flex items-center gap-4 py-4">
              {product.image ? (
                <Img
                  src={product.image}
                  alt={product.name}
                  width={64}
                  height={99}
                  className="block w-16 shrink-0"
                  imgClass="h-auto w-16 object-contain"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-(--color-text)">{product.name}</p>
                <p className="text-sm text-(--color-text-muted)">{formatMoney(product.price)}</p>
              </div>
              <Button type="button" size="sm" onClick={() => moveToCart(product)}>
                Add to cart
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => wishlist.remove(product.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
