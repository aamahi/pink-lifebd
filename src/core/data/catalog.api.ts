import { environment } from '@/core/config/env';
import { FIXTURE_CATEGORIES, FIXTURE_PRODUCTS } from '@/core/data/catalog.fixtures';
import type { Category, Product } from '@/core/data/catalog.model';

/**
 * Reads the catalogue. Two sources, chosen once from `environment.apiBaseUrl`.
 * (Port of the Angular `CatalogService`; every method that returned an Observable returns a
 * Promise, and a rejected Promise is the "failed" branch a page must render.)
 *
 * FIXTURE MODE (`apiBaseUrl === ''`, the default) serves the arrays in `catalog.fixtures.ts` behind
 * a small artificial delay. The delay is not decoration: without it every load resolves
 * synchronously, the loading branch of every view never renders, and a skeleton that is broken
 * ships looking fine.
 *
 * API MODE hits `${apiBaseUrl}/...`. It does NOT fall back to fixtures on failure: a silent
 * fallback turns a broken integration into a page that looks perfect.
 */
export const FIXTURE_LATENCY_MS = 350;

const base = environment.apiBaseUrl.replace(/\/+$/, '');

/** True when this build is serving fixtures. Surfaced in the UI when `environment.debug`. */
export const usingFixtures = base === '';

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${base}${path}`);
  if (!res.ok) throw new Error(`Request failed (${res.status}).`);
  return (await res.json()) as T;
}

export async function listProducts(): Promise<readonly Product[]> {
  if (usingFixtures) {
    await sleep(FIXTURE_LATENCY_MS);
    return FIXTURE_PRODUCTS;
  }
  return getJson<Product[]>('/products');
}

export async function listCategories(): Promise<readonly Category[]> {
  if (usingFixtures) {
    await sleep(FIXTURE_LATENCY_MS);
    return FIXTURE_CATEGORIES;
  }
  return getJson<Category[]>('/categories');
}

/** Rejects when there is no such product -- the page renders its not-found branch off that. */
export async function getProduct(slug: string): Promise<Product> {
  if (usingFixtures) {
    await sleep(FIXTURE_LATENCY_MS);
    const hit = FIXTURE_PRODUCTS.find((p) => p.slug === slug);
    if (!hit) throw new Error(`No fixture product with slug "${slug}"`);
    return hit;
  }
  return getJson<Product>(`/products/${encodeURIComponent(slug)}`);
}

/**
 * True when a `getProduct` failure means there is no such product, as opposed to the API being
 * down. By the time a view sees the rejection `useAsync` has kept only its message, so the two are
 * told apart by what it says: the fixture miss above, or an HTTP 404 from `getJson`. A missing
 * product is a NOT-FOUND screen and a dead API is a retryable error; neither may stand in for the
 * other.
 */
export function isProductNotFound(message: string): boolean {
  return message.startsWith('No fixture product') || /\(404\)/.test(message);
}

function matches(p: Product, q: string): boolean {
  return (
    p.name.toLowerCase().includes(q) ||
    p.summary.toLowerCase().includes(q) ||
    p.tags.some((t) => t.includes(q))
  );
}

/**
 * Search, filtered client-side in fixture mode. In API mode the query goes to the server as `?q=`;
 * if that server does not know the parameter it drops it and returns 200 with the FULL list. The
 * guard is `looksUnfiltered` below, which the page calls -- only the caller knows what it asked for.
 */
export async function searchProducts(query: string): Promise<readonly Product[]> {
  const q = query.trim().toLowerCase();
  if (usingFixtures) {
    await sleep(FIXTURE_LATENCY_MS);
    return q === '' ? FIXTURE_PRODUCTS : FIXTURE_PRODUCTS.filter((p) => matches(p, q));
  }
  return getJson<Product[]>(`/products?q=${encodeURIComponent(q)}`);
}

/**
 * Detects a search parameter the server silently ignored: a non-empty query that came back with
 * results which do not mention it AT ALL. One-sided and cheap; it can be wrong in the harmless
 * direction, so callers show a NOTICE, never an error, and never hide the results.
 */
export function looksUnfiltered(query: string, results: readonly Product[]): boolean {
  const q = query.trim().toLowerCase();
  if (q === '' || results.length === 0) return false;
  return !results.some((p) => matches(p, q));
}
