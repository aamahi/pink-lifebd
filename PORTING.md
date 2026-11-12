# Porting contract: Angular 22 storefront -> Next.js 16 (App Router)

Source of truth for the design and behaviour: `D:\Mahi\falaq-clothing\src\app\` (Angular 22, read-only
for you -- never edit it). Target: this folder, `D:\pinklife-next-version\`.

**Goal: the same site.** Same markup, same Tailwind class strings, same copy, same states, same
animations, same fixtures. This is a translation, not a redesign. Where the Angular template has a
class string, keep it byte-for-byte. Where a comment explains a non-obvious mechanism (a measured
failure, why an obvious alternative fails), keep it -- comments that explain *mechanism* are part of
the code. Delete only comments that describe Angular-specific machinery that no longer exists.

Tests (`*.spec.ts`) are NOT ported. You may read them to learn intended behaviour.

## Stack

Next 16 App Router, React 19, TypeScript (strict, `noUncheckedIndexedAccess`), Tailwind v4 through
PostCSS (`src/app/globals.css`, theme in `src/styles/theme.css` -- already ported, same tokens), Zustand
for shared state. Path alias `@/*` -> `src/*`. No new dependencies without strong reason; if you must
add one, `npm install` it and say so in your report.

## Where things go

| Angular (`src/app/...`)                         | Next (`src/...`)                                          |
| ----------------------------------------------- | --------------------------------------------------------- |
| `core/*`                                        | `core/*` -- **already ported, do not rewrite** (see below) |
| `ui/<name>.ts`                                  | `components/ui/<name>.tsx`                                |
| `shared/<dir>/<name>.ts`                        | `components/shared/<dir>/<name>.tsx` (hooks/utils `.ts`)  |
| `layout/<dir>/<name>.ts`                        | `components/layout/<dir>/<name>.tsx`                      |
| `features/<f>/<name>.component.ts` (+html/css)  | `features/<f>/<name>.tsx` (drop the `.component` infix)  |
| `features/<f>/sections/<s>/...`                 | `features/<f>/sections/<s>/...`                           |
| a route in `app.routes.ts`                      | `app/<route>/page.tsx` -- a thin **server** component    |
| `<name>.component.css` / `<name>.css`           | `<name>.module.css` (CSS Modules), `:host` -> `.root`     |

Keep file names kebab-case and keep the Angular base name, so a reader can find the original.

**Already ported -- import these, do not duplicate** (read the files for exact signatures):

- `@/core/config/site.config` (`SITE`), `@/core/config/env` (`environment`)
- `@/core/data/catalog.model` (`Product`, `Category`, `ProductColor`), `catalog.fixtures`, `variant`
  (`defaultVariant`, `quickAddBlock`), `stock` (`stockLabel`, `stockTone`), `catalog.api`
  (`listProducts`, `listCategories`, `getProduct`, `searchProducts`, `looksUnfiltered`, `usingFixtures`)
- `@/core/utils/money` (`formatMoney`, `isMoneyAbsent`, `UNAVAILABLE`), `bdt-price` (`bdtPrice`),
  `format-bdt-price`, `to-nullable-number`, `site-date` (`formatSiteDate`), `asset-url` (`assetUrl`)
- `@/core/stores/*`: `useCart()` (+ `lineTotal`, `CartLine`), `useWishlist()`, `useAuth()`,
  `useToast()`, `useOrders()` (+ `OrderSummary`, `OrderStatus`, `OrderDelivery`)
- `@/core/hooks/use-async` (`useAsync(load, deps)` -> `{status:'loading'|'error'|'ready', data, error, reload}`)
- `@/core/seo` (`pageMetadata()` for server pages, `useSeo()` for data-dependent client titles)
- `@/core/forms/use-form` + `@/core/forms/validators` (replaces Angular reactive forms)

`src/app/layout.tsx` is written (fonts, globals.css, `<MainLayout>`, fixture badge). It imports
`MainLayout` from `@/components/layout/main-layout`.

## Component API rules (mechanical, so independently-written files agree)

Every file may be written by a different person at the same time. These rules make the import you
write today match the export someone else writes today. Apply them literally.

1. **Names.** Angular class name minus the `Ui`/`App` prefix and `Component` suffix, as a PascalCase
   *named* export: `UiButton` -> `Button`, `UiAlert` -> `Alert`, `UiBadge` -> `Badge`,
   `UiField` -> `Field`, `UiCard` -> `Card`, `UiSkeleton` -> `Skeleton`, `UiEmptyState` -> `EmptyState`,
   `UiErrorState` -> `ErrorState`, `UiBreadcrumbs` -> `Breadcrumbs`, `UiPagination` -> `Pagination`,
   `UiPillTabs` -> `PillTabs`, `UiLoadingSpinner` -> `LoadingSpinner`, `UiDeliveryZones` ->
   `DeliveryZones`, `AppToastHost` -> `ToastHost`, `AppIcon` -> `Icon`, `AppBackLink` -> `BackLink`,
   `AppPageHeader` -> `PageHeader`, `AppRecordLink` -> `RecordLink`. **`AppImage` -> `Img`** (file
   `components/ui/image.tsx`; named so it never collides with `next/image`). Exported prop-type
   aliases keep their Angular names (`BadgeTone`, `ButtonVariant`, `ButtonSize`, `AlertTone`,
   `SkeletonShape`, `Crumb`, `Pill`).
2. **Inputs -> props**, same camelCase name, same default. `input.required<T>()` -> required prop.
3. **Outputs -> callback props `onX`** where X is the output name capitalised: `retry` -> `onRetry`,
   `pageChange` -> `onPageChange`, `selected` -> `onSelected`, `picked` -> `onPicked`.
4. **Content projection.** The default `<ng-content />` -> `children`. A named slot
   `<ng-content select="[card-header]">` -> a `ReactNode` prop named by camel-casing the attribute:
   `cardHeader`, `cardFooter`; `PageHeader`'s `[leading] [badge] [tabs] [search] [actions]` ->
   `leading`, `badge`, `tabs`, `search`, `actions`.
5. **Attribute-selector components** (`button[ui-button], a[ui-button]`): `Button` renders a `<button>`
   by default and a `next/link` `<Link>` styled the same when given `href`. It forwards all native
   props (`type`, `onClick`, `disabled`, `aria-*`, `className`, ...). `<a ui-button routerLink="/x">`
   becomes `<Button href="/x">`.
6. **`Field`** (Angular used a `#ref` with `controlId()` / `describedBy()`): children may be a render
   function `{({ id, describedBy, invalid }) => <input id={id} aria-describedby={describedBy} ... />}`.
   Props: `label` (required), `hint`, `error`, `required`.
7. **`Badge`**: `<Badge tone="success">`; `BadgeTone` is exported from `components/ui/badge.tsx`
   (`core/data/stock.ts` already imports it from there).
8. **Image `src` values from data** (fixtures write `images/...` with no leading slash, relying on
   Angular's `<base href="/">`) must pass through `assetUrl()` -- `Img` does it internally; anywhere
   you write a raw `<img>`/`background-image` from a data string, call it yourself.

## Routing and navigation

- `routerLink="/x"` -> `next/link`. `router.navigate` -> `useRouter()` from `next/navigation`.
- Route params: in `page.tsx` (async server component, Next 16) `const { slug } = await params;` and
  pass `slug` to the client feature component as a prop. Query params: `useSearchParams()` in a client
  component; **wrap that client component in `<Suspense>` in `page.tsx`** or `next build` fails.
- Titles: static pages `export const metadata = pageMetadata({ title: 'Contact', path: '/contact-us' })`.
  Pages whose title depends on loaded data call `useSeo(...)` from the client component. Titles must
  match what the Angular `SeoService.apply` / route `title` produced.
- Chrome flags: `MainLayout` (components/layout/main-layout.tsx) decides header/footer visibility
  from `usePathname()` -- `/account/login` and `/account/register` hide header + footer, `/checkout`
  hides the footer (and bottom bar). Pages never branch on their own route.
- Guards: the portal `authGuard` (redirect to login when `useAuth().isLoggedIn` is false) lives in the
  portal's `layout.tsx`/shell client component. `pendingChangesGuard` + `warn-on-unsaved-changes`
  become one hook, `useUnsavedChangesWarning(isDirty)` in `components/shared/navigation/`.
- The Angular navigation helpers (`NavigationOriginService`, `RouteViewStateController`,
  `return-to.util`, `route-navigate-serializer.util`, `clickable-row.directive`, `confirm-dialog`)
  are ported by the **shared/layout agent** into `components/shared/navigation/` as hooks/components
  (`useNavigationOrigin`, `useRouteViewState`, `ClickableRow`, `useConfirmDialog`, ...). If you need
  one before it exists, derive its API from the Angular file by the rules above and write against it.

## State, async, forms

- Signals -> `useState` / `useMemo`; `computed()` -> `useMemo`; `effect()` -> `useEffect`;
  `input()` -> props; `viewChild`/`ElementRef` -> `useRef`; `afterNextRender` -> `useEffect`.
- `toSignal(service.obs$)` / `resource()` -> `useAsync(() => listProducts(), [])`. Every data view
  keeps **four** branches -- loading, failed, empty, loaded -- and never lets "failed" render the
  empty panel. This is the project's core rule; the Angular templates already follow it, so mirror them.
- Reactive forms -> `useForm` + validators. `FormValidationService.errorFor` -> `form.errorFor(field)`.
- Anything using hooks, state, refs, effects, `window`/`document`, or event handlers is a client
  component: put `'use client'` at the top. `page.tsx` files stay server components.
- No SSR hazards: do not read `window`/`document`/`localStorage` during render; use `useEffect`. If a
  value only exists in the browser (viewport width, `matchMedia`), render the same markup on the
  server and the first client render, then update in an effect (avoids hydration mismatches).

## Styling

- Keep Tailwind class strings. Angular's `[class.x]="cond"` -> `cond ? 'x' : ''`; `[ngClass]` /
  `[style.x]` -> `className` / `style`. Use a tiny local `cn()` (`@/core/utils/cn` -- see below) for
  conditional joins instead of template-string spaghetti.
- Angular component `.css` -> CSS Module next to the component. `:host` -> `.root` on the root
  element; `:host(.x)` -> `.root.x`. `::ng-deep` -> `:global(...)`. If the file uses `@apply` or theme
  functions, start it with `@reference "../../../styles/theme.css";` (relative path to `src/styles`).
- Angular host bindings (`host: { class: '...' }`) -> put those classes on the component's root
  element.

## Verification you must do before reporting

1. `cd D:\pinklife-next-version` then `npx tsc --noEmit` -- zero errors in YOUR files. Other agents
   are writing other files concurrently, so errors that are only "cannot find module '@/components/...'"
   for a file that does not exist *yet* may be ignored -- but name them in your report.
2. Do not run `next build` / `next dev` (other agents are mid-edit; the lead integrates).
3. Do not touch files outside your assignment, except to ADD a missing small helper you need under
   `src/core/utils/` (e.g. `cn.ts`: `(...c: (string|false|null|undefined)[]) => c.filter(Boolean).join(' ')`
   -- already present if listed below; check before creating).

## Report back (short)

List files written, anything you deliberately changed in behaviour (and why), anything you could not
port faithfully, and the exact props/exports of any component others will import from you.
