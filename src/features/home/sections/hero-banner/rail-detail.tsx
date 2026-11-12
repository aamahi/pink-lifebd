'use client';

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { usePathname } from 'next/navigation';
import { prewarm, useRecolored } from '@/components/ui/garment-recolor';
import { cn } from '@/core/utils/cn';
import { GarmentViewer, type Face, type GarmentViewerHandle } from './garment-viewer';
import { RailDetailPanel } from './rail-detail-panel';
import type { RailGarment, RailLabels } from './rail.model';

const FACES: readonly Face[] = ['front', 'back'];

export interface RailDetailProps {
  item: RailGarment;
  labels: RailLabels;
  reduced?: boolean;
  titleId: string;
  /** The piece's current rect on the rail, read at open and again at close. */
  source: () => DOMRect | null;
  /** True while the flight out of the rail is running, so the rail can hide the piece. */
  onLift?: (lifted: boolean) => void;
  onClosed: () => void;
}

/**
 * The overlay starts at the site header's bottom edge and sits under its
 * z-40, so the header stays on screen and usable while a piece is lifted. The
 * original covers the whole viewport, which blanked the header out. Read once
 * at open: the page cannot scroll while the overlay is up, so it cannot move.
 * With no header on the page the overlay simply starts at the top. The page
 * header is the sticky one; the hero's own `<header>` (eyebrow and heading) is not.
 */
function headerBottom(): number {
  if (typeof document === 'undefined') return 0;
  const header = document.querySelector('header.sticky');
  return header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
}

/**
 * The lifted piece: a modal that flies the garment off the rail into a
 * `GarmentViewer` -- ModelViewer's turntable, hover tilt, float and zoom -- and
 * flies it home on close. Port of the original's `Detail`.
 *
 * Both flights are FLIP animations through `Element.animate` on `figure`,
 * measured against `source()` -- the piece's live rect on the rail -- at open
 * and again at close, because the rail may have re-flowed while the dialog was
 * up. The viewer animates everything inside that box, so the two never fight
 * over one transform.
 */
export function RailDetail({
  item,
  labels,
  reduced = false,
  titleId,
  source,
  onLift,
  onClosed,
}: RailDetailProps) {
  const [shown, setShown] = useState(false);
  /** The colourway chosen in the panel; the garment is repainted to it. */
  const [colorIndex, setColorIndex] = useState(0);
  const [side, setSide] = useState<Face>('front');
  const garment = useRecolored(item, colorIndex);
  const [top] = useState(headerBottom);

  const dialogRef = useRef<HTMLDivElement>(null);
  const figureRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<GarmentViewerHandle>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);

  /** Everything the listeners below call is read from here, so they attach once. */
  const latest = useRef({ reduced, source, onLift, onClosed, side });
  latest.current = { reduced, source, onLift, onClosed, side };

  /** Arc from the rail to centre: up and over with a slight tilt, then settle. */
  const flyIn = (): Animation | null => {
    const figure = figureRef.current;
    if (!figure) return null;
    const from = latest.current.source();
    if (latest.current.reduced || !from || from.width <= 0) return null;
    const to = figure.getBoundingClientRect();
    const scale = from.height / to.height;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top - to.top;
    const lift = Math.min(90, Math.abs(dy) * 0.25 + 30);
    latest.current.onLift?.(true);
    return figure.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
        {
          transform: `translate(${dx * 0.4}px, ${dy * 0.4 - lift}px) scale(${((scale + 1) / 2) * 1.03}) rotate(${dx > 0 ? -2.5 : 2.5}deg)`,
          offset: 0.5,
        },
        { transform: 'none' },
      ],
      { duration: 680, easing: 'cubic-bezier(.22,.85,.3,1)' },
    );
  };

  const dismiss = (): void => {
    if (closing.current) return;
    closing.current = true;
    setShown(false);
    const figure = figureRef.current;
    const to = latest.current.source();
    if (!figure || latest.current.reduced || !to || to.width === 0) {
      latest.current.onClosed();
      return;
    }
    const from = figure.getBoundingClientRect();
    const scale = to.height / from.height;
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top - from.top;
    const animation = figure.animate(
      [
        { transform: 'none' },
        {
          transform: `translate(${dx * 0.6}px, ${dy * 0.6 - 30}px) scale(${(scale + 1) / 2})`,
          offset: 0.55,
        },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
      ],
      { duration: 560, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'forwards' },
    );
    animation.onfinish = () => latest.current.onClosed();
  };
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;

  const flip = (): void => {
    viewerRef.current?.turnTo(latest.current.side === 'front' ? 'back' : 'front');
  };

  // Open: lock the page scroll, focus Close, fly the piece in, then fade the overlay up.
  useEffect(() => {
    const body = document.body;
    const overflow = body.style.overflow;
    body.style.overflow = 'hidden';
    closeButtonRef.current?.focus({ preventScroll: true });
    const animation = flyIn();
    const raf = requestAnimationFrame(() => setShown(true));
    return () => {
      cancelAnimationFrame(raf);
      animation?.cancel();
      body.style.overflow = overflow;
    };
     
  }, []);

  // Any navigation closes the lifted piece. The case this exists for is the logo (or anything else
  // pointing at "/") clicked while a piece is open on the home page: the home page is reused rather
  // than re-mounted, so without this the overlay stayed up and the click looked dead. A link click
  // outside the dialog covers that same-URL case, which changes no pathname; the pathname effect and
  // `popstate` cover programmatic and Back/Forward navigation. A navigation to another page
  // destroys this component anyway, mid-flight or not.
  const pathname = usePathname();
  const firstPath = useRef(pathname);
  useEffect(() => {
    if (pathname !== firstPath.current) dismissRef.current();
  }, [pathname]);
  useEffect(() => {
    const onClick = (event: MouseEvent): void => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest('a[href]');
      if (link && !dialogRef.current?.contains(link)) dismissRef.current();
    };
    const onPop = (): void => dismissRef.current();
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPop);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPop);
    };
  }, []);

  // Keys pressed while focus has escaped the dialog: still close, turn, or pull focus back in.
  useEffect(() => {
    const onDocumentKey = (event: KeyboardEvent): void => {
      const dialog = dialogRef.current;
      if (!dialog || dialog.contains(event.target as Node)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        dismissRef.current();
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        flip();
      } else if (event.key === 'Tab') {
        event.preventDefault();
        dialog.querySelector('button')?.focus();
      }
    };
    document.addEventListener('keydown', onDocumentKey);
    return () => document.removeEventListener('keydown', onDocumentKey);
     
  }, []);

  /** Escape closes, arrows turn, Tab cycles within the dialog's buttons. */
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      dismiss();
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      flip();
      return;
    }
    if (event.key !== 'Tab') return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const controls = [...dialog.querySelectorAll('button')].filter((b) => !b.disabled);
    const first = controls[0];
    const last = controls.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-center overflow-y-auto p-6 font-system text-(--color-rail-fg)"
      style={{ top: `${top}px` }}
      onKeyDown={onKeyDown}
    >
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-0 bg-(--color-rail-bg)/90 backdrop-blur-xl transition-opacity duration-300 motion-reduce:transition-none',
          shown ? 'opacity-100' : 'opacity-0',
        )}
        onClick={dismiss}
      ></div>
      <button
        ref={closeButtonRef}
        type="button"
        className={cn(
          'absolute right-5 top-5 z-10 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium tracking-wide text-(--color-rail-muted) outline-none transition-[opacity,color] duration-300 hover:text-(--color-rail-fg) focus-visible:ring-2 focus-visible:ring-(--color-rail-ring) motion-reduce:transition-none',
          shown ? 'opacity-100' : 'opacity-0',
        )}
        onClick={dismiss}
      >
        {labels.close}
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="size-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <path d="M3 3l10 10M13 3L3 13" />
        </svg>
      </button>

      <div className="relative grid w-full max-w-5xl items-center gap-10 pt-10 md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <div className="flex flex-col items-center gap-5">
          <div
            ref={figureRef}
            className="relative mx-auto aspect-[200/310] h-[min(58vh,540px)] max-h-full origin-top"
          >
            <GarmentViewer
              ref={viewerRef}
              item={garment ?? item}
              reduced={reduced}
              onSideChange={setSide}
            />
          </div>

          {/* Under the garment rather than in the panel: the panel follows the product-page reference, which has no front/back control. */}
          <div
            role="group"
            aria-label={labels.front + ' / ' + labels.back}
            className={cn(
              'inline-flex justify-center gap-6 transition-opacity duration-500 motion-reduce:transition-none',
              shown ? 'opacity-100' : 'opacity-0',
            )}
          >
            {FACES.map((face) => (
              <button
                key={face}
                type="button"
                className={cn(
                  'relative pb-1.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-(--color-rail-ring)',
                  side === face
                    ? 'text-(--color-rail-fg)'
                    : 'text-(--color-rail-muted) hover:text-(--color-rail-fg)',
                )}
                aria-pressed={side === face}
                onClick={() => viewerRef.current?.turnTo(face)}
              >
                {face === 'front' ? labels.front : labels.back}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-x-0 bottom-0 h-px origin-left bg-(--color-rail-fg) transition-transform duration-300 motion-reduce:transition-none',
                    side === face ? 'scale-x-100' : 'scale-x-0',
                  )}
                ></span>
              </button>
            ))}
          </div>
        </div>

        <div
          className={cn(
            'transition-[opacity,transform] delay-150 duration-500 motion-reduce:transition-none',
            shown ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
          )}
        >
          <RailDetailPanel
            item={item}
            titleId={titleId}
            onColorChange={setColorIndex}
            onColorHover={(index) => prewarm(item, index)}
          />
        </div>
      </div>
    </div>
  );
}
