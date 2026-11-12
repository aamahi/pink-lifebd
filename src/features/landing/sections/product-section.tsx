'use client';

import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { Product } from '@/core/data/catalog.model';
import type { AsyncResult } from '@/core/hooks/use-async';
import { quickAddBlock } from '@/core/data/variant';
import { useCart } from '@/core/stores/cart.store';
import { useToast } from '@/core/stores/toast.store';
import type { LandingConfig } from '../landing.config';
import { ComboTray, type ComboPick } from './combo-tray';
import { LandingTile } from './landing-tile';

export interface ProductSectionProps {
  readonly config: LandingConfig;
  /** The one catalogue request the page makes; the hero reads its price from it too. */
  readonly catalogue: AsyncResult<readonly Product[]>;
}

/** The products this page sells, best sellers first. Anything that cannot be sold is left out. */
export function sellable(
  products: readonly Product[],
  select: LandingConfig['select'],
): readonly Product[] {
  const rank = (p: Product): number => (p.tags.includes('bestseller') ? 0 : 1);
  return products
    .filter((p) => select(p) && quickAddBlock(p) === null)
    .map((p, i) => ({ p, i }))
    .sort((a, b) => rank(a.p) - rank(b.p) || a.i - b.i)
    .map(({ p }) => p);
}

/**
 * The page's picker, with the four states each on its own branch: loading (a ghost grid), failed
 * (with retry), empty, and the grid. A failed request is never drawn as "no products": that would
 * tell a visitor from an ad that the shop has nothing, when the API simply did not answer.
 *
 * "Empty" here is any answer that leaves nothing to sell, including a catalogue whose products for
 * this page are all unpriced or sold out.
 *
 * On a combo page (`comboSize` set) the tiles add to a tray, and the tray is what goes to the cart.
 */
export function ProductSection({ config, catalogue }: ProductSectionProps) {
  const products = useMemo(
    () => (catalogue.status === 'ready' ? sellable(catalogue.data, config.select) : []),
    [catalogue, config.select],
  );

  return (
    <section
      id="order"
      className="scroll-mt-16 px-4 py-14 sm:px-6 sm:py-20 lg:px-8"
      aria-labelledby="order-title"
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 max-w-2xl">
          <h2
            id="order-title"
            className="font-display text-3xl text-(--color-hero-ink) sm:text-4xl"
          >
            {config.pickerTitle}
          </h2>
          <p className="mt-2 text-(--color-rail-muted)">{config.pickerHint}</p>
        </header>

        {catalogue.status === 'loading' && (
          <div role="status" aria-label="Loading products">
            <ul
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
              aria-hidden="true"
            >
              {Array.from({ length: 4 }, (_, i) => (
                <li key={i}>
                  <Skeleton shape="block" height="22rem" />
                </li>
              ))}
            </ul>
          </div>
        )}

        {catalogue.status === 'error' && (
          <ErrorState
            title="We could not load the styles"
            message="Please check your connection and try again."
            onRetry={catalogue.reload}
          />
        )}

        {catalogue.status === 'ready' && products.length === 0 && (
          <EmptyState
            title="Nothing to order here right now"
            hint="These styles are not available at the moment. Please check back soon."
          />
        )}

        {catalogue.status === 'ready' && products.length > 0 && (
          <Grid config={config} products={products} />
        )}
      </div>
    </section>
  );
}

/**
 * Column classes for the tile grid, by how many tiles there are: two on a phone, three from `sm`,
 * and four from `lg` unless that would strand a short last row. Three tiles and six tiles split
 * into threes; at four columns they would leave a quarter or a third of the row empty on the
 * widest screens, which reads as a missing product. (On a phone a lone last tile spans both
 * columns instead, set on the list.) Written out whole so Tailwind's scanner sees every class.
 */
function columnsFor(count: number): string {
  return count <= 3 || count === 6 ? 'sm:grid-cols-3' : 'sm:grid-cols-3 lg:grid-cols-4';
}

function Grid({
  config,
  products,
}: {
  readonly config: LandingConfig;
  readonly products: readonly Product[];
}) {
  const cart = useCart();
  const toast = useToast();
  const comboSize = config.comboSize;

  const [picks, setPicks] = useState<readonly ComboPick[]>([]);
  const [added, setAdded] = useState(false);
  const full = comboSize !== null && picks.length >= comboSize;

  const addToCombo = (line: Product, look: Pick<ComboPick, 'swatch' | 'photo'>): void => {
    setPicks((current) => (full ? current : [...current, { line, ...look }]));
    setAdded(false);
  };

  const addComboToCart = (): void => {
    for (const pick of picks) cart.add(pick.line);
    toast.show(`Combo of ${picks.length} added to cart`, { tone: 'success' });
    setPicks([]);
    setAdded(true);
  };

  return (
    <>
      <ul
        className={`grid grid-cols-2 gap-3 sm:gap-4 ${columnsFor(products.length)} max-sm:[&>li:last-child:nth-child(odd)]:col-span-2`}
      >
        {products.map((product) => (
          <li key={product.id}>
            <LandingTile
              product={product}
              combo={comboSize === null ? undefined : { full, onAdd: addToCombo }}
            />
          </li>
        ))}
      </ul>

      {comboSize !== null && (
        <ComboTray
          picks={picks}
          size={comboSize}
          onRemove={(index) => setPicks((current) => current.filter((_, i) => i !== index))}
          onAddToCart={addComboToCart}
          added={added}
        />
      )}
    </>
  );
}
