'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { prewarm, useRecolored } from '@/components/ui/garment-recolor';
import type { Product } from '@/core/data/catalog.model';
import { quickAddBlock, variantOf } from '@/core/data/variant';
import { useCart } from '@/core/stores/cart.store';
import { useToast } from '@/core/stores/toast.store';
import { formatMoney } from '@/core/utils/money';
import { FramedPhoto } from './framed-photo';
import { VariantPicker } from './variant-picker';

export interface LandingTileProps {
  readonly product: Product;
  /**
   * Combo pages: the tile adds its chosen variant to the tray instead of the cart. Absent on
   * pages that order straight from the tile.
   */
  readonly combo?: {
    readonly full: boolean;
    /** The chosen variant, and its colour's swatch and repainted photo for the tray's thumbnail. */
    readonly onAdd: (line: Product, look: { swatch: string | null; photo: string | null }) => void;
  };
}

/**
 * One product on a landing page: photo, name, price, colour and size, and the order buttons.
 *
 * The photo is repainted to the chosen colourway (`useRecolored`), the same stand-in the product
 * page uses for real colourway photography, so choosing Black does not leave a beige bra on screen.
 * Index 0 is the photographed colour and passes through untouched.
 *
 * Without a size chosen, the order buttons stay clickable and say what is missing: a disabled
 * button gives a thumb on a phone no reason it did nothing.
 *
 * The list this tile comes from has already dropped products that cannot be sold (no stated price,
 * or a tracked stock of 0), so the `quickAddBlock` check in `commit` is a guard against a stale
 * list, not a branch the page expects to take.
 */
export function LandingTile({ product, combo }: LandingTileProps) {
  const cart = useCart();
  const toast = useToast();
  const router = useRouter();

  const [colorIndex, setColorIndex] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [needSize, setNeedSize] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(addedTimer.current), []);

  const recolorable = useMemo(
    () =>
      product.image
        ? { image: product.image, backImage: null, sideImage: null, colors: product.colors }
        : null,
    [product],
  );
  const shown = useRecolored(recolorable, colorIndex);
  const photo = shown?.image ?? product.image;

  const wasPrice =
    product.price !== null &&
    product.compareAtPrice !== null &&
    product.compareAtPrice > product.price
      ? formatMoney(product.compareAtPrice, { compact: true })
      : null;

  /** The chosen variant as a product, or null (and the size hint raised) while a size is missing. */
  const choice = (): Product | null => {
    if (quickAddBlock(product) !== null) return null;
    if (product.sizes.length > 0 && size === null) {
      setNeedSize(true);
      return null;
    }
    return variantOf(product, product.colors[colorIndex]?.name, size ?? undefined);
  };

  const flashAdded = (): void => {
    setJustAdded(true);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setJustAdded(false), 1600);
  };

  const addToCart = (): void => {
    const line = choice();
    if (!line) return;
    cart.add(line);
    toast.show(`${line.name} added to cart`, { tone: 'success' });
    flashAdded();
  };

  const orderNow = (): void => {
    const line = choice();
    if (!line) return;
    cart.add(line);
    router.push('/cart');
  };

  const addToCombo = (): void => {
    const line = choice();
    if (!line || !combo) return;
    combo.onAdd(line, { swatch: product.colors[colorIndex]?.swatch ?? null, photo });
    flashAdded();
  };

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="relative aspect-[4/5] bg-(--color-shop-tile)">
        {product.image && photo ? (
          <FramedPhoto base={product.image} shown={photo} alt={product.name} frameRatio={1.25} />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-(--color-rail-muted)">
            No image
          </div>
        )}
        {product.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-(--color-hero-ink) shadow-sm">
            {product.badge}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
        <div>
          <h3 className="text-sm font-medium leading-snug text-(--color-rail-fg)">
            {product.name}
          </h3>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-base font-semibold text-(--color-lp-accent-dark)">
              {formatMoney(product.price, { compact: true })}
            </span>
            {wasPrice && (
              <span className="text-xs text-(--color-rail-muted) line-through">{wasPrice}</span>
            )}
          </p>
        </div>

        <VariantPicker
          product={product}
          colorIndex={colorIndex}
          onColor={setColorIndex}
          onColorHint={(i) => prewarm(recolorable, i)}
          size={size}
          onSize={(s) => {
            setSize(s);
            setNeedSize(false);
          }}
          needSize={needSize}
        />

        {/* Stacked while the card is narrow, side by side once it is wide enough for both labels.
            A container query on the card, not a viewport breakpoint: a card is 140px wide on a
            phone's two columns, 204px at a 1024px laptop's four, 244px at 1440px, and only the
            card's own width says whether two buttons fit. Reversed when stacked so the order
            button leads, while the DOM (and tab) order stays Add to cart, then Order now. */}
        <div className="@container mt-auto pt-1">
          {combo ? (
            // The label has a short and a long form: "Add to combo" needs about 9rem of card, and
            // on a 320px phone's two columns the card has 7. A wrapped label inside a fixed-height
            // button is clipped, so the short one is what narrow cards get.
            <Button
              type="button"
              variant="plum"
              block
              disabled={combo.full}
              onClick={addToCombo}
              aria-label={`Add ${product.name} to the combo`}
              className="whitespace-nowrap"
            >
              <span className="@[9rem]:hidden">
                {combo.full ? 'Full' : justAdded ? 'Added ✓' : 'Add'}
              </span>
              <span className="hidden @[9rem]:inline">
                {combo.full ? 'Combo is full' : justAdded ? 'Added ✓' : 'Add to combo'}
              </span>
            </Button>
          ) : (
            <div className="flex flex-col-reverse gap-2 @[14rem]:flex-row">
              <Button
                type="button"
                variant="plum-outline"
                onClick={addToCart}
                aria-label={`Add ${product.name} to cart`}
                className="w-full whitespace-nowrap @[14rem]:w-auto @[14rem]:shrink-0"
              >
                {justAdded ? 'Added ✓' : 'Add to cart'}
              </Button>
              <Button
                type="button"
                variant="accent"
                onClick={orderNow}
                className="w-full whitespace-nowrap @[14rem]:w-auto @[14rem]:flex-1"
              >
                Order now
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
