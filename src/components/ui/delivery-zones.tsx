'use client';

import { useId } from 'react';
import type { DeliveryZone } from '@/core/config/site.config';
import { cn } from '@/core/utils/cn';
import { formatMoney } from '@/core/utils/money';

export interface DeliveryZonesProps {
  zones: readonly DeliveryZone[];
  /** `id` of the chosen zone. */
  selected: string;
  /** Read out by screen readers as the group's name; not drawn. */
  legend?: string;
  onPicked?: (zoneId: string) => void;
  className?: string;
}

/**
 * The delivery-area choice: one tappable row per zone, with its fee on the right.
 *
 * Native radio inputs, visually hidden and drawn as a row with a dot, rather than `role="radio"`
 * divs. A real radio group gives arrow-key movement, a single tab stop, form semantics and
 * correct screen-reader announcements with nothing to re-implement, and on a phone the whole row
 * is the label, so the target is the full width of the card and well over 44px tall.
 *
 * Presentational on purpose: it takes the zones and the current choice and reports a pick. The
 * cart owns the state (`useCart().setDeliveryZone`), which is why the cart page and the checkout
 * page, which both render this, cannot disagree about the fee.
 *
 * Fees go through `formatMoney`, so a zone's fee is formatted by the same code as every other price.
 */
export function DeliveryZones({
  zones,
  selected,
  legend = 'Delivery area',
  onPicked,
  className,
}: DeliveryZonesProps) {
  /** One name per instance, so two pickers on a page would not share a radio group. */
  const group = `delivery-zone-${useId()}`;

  return (
    <div className={cn('block', className)}>
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="sr-only">{legend}</legend>
        <div className="flex flex-col gap-2">
          {zones.map((zone) => (
            <label
              key={zone.id}
              className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-(--color-rail-border) bg-white/70 px-4 py-3 transition-[border-color,background-color,box-shadow] has-checked:border-(--color-rail-fg) has-checked:bg-white has-checked:shadow-sm has-focus-visible:ring-2 has-focus-visible:ring-(--color-rail-ring) motion-reduce:transition-none"
            >
              <input
                type="radio"
                className="peer sr-only"
                name={group}
                value={zone.id}
                checked={zone.id === selected}
                onChange={() => onPicked?.(zone.id)}
              />
              <span
                aria-hidden="true"
                className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-(--color-rail-border) transition-colors after:size-2.5 after:scale-0 after:rounded-full after:bg-(--color-rail-fg) after:transition-transform peer-checked:border-(--color-rail-fg) peer-checked:after:scale-100 motion-reduce:transition-none"
              ></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-(--color-rail-fg)">
                  {zone.label}
                </span>
                {zone.hint ? (
                  <span className="block text-xs leading-snug text-(--color-rail-muted)">
                    {zone.hint}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-(--color-rail-fg)">
                {formatMoney(zone.fee, { compact: true })}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
