import { cn } from '@/core/utils/cn';

export type SkeletonShape = 'line' | 'circle' | 'block';

export interface SkeletonProps {
  count?: number;
  height?: string;
  shape?: SkeletonShape;
  className?: string;
}

/**
 * A loading placeholder, generic over how many rows to draw and what shape each one is.
 *
 * It exists so a page can render its LOADING state as something other than an empty
 * region. An empty region during a fetch is indistinguishable from an empty result,
 * and that ambiguity is the whole reason `<EmptyState>` next door has to be a
 * separate component that a page reaches deliberately.
 *
 * `aria-hidden` plus a live-region announcement on the container is the right split:
 * a screen reader should hear "loading", not read out N grey rectangles.
 *
 * `shape` defaults to `'line'`, which reproduces this component's original behaviour
 * exactly (rounded bars, the last one at 60% width when there is more than one row) --
 * callers that pass only `count` and `height` render unchanged. `'circle'` is for an
 * avatar-shaped placeholder (each row square, fully rounded); `'block'` is for a card- or
 * image-shaped region (rounded corners, no width taper on the last row).
 */
export function Skeleton({ count = 1, height = '1rem', shape = 'line', className }: SkeletonProps) {
  const rows = Array.from({ length: Math.max(1, count) }, (_, i) => i);

  const radius = shape === 'circle' ? 'rounded-full' : shape === 'block' ? 'rounded-lg' : 'rounded';
  const rowClasses = `animate-pulse bg-black/10 dark:bg-white/10 ${radius}`;

  /**
   * A circle row is square (width == height), matching an avatar's aspect ratio. Every other
   * shape keeps the original tapered-last-line behaviour: full width, except the final row of a
   * multi-row set narrows to 60% so a text-skeleton doesn't read as a solid block.
   */
  const rowWidth = (index: number): string => {
    if (shape === 'circle') return height;
    const isLastOfMany = index === rows.length - 1 && rows.length > 1;
    return isLastOfMany ? '60%' : '100%';
  };

  return (
    <div aria-hidden="true" className={cn('block', className)}>
      {rows.map((index) => (
        <div
          key={index}
          className={cn(rowClasses, index > 0 && 'mt-2')}
          style={{ height, width: rowWidth(index) }}
        ></div>
      ))}
    </div>
  );
}
