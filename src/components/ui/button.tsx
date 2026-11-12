'use client';

import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps, ReactNode, Ref } from 'react';
import { cn } from '@/core/utils/cn';
import { SpecularLight } from './specular-light';

export type ButtonVariant =
  'primary' | 'secondary' | 'ghost' | 'danger' | 'dark' | 'accent' | 'plum' | 'plum-outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  // `relative isolate` gives the specular light's canvas a stacking context to
  // sit in under the label; the shadow and the 0.97 press are SpecularButton's.
  primary:
    'rounded-md relative isolate bg-primary text-white shadow-[0_10px_24px_-14px_rgba(0,0,0,0.45)] hover:bg-primary-dark active:scale-[0.97] focus-visible:outline-primary',
  secondary:
    'rounded-md bg-transparent text-primary ring-1 ring-inset ring-primary hover:bg-primary/5 focus-visible:outline-primary',
  ghost:
    'rounded-md bg-transparent text-(--color-text) hover:bg-black/5 focus-visible:outline-primary',
  danger: 'rounded-md bg-danger text-white hover:brightness-90 focus-visible:outline-danger',
  // The storefront's own call to action: the black button the shop banner, the product card
  // and the home hero all use, built from the `--color-rail-*` tokens they read. It carries no
  // specular light -- that belongs to `primary`, whose canvas the shop's black buttons never had.
  dark: 'rounded-lg bg-(--color-rail-fg) text-(--color-rail-bg) hover:opacity-85 active:scale-[0.97] focus-visible:outline-(--color-rail-ring)',
  // The ad landing pages' buttons (`features/landing`): the logo's pink for the order action, the
  // plum ink solid and outlined for the rest. A variant of their own rather than a `className` over
  // `dark`, because two background utilities on one element are won by whichever the stylesheet
  // happens to emit last.
  accent:
    'rounded-lg bg-(--color-lp-accent) text-white hover:bg-(--color-lp-accent-dark) active:scale-[0.97] focus-visible:outline-(--color-lp-accent)',
  plum: 'rounded-lg bg-(--color-hero-ink) text-white hover:opacity-90 active:scale-[0.97] focus-visible:outline-(--color-hero-ink)',
  'plum-outline':
    'rounded-lg bg-transparent text-(--color-hero-ink) ring-1 ring-inset ring-(--color-hero-ink) hover:bg-(--color-hero-ink)/5 active:scale-[0.97] focus-visible:outline-(--color-hero-ink)',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  /** Renders the busy state AND blocks the click, so a double-submit cannot land. */
  loading?: boolean;
  className?: string;
  children?: ReactNode;
}

type NativeButtonProps = ButtonOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps | 'href'> & {
    href?: undefined;
    ref?: Ref<HTMLButtonElement>;
  };

/** Everything `next/link` accepts (`href`, `replace`, `scroll`, `prefetch`, `target`, `onClick`, ...). */
type LinkButtonProps = ButtonOwnProps & Omit<ComponentProps<typeof Link>, keyof ButtonOwnProps>;

export type ButtonProps = NativeButtonProps | LinkButtonProps;

/** Pulls this component's own props off, leaving the native ones to forward. */
function splitOwn<P extends ButtonOwnProps>(props: P) {
  const {
    variant = 'primary',
    size = 'md',
    block = false,
    loading = false,
    className,
    children,
    ...rest
  } = props;
  const classes = cn(
    'inline-flex items-center justify-center gap-2 font-medium',
    'transition-[color,background-color,transform] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
    'disabled:opacity-50 disabled:pointer-events-none',
    VARIANTS[variant],
    SIZES[size],
    block ? 'w-full' : '',
    className,
  );
  const content = (
    <>
      {variant === 'primary' ? <SpecularLight baseColor="var(--color-primary-dark)" /> : null}
      {children}
    </>
  );
  return { classes, content, loading, rest };
}

/**
 * `<Button variant="primary">` renders a native `<button>`; `<Button href="/x">` renders a
 * `next/link` `<Link>` (an `<a>`) with the same classes. The Angular original was an attribute
 * selector (`button[ui-button], a[ui-button]`) for the same reason this keeps a real element:
 *
 * Wrapping a native button in another element breaks three things that are hard
 * to get back: form participation (a wrapped button does not submit its form),
 * `type="submit"` semantics, and the disabled-focus behaviour screen readers expect.
 * So the real `<button>` stays in the DOM, every native prop (`type`, `onClick`,
 * `disabled`, `aria-*`, `ref`) is forwarded to it, and only classes are added.
 *
 * The click handler is the caller's own `onClick`; there is no separate callback prop.
 * With no `type`, a `<button>` is a submit button, exactly as the native element is.
 *
 * Primary buttons carry `<SpecularLight>` (`specular-light.tsx`): a light on the
 * edge that follows the cursor. Its hairline is the primary's own darker shade,
 * read from the theme token so a rebrand recolours it too.
 */
export function Button(props: ButtonProps) {
  if (props.href !== undefined) {
    const { classes, content, loading, rest } = splitOwn(props);
    return (
      <Link {...rest} className={classes} aria-busy={loading ? 'true' : undefined}>
        {content}
      </Link>
    );
  }
  const { classes, content, loading, rest } = splitOwn(props);
  // `disabled` on an <a> is not a thing, so the link branch has none and the
  // pointer-events-none class carries it instead.
  return (
    <button
      {...rest}
      className={classes}
      aria-busy={loading ? 'true' : undefined}
      disabled={loading ? true : rest.disabled}
    >
      {content}
    </button>
  );
}
