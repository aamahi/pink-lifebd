'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from '@/core/forms/use-form';
import {
  minLength,
  name as nameValidator,
  phone as phoneValidator,
  required,
} from '@/core/forms/validators';
import { lineTotal, useCart } from '@/core/stores/cart.store';
import { useOrders } from '@/core/stores/order.store';
import { formatMoney } from '@/core/utils/money';
import { BackLink } from '@/components/shared/navigation/back-link';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DeliveryZones } from '@/components/ui/delivery-zones';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Field } from '@/components/ui/field';
import { Img } from '@/components/ui/image';
import { Skeleton } from '@/components/ui/skeleton';

/** The look every text control here shares. 16px type, because iOS zooms the page into any smaller one on focus. */
const CONTROL =
  'w-full rounded-xl border border-(--color-rail-border) bg-(--color-rail-bg) px-4 text-base text-(--color-rail-fg) outline-none transition-colors placeholder:text-(--color-rail-muted)/70 focus:border-(--color-rail-fg) focus-visible:ring-2 focus-visible:ring-(--color-rail-ring) aria-[invalid=true]:border-danger';

type FieldName = 'name' | 'phone' | 'address';

/**
 * Checkout archetype, at `/checkout`.
 *
 * One `useForm` for the whole form (`core/forms/use-form.ts`, the React counterpart of the typed
 * reactive `FormGroup`): `nameValidator()` for the name, `phoneValidator()` for the number, and
 * `form.errorFor` / `form.isInvalid` / `form.markAllTouched` for every field's error message.
 *
 * **As short as a delivery needs.** Name, a mobile number a courier can ring, and where the
 * parcel goes -- three fields, all in one step. There is no email field (a customer with no email
 * address is not turned away, and nothing here sends one) and no separate city field: the delivery
 * area and the address say it.
 * `MainLayout` hides the footer and the bottom tab bar on `/checkout`, so the only way onward is the
 * order.
 *
 * **Delivery.** The area is chosen with `DeliveryZones` and held in the cart store, the same
 * place the cart page keeps it, so the fee here is the fee the cart quoted. It is not a form
 * field: it drives a total, not a validation.
 *
 * **Phone-first controls.** Inputs are 48px tall with 16px type, each carries the right
 * `inputmode`/`autocomplete` so the keyboard and autofill match the field, and a failed submit
 * moves focus to the first field that needs attention rather than leaving the customer to hunt
 * for a message that may be off screen. Place order sits in a bar that stays at the foot of the
 * screen with the total, and is the summary card's button from `lg` up.
 *
 * The page-level LOADING/FAILED/EMPTY branches are the cart store's, not this component's own -- a
 * checkout page has nothing to check out until the cart has loaded. LOADED renders the form only
 * once the cart is confirmed non-empty. If a line has no price, the total has no value and the
 * order cannot be placed from here.
 *
 * On submit, `placeOrder()` is a genuine async call (350 ms in fixture mode, a real
 * POST in API mode) -- succeeding clears the cart and navigates to `/order-confirmation/:orderId`.
 */
export function Checkout() {
  const cart = useCart();
  const { placeOrder } = useOrders();
  const router = useRouter();

  const form = useForm(
    { name: '', phone: '', address: '' },
    {
      name: [required, nameValidator()],
      phone: [required, phoneValidator()],
      address: [required, minLength(5)],
    },
  );

  const [placing, setPlacing] = useState(false);
  const [placementError, setPlacementError] = useState<string | null>(null);

  const controls = useRef<
    Partial<Record<FieldName, HTMLInputElement | HTMLTextAreaElement | null>>
  >({});
  const root = useRef<HTMLDivElement>(null);

  /** An order needs a total, and a total needs every line priced. */
  const canOrder = cart.total !== null;

  // The button the customer pressed is in the bar at the foot of the screen; the message
  // is above it. Bring it into view once it has rendered.
  useEffect(() => {
    if (placementError !== null) {
      root.current
        ?.querySelector('#order-error')
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [placementError]);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setPlacementError(null);
    if (placing || !canOrder) return;
    if (!form.markAllTouched()) {
      focusFirstInvalid();
      return;
    }

    const zone = cart.deliveryZone;
    setPlacing(true);
    placeOrder(
      cart.items,
      cart.subtotal,
      { zone: zone.id, label: zone.label, fee: zone.fee },
      cart.total,
      {
        name: form.values.name.trim(),
        phone: form.values.phone.trim(),
        address: form.values.address.trim(),
        note: '',
      },
    ).then(
      (orderId) => {
        setPlacing(false);
        cart.clear();
        router.push(`/order-confirmation/${encodeURIComponent(orderId)}`);
      },
      (err: unknown) => {
        setPlacing(false);
        setPlacementError(err instanceof Error ? err.message : 'Request failed.');
      },
    );
  }

  /** Focuses the first control that failed, in form order, so its message is where the customer is looking. */
  function focusFirstInvalid(): void {
    const first = (Object.keys(form.values) as FieldName[]).find((key) => form.errors[key] !== '');
    if (!first) return;
    controls.current[first]?.focus();
  }

  return (
    <div
      ref={root}
      className="min-h-[60vh] bg-(--color-rail-bg) font-jakarta text-(--color-rail-fg)"
    >
      <section
        className="mx-auto w-full max-w-[1320px] px-4 py-6 lg:px-20 lg:py-10"
        aria-labelledby="checkout-title"
      >
        <BackLink className="-ml-2.5 block" fallback="/cart" label="Back to cart" />
        <h1
          id="checkout-title"
          className="mt-2 font-display text-3xl font-semibold leading-tight md:text-4xl"
        >
          Checkout
        </h1>

        {cart.error ? (
          <div className="mt-6 rounded-2xl bg-(--color-shop-tile)">
            <ErrorState
              title="Could not load your cart"
              message={cart.error}
              onRetry={() => void cart.hydrate()}
            />
          </div>
        ) : !cart.ready ? (
          <>
            <div
              className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-14"
              aria-busy="true"
            >
              <Skeleton shape="block" height="26rem" />
              <Skeleton shape="block" height="20rem" />
            </div>
            <p className="sr-only" role="status">
              Loading cart
            </p>
          </>
        ) : cart.items.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-(--color-shop-tile) py-6">
            <EmptyState
              title="Your cart is empty"
              hint="Add something from the shop before checking out."
            >
              <Button variant="dark" size="lg" href="/shop">
                Browse the shop
              </Button>
            </EmptyState>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-14">
              <form
                id="checkout-form"
                className="flex min-w-0 flex-col gap-10"
                onSubmit={submit}
                noValidate
              >
                <section aria-labelledby="details-title" className="flex flex-col gap-5">
                  <h2
                    id="details-title"
                    className="flex items-center gap-3 font-display text-xl font-semibold"
                  >
                    <span
                      className="grid size-7 place-items-center rounded-full bg-(--color-rail-fg) font-jakarta text-sm font-semibold text-(--color-rail-bg)"
                      aria-hidden="true"
                    >
                      1
                    </span>
                    Your details
                  </h2>

                  <Field label="Full name" required error={form.errorFor('name')}>
                    {({ id, describedBy }) => (
                      <input
                        id={id}
                        ref={(el) => {
                          controls.current.name = el;
                        }}
                        value={form.values.name}
                        onChange={form.onChange('name')}
                        onBlur={form.onBlur('name')}
                        autoComplete="name"
                        enterKeyHint="next"
                        aria-invalid={form.isInvalid('name') ? 'true' : undefined}
                        aria-describedby={describedBy || undefined}
                        className={CONTROL + ' h-12'}
                      />
                    )}
                  </Field>

                  <Field
                    label="Mobile number"
                    hint="So the courier can reach you."
                    required
                    error={form.errorFor('phone')}
                  >
                    {({ id, describedBy }) => (
                      <input
                        id={id}
                        ref={(el) => {
                          controls.current.phone = el;
                        }}
                        type="tel"
                        inputMode="tel"
                        value={form.values.phone}
                        onChange={form.onChange('phone')}
                        onBlur={form.onBlur('phone')}
                        autoComplete="tel"
                        placeholder="01XXXXXXXXX"
                        enterKeyHint="next"
                        aria-invalid={form.isInvalid('phone') ? 'true' : undefined}
                        aria-describedby={describedBy || undefined}
                        className={CONTROL + ' h-12'}
                      />
                    )}
                  </Field>

                  <Field
                    label="Full address"
                    hint="House, road, area and district."
                    required
                    error={form.errorFor('address')}
                  >
                    {({ id, describedBy }) => (
                      <textarea
                        id={id}
                        ref={(el) => {
                          controls.current.address = el;
                        }}
                        value={form.values.address}
                        onChange={form.onChange('address')}
                        onBlur={form.onBlur('address')}
                        rows={3}
                        autoComplete="street-address"
                        aria-invalid={form.isInvalid('address') ? 'true' : undefined}
                        aria-describedby={describedBy || undefined}
                        className={CONTROL + ' min-h-28 py-3'}
                      />
                    )}
                  </Field>
                </section>

                <section aria-labelledby="delivery-title" className="flex flex-col gap-5">
                  <h2
                    id="delivery-title"
                    className="flex items-center gap-3 font-display text-xl font-semibold"
                  >
                    <span
                      className="grid size-7 place-items-center rounded-full bg-(--color-rail-fg) font-jakarta text-sm font-semibold text-(--color-rail-bg)"
                      aria-hidden="true"
                    >
                      2
                    </span>
                    Delivery
                  </h2>

                  <div>
                    <p className="mb-2 text-sm font-medium">Delivery area</p>
                    <DeliveryZones
                      zones={cart.deliveryZones}
                      selected={cart.selectedZoneId}
                      onPicked={cart.setDeliveryZone}
                    />
                  </div>
                </section>

                {placementError ? (
                  <Alert id="order-error" tone="danger" title="Could not place your order">
                    {placementError}
                  </Alert>
                ) : null}
              </form>

              <aside
                aria-labelledby="summary-title"
                className="rounded-2xl bg-linear-to-br from-(--color-hero-from) to-(--color-hero-to) p-5 sm:p-6 lg:sticky lg:top-28"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 id="summary-title" className="font-display text-xl font-semibold">
                    Your order
                  </h2>
                  <Link
                    href="/cart"
                    className="rounded-md py-1 text-sm font-medium text-(--color-rail-muted) underline underline-offset-4 hover:text-(--color-rail-fg)"
                  >
                    Edit cart
                  </Link>
                </div>

                <ul className="mt-4 flex flex-col gap-3">
                  {cart.items.map((line) => (
                    <li key={line.product.id} className="flex items-center gap-3">
                      <div className="relative aspect-[4/5] w-14 shrink-0 rounded-lg bg-white/70">
                        {line.product.image ? (
                          <div className="absolute inset-1">
                            <Img
                              className="block h-full"
                              imgClass="mx-auto h-full w-auto"
                              src={line.product.image}
                              alt=""
                              width={645}
                              height={1000}
                            />
                          </div>
                        ) : null}
                        <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-(--color-rail-fg) px-1 text-[11px] font-semibold leading-5 text-(--color-rail-bg)">
                          {line.quantity}
                          <span className="sr-only"> ×</span>
                        </span>
                      </div>
                      <p className="min-w-0 flex-1 text-sm leading-snug">{line.product.name}</p>
                      <p className="shrink-0 text-sm font-medium tabular-nums">
                        {formatMoney(lineTotal(line), { compact: true })}
                      </p>
                    </li>
                  ))}
                </ul>

                <dl className="mt-5 border-t border-(--color-hero-ink)/15 pt-4 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-(--color-rail-muted)">Subtotal</dt>
                    <dd className="font-medium tabular-nums">
                      {formatMoney(cart.subtotal, { compact: true })}
                    </dd>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between gap-3">
                    <dt className="text-(--color-rail-muted)">
                      Delivery · {cart.deliveryZone.label}
                    </dt>
                    <dd className="font-medium tabular-nums">
                      {formatMoney(cart.deliveryFee, { compact: true })}
                    </dd>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-(--color-hero-ink)/15 pt-4">
                    <dt className="text-base font-semibold">Total</dt>
                    <dd className="text-xl font-semibold tabular-nums">
                      {formatMoney(cart.total, { compact: true })}
                    </dd>
                  </div>
                </dl>

                {canOrder ? (
                  <Button
                    type="submit"
                    form="checkout-form"
                    variant="dark"
                    size="lg"
                    block
                    className="mt-5 max-lg:hidden"
                    loading={placing}
                  >
                    {placing ? 'Placing order…' : 'Place order'}
                  </Button>
                ) : (
                  <p className="mt-4 text-sm" role="status">
                    Some items have no price yet, so this order cannot be placed.{' '}
                    <Link href="/cart" className="font-medium underline underline-offset-4">
                      Review your cart
                    </Link>
                  </p>
                )}
              </aside>
            </div>

            <Alert className="mt-8 block" tone="info" title="This checkout is a demonstration">
              Placing an order does not charge a card. Wire{' '}
              <code className="font-mono">submit()</code> in{' '}
              <code className="font-mono">checkout.tsx</code> to a real payment endpoint before
              using it.
            </Alert>

            <div
              data-action-bar
              className="sticky bottom-0 z-20 -mx-4 mt-6 flex items-center gap-4 border-t border-(--color-rail-border) bg-(--color-rail-bg)/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden"
            >
              <div className="min-w-0">
                <p className="text-xs text-(--color-rail-muted)">Total</p>
                <p className="text-lg font-semibold leading-tight tabular-nums">
                  {formatMoney(cart.total, { compact: true })}
                </p>
              </div>
              {canOrder ? (
                <Button
                  type="submit"
                  form="checkout-form"
                  variant="dark"
                  size="lg"
                  className="flex-1"
                  loading={placing}
                >
                  {placing ? 'Placing order…' : 'Place order'}
                </Button>
              ) : (
                <Button variant="dark" size="lg" className="flex-1" href="/cart">
                  Review cart
                </Button>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
