'use client';

export interface FilterSidebarProps {
  readonly tags: readonly string[];
  readonly selectedTags?: readonly string[];
  readonly inStockOnly?: boolean;
  readonly onSelectedTagsChange?: (tags: readonly string[]) => void;
  readonly onInStockOnlyChange?: (inStockOnly: boolean) => void;
}

/**
 * Category-detail's filter panel: an "in stock only" toggle plus the tag
 * checkboxes for whatever tags the current category's products actually
 * carry.
 *
 * Stateless -- `selectedTags` and `inStockOnly` are props, every change is a
 * callback, and `category-detail.tsx` owns the actual filtering
 * (`visible` computed there). Keeping the filtering logic in one place is what
 * lets that computed stay the one thing that decides the EMPTY branch; a
 * filter owned here too would be a second place that could disagree with it.
 */
export function FilterSidebar({
  tags,
  selectedTags = [],
  inStockOnly = false,
  onSelectedTagsChange,
  onInStockOnlyChange,
}: FilterSidebarProps) {
  const toggleTag = (tag: string, checked: boolean): void => {
    onSelectedTagsChange?.(checked ? [...selectedTags, tag] : selectedTags.filter((t) => t !== tag));
  };

  return (
    <aside className="w-full shrink-0 sm:w-48">
      <h2 className="text-sm font-semibold text-[--color-text]">Filter</h2>

      <label className="mt-3 flex items-center gap-2 text-sm text-[--color-text]">
        <input
          type="checkbox"
          checked={inStockOnly}
          onChange={(event) => onInStockOnlyChange?.(event.target.checked)}
        />
        In stock only
      </label>

      {tags.length > 0 && (
        <fieldset className="mt-4">
          <legend className="text-xs font-medium uppercase tracking-wide text-[--color-text-muted]">
            Tags
          </legend>
          <div className="mt-2 flex flex-col gap-2">
            {tags.map((tag) => (
              <label key={tag} className="flex items-center gap-2 text-sm text-[--color-text]">
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tag)}
                  onChange={(event) => toggleTag(tag, event.target.checked)}
                />
                {tag}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </aside>
  );
}
