import { SITE } from '@/core/config/site.config';
import { assetUrl } from '@/core/utils/asset-url';

export interface BrandLogoProps {
  /**
   * Use the light-on-dark artwork. The default logo's plum "Life" is `#5B2740`, which all but
   * disappears on the footer's near-black background; the on-dark file swaps it for a warm white.
   */
  onDark?: boolean;
  /** Sizing only. The artwork is drawn on a 162x102 canvas, so give it that proportion. */
  className?: string;
}

/**
 * The brand logo as an image, for every place that shows it outside the header bar. The name is
 * the image's own `alt`, so a link wrapping this needs no `aria-label` of its own.
 *
 * Both files are SVG, so there is nothing for next/image's optimiser to do and a plain <img> keeps
 * the width and height the browser reserves exactly the canvas's.
 */
export function BrandLogo({ onDark = false, className }: BrandLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- an SVG logo: nothing for the image optimiser to do
    <img
      src={assetUrl(onDark ? SITE.logo.srcOnDark : SITE.logo.src)}
      alt={SITE.logo.alt}
      width={162}
      height={102}
      className={className}
    />
  );
}
