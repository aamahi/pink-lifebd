import Link from 'next/link';
import { SITE } from '@/core/config/site.config';

/**
 * Static/CMS archetype, about variant, at `/about-us`.
 *
 * The copy below names itself as placeholder rather than shipping lorem ipsum --
 * `.claude/rules/demo-craft.md` rule 2 is specifically about the failure mode a
 * generic paragraph would produce: text that reads as finished prose is
 * placeholder text nobody notices is placeholder text, and it survives past the
 * point where someone would have caught it. `announcement-bar.tsx`'s default
 * message follows the same convention for the same reason.
 *
 * No async state here. Unlike the catalog and product archetypes, an about page
 * has no service call to fail, load, or come back empty -- its four-branch
 * requirement is satisfied by having only one branch to render, always.
 */
export function AboutUs() {
  return (
    <section className="page-shell max-w-2xl py-10">
      <h1 className="text-2xl font-bold tracking-tight text-[--color-text]">About {SITE.name}</h1>

      <p className="mt-4 text-[--color-text-muted]">
        Placeholder copy -- replace this paragraph in{' '}
        <code className="font-mono">about-us.tsx</code> with the client&apos;s own story before a
        demo. {SITE.tagline}
      </p>

      <h2 className="mt-8 text-lg font-semibold text-[--color-text]">What we do</h2>
      <p className="mt-2 text-[--color-text-muted]">{SITE.description}</p>

      <h2 className="mt-8 text-lg font-semibold text-[--color-text]">Get in touch</h2>
      <p className="mt-2 text-[--color-text-muted]">
        Questions about an order or the catalog? Visit the{' '}
        <Link href="/contact-us" className="text-primary hover:underline">
          contact page
        </Link>
        .
      </p>
    </section>
  );
}
