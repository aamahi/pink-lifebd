'use client';

import { Button } from '@/components/ui/button';
import { formatMoney } from '@/core/utils/money';

export const CONFIRM_LABEL = 'অর্ডার কনফার্ম করুন';

/**
 * The phone's confirm button, pinned to the foot of the screen with the running total beside it,
 * so the way to order is under the thumb however far down the form is scrolled. It submits the
 * order form by `form="order-form"` rather than sitting inside it, which is what lets it stay
 * fixed while the form scrolls. From `md` up the form's own button is used and this is hidden.
 */
export function OrderBar({
  total,
  placing,
}: {
  readonly total: number | null;
  readonly placing: boolean;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-4 border-t border-(--color-rail-border) bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:hidden">
      <div className="min-w-0">
        <p className="text-xs text-(--color-rail-muted)">Total</p>
        <p className="text-lg font-semibold leading-tight tabular-nums text-(--color-lp-accent-dark)">
          {formatMoney(total, { compact: true })}
        </p>
      </div>
      <Button
        type="submit"
        form="order-form"
        variant="accent"
        size="lg"
        className="flex-1 whitespace-nowrap"
        loading={placing}
      >
        {placing ? 'Placing order…' : CONFIRM_LABEL}
      </Button>
    </div>
  );
}
