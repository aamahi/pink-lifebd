'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';

import { cn } from '@/core/utils/cn';

export interface AnnouncementBarProps {
  highlight?: string;
  message?: string;
  languages?: readonly string[];
  /** Fired when a language is picked. There is no translation layer here to hook it to. */
  onLanguageChange?: (lang: string) => void;
}

const DEFAULT_LANGUAGES: readonly string[] = ['EN', 'UKR'];

/**
 * Information strip above the header -- Figma node 15:50
 * (JOFrOzySLSKoXAJVxig0jN, "Claude-Ai-Design").
 *
 * Three columns on `grid-cols-[1fr_auto_1fr]` rather than the design's absolute
 * offsets: the two `1fr` tracks are equal, so the promo stays on the true centre
 * line whatever the language or utility links measure, which is what the
 * design's `left: calc(50% - 111px)` was hand-placing for one string length.
 *
 * The language group is inline text, not flex: a flex item is blockified, and a
 * block drops its trailing space, which would collapse the design's `EN/ UKR` to
 * `EN/UKR`.
 *
 * There is no translation layer in this template, so choosing a language only
 * moves the highlight and emits `onLanguageChange` for one to hook into later.
 */
export function AnnouncementBar({
  highlight = '5% discount',
  message = 'when you buy any product',
  languages = DEFAULT_LANGUAGES,
  onLanguageChange,
}: AnnouncementBarProps) {
  const [chosen, setChosen] = useState<string | null>(null);
  /** Until someone picks one, the first entry of `languages` -- the design's `EN`. */
  const current = chosen ?? languages[0];

  const select = (lang: string): void => {
    setChosen(lang);
    onLanguageChange?.(lang);
  };

  return (
    <div className="bg-(--color-info-bar) px-4 py-2 lg:px-20 font-jakarta text-[12px] leading-[1.64]">
      <div className="grid min-h-5 w-full grid-cols-1 items-center md:grid-cols-[1fr_auto_1fr]">
        <p className="hidden justify-self-start md:block" role="group" aria-label="Language">
          {languages.map((lang, i) => (
            <Fragment key={lang}>
              <button
                type="button"
                className={cn(
                  'rounded-sm focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-(--color-info-bar-text)',
                  lang === current
                    ? 'text-(--color-info-bar-text)'
                    : 'text-(--color-info-bar-subtle)',
                )}
                aria-pressed={lang === current}
                onClick={() => select(lang)}
              >
                {lang}
              </button>
              {i < languages.length - 1 ? (
                <span className="text-(--color-info-bar-text)" aria-hidden="true">
                  {'/ '}
                </span>
              ) : null}
            </Fragment>
          ))}
        </p>

        <p className="text-center">
          <span className="font-medium text-(--color-info-bar-text)">{highlight}</span>{' '}
          <span className="text-(--color-info-bar-muted)">{message}</span>
        </p>

        <nav
          className="hidden items-center gap-4 justify-self-end text-(--color-info-bar-text) md:flex"
          aria-label="Utility"
        >
          <Link
            href="/contact-us"
            className="text-(--color-info-bar-text) hover:text-(--color-info-bar-text) hover:underline"
          >
            Help
          </Link>
          <span
            className="block h-[14.5px] w-px bg-(--color-info-bar-text) [mask:url(/icons/announcement-divider.svg)_center/100%_100%_no-repeat]"
            aria-hidden="true"
          ></span>
          <Link
            href="/account/login"
            className="text-(--color-info-bar-text) hover:text-(--color-info-bar-text) hover:underline"
          >
            Sign In
          </Link>
        </nav>
      </div>
    </div>
  );
}
