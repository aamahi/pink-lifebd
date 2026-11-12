import { isMoneyAbsent } from '@/core/utils/money';
import type { Product } from '@/core/data/catalog.model';

/**
 * Why a product cannot go straight into the cart, or null when it can.
 *
 * 'price': the API stated no price -- the product page refuses to sell it too,
 * since an absent price is neither zero nor purchasable. 'stock': a tracked
 * stock of 0. An untracked (null) stock is orderable and is not a reason.
 */
export function quickAddBlock(p: Product): 'price' | 'stock' | null {
  if (isMoneyAbsent(p.price)) return 'price';
  if (p.stock === 0) return 'stock';
  return null;
}

/**
 * The line a one-click "Add to cart" puts in the cart: the first colourway in
 * M (or the first size listed), the same defaults the home hero's detail panel
 * opens on. The id and name carry the variant, so two sizes of one product
 * stay two lines, and the toast and cart both say what was added.
 */
export function defaultVariant(p: Product): Product {
  const size = p.sizes.includes('M') ? 'M' : p.sizes[0];
  return variantOf(p, p.colors[0]?.name, size);
}

/**
 * `p` as one chosen colour and size. The single place a cart line's id and name are built from a
 * variant, so the shop card, the product page and the landing pages name the same choice the same
 * way, and two sizes of one product stay two lines in the cart. A missing colour or size (a
 * product that has none to choose) is left out rather than written as "undefined".
 */
export function variantOf(
  p: Product,
  color: string | undefined,
  size: string | undefined,
): Product {
  const variant = [color, size].filter((v): v is string => !!v);
  return {
    ...p,
    id: [p.id, ...variant].join(':'),
    name: variant.length ? `${p.name} (${variant.join(', ')})` : p.name,
  };
}
