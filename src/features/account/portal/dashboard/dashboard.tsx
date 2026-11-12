import Link from 'next/link';

/**
 * Portal dashboard -- a static welcome and a set of shortcuts into the other
 * portal sections. No fetch of its own: an account summary panel usually
 * pulls from other services the portal already has (orders, addresses), and
 * duplicating those calls here just to give this page its own loading branch
 * would be manufacturing an async state that does not correspond to anything
 * this page actually does. `orders.tsx` is where the portal's real
 * loading/failed/empty demonstration lives.
 */
export function Dashboard() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-[--color-text]">Your account</h1>
      <p className="mt-2 text-[--color-text-muted]">
        Manage your orders, profile and saved addresses from here.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Link
          href="/account/portal/orders"
          className="rounded-lg border border-[--color-border] bg-[--color-surface-raised] p-4 hover:shadow-lg"
        >
          <p className="font-medium text-[--color-text]">Orders</p>
          <p className="mt-1 text-sm text-[--color-text-muted]">Track and review past orders.</p>
        </Link>
        <Link
          href="/account/portal/profile"
          className="rounded-lg border border-[--color-border] bg-[--color-surface-raised] p-4 hover:shadow-lg"
        >
          <p className="font-medium text-[--color-text]">Profile</p>
          <p className="mt-1 text-sm text-[--color-text-muted]">Update your name and email.</p>
        </Link>
        <Link
          href="/account/portal/addresses"
          className="rounded-lg border border-[--color-border] bg-[--color-surface-raised] p-4 hover:shadow-lg"
        >
          <p className="font-medium text-[--color-text]">Addresses</p>
          <p className="mt-1 text-sm text-[--color-text-muted]">Manage your saved addresses.</p>
        </Link>
      </div>
    </>
  );
}
