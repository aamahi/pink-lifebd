'use client';

import { cn } from '@/core/utils/cn';
import { useJellyRadio } from './jelly-radio';

export interface Pill {
  /** What `onSelected` receives and `value` is compared against. */
  readonly key: string;
  readonly label: string;
}

export interface PillTabsProps {
  pills: readonly Pill[];
  /** The chosen pill's key. */
  value: string;
  /** Accessible name of the group. */
  label: string;
  onSelected?: (key: string) => void;
  className?: string;
}

/**
 * A row of rounded filter pills, one chosen: the home page's "Shop by
 * category" and "Best sellers" headers, after their references -- the chosen
 * pill solid black, the rest outlined in a soft grey.
 *
 * A radiogroup with React Bits' JellyRadio motion (`useJellyRadio`): the
 * chosen pill swells wide-then-tall on a spring and its neighbours are shoved
 * aside, rippling outward. Arrow keys, Home and End move the choice. The row
 * keeps no state: it shows `value` and calls `onSelected`, so the page decides
 * where the choice lives (the URL, through `useRouteViewState`).
 *
 * On phones the row is one line that swipes sideways instead of wrapping.
 * The padding around it is room for the motion -- the pills are transformed,
 * so layout does not grow to fit them, and a scrolling row clips what
 * overflows.
 */
export function PillTabs({ pills, value, label, onSelected, className }: PillTabsProps) {
  /** The chosen pill's position, for the JellyRadio motion; -1 when none matches. */
  const activeIndex = pills.findIndex((pill) => pill.key === value);
  const jelly = useJellyRadio<HTMLDivElement>(activeIndex);

  return (
    <div className={cn('block min-w-0', className)}>
      <div
        ref={jelly.ref}
        onKeyDown={jelly.onKeyDown}
        className="-mx-4 -my-2.5 flex w-[calc(100%+2rem)] gap-3 overflow-x-auto px-8 py-2.5 [scrollbar-width:none] md:mx-0 md:w-auto md:flex-wrap md:overflow-visible md:px-0"
        role="radiogroup"
        aria-label={label}
      >
        {pills.map((pill) => (
          <button
            key={pill.key}
            type="button"
            role="radio"
            className={cn(
              'h-10 shrink-0 rounded-full border px-5 text-sm outline-none transition-[background-color,border-color,color] duration-200 focus-visible:ring-2 focus-visible:ring-(--color-rail-ring) focus-visible:ring-offset-2',
              pill.key === value
                ? 'border-(--color-rail-fg) bg-(--color-rail-fg) text-(--color-rail-bg)'
                : 'border-black/10 bg-(--color-rail-bg) text-(--color-rail-muted) hover:border-(--color-rail-fg) hover:text-(--color-rail-fg)',
            )}
            aria-checked={pill.key === value}
            onClick={() => onSelected?.(pill.key)}
          >
            {pill.label}
          </button>
        ))}
      </div>
    </div>
  );
}
