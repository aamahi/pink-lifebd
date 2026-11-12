import { Icon } from '@/components/shared/icons/icon';
import type { LandingBenefit } from '../landing.config';

/** Four short reasons to order, each a line the catalogue's own descriptions back up. */
export function Benefits({ items }: { readonly items: readonly LandingBenefit[] }) {
  return (
    <section
      aria-label="Why order"
      className="border-y border-(--color-rail-border) bg-white px-4 py-10 sm:px-6 lg:px-8"
    >
      <ul className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <li key={item.title} className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-(--color-hero-to) text-(--color-hero-ink)">
              <Icon name={item.icon} size={24} />
            </span>
            <div>
              <h3 className="font-medium text-(--color-rail-fg)">{item.title}</h3>
              <p className="mt-1 text-sm text-(--color-rail-muted)">{item.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
