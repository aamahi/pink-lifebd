/** Joins class names, dropping falsy entries. `cn('a', cond && 'b', undefined)` -> `'a b'` or `'a'`. */
export function cn(...parts: ReadonlyArray<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
