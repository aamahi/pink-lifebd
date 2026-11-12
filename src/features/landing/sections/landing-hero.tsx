import { Icon } from '@/components/shared/icons/icon';
import { Button } from '@/components/ui/button';
import { Img } from '@/components/ui/image';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/core/utils/money';
import type { LandingConfig } from '../landing.config';

export interface LandingHeroProps {
  readonly config: LandingConfig;
  /**
   * The cheapest piece on offer, for the "From" line. `undefined` while the catalogue loads, `null` when
   * it failed or has nothing to sell (the line is then left out rather than showing a dash).
   */
  readonly fromPrice: number | null | undefined;
}

/**
 * The first screen from an ad: what this page sells, in the ad's own language, one button, and the
 * cash-on-delivery promise. The three cut-outs are boxes the pictures are fitted into
 * (`object-contain`), so a wide brief and a tall babydoll both sit in the same collage.
 */
export function LandingHero({ config, fromPrice }: LandingHeroProps) {
  const [middle, left, right] = config.heroImages;
  return (
    <section
      aria-labelledby="landing-title"
      className="relative overflow-hidden bg-linear-to-b from-(--color-hero-from) to-(--color-hero-to)"
    >
      <div
        className="pointer-events-none absolute -right-24 top-10 size-96 rounded-full bg-(--color-hero-blob)/70 blur-3xl"
        aria-hidden="true"
      ></div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 pb-10 sm:px-6 lg:px-8 pt-8 md:grid-cols-2 md:gap-4 md:pb-16 md:pt-12">
        <div>
          <p className="inline-block rounded-full bg-white/80 px-3 py-1 text-xs font-medium uppercase tracking-widest text-(--color-hero-ink) shadow-sm">
            {config.eyebrow}
          </p>
          <h1
            id="landing-title"
            className="mt-4 text-balance font-display text-4xl leading-[1.08] text-(--color-hero-ink) sm:text-5xl lg:text-6xl"
          >
            {config.headline}{' '}
            <span className="text-(--color-lp-accent)">{config.headlineAccent}</span>
          </h1>
          <p lang="bn" className="mt-4 text-lg font-medium text-(--color-hero-ink)">
            {config.bangla}
          </p>
          <p className="mt-3 max-w-xl text-(--color-rail-muted)">{config.lede}</p>

          <div className="mt-5 min-h-7" aria-live="polite">
            {fromPrice === undefined && <Skeleton height="1.5rem" className="max-w-32" />}
            {typeof fromPrice === 'number' && (
              <p className="text-lg text-(--color-hero-ink)">
                From{' '}
                <span className="font-semibold text-(--color-lp-accent-dark)">
                  {formatMoney(fromPrice, { compact: true })}
                </span>
              </p>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button href="#order" variant="accent" size="lg">
              {config.cta}
            </Button>
            <Button href="#how" variant="plum-outline" size="lg">
              How to order
            </Button>
          </div>

          <p className="mt-6 flex items-center gap-2 text-sm font-medium text-(--color-hero-ink)">
            <Icon name="local_shipping" size={20} />
            Cash on Delivery all over Bangladesh
          </p>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-md md:max-w-none">
          <Img
            src={left}
            alt=""
            priority
            className="absolute left-0 top-[4%] block h-[40%] w-[50%] -rotate-6"
            imgClass="h-full w-full object-contain drop-shadow-xl"
          />
          <Img
            src={right}
            alt=""
            priority
            className="absolute bottom-[4%] right-0 block h-[40%] w-[50%] rotate-6"
            imgClass="h-full w-full object-contain drop-shadow-xl"
          />
          <Img
            src={middle}
            alt=""
            priority
            className="absolute left-[10%] top-[22%] z-10 block h-[56%] w-[80%]"
            imgClass="h-full w-full object-contain drop-shadow-2xl"
          />
        </div>
      </div>
    </section>
  );
}
