import { assetUrl } from '@/core/utils/asset-url';

export interface ImgProps {
  src: string;
  /** Required: every `<img>` this component renders carries one, so a caller that forgets it fails to compile. */
  alt: string;
  width?: number | null;
  height?: number | null;
  /** Above-the-fold hero images pass `true` to skip lazy loading and raise fetch priority. */
  priority?: boolean;
  /** Classes for the `<img>` itself. */
  imgClass?: string;
  /** Classes for the wrapper element (what `class` on `<app-image>` styled). */
  className?: string;
}

/**
 * `<Img src={p.image} alt={p.name} width={400} height={400} />` -- the Angular `AppImage`.
 *
 * Named `Img` so it never collides with `next/image`. It is deliberately not `next/image`: the
 * Angular original used `NgOptimizedImage`, whose behaviour with a passthrough loader is a plain
 * `<img>` with explicit dimensions, `loading="lazy"` and `decoding="async"` (or `loading="eager"`
 * plus `fetchpriority="high"` for `priority`). That is reproduced here directly, so the fixture
 * images in `public/` render exactly as before with no remote-pattern config or optimiser.
 *
 * Explicit `width` and `height` reserve layout space, which is what that directive requires and
 * warns loudly about when missing -- precisely the case the fixture set's `image: null` product
 * exercises (rule 3 of `.claude/rules/demo-craft.md`), where there is no source at all to size. A
 * plain `<img>` covers that case and any other where a caller genuinely does not know the
 * dimensions up front.
 *
 * `src` goes through `assetUrl()`: fixtures write `images/...` with no leading slash and relied on
 * Angular's `<base href="/">`; Next has no base tag, so a bare path would resolve against the
 * current route.
 *
 * Like the `<app-image>` host it replaces, the wrapper is an inline element that `className`
 * styles (`block h-full`, `absolute inset-0 block ...`), with `imgClass` on the image inside it.
 */
export function Img({
  src,
  alt,
  width = null,
  height = null,
  priority = false,
  imgClass = '',
  className,
}: ImgProps) {
  const sized = width !== null && height !== null;
  return (
    <span className={className}>
      {sized ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={assetUrl(src)}
          width={width}
          height={height}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          decoding="async"
          className={imgClass || undefined}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={assetUrl(src)} alt={alt} className={imgClass || undefined} />
      )}
    </span>
  );
}
