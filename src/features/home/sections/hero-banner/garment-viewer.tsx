'use client';

/* The viewer's photos are bare <img> on purpose: their transforms and opacity are written per frame
   by the loop below, on nodes next/image would wrap and re-style. */
/* eslint-disable @next/next/no-img-element */

import {
  useEffect,
  useImperativeHandle,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type Ref,
  type SyntheticEvent,
} from 'react';
import { hookShiftPercent } from '@/components/ui/hook-shift';
import { assetUrl } from '@/core/utils/asset-url';
import { HOOK_TOP, VB_H, clamp, type RailGarment } from './rail.model';

export type Face = 'front' | 'back';

const TAU = Math.PI * 2;
/** How long the rise-in takes, s. */
const INTRO_SECONDS = 1.3;
/** Radians of turn per px dragged. */
const DRAG_SPEED = 0.0065;
/** Idle turn speed once auto-rotate eases in, rad/s, and the pause before it does. */
const AUTO_SPEED = 0.4;
const AUTO_DELAY = 2;
/** Most the garment leans toward the cursor, rad. */
const HOVER_TILT = 0.15;
/** Float amplitude: the original's `float` 0.3 times its 0.06, in model units. */
const FLOAT = 0.3 * 0.06;
const SHADOW_OPACITY = 0.45;
const MIN_ZOOM = 0.7;
const MAX_ZOOM = 2;

const FACES: readonly Face[] = ['front', 'back'];
const HOOK_PERCENT = (HOOK_TOP / VB_H) * 100;

/** Ease `value` toward `goal` at `rate` per second, frame-rate independent. */
const approach = (value: number, goal: number, rate: number, dt: number) =>
  value + (goal - value) * (1 - Math.exp(-dt * rate));

/** What a parent can call on the viewer (the Angular `viewer.turnTo(face)`). */
export interface GarmentViewerHandle {
  /** Turn to a face the short way round, as ModelViewer's reset eases there. */
  turnTo(face: Face): void;
}

export interface GarmentViewerProps {
  item: RailGarment;
  reduced?: boolean;
  /**
   * Which face is toward the visitor, for the Front / Back control (the Angular `viewer.side()`
   * signal). Called whenever it changes; the viewer starts on 'front', so a parent holds
   * `useState<Face>('front')` and passes the setter.
   */
  onSideChange?: (side: Face) => void;
  /** Receives `{ turnTo }`; React 19 passes `ref` as a plain prop. */
  ref?: Ref<GarmentViewerHandle>;
}

/**
 * The lifted garment in the detail view, with the motion and handling of
 * React Bits' `ModelViewer`, built for photos instead of a 3D model.
 *
 * ModelViewer renders a glTF/FBX/OBJ mesh through three.js. The rail's pieces
 * are front, back and side photographs, so there is no mesh to load; what this
 * keeps is everything ModelViewer does *to* the model, with its constants:
 *
 * - **Rise intro** (1.3s, cubic ease-out): starts 0.45 model-units low, at 90%
 *   scale and twisted -0.5 rad, and settles.
 * - **Turntable drag** with momentum (decay 4.5/s); left and right only, which
 *   is ModelViewer's `turntable` mode and what a hanging garment allows.
 * - **Auto-rotate** at 0.4 rad/s that eases back in 2s after the last touch.
 * - **Hover tilt** toward the cursor, **float** bob above a **contact shadow**.
 * - **Zoom** by pinch or Ctrl/Cmd + scroll (plain scroll still scrolls), and
 *   **double-click** to return to the starting view.
 *
 * Model units map to the figure: the original normalises a model to 2 units
 * tall, so one unit is half the figure's height.
 *
 * The turn is real 3D (CSS `rotateY` with front and back faces). Near edge-on
 * the side photo cross-fades in, mirrored to the direction of turn, over the
 * same band the rail uses -- a flat photo seen at 90 degrees would otherwise
 * thin to a line.
 */
export function GarmentViewer({ item, reduced = false, onSideChange, ref }: GarmentViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const floaterRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const spinRef = useRef<HTMLDivElement>(null);
  const sideElRef = useRef<HTMLImageElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);

  /** The loop reads the latest of these without being re-created. */
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const onSideChangeRef = useRef(onSideChange);
  onSideChangeRef.current = onSideChange;

  const sideRef = useRef<Face>('front');
  const m = useRef({
    yaw: 0,
    yawVelocity: 0,
    zoom: 1,
    zoomGoal: 1,
    tiltX: 0,
    tiltY: 0,
    tiltGoalX: 0,
    tiltGoalY: 0,
    spinSpeed: 0,
    idle: 0,
    dragging: false,
    intro: 0,
    clock: 0,
    reset: null as number | null,
  }).current;
  const pointers = useRef(new Map<number, { x: number; y: number; t: number }>()).current;
  const pinch = useRef({ start: 0, zoomStart: 1 }).current;
  /** Side photo's sideways shift, % of its width, that puts its hook under the wire. */
  const hookShift = useRef(0);

  const setSide = (face: Face) => {
    if (sideRef.current === face) return;
    sideRef.current = face;
    onSideChangeRef.current?.(face);
  };

  const turnTo = (face: Face): void => {
    const base = face === 'back' ? Math.PI : 0;
    m.reset = base + Math.round((m.yaw - base) / TAU) * TAU;
    m.yawVelocity = 0;
    m.idle = 0;
    setSide(face);
  };
  useImperativeHandle(ref, () => ({ turnTo }));

  /** Centre the side photo's hanger hook under the wire; see `hookShiftPercent`. */
  const findHook = (img: HTMLImageElement): void => {
    const shift = hookShiftPercent(img);
    if (shift !== null) hookShift.current = shift;
  };

  // A cached side photo can finish loading before this effect attaches `onLoad`'s work, so read an
  // already-complete image directly as well.
  const sideSrc = item.sideImage;
  useEffect(() => {
    const img = sideElRef.current;
    if (img && img.complete && img.naturalWidth > 0) findHook(img);
     
  }, [sideSrc]);

  useEffect(() => {
    let raf = 0;
    let last = 0;

    const paint = (eased: number, reduce: boolean): void => {
      const host = hostRef.current;
      const floater = floaterRef.current;
      const tilt = tiltRef.current;
      const spin = spinRef.current;
      const shadow = shadowRef.current;
      if (!host || !floater || !tilt || !spin || !shadow) return;
      // One model unit is half the figure's height.
      const unit = host.clientHeight / 2;
      const rise = (1 - eased) * 0.45;
      const grow = 0.9 + 0.1 * eased;
      const twist = (1 - eased) * -0.5;
      const bob = reduce ? 0 : Math.sin(m.clock * 1.3) * FLOAT;
      const yaw = m.yaw + twist;

      floater.style.transform = `translateY(${((rise - bob) * unit).toFixed(2)}px) scale(${(grow * m.zoom).toFixed(4)})`;
      // CSS rotateX runs the opposite way to three.js's rotation.x; rotateY agrees.
      tilt.style.transform = `rotateX(${(-m.tiltX).toFixed(4)}rad) rotateY(${m.tiltY.toFixed(4)}rad)`;
      spin.style.transform = `rotateY(${yaw.toFixed(4)}rad)`;

      // 1 when a face is square to the visitor, 0 edge-on. The photos swap over
      // the rail's 0.44-0.56 band.
      const facing = Math.abs(Math.cos(yaw));
      const sideEl = sideElRef.current;
      const faceOpacity = sideEl ? clamp((facing - 0.44) / 0.12, 0, 1) : 1;
      spin.style.opacity = faceOpacity.toFixed(3);
      if (sideEl) {
        sideEl.style.opacity = (clamp((0.56 - facing) / 0.12, 0, 1) * eased).toFixed(3);
        // Mirrored to the direction of turn. The shift sits inside the flip, so a
        // mirrored hook moves the other way with it and stays under the wire.
        const shift = `translateX(${hookShift.current.toFixed(2)}%)`;
        sideEl.style.transform = Math.sin(yaw) < 0 ? `scaleX(-1) ${shift}` : shift;
      }

      // The shadow stays on the floor: narrower as the garment turns side-on,
      // smaller and fainter as it floats up, and absent until the rise lands.
      const width = Math.max(0.35, facing) * (1 - bob * 2);
      shadow.style.transform = `scaleX(${width.toFixed(3)})`;
      shadow.style.opacity = (SHADOW_OPACITY * eased * (1 - bob * 4)).toFixed(3);

      const face: Face = Math.cos(yaw) >= 0 ? 'front' : 'back';
      if (face !== sideRef.current && m.reset === null) setSide(face);
    };

    const frame = (now: number): void => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      const reduce = reducedRef.current;
      m.clock += dt;
      m.idle += dt;

      if (m.intro < 1) m.intro = reduce ? 1 : Math.min(1, m.intro + dt / INTRO_SECONDS);
      const eased = 1 - Math.pow(1 - m.intro, 3);

      if (m.reset !== null) {
        m.yaw = approach(m.yaw, m.reset, 7, dt);
        if (Math.abs(m.reset - m.yaw) < 0.001) m.reset = null;
      } else if (!m.dragging) {
        m.yaw += m.yawVelocity * dt;
        m.yawVelocity *= Math.exp(-dt * 4.5);
      }
      const spinning = !reduce && !m.dragging && m.reset === null && m.idle > AUTO_DELAY;
      m.spinSpeed = approach(m.spinSpeed, spinning ? AUTO_SPEED : 0, 2, dt);
      m.yaw += m.spinSpeed * dt;
      m.zoom = approach(m.zoom, m.zoomGoal, 8, dt);
      m.tiltX = approach(m.tiltX, m.tiltGoalX, 6, dt);
      m.tiltY = approach(m.tiltY, m.tiltGoalY, 6, dt);

      paint(eased, reduce);
      raf = requestAnimationFrame(frame);
    };

    if (reducedRef.current) m.intro = 1;
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [m]);

  // React attaches `onWheel` as a passive listener, which cannot `preventDefault()`; the Ctrl/Cmd +
  // scroll zoom has to cancel the browser's own page zoom, so it listens directly.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    /** Only Ctrl/Cmd + scroll zooms; a plain scroll is left to the page. */
    const onWheel = (event: WheelEvent): void => {
      if (!(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      m.zoomGoal = clamp(m.zoomGoal * Math.exp(-event.deltaY * 0.01), MIN_ZOOM, MAX_ZOOM);
      m.idle = 0;
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [m]);

  /** Double-click: back to the starting view, the nearest whole turn away, at zoom 1. */
  const resetView = (): void => {
    turnTo('front');
    m.zoomGoal = 1;
  };

  const onDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, t: event.timeStamp });
    const stage = stageRef.current;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      if (a && b) pinch.start = Math.hypot(a.x - b.x, a.y - b.y);
      pinch.zoomStart = m.zoomGoal;
      m.dragging = false;
    } else if (pointers.size === 1 && (event.pointerType !== 'mouse' || event.button === 0)) {
      m.dragging = true;
      m.reset = null;
      m.yawVelocity = 0;
      if (stage) {
        stage.setPointerCapture(event.pointerId);
        stage.style.cursor = 'grabbing';
      }
    }
    m.idle = 0;
  };

  const onMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      m.tiltGoalX = ny * HOVER_TILT * 0.6;
      m.tiltGoalY = nx * HOVER_TILT;
    }
    const last = pointers.get(event.pointerId);
    if (!last) return;
    const dx = event.clientX - last.x;
    const elapsed = Math.max((event.timeStamp - last.t) / 1000, 1 / 240);
    last.x = event.clientX;
    last.y = event.clientY;
    last.t = event.timeStamp;
    if (pointers.size === 2 && pinch.start > 0) {
      const [a, b] = [...pointers.values()];
      if (!a || !b) return;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      m.zoomGoal = clamp((pinch.zoomStart * distance) / pinch.start, MIN_ZOOM, MAX_ZOOM);
    } else if (m.dragging) {
      m.yaw += dx * DRAG_SPEED;
      // Velocity is smoothed 40/60 so one jittery sample cannot fling it.
      m.yawVelocity = m.yawVelocity * 0.4 + ((dx * DRAG_SPEED) / elapsed) * 0.6;
      m.idle = 0;
    }
  };

  const onUp = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const last = pointers.get(event.pointerId);
    // Held still for 80ms before letting go: no fling.
    if (last && event.timeStamp - last.t > 80) m.yawVelocity = 0;
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinch.start = 0;
    if (pointers.size === 0) {
      m.dragging = false;
      if (stageRef.current) stageRef.current.style.cursor = '';
    }
  };

  const onLeave = (): void => {
    m.tiltGoalX = 0;
    m.tiltGoalY = 0;
  };

  return (
    <div ref={hostRef} className="absolute inset-0 block">
      <div
        ref={shadowRef}
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[1%] left-[15%] h-[5%] w-[70%] rounded-[50%] bg-black blur-md"
        style={{ opacity: 0 }}
      ></div>
      <div ref={floaterRef} className="absolute inset-0 will-change-transform">
        <div
          aria-hidden="true"
          className="absolute left-1/2 h-[40vh] w-[3px] -translate-x-1/2 rounded-full"
          style={{
            top: `calc(-40vh + ${HOOK_PERCENT}%)`,
            background:
              'linear-gradient(to right, color-mix(in oklab, var(--color-rail-muted) 50%, white), var(--color-rail-muted), color-mix(in oklab, var(--color-rail-muted) 50%, black))',
          }}
        ></div>
        <div
          ref={stageRef}
          className="absolute inset-0 cursor-grab touch-pan-y select-none"
          style={{ perspective: '1100px' }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onLeave}
          onDoubleClick={resetView}
        >
          <div ref={tiltRef} className="absolute inset-0 [transform-style:preserve-3d]">
            <div ref={spinRef} className="absolute inset-0 [transform-style:preserve-3d]">
              {FACES.map((face) => (
                <div
                  key={face}
                  className="absolute inset-0 [backface-visibility:hidden]"
                  style={face === 'back' ? { transform: 'rotateY(180deg)' } : undefined}
                >
                  <img
                    src={assetUrl(face === 'back' ? (item.backImage ?? item.image) : item.image)}
                    alt={face === 'front' ? item.name : ''}
                    draggable="false"
                    className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain object-top"
                  />
                </div>
              ))}
            </div>
            {item.sideImage ? (
              <img
                ref={sideElRef}
                src={assetUrl(item.sideImage)}
                alt=""
                draggable="false"
                className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain object-top"
                style={{ opacity: 0 }}
                onLoad={(event: SyntheticEvent<HTMLImageElement>) => findHook(event.currentTarget)}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
