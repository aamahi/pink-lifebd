import type { Metadata } from 'next';
import { getProduct } from '@/core/data/catalog.api';
import { pageMetadata } from '@/core/seo';
import { adPhotosFor } from '@/features/landing/product-landing.config';
import { ProductLanding } from '@/features/landing/product-landing';

type Params = Promise<{ slug: string }>;

/**
 * The single-product ad page, `/lp/<product slug>`. `/lp/bra`, `/lp/panty-combo` and
 * `/lp/nightwear` are their own static routes and are matched before this one, so a product can
 * be given any slug except those three.
 *
 * The title, description and picture are in the HTML a link-preview crawler reads, which is what
 * shows when the ad's link is shared or pasted into Messenger. The picture is the first cleared
 * photograph (`adPhotosFor`) when there is one: the catalogue's cut-out has a transparent
 * background, which a preview card draws as a black block. Not indexed: it repeats the product
 * page, and an ad destination has no business competing with it in search.
 */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const path = `/lp/${slug}`;
  try {
    const product = await getProduct(slug);
    return pageMetadata({
      title: product.name,
      description: product.summary,
      path,
      type: 'product',
      image: adPhotosFor(slug)[0] ?? product.image ?? undefined,
      noIndex: true,
    });
  } catch {
    // Unknown slug or the API down: the page itself says which; the head just stays generic.
    return pageMetadata({ title: 'Product', path, noIndex: true });
  }
}

export default async function ProductLandingPage({ params }: { params: Params }) {
  const { slug } = await params;
  return <ProductLanding key={slug} slug={slug} />;
}
