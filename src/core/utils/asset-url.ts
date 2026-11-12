/**
 * Turns a `public/`-relative path (`images/pink-life/photo-x-front.webp`, as the fixtures and
 * `SITE.logo.src` write them) into a root-absolute URL.
 *
 * The Angular app had `<base href="/">`, so a bare `images/...` resolved against the site root on
 * every route. Next has no base tag: on `/shop/bras` a bare `images/x.webp` would request
 * `/shop/images/x.webp`. Every `src` that came from data goes through this.
 */
export function assetUrl(path: string): string {
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  return path.startsWith('/') ? path : `/${path}`;
}
