'use client';

export interface QuantityStepperProps {
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly min?: number;
  readonly max: number;
}

const STEP_BUTTON =
  'grid size-11 place-items-center text-xl leading-none text-(--color-hero-ink) outline-none transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--color-rail-fg) disabled:pointer-events-none disabled:opacity-35';

/**
 * A quantity as minus, the number and plus: 44px buttons, so a thumb hits them, and a polite live
 * region so a screen reader hears the new number. The buttons disable at the limits instead of
 * silently ignoring the tap.
 */
export function QuantityStepper({ value, onChange, min = 1, max }: QuantityStepperProps) {
  return (
    <div
      role="group"
      aria-label="Quantity"
      className="inline-flex items-center overflow-hidden rounded-lg bg-white ring-1 ring-inset ring-(--color-rail-border)"
    >
      <button
        type="button"
        aria-label="One fewer"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={STEP_BUTTON}
      >
        −
      </button>
      <span
        aria-live="polite"
        className="min-w-10 text-center font-medium tabular-nums text-(--color-rail-fg)"
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="One more"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={STEP_BUTTON}
      >
        +
      </button>
    </div>
  );
}
