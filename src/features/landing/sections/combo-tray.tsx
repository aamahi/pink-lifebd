'use client';

import { Button } from '@/components/ui/button';
import type { Product } from '@/core/data/catalog.model';
import { cartSubtotal } from '@/core/stores/cart.store';
import { formatMoney } from '@/core/utils/money';
import { FramedPhoto } from './framed-photo';

/** One piece in the tray: the cart line it will become, and its colour for the thumbnail dot. */
export interface ComboPick {
  readonly line: Product;
  readonly swatch: string | null;
  /** The photo repainted to that colour when it was picked; null for a product with no photo. */
  readonly photo: string | null;
}

export interface ComboTrayProps {
  readonly picks: readonly ComboPick[];
  /** Pieces that make a combo. */
  readonly size: number;
  readonly onRemove: (index: number) => void;
  readonly onAddToCart: () => void;
  /** True from the moment the combo goes to the cart until the next piece is picked. */
  readonly added: boolean;
}

/**
 * The combo being built: `size` slots, filled as pieces are picked, the running total, and the
 * button that sends all of them to the cart together. Sticks to the foot of the screen while the
 * picker is on screen, and rests under the grid once it scrolls past.
 *
 * The total is `cartSubtotal`, so a piece with no stated price makes it `null` and it renders as
 * the unavailable dash instead of a sum that quietly left one out. (The list the tiles come from
 * already drops unpriced products, so in practice it is a number; the cart's rule is kept anyway.)
 * There is no combo price: the total is the pieces' own prices added up.
 */
export function ComboTray({ picks, size, onRemove, onAddToCart, added }: ComboTrayProps) {
  const complete = picks.length >= size;
  const total = cartSubtotal(picks.map((p) => ({ product: p.line, quantity: 1 })));
  const slots = Array.from({ length: size }, (_, i) => picks[i] ?? null);

  return (
    <div
      className="sticky bottom-0 z-30 -mx-4 mt-8 border-t border-(--color-rail-border) bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:shadow-lg"
      aria-label="Your combo"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <ul className="flex gap-2">
          {slots.map((pick, i) => (
            <li key={i} className="relative">
              {pick ? (
                <>
                  <div
                    className="relative size-14 overflow-hidden rounded-lg bg-(--color-shop-tile)"
                    title={pick.line.name}
                  >
                    {pick.line.image && (
                      <FramedPhoto
                        base={pick.line.image}
                        shown={pick.photo ?? pick.line.image}
                        alt={pick.line.name}
                        frameRatio={1}
                        pad={0.06}
                      />
                    )}
                    {pick.swatch && (
                      <span
                        className="absolute bottom-1 left-1 size-3 rounded-full ring-1 ring-black/20"
                        style={{ background: pick.swatch }}
                        aria-hidden="true"
                      ></span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(i)}
                    aria-label={`Remove ${pick.line.name} from the combo`}
                    className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-(--color-hero-ink) text-sm leading-none text-white outline-none before:absolute before:-inset-2 before:content-[''] focus-visible:ring-2 focus-visible:ring-(--color-rail-fg)"
                  >
                    ×
                  </button>
                </>
              ) : (
                <div
                  className="flex size-14 items-center justify-center rounded-lg border border-dashed border-(--color-rail-ring) text-sm text-(--color-rail-muted)"
                  aria-label={`Empty slot ${i + 1}`}
                >
                  {i + 1}
                </div>
              )}
            </li>
          ))}
        </ul>

        <div className="min-w-0 flex-1" aria-live="polite">
          {added && picks.length === 0 ? (
            <p className="text-sm font-medium text-(--color-hero-ink)">Combo added to your cart</p>
          ) : (
            <>
              <p className="text-xs text-(--color-rail-muted)">
                {complete
                  ? 'Your combo is ready'
                  : `${picks.length} of ${size} picked, ${size - picks.length} to go`}
              </p>
              <p className="text-base font-semibold text-(--color-lp-accent-dark)">
                {picks.length === 0 ? 'Total —' : `Total ${formatMoney(total, { compact: true })}`}
              </p>
            </>
          )}
        </div>

        {added && picks.length === 0 ? (
          <Button href="/cart" variant="accent" size="lg" className="w-full sm:w-auto">
            View cart and order
          </Button>
        ) : (
          <Button
            type="button"
            variant="accent"
            size="lg"
            disabled={!complete}
            onClick={onAddToCart}
            className="w-full sm:w-auto"
          >
            {complete ? 'Add combo to cart' : `Pick ${size - picks.length} more`}
          </Button>
        )}
      </div>
    </div>
  );
}
