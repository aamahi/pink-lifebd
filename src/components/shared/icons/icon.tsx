import type { CSSProperties } from 'react';
import { cn } from '@/core/utils/cn';
import { ICONS, type IconDef, type IconName } from './icon-registry';

export interface IconProps {
  /** A registry key, or any Material Symbols ligature (`home`, `menu`, `inventory_2`, ...). */
  name: string;
  /** Drawn width and height in px. `null` (the default) uses the matched glyph's own grid. */
  size?: number | null;
  /** Classes for the host element (the Angular `<app-icon class="...">`). */
  className?: string;
  style?: CSSProperties;
}

/** Names already warned about, so a miss logs once instead of on every render. */
const warned = new Set<string>();

/**
 * `<Icon name="cart" />` — a registry-backed glyph, falling back to a self-hosted Material
 * Symbols ligature for any name the registry does not carry.
 *
 * `name` is plain `string`, not `IconName`, on purpose: a real Material Symbols ligature
 * (`inventory_2`, `local_shipping`, …) is a legitimate value that is never a key of `ICONS`, so
 * typing this prop to the registry's own key union would make every one of those calls a type
 * error at the only place that could catch it, for a name that is correct. The registry lookup is
 * the actual gate — a hit renders the data-driven SVG, a miss renders the ligature text through the
 * `material-symbols-outlined` class, and dev mode logs the miss so a typo'd custom name (one
 * that was meant to hit the registry but does not) is visible immediately rather than rendering as
 * a plausible-looking fallback nobody double-checks.
 *
 * Decorative by default (`aria-hidden` on the host): every current caller pairs the icon with
 * visible or `sr-only` text, so the icon itself carries no independent accessible name. A caller
 * that needs the icon to BE the accessible name (an icon-only button) is responsible for its own
 * `aria-label` on that button — this component does not guess at one.
 */
export function Icon({ name, size = null, className, style }: IconProps) {
  // `Object.hasOwn`, not the `in` operator the Angular version used: `'constructor' in ICONS` and
  // `'toString' in ICONS` are true through the prototype, and would index a function as an IconDef.
  const def: IconDef | null = Object.hasOwn(ICONS, name) ? ICONS[name as IconName] : null;

  if (!def && process.env.NODE_ENV !== 'production' && !warned.has(name)) {
    warned.add(name);
    console.warn(
      `Icon: "${name}" is not an ICONS registry key -- falling back to the Material ` +
        `Symbols ligature. If this was meant to be a registry glyph, check the spelling ` +
        `against icon-registry.ts.`,
    );
  }

  /** The size actually drawn: an explicit `size`, or the matched glyph's grid, or 24. */
  const drawn = size ?? def?.grid ?? 24;
  const grid = def?.grid ?? 24;

  return (
    <span aria-hidden="true" className={cn('inline-flex', className)} style={style}>
      {def ? (
        <svg
          width={drawn}
          height={drawn}
          viewBox={`0 0 ${grid} ${grid}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {(def.shapes ?? []).map((shape, i) => (
            <path
              key={i}
              d={shape.d}
              fill={shape.fill ? 'currentColor' : 'none'}
              stroke={shape.fill ? undefined : 'currentColor'}
              strokeWidth={shape.fill ? undefined : (def.stroke ?? 1.5)}
              fillRule={shape.evenOdd ? 'evenodd' : undefined}
              clipRule={shape.evenOdd ? 'evenodd' : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {(def.circles ?? []).map((circle, i) => (
            <circle
              key={i}
              cx={circle.cx}
              cy={circle.cy}
              r={circle.r}
              fill={circle.fill ? 'currentColor' : 'none'}
              stroke={circle.fill ? undefined : 'currentColor'}
              strokeWidth={circle.fill ? undefined : (def.stroke ?? 1.5)}
            />
          ))}
        </svg>
      ) : (
        <span className="material-symbols-outlined" style={{ fontSize: `${drawn}px` }}>
          {name}
        </span>
      )}
    </span>
  );
}
