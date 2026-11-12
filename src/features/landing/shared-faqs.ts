import { SITE } from '@/core/config/site.config';
import { formatMoney } from '@/core/utils/money';
import type { LandingFaq } from './landing.config';

/**
 * The two answers every ad page gives, built from the same config the cart and checkout read, so
 * the fees quoted here are the fees checkout charges.
 */
export function sharedFaqs(): readonly LandingFaq[] {
  const fees = SITE.delivery.zones
    .map((z) => `${z.label} ${formatMoney(z.fee, { compact: true })}`)
    .join(', ');
  return [
    {
      q: 'How do I pay?',
      a: 'Cash on Delivery, all over Bangladesh. You pay the courier in cash when your order reaches you.',
    },
    {
      q: 'How much does delivery cost?',
      a: `${fees}. The charge is added to your order at checkout.`,
    },
  ];
}
