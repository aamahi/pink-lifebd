import { Icon } from '@/components/shared/icons/icon';
import { SITE } from '@/core/config/site.config';
import { formatMoney } from '@/core/utils/money';

const STEPS = [
  {
    bangla: 'বেছে নিন',
    title: 'Choose',
    text: 'Pick your colour and size.',
  },
  {
    bangla: 'অর্ডার করুন',
    title: 'Order',
    text: 'Add to cart, then give your name, mobile number and address.',
  },
  {
    bangla: 'হাতে পেয়ে টাকা দিন',
    title: 'Pay on delivery',
    text: 'Pay the courier in cash when your order reaches you.',
  },
] as const;

/**
 * Three steps and the delivery charge. The charges come from `SITE.delivery.zones`, the same list
 * the cart and checkout price from, through `formatMoney`, so this page cannot quote a fee the
 * checkout will not charge.
 */
export function HowToOrder() {
  return (
    <section
      id="how"
      aria-labelledby="how-title"
      className="scroll-mt-16 bg-(--color-hero-ink) px-4 py-14 text-white sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <h2 id="how-title" className="font-display text-3xl sm:text-4xl">
          Ordering takes a minute
        </h2>

        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-2xl bg-white/10 p-6">
              <span className="flex size-9 items-center justify-center rounded-full bg-white text-sm font-semibold text-(--color-hero-ink)">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-medium">{step.title}</h3>
              <p lang="bn" className="text-sm text-white/80">
                {step.bangla}
              </p>
              <p className="mt-2 text-sm text-white/80">{step.text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-col gap-5 rounded-2xl bg-white p-6 text-(--color-hero-ink) sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-(--color-hero-to)">
              <Icon name="local_shipping" size={30} />
            </span>
            <div>
              <p className="text-lg font-semibold">Cash on Delivery all over Bangladesh</p>
              <p lang="bn" className="text-sm">
                সারা বাংলাদেশে ক্যাশ অন ডেলিভারি
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-4 text-center sm:text-left">
            {SITE.delivery.zones.map((zone) => (
              <div key={zone.id}>
                <dt className="text-xs text-(--color-rail-muted)">{zone.label}</dt>
                <dd className="font-semibold text-(--color-lp-accent-dark)">
                  {formatMoney(zone.fee, { compact: true })}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
