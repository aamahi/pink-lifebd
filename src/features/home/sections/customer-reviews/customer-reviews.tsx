'use client';

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { cn } from '@/core/utils/cn';
import styles from './customer-reviews.module.css';

interface Review {
  readonly quote: string;
  readonly name: string;
  readonly handle: string;
  /** Avatar fill behind the initials; there are no customer photos. */
  readonly tone: string;
}

/**
 * Where each of the three cards sits on the desktop stage, as the reference
 * scatters them: position, tilt, the direction it flies in from, and how far
 * it drifts with the pointer (`depth`).
 */
interface Slot {
  readonly left: string;
  readonly top: string;
  readonly tilt: number;
  readonly fromX: number;
  readonly fromY: number;
  readonly depth: number;
}

const SLOTS: readonly Slot[] = [
  { left: '6%', top: '2%', tilt: -12, fromX: -140, fromY: -90, depth: 1 },
  { left: '13%', top: '57%', tilt: 6, fromX: -160, fromY: 120, depth: 0.55 },
  { left: '64%', top: '55%', tilt: 14, fromX: 170, fromY: 130, depth: 0.8 },
];

/** Cards per hand. */
const HAND = 3;
/** How long the outgoing hand takes to leave before the next is dealt, ms. */
const DEAL_OUT_MS = 560;

const REVIEWS: readonly Review[] = [
  {
    quote:
      "The quality is way better than I expected. The fabric feels premium and the fit is perfect — I've already ordered two more pieces.",
    name: 'Renee Dotson',
    handle: '@reneedotson',
    tone: '#c9b8a6',
  },
  {
    quote:
      'Washed the heavyweight tee a dozen times now and it still holds its shape. No shrinking, no twisting seams.',
    name: 'Tanvir Ahmed',
    handle: '@tanvir.wears',
    tone: '#9fb3c8',
  },
  {
    quote:
      'Ordered an M after reading the size guide and it fits exactly like the photos. Delivery came a day early too.',
    name: 'Maya Lindqvist',
    handle: '@mayalindq',
    tone: '#d5b3b8',
  },
  {
    quote:
      'The hoodie is properly thick without being stiff. It has become the thing I reach for every single morning.',
    name: 'Arif Hossain',
    handle: '@arif.h',
    tone: '#a7b89a',
  },
  {
    quote:
      'Colours are true to the pictures, which almost never happens online. The olive is even nicer in person.',
    name: 'Sofia Marquez',
    handle: '@sofiamqz',
    tone: '#e0c38c',
  },
  {
    quote:
      'Swapping a size took two minutes and the new one arrived before the weekend. That is how returns should work.',
    name: 'Daniel Okafor',
    handle: '@danokafor',
    tone: '#b6a6cf',
  },
  {
    quote:
      'Bought the oxford shirt for work and the polo for weekends. Both still look new after a whole season.',
    name: 'Nusrat Jahan',
    handle: '@nusrat.j',
    tone: '#c6a991',
  },
  {
    quote:
      'Simple pieces, done properly. The stitching is clean and the labels do not itch — small things, but they matter.',
    name: 'Lucas Brandt',
    handle: '@lucasbrandt',
    tone: '#9cc0bb',
  },
  {
    quote:
      'I was nervous ordering knitwear online, but the cardigan is soft, warm and exactly the weight described.',
    name: 'Priya Raman',
    handle: '@priyaraman',
    tone: '#d3a9a0',
  },
];

const HANDS = Math.ceil(REVIEWS.length / HAND);
const TITLE_WORDS = ['See', 'why', 'everyone', 'loves', 'us', '!'];

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2);
}

/** CSS custom properties are not in `CSSProperties`; this is the one place they are typed in. */
const vars = (properties: Record<string, string | number>): CSSProperties =>
  properties as CSSProperties;

/**
 * Home "See why everyone loves us!": a big serif title with three tilted
 * quote cards scattered around it, each with a reviewer tag pinned to its
 * corner, and a dashed "See more reviews" badge, after the reference.
 *
 * **Motion.**
 * - Scrolled into view, the title rises word by word and the cards fly in
 *   from three directions, settling onto their tilts with a slight overshoot,
 *   one after another.
 * - At rest each card floats on its own slow bob, and the whole spread
 *   drifts a little against the pointer, nearer cards further (`--px/--py`,
 *   written straight to the section's style so a mouse move never re-renders).
 * - Hovering a card straightens and lifts it, so it can be read square-on.
 * - The badge's dashed ring turns slowly. Pressing it deals the next three
 *   reviews: the hand flies back out the way it came and the next one is
 *   dealt in. A polite live region names which reviews are showing.
 * - Under reduced motion none of this runs: everything is simply in place
 *   and the badge swaps the reviews at once.
 *
 * Below `lg` the stage becomes a column -- title, then the cards stacked with
 * a gentler tilt -- because the scattered layout needs the width.
 *
 * Static copy, not the catalogue: `catalog.model.ts` has no review shape,
 * and the home archetype's four async states are demonstrated by the
 * catalogue-backed sections. **These reviews are worked examples written for
 * the template -- replace them with the client's real ones before a demo.**
 */
export function CustomerReviews() {
  /** Which hand of three is showing. */
  const [hand, setHand] = useState(0);
  /** True once the section has been scrolled into view; the entrance plays then. */
  const [seen, setSeen] = useState(false);
  /** False while a hand is flying out, between two deals. */
  const [dealt, setDealt] = useState(true);
  /** `next` reads this, not the state, so two quick presses cannot both start a deal. */
  const dealtRef = useRef(true);

  const stageRef = useRef<HTMLDivElement>(null);
  const reduced = useRef(false);
  const dealTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /** The hand on show, each review paired with the slot it is dealt to. */
  const showing = useMemo(
    () =>
      SLOTS.flatMap((slot, i) => {
        const review = REVIEWS[hand * HAND + i];
        return review ? [{ slot, review }] : [];
      }),
    [hand],
  );
  const start = hand * HAND + 1;
  const range = `Showing reviews ${start} to ${start + showing.length - 1} of ${REVIEWS.length}`;

  useEffect(() => () => clearTimeout(dealTimer.current), []);

  useEffect(() => {
    reduced.current = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stage = stageRef.current;
    if (reduced.current || typeof IntersectionObserver !== 'function' || !stage) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(stage);
    return () => io.disconnect();
  }, []);

  /** Deal the next three: the current hand flies out, then the next flies in. */
  const next = (): void => {
    const advance = () => setHand((h) => (h + 1) % HANDS);
    if (reduced.current) {
      advance();
      return;
    }
    if (!dealtRef.current) return;
    dealtRef.current = false;
    setDealt(false);
    clearTimeout(dealTimer.current);
    dealTimer.current = setTimeout(() => {
      advance();
      dealtRef.current = true;
      setDealt(true);
    }, DEAL_OUT_MS);
  };

  /** Pointer position over the stage as -1..1 on each axis, for the drift. */
  const drift = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const el = stageRef.current;
    if (event.pointerType !== 'mouse' || reduced.current || !el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--px', (((event.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    el.style.setProperty('--py', (((event.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
  };

  const settle = (): void => {
    const el = stageRef.current;
    if (!el) return;
    el.style.setProperty('--px', '0');
    el.style.setProperty('--py', '0');
  };

  return (
    <section
      className="overflow-hidden bg-(--color-rail-bg) px-4 py-20 font-jakarta text-(--color-rail-fg) lg:px-20"
      aria-labelledby="reviews-title"
    >
      <div
        ref={stageRef}
        className={cn(
          styles.stage,
          'relative mx-auto w-full lg:h-[660px]',
          seen && styles.seen,
          dealt && styles.dealt,
        )}
        onPointerMove={drift}
        onPointerLeave={settle}
      >
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center text-center lg:pointer-events-none lg:absolute lg:inset-x-0 lg:top-[34%]">
          <h2
            id="reviews-title"
            className="font-display text-4xl font-black uppercase leading-[1.18] md:text-6xl"
          >
            {TITLE_WORDS.map((word, i) => (
              <Fragment key={i}>
                <span className={styles.word}>
                  <span style={vars({ '--i': i })}>{word}</span>
                </span>{' '}
                {i === 2 ? <br className="hidden md:block" /> : null}
              </Fragment>
            ))}
          </h2>
          <p
            className={cn(
              styles.intro,
              'mt-6 max-w-[15rem] text-xs leading-relaxed text-(--color-rail-muted)',
            )}
          >
            Thoughtful reviews from the people who wear our designs daily.
          </p>
        </div>

        <button
          type="button"
          className={cn(
            styles['review-badge'],
            'relative z-20 mx-auto mt-10 flex size-28 items-center justify-center rounded-full text-center outline-none focus-visible:ring-2 focus-visible:ring-(--color-rail-ring) focus-visible:ring-offset-4 lg:absolute lg:right-[11%] lg:top-[12%] lg:mt-0',
          )}
          onClick={next}
        >
          <svg
            className={cn(styles['dash-ring'], 'absolute inset-0 size-full')}
            viewBox="0 0 120 120"
            aria-hidden="true"
          >
            <circle
              cx="60"
              cy="60"
              r="58"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeDasharray="5 4.5"
            />
          </svg>
          <span className="font-display text-lg font-semibold leading-tight text-(--color-review-accent)">
            See more
            <br />
            reviews
          </span>
        </button>

        <ul className="mt-16 flex flex-col items-center gap-20 lg:mt-0 lg:block">
          {/* Keyed by slot, not by review: the same three cards fly out, take the
              next reviews while out of sight, and fly back in. */}
          {showing.map((entry, i) => {
            const s = entry.slot;
            const review = entry.review;
            return (
              <li
                key={i}
                className={styles.slot}
                style={vars({
                  '--left': s.left,
                  '--top': s.top,
                  '--tilt': s.tilt + 'deg',
                  '--from-x': s.fromX + 'px',
                  '--from-y': s.fromY + 'px',
                  '--depth': s.depth,
                  '--i': i,
                })}
              >
                <div className={styles.deal}>
                  <div className={styles.bob}>
                    <figure
                      className={cn(
                        styles.card,
                        'relative w-[17.5rem] bg-(--color-review-card) px-6 pb-14 pt-4',
                      )}
                    >
                      <span
                        className="block font-display text-7xl leading-none text-(--color-rail-fg)/10"
                        aria-hidden="true"
                      >
                        &ldquo;
                      </span>
                      <blockquote className="-mt-5 text-[13px] leading-relaxed text-(--color-rail-fg)/85">
                        {review.quote}
                      </blockquote>
                      <figcaption
                        className={cn(
                          styles.tag,
                          'absolute -bottom-9 -left-5 flex items-center gap-3 bg-(--color-rail-bg) py-2.5 pl-3 pr-6 shadow-[0_8px_24px_-10px_rgb(0_0_0/0.3)]',
                        )}
                      >
                        <span
                          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-(--color-rail-fg)/80"
                          style={{ background: review.tone }}
                          aria-hidden="true"
                        >
                          {initials(review.name)}
                        </span>
                        <span className="flex flex-col">
                          <span className="text-sm font-medium">{review.name}</span>
                          <span className="text-[11px] text-(--color-rail-muted)">
                            {review.handle}
                          </span>
                        </span>
                      </figcaption>
                    </figure>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="sr-only" aria-live="polite">
        {range}
      </p>
    </section>
  );
}
