/**
 * Reusable Canvas wheel.
 *
 * AGENTS.md §7.2: this is a RENDERER. It does not choose a winner, eliminate
 * anyone, or change phase. It is told which entry won and animates to it.
 *
 * The same component serves the Fate Wheel in Phase 2, so nothing here may
 * reference players or abilities.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  RATCHET_TEETH,
  createSpinProfile,
  edgeBiasedOffset,
  resolveLabelFontSize,
  resolvePullBack,
  resolveTargetRotation,
  segmentArc,
  segmentAtPointer,
  spinProgress,
} from './wheelGeometry';
import { randomFloat } from '../../utils/random';

/**
 * A coloured band drawn on a segment's rim.
 *
 * Generic on purpose. The wheel must not learn what a Death Mark is — callers
 * map their own domain state to colours, which is how the same component
 * serves both the player wheel and the Fate wheel.
 */
export type WheelMarker = {
  color: string;
  /** Optional glyph, drawn only when the segment is wide enough to fit it. */
  icon?: string;
};

export type WheelEntry = {
  id: string;
  label: string;
  /** Outermost first. Rendered as concentric rim bands. */
  markers?: WheelMarker[];
};

export type WheelProps = {
  entries: WheelEntry[];
  /** The already-decided result. The wheel animates toward this entry. */
  selectedId: string | null;
  spinning: boolean;
  onSpinComplete: () => void;
  /**
   * Fired each time a segment boundary passes the pointer.
   *
   * `windingUp` is true while the wheel is being hauled backwards, so a caller
   * can play a ratchet click there instead of a spin tick — during the pull the
   * pointer is dragging over teeth, not flying past them. `progress` is the
   * spin's normalised position, for callers that want to bend pitch with the
   * slowdown.
   */
  onTick?: (tick: { windingUp: boolean; progress: number }) => void;
  spinDurationMs?: number;
  minTurns?: number;
  /**
   * Extra turns, rolled per spin.
   *
   * Duration is fixed, so more travel means a faster spin. Without this every
   * spin runs the identical speed curve, which the eye learns quickly — the
   * wheel starts to look like it is playing back a recording rather than
   * actually being thrown.
   */
  turnVariance?: number;
  /**
   * Wait this long after `spinning` goes true before the wheel actually moves.
   *
   * Lets two wheels share a screen without competing for attention: the second
   * one holds still, visibly armed, until the first has had the room to itself.
   */
  startDelayMs?: number;
  /**
   * Whether this spin is preceded by the backward pull.
   *
   * False for a re-spin within the same round — the target spin for Hunter or
   * Duel. The wheel is already loaded, so hauling it back again is a beat that
   * never happened, and hearing the ratchet twice inside twenty seconds dulls
   * it. Worth 1.5s off the longest rounds in the game.
   */
  windUp?: boolean;
  /** Colours only. The wheel never learns what a phase or a status is. */
  theme?: WheelTheme;
  maxSize?: number;
};

/**
 * Rim band thickness. Chosen to survive stream compression — a 2px line smears
 * into the segment edge at typical bitrates (PROJECT_SPEC.md §21).
 */
const MARKER_BAND_WIDTH = 6;

const SEGMENT_FILLS = ['#1f2733', '#2a3442'];
const SEGMENT_FILLS_ACTIVE = ['#3a2a12', '#4a3616'];

/**
 * Colours the wheel is told to use. It is not told what they mean.
 *
 * `tint` is the only value that moves with the phase, and it only reaches the
 * gutters and the rim — never a slice fill. That keeps the four status colours
 * (gold landed, purple Death Mark, blue Shield, orange Bomb) legible in every
 * phase, which a full reskin would not.
 */
export type WheelTheme = {
  tint: string;
  accent: string;
  /**
   * The line between slices.
   *
   * Bright, and deliberately NOT phase-tinted. Gutters alone were invisible: a
   * gap between two dark fills is just more dark, so the wheel read as one disc
   * rather than a set of cells. A tinted separator would go dark again in
   * Chaos — which is exactly where the problem showed up.
   */
  separator: string;
};

/** Module-local, not exported: a value export here would break Fast Refresh. */
const DEFAULT_WHEEL_THEME: WheelTheme = {
  tint: '#2b313d',
  accent: '#ffd479',
  separator: '#8b98ab',
};

/**
 * Gap between slices, as an angle.
 *
 * Drawn INSIDE each slice, so the logical arc is untouched: `segmentAtPointer`
 * never sees a gutter and the pointer can never sit in a gap. Proportional at
 * high counts so twenty narrow slices are not eaten by their own gaps, capped at
 * low counts so two slices are not separated by a canyon.
 */
function gutterFor(arc: number): number {
  return Math.min(0.018, arc * 0.12);
}

/** How long the landed slice stays punched-up after it lands. */
const IMPACT_MS = 260;

export function Wheel({
  entries,
  selectedId,
  spinning,
  onSpinComplete,
  onTick,
  // Sized so the tail has real wall-clock time to breathe. The crawl itself is
  // an absolute 3.3s (CRAWL_MS), so this is the fast phase plus that tail — a
  // greasy tail compressed into a second reads as a stutter, not tension.
  spinDurationMs = 7800,
  minTurns = 4,
  turnVariance = 1.8,
  startDelayMs = 0,
  windUp = true,
  theme = DEFAULT_WHEEL_THEME,
  maxSize = 680,
}: WheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const rotationRef = useRef(0);
  /** 1 at the moment of landing, decaying to 0 over IMPACT_MS. */
  const impactRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  /** Separate from `frameRef`: the flash outlives the spin that triggered it. */
  const impactFrameRef = useRef<number | null>(null);
  const lastTickSegmentRef = useRef(-1);
  const [size, setSize] = useState(360);
  const [pointerKick, setPointerKick] = useState(0);

  // Latest callbacks without restarting the animation when a parent re-renders.
  const onSpinCompleteRef = useRef(onSpinComplete);
  const onTickRef = useRef(onTick);
  onSpinCompleteRef.current = onSpinComplete;
  onTickRef.current = onTick;

  // The spin keys off WHICH entries exist, not the array's identity.
  //
  // Both wheels can now turn at once, so a parent re-render happens mid-spin:
  // the Main Wheel lands and reveals its player while the Fate Wheel is still
  // going. That hands the Fate Wheel a fresh array with identical contents. An
  // effect depending on identity would cancel and restart the animation from
  // wherever it had got to, with a new random landing offset and a full fresh
  // duration — the spin would appear to stall and re-throw itself.
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const entriesKey = entries.map((entry) => entry.id).join('|');

  // Timing is latched when a spin starts, for the same reason.
  //
  // The Fate Wheel's duration depends on whether the round began as a dual
  // spin — and that stops being true the moment the Main Wheel lands, halfway
  // through the Fate Wheel's own animation. As a dependency it restarted the
  // spin from wherever it had reached, with a full fresh duration, so the wheel
  // re-threw itself and finished seconds late.
  //
  // A spin already in flight finishes on the terms it started with; new values
  // apply to the next one.
  const timingRef = useRef({ spinDurationMs, minTurns, turnVariance, startDelayMs, windUp });
  timingRef.current = { spinDurationMs, minTurns, turnVariance, startDelayMs, windUp };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const center = size / 2;
    const radius = center - 6;
    const rotation = rotationRef.current;
    const count = entries.length;

    if (count === 0) {
      ctx.fillStyle = '#2b313d';
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const arc = segmentArc(count);
    const fontSize = resolveLabelFontSize(count, radius);

    const gutter = gutterFor(arc);
    const impact = impactRef.current;

    for (let i = 0; i < count; i += 1) {
      // Inset by half a gutter each side. The LOGICAL arc is untouched — this
      // only shrinks what gets painted — so `segmentAtPointer` is unaffected and
      // the pointer can never land in a gap.
      const start = rotation + i * arc + gutter / 2;
      const end = rotation + (i + 1) * arc - gutter / 2;

      // Keyed off the engine's result, not the pointer position. If the two
      // ever disagree the highlight will visibly sit off-pointer, which makes
      // a landing bug obvious instead of silent.
      const isLanded = !spinning && entries[i].id === selectedId;
      const palette = isLanded ? SEGMENT_FILLS_ACTIVE : SEGMENT_FILLS;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = palette[i % 2];
      ctx.fill();

      if (isLanded) {
        // The bright edge is the whole reason the gutters exist: a hard dark gap
        // on either side gives it something to pop against. Only the winner gets
        // it, so the permanent neon that would swamp the status rims is avoided.
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Punch on landing, decaying to nothing. Drawn as a translucent white
        // overlay rather than a colour change so it reads as light, not as a
        // different state.
        if (impact > 0) {
          ctx.fillStyle = `rgba(255,255,255,${0.5 * impact})`;
          ctx.fill();
        }
      }

      // Status bands on the rim. Deliberately a different channel from the
      // landed highlight, which uses the FILL — so "who is marked" and "who
      // just won" stay readable at the same time.
      const markers = entries[i].markers;
      if (markers && markers.length > 0) {
        markers.forEach((marker, band) => {
          const bandRadius = radius - MARKER_BAND_WIDTH * (band + 0.5) - 1;
          if (bandRadius <= 0) return;

          ctx.beginPath();
          ctx.arc(center, center, bandRadius, start, end);
          ctx.strokeStyle = marker.color;
          ctx.lineWidth = MARKER_BAND_WIDTH;
          ctx.stroke();
        });
      }
    }

    // Separators, drawn after every fill so no slice can paint over its
    // neighbour's line. Down the CENTRE of each gutter, so the dark gap frames
    // the bright line rather than replacing it — the gap alone was invisible
    // between two dark fills.
    const hubRadius = radius * 0.13;
    ctx.strokeStyle = theme.separator;
    ctx.lineWidth = 1.5;

    for (let i = 0; i < count; i += 1) {
      const boundary = rotation + i * arc;
      ctx.beginPath();
      ctx.moveTo(center + Math.cos(boundary) * hubRadius, center + Math.sin(boundary) * hubRadius);
      ctx.lineTo(center + Math.cos(boundary) * radius, center + Math.sin(boundary) * radius);
      ctx.stroke();
    }

    // Outer rim. The one element that carries the phase, so escalation is felt
    // without four separate skins to build and without touching a slice fill.
    ctx.beginPath();
    ctx.arc(center, center, radius + 2, 0, Math.PI * 2);
    ctx.strokeStyle = theme.tint;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Labels drawn in a second pass so no segment fill covers a neighbour's text.
    ctx.textBaseline = 'middle';

    const maxLabelWidth = radius * 0.7;
    const labelInset = 12;

    for (let i = 0; i < count; i += 1) {
      // Keyed off the engine's result, not the pointer position. If the two
      // ever disagree the highlight will visibly sit off-pointer, which makes
      // a landing bug obvious instead of silent.
      const isLanded = !spinning && entries[i].id === selectedId;
      const angle = rotation + i * arc + arc / 2;

      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(angle);
      ctx.fillStyle = isLanded ? theme.accent : '#e8ecf3';

      // Uppercase, tracked and heavy — arcade character out of a system font
      // stack, so the project keeps shipping zero binary assets. Uppercase is
      // also narrower per glyph in most system faces, which buys back label
      // room at twenty players rather than costing it.
      const label = fitLabel(ctx, entries[i].label.toUpperCase(), maxLabelWidth, fontSize);

      // Segments on the left half would otherwise render upside down. Flip
      // them so every name reads left-to-right (PROJECT_SPEC.md §21: names
      // must stay readable, including after stream compression).
      if (Math.cos(angle) < 0) {
        ctx.rotate(Math.PI);
        ctx.textAlign = 'left';
        ctx.fillText(label, -(radius - labelInset), 0);
      } else {
        ctx.textAlign = 'right';
        ctx.fillText(label, radius - labelInset, 0);
      }

      ctx.restore();
    }

    // Hub
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.13, 0, Math.PI * 2);
    ctx.fillStyle = '#0d0f14';
    ctx.fill();
    ctx.strokeStyle = theme.tint;
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [entries, size, spinning, selectedId, theme]);

  // Responsive: track the container, never exceed maxSize.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // The canvas is square, so it is bounded by the SHORTER side of whatever
    // box the layout gives us. The container is a flex child with min-height:0,
    // so its height is already "what is left after the rest of the page" —
    // which means no hardcoded allowance for header/roster/footer is needed.
    //
    // The wheel therefore grows to dominate the screen (PROJECT_SPEC.md §8)
    // while never pushing the action button off a 1280x720 display (§21).
    const measure = () => {
      const rect = container.getBoundingClientRect();
      const side = Math.min(rect.width, rect.height);
      if (side <= 0) return;
      setSize(Math.max(220, Math.min(maxSize, side)));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [maxSize]);

  // The animation loop reaches drawing through this ref, so a resize (which
  // gives `draw` a new identity) repaints without restarting the spin.
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    draw();
  }, [draw]);

  // The spin itself.
  useEffect(() => {
    if (!spinning || selectedId === null) return;

    // Snapshot: the effect must not re-read `entries` on later renders, or the
    // segment count could change under an in-flight animation.
    const spinEntries = entriesRef.current;
    if (spinEntries.length === 0) return;

    const {
      spinDurationMs: duration,
      minTurns: baseTurns,
      turnVariance: variance,
      startDelayMs: delay,
      windUp: wantsWindUp,
    } = timingRef.current;

    const count = spinEntries.length;
    const targetIndex = spinEntries.findIndex((entry) => entry.id === selectedId);
    if (targetIndex < 0) {
      // Nothing to animate toward — do not strand the game in 'spinning'.
      onSpinCompleteRef.current();
      return;
    }

    // NOTE: the spin deliberately does NOT honour `prefers-reduced-motion` by
    // skipping. An earlier version jumped straight to the result, which on a
    // machine with OS animations disabled made the wheel look broken — the spin
    // IS the game, not decoration. Reduced motion is still respected where it
    // belongs: the pointer nudge, screen shake, confetti and impact titles are
    // all disabled by media query in globals.css.
    //
    // Hosts who want a shorter spin control it through `spinDurationMs`, which
    // the game screen derives from `config.animationSpeed`.

    let startTimer: number | null = null;

    const launch = () => {
      startTimer = null;

      // Read at launch, not when the effect ran: during a staggered start this
      // wheel may have been repainted meanwhile, and starting from a stale
      // angle would make it jump on its first frame.
      const from = rotationRef.current;

      // Stop somewhere inside the winning segment rather than dead centre, and
      // travel a different distance each time. Both are presentation only — the
      // engine already decided WHICH entry wins; this decides where within it
      // the pointer rests and how hard the wheel was thrown to get there.
      //
      // Routed through utils/random per AGENTS.md §7.5.
      const offset = edgeBiasedOffset(randomFloat());
      const turns = baseTurns + randomFloat() * variance;
      const to = resolveTargetRotation(from, targetIndex, count, turns, offset);

      // Solved once per spin rather than once per frame. It also inherits the
      // timing latch above, so a duration change mid-spin cannot re-time an
      // animation that is already in flight.
      //
      // The pull is measured against the ACTUAL travel of this spin, which
      // varies with the random turn count — so the wheel is always hauled back
      // the same number of segments regardless of how hard it was thrown.
      const profile = createSpinProfile(duration, wantsWindUp ? resolvePullBack(to - from) : 0);

      const startedAt = performance.now();
      lastTickSegmentRef.current = segmentAtPointer(from, count);

      let lastTooth = 0;

      const step = (now: number) => {
        const t = Math.min(1, (now - startedAt) / duration);
        const progress = spinProgress(t, profile);
        rotationRef.current = from + (to - from) * progress;

        const windingUp = t < profile.windUp;

        // Two different detectors, because the pull and the spin are different
        // physical events. During the pull the pointer drags over the ratchet's
        // own teeth — fixed in number, nothing to do with the roster — so
        // counting segment boundaries there would fall silent on a small wheel.
        // Once thrown, a boundary flying past IS the tick.
        if (windingUp) {
          const depth = profile.pullBack > 0 ? Math.abs(progress) / profile.pullBack : 0;
          const tooth = Math.floor(depth * RATCHET_TEETH);

          if (tooth !== lastTooth) {
            lastTooth = tooth;
            onTickRef.current?.({ windingUp: true, progress });
            setPointerKick((n) => n + 1);
          }
        } else {
          const current = segmentAtPointer(rotationRef.current, count);
          if (current !== lastTickSegmentRef.current) {
            lastTickSegmentRef.current = current;
            onTickRef.current?.({ windingUp: false, progress });
            setPointerKick((n) => n + 1);
          }
        }

        drawRef.current();

        if (t < 1) {
          frameRef.current = requestAnimationFrame(step);
        } else {
          rotationRef.current = to;
          frameRef.current = null;

          // Punch the winning slice, then decay. This runs on its own frame ref
          // rather than `frameRef`, because the spin's cleanup cancels that one
          // the moment `spinning` flips false — which is exactly when the flash
          // needs to still be running.
          const flashStart = performance.now();
          const flash = () => {
            impactRef.current = Math.max(0, 1 - (performance.now() - flashStart) / IMPACT_MS);
            drawRef.current();
            impactFrameRef.current = impactRef.current > 0 ? requestAnimationFrame(flash) : null;
          };
          flash();

          onSpinCompleteRef.current();
        }
      };

      frameRef.current = requestAnimationFrame(step);
    };

    if (delay > 0) {
      startTimer = window.setTimeout(launch, delay);
    } else {
      launch();
    }

    return () => {
      // Both are live during a staggered start: the timer before the wheel
      // moves, the frame after. Leaving the timer would fire a spin into a
      // round that has already moved on.
      if (startTimer !== null) {
        window.clearTimeout(startTimer);
        startTimer = null;
      }
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      // A new spin starting mid-flash must not leave the old one repainting.
      if (impactFrameRef.current !== null) {
        cancelAnimationFrame(impactFrameRef.current);
        impactFrameRef.current = null;
        impactRef.current = 0;
      }
    };
    // `entriesKey`, not `entries`, and no timing props: see the refs above. The
    // animation restarts only when the actual segment set changes — never on a
    // re-render, and never because a prop moved underneath a spin in flight.
  }, [spinning, selectedId, entriesKey]);

  return (
    <div className="wheel" ref={containerRef}>
      <div className="wheel__stage" style={{ width: size, height: size }}>
        <canvas
          ref={canvasRef}
          className="wheel__canvas"
          style={{ width: size, height: size }}
          role="img"
          aria-label={`Wheel with ${entries.length} entries`}
        />
        <div
          key={pointerKick}
          className={`wheel__pointer${spinning ? ' wheel__pointer--ticking' : ''}`}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

/**
 * Condensed faces first, then the ordinary stack.
 *
 * A condensed system face is the single biggest arcade cue available without
 * shipping a webfont — which the project deliberately avoids, since every sound
 * is synthesised at runtime to keep it asset-free. On a canvas an unloaded
 * webfont is worse than usual: labels would draw in the fallback and then
 * visibly jump mid-spin.
 */
const LABEL_FONT_FAMILY =
  '"Bahnschrift", "Roboto Condensed", "Segoe UI Semibold", system-ui, "Segoe UI", Roboto, sans-serif';
const MIN_LABEL_FONT = 10;

/**
 * Fit a label into its segment, setting ctx.font as a side effect.
 *
 * Shrinking is tried BEFORE truncating. The arc-height font size alone is not
 * enough: a small wheel with few segments has generous arc height but little
 * radial width, which previously reduced every Fate label to an ellipsis.
 * Truncation is the last resort, once the floor font still does not fit.
 */
function fitLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  baseFontSize: number,
): string {
  for (let size = Math.round(baseFontSize); size > MIN_LABEL_FONT; size -= 1) {
    ctx.font = `700 ${size}px ${LABEL_FONT_FAMILY}`;
    if (ctx.measureText(text).width <= maxWidth) return text;
  }

  ctx.font = `700 ${MIN_LABEL_FONT}px ${LABEL_FONT_FAMILY}`;
  return truncateToWidth(ctx, text, maxWidth);
}

/** Trim a label with an ellipsis until it fits the segment width. */
function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let trimmed = text;
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}
