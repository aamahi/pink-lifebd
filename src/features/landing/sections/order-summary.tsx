'use client';

import type { Product } from '@/core/data/catalog.model';
import { formatMoney } from '@/core/utils/money';
import { FramedPhoto } from './framed-photo';

export interface OrderSummaryProps {
  readonly product: Product;
  /** The cut-out as repainted to the chosen colour, for the thumbnail. */
  readonly cutout: string | null;
  /** "Rose, 34B" as far as it has been chosen; '' while nothing has. */
  readonly choice: string;
  readonly quantity: number;
  readonly subtotal: number | null;
  readonly deliveryLabel: string;
  readonly deliveryFee: number;
  readonly total: number | null;
}

/**
 * What the customer is about to confirm: the piece they chose, the goods, the delivery charge for
 * the area they picked, and the total, so there is no figure at the button they have not seen.
 * Money goes through `formatMoney` like everywhere else; an unknown price shows the dash, never 0.
 */
export function OrderSummary({
  product,
  cutout,
  choice,
  quantity,
  subtotal,
  deliveryLabel,
  deliveryFee,
  total,
}: OrderSummaryProps) {
  return (
    <div className="rounded-2xl bg-linear-to-br from-(--color-hero-from) to-(--color-hero-to) p-5">
      <div className="flex items-center gap-3">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-white/70">
          {product.image && cutout ? (
            <FramedPhoto base={product.image} shown={cutout} alt="" frameRatio={1} pad={0.04} />
          ) : null}
          <span className="absolute -right-0 -top-0 grid min-w-5 place-items-center rounded-bl-lg bg-(--color-hero-ink) px-1 text-[11px] font-semibold leading-5 text-white">
            {quantity}
            <span className="sr-only"> ×</span>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-(--color-rail-fg)">{product.name}</p>
          <p className="text-xs text-(--color-rail-muted)">{choice || 'Choose colour and size'}</p>
        </div>
        <p className="shrink-0 text-sm font-medium tabular-nums">
          {formatMoney(subtotal, { compact: true })}
        </p>
      </div>

      <dl className="mt-4 border-t border-(--color-hero-ink)/15 pt-4 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-(--color-rail-muted)">Subtotal</dt>
          <dd className="font-medium tabular-nums">{formatMoney(subtotal, { compact: true })}</dd>
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <dt className="text-(--color-rail-muted)">Delivery · {deliveryLabel}</dt>
          <dd className="font-medium tabular-nums">
            {formatMoney(deliveryFee, { compact: true })}
          </dd>
        </div>
        <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-(--color-hero-ink)/15 pt-4">
          <dt className="text-base font-semibold">Total</dt>
          <dd className="text-xl font-semibold tabular-nums text-(--color-lp-accent-dark)">
            {formatMoney(total, { compact: true })}
          </dd>
        </div>
      </dl>
    </div>
  );
}
