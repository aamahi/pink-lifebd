'use client';

import { useEffect, useRef } from 'react';
import { FRAGMENT, VERTEX, loopPosition, rimPoint } from './specular-light.shader';

/** Canvas overhang past the button on every side, px: room for the glow. */
const PAD = 24;
const TAU = Math.PI * 2;
/**
 * Most lit buttons at once. Chrome keeps about 16 WebGL contexts per page and
 * silently kills the oldest past that; a page of primary buttons could reach
 * it. Past this cap a button just has no light -- nothing else breaks.
 */
const MAX_CONTEXTS = 12;
let liveContexts = 0;

const UNIFORMS = [
  'uCenter',
  'uHalf',
  'uRadius',
  'uPx',
  'uSpot',
  'uEntry',
  'uLineColor',
  'uBaseColor',
  'uIntensity',
  'uWindow',
  'uThickness',
  'uGlow',
] as const;
type Uniform = (typeof UNIFORMS)[number];

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const wrap = (v: number) => v - Math.floor(v);

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}

function link(gl: WebGL2RenderingContext): WebGLProgram | null {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, 'aPosition');
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  gl.deleteProgram(program);
  return null;
}

/** A computed `border-radius` in px. A value that does not parse means square corners. */
function radiusOf(el: HTMLElement): number {
  const px = parseFloat(getComputedStyle(el).borderTopLeftRadius);
  return Number.isFinite(px) ? px : 0;
}

export interface SpecularLightProps {
  /** Colour of the light. `var(--token)` is resolved against the button. */
  lineColor?: string;
  /** The thin edge line that stays visible under the light. `var(--token)` allowed. */
  baseColor?: string;
  intensity?: number;
  /** Share of the light left on when the cursor is away, 0-1. */
  idleIntensity?: number;
  /** Degrees of rim at full strength, then degrees of fade past that. */
  shineSize?: number;
  shineFade?: number;
  /** Width of the lit edge, px. */
  thickness?: number;
  glow?: number;
  followMouse?: boolean;
  /** Distance, px, at which the light starts to follow and brighten. */
  proximity?: number;
  /** Keep the light circling whenever the cursor is away. */
  autoAnimate?: boolean;
  speed?: number;
}

type Config = Required<SpecularLightProps>;

/**
 * Sets up WebGL and the listeners for `canvas`, lighting `button`; returns the cleanup, or null
 * when WebGL2 is unavailable. `cfg()` is read on every frame, so a prop that changes after
 * mount takes effect on the next draw (the Angular inputs were signals read the same way).
 */
function start(
  canvas: HTMLCanvasElement,
  button: HTMLElement,
  cfg: () => Config,
): (() => void) | null {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
  });
  if (!gl) return null;
  const program = link(gl);
  if (!program) return null;
  const uniforms = {} as Record<Uniform, WebGLUniformLocation | null>;
  for (const name of UNIFORMS) uniforms[name] = gl.getUniformLocation(program, name);
  const buffer = gl.createBuffer();
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  // One triangle that covers the whole viewport; the fragment shader does the rest.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const colors = new Map<string, [number, number, number]>();
  const view = { width: 1, height: 1, ratio: 1, radius: 0 };
  const pointer = { x: 0, y: 0, known: false };
  const state = { spot: 0, level: 0, press: 0, ready: false };
  let raf = 0;
  let last = 0;
  let visible = true;

  /** Any CSS colour, or `var(--token)` read off the button, as 0-1 RGB via a 1px 2D canvas. */
  const toRgb = (value: string): [number, number, number] => {
    const cached = colors.get(value);
    if (cached) return cached;
    const token = /^var\((--[\w-]+)\)$/.exec(value.trim());
    const css = token?.[1] ? getComputedStyle(button).getPropertyValue(token[1]).trim() : value;
    let rgb: [number, number, number] = [1, 1, 1];
    if (probe) {
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = '#000000';
      probe.fillStyle = css;
      probe.fillRect(0, 0, 1, 1);
      const [r = 255, g = 255, b = 255] = probe.getImageData(0, 0, 1, 1).data;
      rgb = [r / 255, g / 255, b / 255];
    }
    colors.set(value, rgb);
    return rgb;
  };

  const disabled = () => button.matches(':disabled, [aria-disabled="true"]');
  const cornerRadius = () => Math.min(view.radius, view.width / 2, view.height / 2);

  /** Where the light rests: the top-left corner's midpoint. */
  const restSpot = () => {
    const r = cornerRadius();
    const inset = r * (1 - Math.SQRT1_2);
    return loopPosition(
      inset - view.width / 2,
      view.height / 2 - inset,
      view.width / 2,
      view.height / 2,
      r,
    );
  };

  /** The rim point nearest the cursor, and how near the cursor is (0 far, 1 touching). */
  const aim = (): { spot: number; near: number } | null => {
    if (!cfg().followMouse || disabled() || !pointer.known) return null;
    const rect = button.getBoundingClientRect();
    const scale = rect.width / view.width || 1;
    const halfX = view.width / 2;
    const halfY = view.height / 2;
    const x = (pointer.x - rect.left - rect.width / 2) / scale;
    const y = (rect.top + rect.height / 2 - pointer.y) / scale;
    const distance = Math.hypot(Math.max(Math.abs(x) - halfX, 0), Math.max(Math.abs(y) - halfY, 0));
    const t = clamp(1 - distance / Math.max(1, cfg().proximity), 0, 1);
    const near = t * t * (3 - 2 * t);
    const nearest = loopPosition(x, y, halfX, halfY, cornerRadius());
    if (distance > 0) return { spot: nearest, near };
    // Inside the button the light eases back toward rest the deeper the cursor goes.
    const depth = clamp(Math.min(halfX - Math.abs(x), halfY - Math.abs(y)) / (halfY * 0.8), 0, 1);
    const sway = restSpot() - (x / halfX) * 0.06 - (y / halfY) * 0.02;
    const offset = sway - nearest - Math.round(sway - nearest);
    return { spot: wrap(nearest + offset * depth * depth * (3 - 2 * depth)), near };
  };

  const draw = () => {
    const c = cfg();
    const { width, height } = view;
    const scaleX = canvas.width / (width + PAD * 2);
    const scaleY = canvas.height / (height + PAD * 2);
    const r = cornerRadius();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniform2f(uniforms.uCenter, (PAD + width / 2) * scaleX, (PAD + height / 2) * scaleY);
    gl.uniform2f(uniforms.uHalf, (width / 2) * scaleX, (height / 2) * scaleY);
    gl.uniform1f(uniforms.uRadius, r * scaleX);
    gl.uniform1f(uniforms.uPx, view.ratio);
    const [rimX, rimY] = rimPoint(state.spot, width / 2, height / 2, r);
    const reach = Math.max(Math.hypot(rimX, rimY), 0.0001);
    const pull = 1 - Math.min(0.35 * (height / 2), reach) / reach;
    gl.uniform1f(uniforms.uSpot, state.spot);
    gl.uniform2f(uniforms.uEntry, rimX * pull * scaleX, rimY * pull * scaleY);
    gl.uniform3fv(uniforms.uLineColor, toRgb(c.lineColor));
    gl.uniform3fv(uniforms.uBaseColor, toRgb(c.baseColor));
    gl.uniform1f(uniforms.uIntensity, Math.max(0, c.intensity) * (state.level + state.press * 0.8));
    gl.uniform2f(
      uniforms.uWindow,
      Math.max(0, c.shineSize) / 360 + state.press * 0.06,
      Math.max(0, c.shineFade) / 360 + 0.0001,
    );
    gl.uniform1f(uniforms.uThickness, Math.max(0, c.thickness));
    gl.uniform1f(uniforms.uGlow, Math.max(0, c.glow));
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  };

  // Each quantity eases toward its target exponentially (rates 8, 7 and 5 per
  // second, the original's), and the loop stops once everything has settled.
  const frame = (now: number) => {
    raf = 0;
    if (!visible) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    const c = cfg();
    const idle = clamp(c.idleIntensity, 0, 1);
    const target = aim();
    const spinning = c.autoAnimate && !reduce;
    const steering = !!target && target.near > 0;
    if (!state.ready) {
      state.spot = restSpot();
      state.level = c.autoAnimate ? 1 : idle;
      state.ready = true;
    }
    let diff = 0;
    if (spinning && !steering) state.spot = wrap(state.spot + (c.speed / TAU) * dt);
    else {
      diff = (steering && target ? target.spot : restSpot()) - state.spot;
      diff -= Math.round(diff);
      state.spot = wrap(state.spot + diff * (1 - Math.exp(-dt * 8)));
    }
    const level = c.autoAnimate ? 1 : idle + (1 - idle) * (target ? target.near : 0);
    state.level += (level - state.level) * (1 - Math.exp(-dt * 7));
    state.press *= Math.exp(-dt * 5);
    draw();
    const settling =
      Math.abs(diff) > 0.0002 || Math.abs(level - state.level) > 0.001 || state.press > 0.002;
    if (settling || (spinning && !steering)) raf = requestAnimationFrame(frame);
    else last = 0;
  };

  const wake = () => {
    if (!raf && visible) raf = requestAnimationFrame(frame);
  };

  const measure = (entry?: ResizeObserverEntry) => {
    const box = entry?.borderBoxSize?.[0];
    view.width = Math.max(1, box ? box.inlineSize : button.offsetWidth);
    view.height = Math.max(1, box ? box.blockSize : button.offsetHeight);
    view.ratio = Math.min(window.devicePixelRatio || 1, 3);
    view.radius = radiusOf(button);
    canvas.width = Math.max(1, Math.round((view.width + PAD * 2) * view.ratio));
    canvas.height = Math.max(1, Math.round((view.height + PAD * 2) * view.ratio));
    if (state.ready) draw();
    wake();
  };

  const onPointerMove = (event: PointerEvent) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.known = true;
    wake();
  };
  const onPointerDown = (event: PointerEvent) => {
    onPointerMove(event);
    if (!disabled()) state.press = 1;
  };
  // A touch has no hover: once the finger lifts, the light goes back to rest.
  const onPointerEnd = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') return;
    pointer.known = false;
    wake();
  };
  const onPointerLeave = () => {
    pointer.known = false;
    wake();
  };

  const resize = new ResizeObserver((entries) => measure(entries.at(-1)));
  resize.observe(button);
  const intersection = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible) {
      last = 0;
      wake();
    }
  });
  intersection.observe(button);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup', onPointerEnd, { passive: true });
  window.addEventListener('pointercancel', onPointerEnd, { passive: true });
  document.documentElement.addEventListener('pointerleave', onPointerLeave);
  button.addEventListener('pointerdown', onPointerDown);
  measure();

  return () => {
    cancelAnimationFrame(raf);
    resize.disconnect();
    intersection.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerEnd);
    window.removeEventListener('pointercancel', onPointerEnd);
    document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    button.removeEventListener('pointerdown', onPointerDown);
    gl.deleteBuffer(buffer);
    gl.deleteVertexArray(vao);
    gl.deleteProgram(program);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
}

/**
 * `<SpecularLight />` as the first child of a button: a light that runs along the
 * button's edge, slides to the part of the rim nearest the cursor and
 * brightens as the cursor approaches, and flares on press. Port of
 * React Bits' `SpecularButton` -- its shader and motion constants unchanged --
 * as a canvas dropped inside the button rather than a button component, so the button keeps
 * its own element, styles and semantics and only gains the light.
 *
 * The canvas lights its PARENT element, which must be `relative isolate`: the
 * canvas sits at `-z-10` inside that stacking context, over the button's fill
 * but under its label. The corner radius is read from the parent's computed
 * `border-radius`, so it matches whatever shape the button already has.
 *
 * Nothing runs until the button first scrolls into view, and past
 * MAX_CONTEXTS lit buttons the rest stay dark. Without WebGL2, ResizeObserver
 * or IntersectionObserver it does nothing at all. Browser-only: everything happens in an
 * effect, so the server renders just the inert `<canvas>`.
 *
 * Props are read live on every frame (through a ref), not captured at mount, so changing one
 * re-lights the button without restarting WebGL.
 */
export function SpecularLight({
  lineColor = '#ffffff',
  baseColor = '#525252',
  intensity = 1,
  idleIntensity = 0.35,
  shineSize = 10,
  shineFade = 34,
  thickness = 1.2,
  glow = 1,
  followMouse = true,
  proximity = 250,
  autoAnimate = false,
  speed = 0.35,
}: SpecularLightProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const configRef = useRef<Config>({
    lineColor,
    baseColor,
    intensity,
    idleIntensity,
    shineSize,
    shineFade,
    thickness,
    glow,
    followMouse,
    proximity,
    autoAnimate,
    speed,
  });
  useEffect(() => {
    configRef.current = {
      lineColor,
      baseColor,
      intensity,
      idleIntensity,
      shineSize,
      shineFade,
      thickness,
      glow,
      followMouse,
      proximity,
      autoAnimate,
      speed,
    };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const button = canvas?.parentElement;
    if (
      !canvas ||
      !button ||
      typeof IntersectionObserver === 'undefined' ||
      typeof ResizeObserver === 'undefined'
    ) {
      return;
    }
    let teardown: (() => void) | null = null;
    // Wait for the button to be seen once before spending a WebGL context on it.
    const firstSight = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      firstSight.disconnect();
      if (liveContexts >= MAX_CONTEXTS) return;
      teardown = start(canvas, button, () => configRef.current);
      if (teardown) liveContexts++;
    });
    firstSight.observe(button);
    return () => {
      firstSight.disconnect();
      if (teardown) {
        teardown();
        liveContexts--;
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute -inset-6 -z-10 block h-[calc(100%+48px)] w-[calc(100%+48px)]"
    />
  );
}
