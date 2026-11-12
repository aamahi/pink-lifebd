'use client';

export type SortOption = 'name' | 'price-asc' | 'price-desc';

const OPTIONS: ReadonlyArray<{ readonly value: SortOption; readonly label: string }> = [
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'price-asc', label: 'Price (low to high)' },
  { value: 'price-desc', label: 'Price (high to low)' },
];

export interface SortBarProps {
  readonly value?: SortOption;
  readonly onValueChange?: (value: SortOption) => void;
}

/**
 * Category-detail's sort control -- a single `<select>`, stateless like
 * `filter-sidebar.tsx` next to it.
 *
 * `price-asc`/`price-desc` sort a `price: number | null` field
 * (`catalog.model.ts`). The parent's comparator, not this component, decides
 * where a null price lands in that order -- this component only reports which
 * option was picked.
 */
export function SortBar({ value = 'name', onValueChange }: SortBarProps) {
  return (
    <label className="flex items-center gap-2 text-sm text-[--color-text]">
      Sort by
      <select
        className="h-9 rounded-md border border-[--color-border] bg-[--color-surface] px-2 text-sm"
        value={value}
        onChange={(event) => onValueChange?.(event.target.value as SortOption)}
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
