import { Icon } from '@/components/shared/icons/icon';
import type { LandingFaq } from '../landing.config';

/**
 * Questions as native `<details>`: keyboard, screen-reader and no-JavaScript behaviour come with
 * the element, and the open state needs no component state to keep.
 */
export function Faq({ items }: { readonly items: readonly LandingFaq[] }) {
  return (
    <section aria-labelledby="faq-title" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 id="faq-title" className="font-display text-3xl text-(--color-hero-ink) sm:text-4xl">
          Questions
        </h2>
        <div className="mt-8 flex flex-col gap-3">
          {items.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl bg-white ring-1 ring-black/5 open:shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 font-medium text-(--color-rail-fg) outline-none focus-visible:ring-2 focus-visible:ring-(--color-rail-fg) [&::-webkit-details-marker]:hidden">
                {item.q}
                <Icon
                  name="chevron-down"
                  size={20}
                  className="shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                />
              </summary>
              <p className="px-5 pb-4 text-sm text-(--color-rail-muted)">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
