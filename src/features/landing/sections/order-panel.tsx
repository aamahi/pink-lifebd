'use client';

import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DeliveryZones } from '@/components/ui/delivery-zones';
import { SITE } from '@/core/config/site.config';
import type { Product } from '@/core/data/catalog.model';
import { quickAddBlock, variantOf } from '@/core/data/variant';
import { cartSubtotal, type CartLine } from '@/core/stores/cart.store';
import { useOrders } from '@/core/stores/order.store';
import { formatMoney } from '@/core/utils/money';
import { CustomerFields, REQUIRED_FIELDS, useCustomerForm } from './customer-fields';
import { CONFIRM_LABEL, OrderBar } from './order-bar';
import { OrderSummary } from './order-summary';
import { QuantityStepper } from './quantity-stepper';
import { VariantPicker } from './variant-picker';

/** The most of one style a single order can carry. */
const MAX_QUANTITY = 10;

export interface OrderPanelProps {
  readonly product: Product;
  readonly colorIndex: number;
  readonly onColor: (index: number) => void;
  /** Prewarms the repaint for a colour before it is clicked. */
  readonly onColorHint: (index: number) => void;
  /** The cut-out as repainted to the chosen colour, for the summary's thumbnail. */
  readonly cutout: string | null;
}

/** A numbered section heading, the same look as the shop's checkout. */
function Step({ n, id, children }: { n: number; id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-3 font-display text-xl font-semibold">
      <span
        className="grid size-7 place-items-center rounded-full bg-(--color-hero-ink) font-sans text-sm font-semibold text-white"
        aria-hidden="true"
      >
        {n}
      </span>
      {children}
    </h2>
  );
}

/**
 * The whole order, on the product page: what it is and costs, colour, size and quantity, the
 * customer's name, number and address, the delivery area, the summary, and one confirm button.
 * There is no separate checkout step to lose a visitor from an ad at.
 *
 * Submitting checks everything at once, so a visitor sees every gap in one go: a missing size
 * rings the sizes and scrolls them into view; a bad field is marked and the first one is focused.
 * Only when both are right is the order placed (`placeOrder`, with the customer's details), after
 * which they land on the order confirmation. Nothing here touches the cart: the order is exactly
 * what the page showed, and whatever the cart held stays as it was.
 *
 * A product that cannot be sold (no stated price, or a tracked stock of 0) gets no form, only a
 * way back to the shop: an unpriced item must not be put through as an order.
 *
 * The confirm button is in the form from `md` up and pinned to the screen's foot below it
 * (`OrderBar`), where the total stays in view as the form scrolls.
 */
export function OrderPanel({ product, colorIndex, onColor, onColorHint, cutout }: OrderPanelProps) {
  const router = useRouter();
  const { placeOrder } = useOrders();
  const form = useCustomerForm();
  const formRef = useRef<HTMLFormElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const [size, setSize] = useState<string | null>(null);
  const [needSize, setNeedSize] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [zoneId, setZoneId] = useState<string>(SITE.delivery.zones[0].id);
  const [placing, setPlacing] = useState(false);
  const [placementError, setPlacementError] = useState<string | null>(null);

  const blocked = quickAddBlock(product);
  const zone = SITE.delivery.zones.find((z) => z.id === zoneId) ?? SITE.delivery.zones[0];

  const colorName = product.colors[colorIndex]?.name;
  const chosen = variantOf(product, colorName, size ?? undefined);
  const line: CartLine = { product: chosen, quantity };
  const subtotal = cartSubtotal([line]);
  const total = subtotal === null ? null : subtotal + zone.fee;

  const saving =
    product.price !== null &&
    product.compareAtPrice !== null &&
    product.compareAtPrice > product.price
      ? product.compareAtPrice - product.price
      : null;

  const smooth = (): ScrollBehavior =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setPlacementError(null);
    if (placing || blocked !== null) return;

    // Check everything before reacting, so every gap is marked in one go.
    const detailsOk = form.markAllTouched();
    const sizeOk = product.sizes.length === 0 || size !== null;

    if (!sizeOk) {
      setNeedSize(true);
      pickerRef.current?.scrollIntoView({ block: 'center', behavior: smooth() });
      return;
    }
    if (!detailsOk) {
      const first = REQUIRED_FIELDS.find((key) => form.errors[key] !== '');
      if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }

    setPlacing(true);
    placeOrder([line], subtotal, { zone: zone.id, label: zone.label, fee: zone.fee }, total, {
      name: form.values.name.trim(),
      phone: form.values.phone.trim(),
      address: form.values.address.trim(),
      note: form.values.note.trim(),
    }).then(
      (orderId) => {
        setPlacing(false);
        router.push(`/order-confirmation/${encodeURIComponent(orderId)}`);
      },
      (err: unknown) => {
        setPlacing(false);
        setPlacementError(err instanceof Error ? err.message : 'Request failed.');
        requestAnimationFrame(() =>
          document
            .getElementById('order-error')
            ?.scrollIntoView({ block: 'center', behavior: smooth() }),
        );
      },
    );
  };

  return (
    <section
      aria-labelledby="product-title"
      className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6"
    >
      {product.badge && (
        <p className="inline-block rounded-full bg-(--color-hero-from) px-3 py-1 text-xs font-medium uppercase tracking-widest text-(--color-hero-ink)">
          {product.badge}
        </p>
      )}
      <h1
        id="product-title"
        className="mt-3 text-balance font-display text-3xl leading-tight text-(--color-hero-ink) sm:text-4xl"
      >
        {product.name}
      </h1>

      <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-3xl font-semibold text-(--color-lp-accent-dark)">
          {formatMoney(product.price, { compact: true })}
        </span>
        {saving !== null && product.compareAtPrice !== null && (
          <>
            <span className="text-lg text-(--color-rail-muted) line-through">
              {formatMoney(product.compareAtPrice, { compact: true })}
            </span>
            <span className="rounded-full bg-(--color-lp-accent)/10 px-2.5 py-0.5 text-sm font-medium text-(--color-lp-accent-dark)">
              Save {formatMoney(saving, { compact: true })}
            </span>
          </>
        )}
      </p>
      <p className="mt-2 text-(--color-rail-muted)">{product.summary}</p>

      {blocked !== null ? (
        <div className="mt-6 rounded-2xl bg-(--color-hero-from) p-5" role="status">
          <p className="font-medium text-(--color-rail-fg)">
            This style cannot be ordered right now.
          </p>
          <p className="mt-1 text-sm text-(--color-rail-muted)">
            {blocked === 'stock'
              ? 'It is sold out at the moment.'
              : 'Its price is not available at the moment.'}{' '}
            Have a look at what else we have.
          </p>
          <Button href="/shop" variant="plum" className="mt-4">
            Browse the shop
          </Button>
        </div>
      ) : (
        <>
          <form
            id="order-form"
            ref={formRef}
            onSubmit={submit}
            noValidate
            className="mt-6 flex flex-col gap-8"
          >
            <div>
              <div ref={pickerRef}>
                <VariantPicker
                  product={product}
                  colorIndex={colorIndex}
                  onColor={onColor}
                  onColorHint={onColorHint}
                  size={size}
                  onSize={(s) => {
                    setSize(s);
                    setNeedSize(false);
                  }}
                  needSize={needSize}
                />
              </div>
              {product.sizeChart && (
                <a
                  href="#size-guide"
                  className="mt-1 inline-block py-2 text-sm font-medium text-(--color-hero-ink) underline underline-offset-4"
                >
                  Not sure of your size? See the size guide
                </a>
              )}

              <div className="mt-3 flex items-center justify-between gap-4 rounded-xl bg-(--color-hero-from) px-4 py-2">
                <span className="text-sm font-medium text-(--color-rail-fg)">Quantity</span>
                <QuantityStepper value={quantity} onChange={setQuantity} max={MAX_QUANTITY} />
              </div>
            </div>

            <section aria-labelledby="details-title" className="flex flex-col gap-4">
              <Step n={1} id="details-title">
                Your details
              </Step>
              <CustomerFields form={form} />
            </section>

            <section aria-labelledby="area-title" className="flex flex-col gap-4">
              <Step n={2} id="area-title">
                Delivery area
              </Step>
              <DeliveryZones zones={SITE.delivery.zones} selected={zoneId} onPicked={setZoneId} />
            </section>

            <section aria-labelledby="summary-title" className="flex flex-col gap-4">
              <Step n={3} id="summary-title">
                Your order
              </Step>
              <OrderSummary
                product={product}
                cutout={cutout}
                choice={[colorName, size].filter(Boolean).join(', ')}
                quantity={quantity}
                subtotal={subtotal}
                deliveryLabel={zone.label}
                deliveryFee={zone.fee}
                total={total}
              />
              <p className="text-sm text-(--color-rail-muted)">
                Cash on Delivery: you pay the courier when your order reaches you. Your details are
                used only to deliver this order; see our{' '}
                <Link
                  href="/privacy-policy"
                  className="font-medium text-(--color-hero-ink) underline underline-offset-4"
                >
                  privacy policy
                </Link>
                .
              </p>
            </section>

            {placementError ? (
              <Alert id="order-error" tone="danger" title="Could not place your order">
                {placementError}
              </Alert>
            ) : null}

            <Button
              type="submit"
              variant="accent"
              size="lg"
              block
              className="whitespace-nowrap max-md:hidden"
              loading={placing}
            >
              {placing
                ? 'Placing order…'
                : `${CONFIRM_LABEL} · ${formatMoney(total, { compact: true })}`}
            </Button>
          </form>

          <OrderBar total={total} placing={placing} />
        </>
      )}
    </section>
  );
}
