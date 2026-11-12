import { SITE } from '@/core/config/site.config';

/**
 * Static/CMS archetype, privacy-policy variant, at `/privacy-policy`.
 *
 * The text below is placeholder legal copy, labelled as such in its own first
 * paragraph rather than left to be discovered -- a demo author who forks this
 * template and forgets to replace it has shipped an unreviewed privacy policy
 * to a real site, which is a worse failure than a visibly unfinished page.
 * `.claude/rules/demo-craft.md` rule 2 (lorem ipsum reads as unfinished) applies
 * to legal copy in the opposite direction: text that reads as finished and
 * genuine is the risk here, not text that reads as a placeholder.
 *
 * No async state, for the same reason `about-us.tsx` has none -- there
 * is no service call for this page to load, fail, or come back empty.
 */
export function PrivacyPolicy() {
  return (
    <section className="page-shell max-w-2xl py-10">
      <h1 className="text-2xl font-bold tracking-tight text-[--color-text]">Privacy Policy</h1>

      <p className="mt-4 text-sm font-medium text-danger">
        Placeholder legal text -- do not publish this page unreviewed. Replace the copy below in{' '}
        <code className="font-mono">privacy-policy.tsx</code> with a policy your counsel has checked
        against what {SITE.name} actually collects and stores.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-[--color-text]">Information we collect</h2>
      <p className="mt-2 text-[--color-text-muted]">
        This demo does not collect any real data -- the catalog, the cart, and the account pages in
        this template all read fixture data. A live store built from this template would describe
        here what it collects at checkout and account creation.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-[--color-text]">How we use it</h2>
      <p className="mt-2 text-[--color-text-muted]">
        Describe the store&apos;s actual use of order data, account data, and any analytics or
        marketing tools it runs, in plain language rather than by category.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-[--color-text]">Contact</h2>
      <p className="mt-2 text-[--color-text-muted]">
        Questions about this policy go to {SITE.contact.email}.
      </p>
    </section>
  );
}
