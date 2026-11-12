import type { BadgeTone } from '@/components/ui/badge';
import type { Product } from '@/core/data/catalog.model';

/**
 * How a stock count is described, in one place.
 *
 * The rule worth keeping is the `null` row. On the house platform stock tracking is OFF by
 * default, so `null` is the common case and means "not tracked" -- an untracked product is
 * orderable. Rendering it as "Out of stock" reads as a reasonable default and is wrong roughly
 * ninety-nine times in a hundred, and it is wrong in the direction that stops a sale.
 *
 * Shared rather than copied into each page: the catalog card and the product detail must not be
 * able to disagree about what `null` means.
 */
export function stockLabel(p: Product): string {
  if (p.stock === null) return 'Available';
  if (p.stock === 0) return 'Out of stock';
  if (p.stock <= 10) return `Only ${p.stock} left`;
  return 'In stock';
}

export function stockTone(p: Product): BadgeTone {
  if (p.stock === null) return 'neutral';
  if (p.stock === 0) return 'danger';
  return p.stock <= 10 ? 'warning' : 'success';
}
