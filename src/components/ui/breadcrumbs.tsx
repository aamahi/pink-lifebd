import Link from 'next/link';

export interface Crumb {
  readonly label: string;
  /** Omitted on a non-linking interior crumb (a category with no page of its own). */
  readonly href?: string;
}

export type BreadcrumbVariant = 'default' | 'toolbar' | 'product';

const VARIANTS: Record<BreadcrumbVariant, string> = {
  default: 'text-sm',
  toolbar: 'text-xs uppercase tracking-wide',
  product: 'text-sm text-[--color-text-muted]',
};

export interface BreadcrumbsProps {
  items: readonly Crumb[];
  variant?: BreadcrumbVariant;
}

/**
 * `<nav aria-label="Breadcrumb">` wrapping an ordered list of crumbs, ending in the current page.
 *
 * Three visual variants (`default`, `toolbar`, `product`) as a union prop rather than three
 * booleans, per `.claude/commands/new-primitive.md` — a page cannot ask for `toolbar` and
 * `product` styling at once because there is only one prop to set.
 *
 * The last crumb is never a link: it renders as `aria-current="page"` text, matching the "you are
 * here" semantics a breadcrumb trail exists to state. Every other crumb with an `href` is a real
 * `<Link>`, so it inherits native anchor keyboard behaviour (Tab, Enter) rather than needing
 * any of its own; an interior crumb with no `href` (a non-linking category) renders as plain text
 * with no keyboard target, since there is nowhere for it to go.
 */
export function Breadcrumbs({ items, variant = 'default' }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={VARIANTS[variant]}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((crumb, index) => {
          const last = index === items.length - 1;
          return (
            <li key={crumb.label + index} className="flex items-center gap-1">
              {last ? (
                <span aria-current="page" className="font-medium text-[--color-text]">
                  {crumb.label}
                </span>
              ) : (
                <>
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="text-[--color-text-muted] hover:text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-[--color-text-muted]">{crumb.label}</span>
                  )}
                  <span aria-hidden="true" className="text-[--color-text-muted]">
                    /
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
