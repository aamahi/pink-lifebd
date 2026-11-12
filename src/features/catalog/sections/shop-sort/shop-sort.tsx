'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/core/utils/cn';
import { SHOP_SORTS, SORT_LABELS, type ShopSort } from '@/features/catalog/shop-filter';
import styles from './shop-sort.module.css';

export interface ShopSortProps {
  readonly value: ShopSort;
  readonly onValueChange?: (value: ShopSort) => void;
}

const SORTS = SHOP_SORTS;
const LABELS = SORT_LABELS;

/**
 * The shop's "Sort by" control: a button showing the current order that opens
 * a small menu of the others. Replaces a native `<select>`, whose open list is
 * drawn by the operating system and cannot be styled to match the page.
 *
 * It is the WAI-ARIA "select-only combobox" pattern: the button is a
 * `combobox` that owns a `listbox`, focus stays on the button while the menu
 * is open, and `aria-activedescendant` names the highlighted option, so a
 * screen reader follows the highlight without focus jumping around.
 *
 * Keys: Enter, Space or Down open it; Up and Down move the highlight, Home and
 * End jump to the ends; Enter or Space chooses; Escape or Tab close without
 * changing anything. A pointer press anywhere outside closes it too.
 *
 * Options carry `tabindex="-1"` and an Enter handler although, in this pattern,
 * they never take focus: the template accessibility lint cannot see focus
 * staying on the combobox, and both are true and harmless -- reachable by
 * script, never by Tab, and Enter on one does exactly what a click does.
 */
export function ShopSort({ value, onValueChange }: ShopSortProps) {
  const [open, setOpen] = useState(false);
  /** The highlighted option while open (keyboard or hover), by index. */
  const [active, setActive] = useState(0);
  const listId = `shop-sort-${useId()}`;

  const hostRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const current = SORTS.indexOf(value);
  const optionId = (i: number): string => `${listId}-${i}`;

  // A pointer press anywhere outside closes the menu. Listening only while open keeps the
  // document free of a handler per mounted sort control.
  useEffect(() => {
    if (!open) return;
    const onOutside = (event: PointerEvent): void => {
      if (!hostRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onOutside);
    return () => document.removeEventListener('pointerdown', onOutside);
  }, [open]);

  const show = (): void => {
    setActive(Math.max(0, current));
    setOpen(true);
  };

  const close = (): void => setOpen(false);

  const toggle = (): void => {
    if (open) close();
    else show();
  };

  const choose = (i: number): void => {
    const s = SORTS[i];
    close();
    triggerRef.current?.focus();
    if (s !== undefined && s !== value) onValueChange?.(s);
  };

  const onKey = (event: KeyboardEvent<HTMLButtonElement>): void => {
    const last = SORTS.length - 1;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        show();
      }
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActive((i) => Math.min(last, i + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case 'Home':
        event.preventDefault();
        setActive(0);
        break;
      case 'End':
        event.preventDefault();
        setActive(last);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        choose(active);
        break;
      case 'Escape':
        event.preventDefault();
        close();
        break;
      case 'Tab':
        close();
        break;
    }
  };

  return (
    <div ref={hostRef} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? optionId(active) : undefined}
        aria-label="Sort products"
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-lg border bg-(--color-rail-bg) pl-3.5 pr-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-(--color-rail-ring)',
          open
            ? 'border-(--color-rail-fg)'
            : 'border-(--color-rail-border) hover:border-(--color-rail-fg)/40',
        )}
        onClick={toggle}
        onKeyDown={onKey}
      >
        <span className="text-(--color-rail-muted)">Sort by</span>
        <span className="font-medium text-(--color-rail-fg)">{LABELS[value]}</span>
        <svg
          viewBox="0 0 16 16"
          className={cn(
            'size-4 text-(--color-rail-muted) transition-transform duration-200',
            open && 'rotate-180',
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Sort products"
          className={cn(
            styles.menuIn,
            'absolute right-0 top-full z-30 mt-2 w-60 rounded-xl border border-(--color-rail-border) bg-(--color-rail-bg) p-1.5 shadow-[0_12px_32px_-8px_rgb(0_0_0/0.18)]',
          )}
        >
          {SORTS.map((s, i) => (
            <li
              key={s}
              id={optionId(i)}
              role="option"
              tabIndex={-1}
              onKeyDown={(event) => {
                if (event.key === 'Enter') choose(i);
              }}
              aria-selected={s === value}
              className={cn(
                'flex h-9 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-sm text-(--color-rail-fg)',
                i === active && 'bg-(--color-shop-tile)',
                s === value && 'font-medium',
              )}
              onPointerEnter={() => setActive(i)}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => choose(i)}
            >
              {LABELS[s]}
              {s === value && (
                <svg
                  viewBox="0 0 16 16"
                  className="size-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m3.5 8.5 3 3 6-7" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
