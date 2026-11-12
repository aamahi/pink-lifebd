# Pink Life — Next.js storefront

A Next.js 16 (App Router, React 19, Tailwind v4) port of the Angular 22 `falaq-clothing` storefront template:
same design, same Tailwind classes, same fixtures, same product variants (colours and sizes), same pages and states.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
npm run typecheck
```

## Fixture mode vs API mode

Copy `.env.example` to `.env.local`.

- `NEXT_PUBLIC_API_BASE_URL` empty (default): the catalogue, cart and orders are served from in-memory
  fixtures (`src/core/data/catalog.fixtures.ts`) behind 350 ms of artificial latency, so loading states render.
- Set it to a real API origin to leave fixture mode. A failed request surfaces as an error page state; there is
  deliberately **no** silent fallback to fixtures.

## Layout

| Path | What |
| --- | --- |
| `src/app/` | Routes (thin server `page.tsx` files), root layout, `globals.css` |
| `src/features/` | Page-level client components, one folder per feature |
| `src/components/ui/` | UI primitives (Button, Field, Badge, Img, ...) |
| `src/components/shared/` | Icons, navigation helpers, carousel hook |
| `src/components/layout/` | Header, footer, bottom bar, `MainLayout` |
| `src/core/` | Site config, data + fixtures, money/date utils, Zustand stores, hooks, form validators |
| `src/styles/` | Tailwind theme (`theme.css`), tokens, components, typography |

Rebranding: `src/core/config/site.config.ts` and `src/styles/theme.css` / `tokens.css`.
`PORTING.md` records the Angular-to-Next translation rules used for this port.
