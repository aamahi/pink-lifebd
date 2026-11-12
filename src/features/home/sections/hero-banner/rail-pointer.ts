import type { RailLive, RailPhysics } from './rail-physics';
import { clamp, footprint } from './rail.model';

/** What the gestures need from the hero; declared here so this file never imports the component. */
export interface RailHost {
  readonly physics: RailPhysics;
  readonly live: RailLive;
  readonly stage: () => HTMLElement;
  choose(index: number | null): void;
  stop(): void;
}

/**
 * Pointer gestures on the rail, ported from the original's `pointer` ref and
 * its `onPointerDown` / `onPointerMove` / `finishPointer` handlers.
 *
 * - Mouse hover turns the piece under the cursor to the front, with a 14px
 *   grace zone so moving onto a neighbour's overlap does not flicker.
 * - A horizontal drag past 6px (and more sideways than vertical, so a page
 *   scroll on touch is left alone) grabs that hanger and slides it along the
 *   rail; on release it coasts for 700ms, then springs back.
 * - In carousel mode the same drag swipes the whole rail; release advances one
 *   piece past 40px or a 0.45px/ms flick.
 * - A press without movement is resolved in the slot's own click handler via
 *   `pendingOpen`, so a click opens the detail but a drag never does. On touch,
 *   the first tap only turns a piece to the front; a second tap opens it.
 */
export class RailPointer {
  id = -1;
  index = -1;
  pendingOpen = -1;
  /** Live carousel swipe offset in px, added to every target while dragging. */
  swipe = 0;
  private x = 0;
  private y = 0;
  private moved = false;
  private kind = '';
  private lastX = 0;
  private lastT = 0;
  /** Smoothed horizontal velocity, px per ms. */
  private v = 0;

  constructor(private readonly host: RailHost) {}

  private box(): DOMRect {
    return this.host.stage().getBoundingClientRect();
  }

  private hitAt(clientX: number, clientY: number): number | null {
    const box = this.box();
    return this.host.physics.nearest(clientX - box.left, clientY - box.top);
  }

  down(event: PointerEvent): void {
    if (event.button !== 0) return;
    const now = performance.now();
    this.pendingOpen = -1;
    this.id = event.pointerId;
    this.index = this.hitAt(event.clientX, event.clientY) ?? -1;
    this.x = this.lastX = event.clientX;
    this.y = event.clientY;
    this.lastT = now;
    this.moved = false;
    this.kind = event.pointerType;
    this.swipe = 0;
    this.v = 0;
  }

  move(event: PointerEvent): void {
    const { physics: s, live } = this.host;
    if (this.id === event.pointerId) {
      this.track(event);
      return;
    }
    if (event.pointerType !== 'mouse' || live.size.carousel || live.openIndex !== null) return;
    const hit = this.hitAt(event.clientX, event.clientY);
    const current = live.active;
    const front = current === null ? undefined : s.pieces[current];
    if (front && hit !== current) {
      const box = this.box();
      const keep =
        Math.abs(event.clientX - box.left - front.x) < footprint(live.size.h, 0) / 2 + 14;
      if (keep && (hit === null || Math.abs(event.clientY - box.top) < live.size.h + 40)) return;
    }
    if (hit !== null) {
      this.host.stop();
      this.host.choose(hit);
    }
  }

  /** Movement of the pressed pointer: decide whether it is a drag, then drag or swipe. */
  private track(event: PointerEvent): void {
    const { physics: s, live } = this.host;
    const stage = this.host.stage();
    const dx = event.clientX - this.x;
    const now = performance.now();
    if (!this.moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(event.clientY - this.y)) {
      this.moved = true;
      this.host.stop();
      if (stage.isConnected) stage.setPointerCapture(event.pointerId);
      const grabbed = s.pieces[this.index];
      if (!live.size.carousel && grabbed) {
        s.drag = this.index;
        s.grab = event.clientX - this.box().left - grabbed.x;
      }
    }
    if (!this.moved) return;
    const v = (event.clientX - this.lastX) / Math.max(1, now - this.lastT);
    this.v = this.v * 0.6 + v * 0.4;
    this.lastX = event.clientX;
    this.lastT = now;
    const dragged = s.pieces[s.drag];
    if (dragged) {
      dragged.vx = this.v * 1000;
      dragged.x = event.clientX - this.box().left - s.grab;
      s.free = now + 900;
      s.kick();
    } else if (live.size.carousel) {
      this.swipe = dx;
      const { h, width } = live.size;
      const xs = s.targets(h, width, true, live.active ?? live.carouselIndex);
      s.pieces.forEach((p, i) => {
        const x = xs[i];
        if (x !== undefined) p.tx = x + dx;
      });
      s.kick();
    }
  }

  finish(event: PointerEvent, cancelled: boolean): void {
    if (this.id !== event.pointerId) return;
    const { physics: s, live } = this.host;
    const stage = this.host.stage();
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    this.id = -1;
    if (s.drag >= 0) {
      s.drag = -1;
      s.free = performance.now() + 700;
      s.kick();
      return;
    }
    if (this.moved && live.size.carousel) {
      const dx = event.clientX - this.x;
      const current = live.active ?? live.carouselIndex;
      const step = Math.abs(dx) > 40 || Math.abs(this.v) > 0.45 ? (dx < 0 ? 1 : -1) : 0;
      this.swipe = 0;
      const next = clamp(current + step, 0, live.count - 1);
      this.host.choose(next);
      // The original leaves the swipe offset in the targets when the index does
      // not change (a short swipe); re-aiming here lets the rail spring back.
      s.retarget(next, 0);
      for (let i = 0; i < live.count; i++) s.impulse(i, clamp(-this.v * 22, -30, 30));
      return;
    }
    if (cancelled || this.moved || this.index < 0) return;
    this.host.stop();
    if (this.kind !== 'mouse' && live.active !== this.index) this.host.choose(this.index);
    else this.pendingOpen = this.index;
  }
}
