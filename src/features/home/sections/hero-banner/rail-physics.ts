import { ASPECT, GAP, PERSPECTIVE, REST, clamp, footprint, lambert } from './rail.model';

/** The DOM nodes one piece's frame writes to. `side` and `tag` are optional layers. */
export interface PieceEls {
  readonly slot: HTMLElement;
  readonly swing: HTMLElement | null;
  readonly turn: HTMLElement | null;
  readonly side: HTMLElement | null;
  readonly drape: HTMLElement | null;
  readonly shade: HTMLElement | null;
  readonly shadow: HTMLElement | null;
  readonly tag: HTMLElement | null;
}

export interface RailSize {
  readonly width: number;
  readonly h: number;
  readonly carousel: boolean;
}

/** What the component knows and the simulation reads every frame. */
export interface RailLive {
  active: number | null;
  size: RailSize;
  reduced: boolean;
  count: number;
  openIndex: number | null;
  carouselIndex: number;
  sideWidths: readonly number[];
}

/** One hanger's four springs: position on the rail, turn, pendulum swing, hang-tag swing. */
export interface Piece {
  x: number;
  vx: number;
  tx: number;
  turn: number;
  vturn: number;
  tturn: number;
  swing: number;
  vswing: number;
  tag: number;
  vtag: number;
  /** Side-on width as a canvas fraction; undefined lets `footprint` use its default. */
  sideW: number | undefined;
}

function restingPiece(): Piece {
  return {
    x: 0,
    vx: 0,
    tx: 0,
    turn: REST,
    vturn: 0,
    tturn: REST,
    swing: 0,
    vswing: 0,
    tag: 0,
    vtag: 0,
    sideW: undefined,
  };
}

/**
 * The rail's spring simulation, ported from `ClothingRailHero`'s `sim` ref and
 * its `step` / `paint` / `kick` / `impulse` callbacks with every coefficient
 * unchanged.
 *
 * Per piece it integrates four damped springs in two sub-steps a frame, then
 * resolves overlaps between neighbours so a piece turning to the front
 * shoulders the others aside. Horizontal acceleration feeds the pendulum, which
 * is what makes a dragged or shoved hanger rock.
 *
 * It writes styles straight to the DOM rather than through React state:
 * eight properties on ten pieces at 60 fps through state would re-render the
 * component every frame for values nothing in the JSX reads. The JSX
 * therefore never sets `transform` or `opacity` on these nodes, or a later
 * render could overwrite the frame this class just wrote.
 *
 * The original keeps ten parallel arrays read with `?? 0`. Here each piece is
 * one object, created whole by `retarget`, so there is no half-filled index to
 * fall back from.
 */
export class RailPhysics {
  pieces: Piece[] = [];
  els: PieceEls[] = [];
  /** Index being dragged along the rail, or -1. */
  drag = -1;
  /** Pointer offset from the dragged piece's centre at grab time. */
  grab = 0;
  /** Until this timestamp, released pieces coast instead of springing home. */
  free = 0;
  private last = 0;
  private raf = 0;

  constructor(private readonly live: RailLive) {}

  /** Resting centre of each piece: packed and centred, or a carousel around `front`. */
  targets(h: number, width: number, carousel: boolean, front: number | null): number[] {
    const feet = this.live.sideWidths.map(
      (w, i) => footprint(h, i === front ? 0 : REST, w) + h * GAP,
    );
    if (carousel) {
      // Centre-to-centre spacing is half of each neighbour's footprint.
      const rel: number[] = [];
      let acc = 0;
      let prev: number | null = null;
      for (const f of feet) {
        if (prev !== null) acc += (prev + f) / 2;
        rel.push(acc);
        prev = f;
      }
      const anchor = rel[front === null ? 0 : front];
      return anchor === undefined ? rel : rel.map((r) => r - anchor + width / 2);
    }
    const total = feet.reduce((sum, f) => sum + f, 0);
    let cursor = (width - total) / 2;
    return feet.map((f) => {
      const x = cursor + f / 2;
      cursor += f;
      return x;
    });
  }

  paint(i: number): void {
    const el = this.els[i];
    const p = this.pieces[i];
    if (!el || !p) return;
    const { h } = this.live.size;
    const w = h * ASPECT;
    const angle = p.turn;
    el.slot.style.transform = `translate3d(${(p.x - w / 2).toFixed(2)}px,0,0)`;
    if (el.swing) el.swing.style.transform = `rotate(${p.swing.toFixed(3)}deg)`;
    // e: 0 side-on .. 1 facing front. The side photo and the turning front photo
    // cross-fade over e 0.44-0.56, near where the front would be edge-on.
    const e = clamp(1 - angle / REST, 0, 1);
    if (el.turn) {
      el.turn.style.transform = `perspective(${PERSPECTIVE}px) rotateY(${angle.toFixed(2)}deg)`;
      el.turn.style.opacity = el.side ? clamp((e - 0.44) / 0.12, 0, 1).toFixed(3) : '1';
    }
    if (el.side) {
      el.side.style.opacity = clamp((0.56 - e) / 0.12, 0, 1).toFixed(3);
      el.side.style.transform = `perspective(${PERSPECTIVE}px) rotateY(${(Math.min(1, e * 2) * -84).toFixed(2)}deg)`;
    }
    const lag = clamp(-p.vswing * 0.018, -5, 5);
    el.drape?.style.setProperty('--drape', `${lag.toFixed(3)}deg`);
    el.shade?.style.setProperty('--shade', (1 - lambert(angle)).toFixed(3));
    if (el.shadow) {
      const squash = Math.max(0.12, Math.abs(Math.cos((angle * Math.PI) / 180)));
      el.shadow.style.transform = `translate3d(${(w * 0.05).toFixed(1)}px, ${(h * 0.035).toFixed(1)}px, 0) scaleX(${squash.toFixed(3)})`;
    }
    if (el.tag) el.tag.style.transform = `rotate(${(-12 + p.tag).toFixed(2)}deg)`;
  }

  private readonly step = (now: number): void => {
    const pieces = this.pieces;
    const dt = this.last ? Math.min(0.034, (now - this.last) / 1000) : 1 / 60;
    this.last = now;
    const { h, width, carousel } = this.live.size;
    const sub = 2;
    const sdt = dt / sub;
    for (let k = 0; k < sub; k++) {
      pieces.forEach((p, i) => this.integrate(p, i, now, sdt));
      this.separate(h);
      const first = pieces[0];
      const last = pieces.at(-1);
      if (!carousel && first && last) {
        const edge = h * 0.06;
        const min = edge + footprint(h, first.turn, first.sideW) / 2;
        const max = width - edge - footprint(h, last.turn, last.sideW) / 2;
        if (first.x < min) {
          first.x = min;
          first.vx = Math.abs(first.vx) * 0.3;
        }
        if (last.x > max) {
          last.x = max;
          last.vx = -Math.abs(last.vx) * 0.3;
        }
      }
    }
    let busy = this.drag >= 0 || now < this.free;
    pieces.forEach((p, i) => {
      this.paint(i);
      if (this.isMoving(p, now)) busy = true;
    });
    if (busy) {
      this.raf = requestAnimationFrame(this.step);
      return;
    }
    // Settled: snap the residue to exact rest so the next frame starts clean.
    this.raf = 0;
    this.last = 0;
    pieces.forEach((p, i) => {
      if (now > this.free) p.x = p.tx;
      p.swing = p.vswing = p.tag = p.vtag = 0;
      this.paint(i);
    });
  };

  /** One sub-step of the four springs for piece `i`. */
  private integrate(p: Piece, i: number, now: number, sdt: number): void {
    const before = p.vx;
    if (i !== this.drag) {
      // Released by a drag, a piece coasts with light damping until `free`,
      // then springs back to its slot.
      const restoring = now > this.free;
      const stiff = restoring ? 130 : 0;
      const damp = restoring ? 2 * Math.sqrt(130) * 0.86 : 3.2;
      p.vx = before + (-stiff * (p.x - p.tx) - damp * before) * sdt;
      p.x += p.vx * sdt;
    }
    const accel = (p.vx - before) / sdt;
    p.vturn += (-150 * (p.turn - p.tturn) - 2 * Math.sqrt(150) * 0.78 * p.vturn) * sdt;
    p.turn += p.vturn * sdt;
    p.vswing += (-24 * p.swing - 2.1 * p.vswing - clamp(accel, -6000, 6000) * 0.0045) * sdt;
    p.swing = clamp(p.swing + p.vswing * sdt, -12, 12);
    p.vtag += (-46 * (p.tag - p.swing * 0.6) - 3.4 * p.vtag - p.vswing * 0.9) * sdt;
    p.tag = clamp(p.tag + p.vtag * sdt, -30, 30);
  }

  /** Two passes of pairwise push-apart, sharing velocity on contact like a soft collision. */
  private separate(h: number): void {
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < this.pieces.length - 1; i++) {
        const a = this.pieces[i];
        const b = this.pieces[i + 1];
        if (!a || !b) continue;
        const minGap =
          (footprint(h, a.turn, a.sideW) + footprint(h, b.turn, b.sideW)) / 2 + h * 0.012;
        const overlap = minGap - (b.x - a.x);
        if (overlap <= 0) continue;
        if (i === this.drag) b.x += overlap;
        else if (i + 1 === this.drag) a.x -= overlap;
        else {
          a.x -= overlap / 2;
          b.x += overlap / 2;
        }
        if (a.vx > b.vx) {
          const shared = (a.vx + b.vx) / 2;
          if (i !== this.drag) a.vx = shared;
          if (i + 1 !== this.drag) b.vx = shared;
        }
      }
    }
  }

  private isMoving(p: Piece, now: number): boolean {
    return (
      Math.abs(p.vx) > 0.4 ||
      (now > this.free && Math.abs(p.x - p.tx) > 0.25) ||
      Math.abs(p.turn - p.tturn) > 0.05 ||
      Math.abs(p.vturn) > 0.05 ||
      Math.abs(p.swing) > 0.02 ||
      Math.abs(p.vswing) > 0.05 ||
      Math.abs(p.tag) > 0.05 ||
      Math.abs(p.vtag) > 0.08
    );
  }

  /** Start the frame loop if it is idle. Under reduced motion, jump straight to rest. */
  kick(): void {
    if (this.live.reduced) {
      this.pieces.forEach((p, i) => {
        p.x = p.tx;
        p.turn = p.tturn;
        p.vx = p.vturn = p.swing = p.vswing = 0;
        this.paint(i);
      });
      return;
    }
    if (!this.raf) {
      this.last = 0;
      this.raf = requestAnimationFrame(this.step);
    }
  }

  /** Add angular velocity to one piece's pendulum. Out-of-range indices are ignored. */
  impulse(i: number, amount: number): void {
    const p = this.pieces[i];
    if (this.live.reduced || !p) return;
    p.vswing += amount;
    this.kick();
  }

  /**
   * Re-aim every piece at its rest target. A first layout, a changed item count
   * and reduced motion all place the pieces there outright instead of springing.
   */
  retarget(front: number | null, swipe: number): void {
    const { h, width, carousel } = this.live.size;
    const n = this.live.count;
    const fresh = this.pieces.length !== n;
    if (fresh) this.pieces = Array.from({ length: n }, restingPiece);
    const xs = this.targets(h, width, carousel, front);
    this.pieces.forEach((p, i) => {
      const x = xs[i];
      if (x === undefined) return;
      p.sideW = this.live.sideWidths[i];
      p.tx = x + (carousel ? swipe : 0);
      p.tturn = i === front ? 0 : REST;
      if (fresh || this.live.reduced) {
        p.x = p.tx;
        p.turn = p.tturn;
        p.vx = p.vturn = p.tag = p.vtag = 0;
      }
    });
    if (fresh) this.pieces.forEach((_, i) => this.paint(i));
    this.kick();
  }

  /** Index whose footprint is under the pointer, nearest centre first, or null. */
  nearest(x: number, y: number): number | null {
    const { h } = this.live.size;
    if (y < 0 || y > h + 46) return null;
    let best: number | null = null;
    let distance = Infinity;
    this.pieces.forEach((p, i) => {
      const half = footprint(h, p.turn, p.sideW) / 2 + 4;
      const d = Math.abs(x - p.x);
      if (d < half && d < distance) {
        best = i;
        distance = d;
      }
    });
    return best;
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}
