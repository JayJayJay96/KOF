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
  maxSize?: number;
};

/**
 * Rim band thickness. Chosen to survive stream compression — a 2px line smears
 * into the segment edge at typical bitrates (PROJECT_SPEC.md §21).
 */
const MARKER_BAND_WIDTH = 6;

const SEGMENT_FILLS = ['#1f2733', '#2a3442'];
const SEGMENT_FILLS_ACTIVE = ['#3a2a12', '#4a3616'];

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
  maxSize = 680,
}: WheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const rotationRef = useRef(0);
  const frameRef = useRef<number | null>(null);
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
  const timingRef = useRef({ spinDurationMs, minTurns, turnVariance, startDelayMs });
  timingRef.current = { spinDurationMs, minTurns, turnVariance, startDelayMs };

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

    for (let i = 0; i < count; i += 1) {
      const start = rotation + i * arc;
      // Keyed off the engine's result, not the pointer position. If the two
      // ever disagree the highlight will visibly sit off-pointer, which makes
      // a landing bug obvious instead of silent.
      const isLanded = !spinning && entries[i].id === selectedId;
      const palette = isLanded ? SEGMENT_FILLS_ACTIVE : SEGMENT_FILLS;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, start, start + arc);
      ctx.closePath();
      ctx.fillStyle = palette[i % 2];
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Status bands on the rim. Deliberately a different channel from the
      // landed highlight, which uses the FILL — so "who is marked" and "who
      // just won" stay readable at the same time.
      const markers = entries[i].markers;
      if (markers && markers.length > 0) {
        markers.forEach((marker, band) => {
          const bandRadius = radius - MARKER_BAND_WIDTH * (band + 0.5) - 1;
          if (bandRadius <= 0) return;

          ctx.beginPath();
          ctx.arc(center, center, bandRadius, start, start + arc);
          ctx.strokeStyle = marker.color;
          ctx.lineWidth = MARKER_BAND_WIDTH;
          ctx.stroke();
        });
      }
    }

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
      ctx.fillStyle = isLanded ? '#ffd479' : '#e8ecf3';

      const label = fitLabel(ctx, entries[i].label, maxLabelWidth, fontSize);

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
    ctx.strokeStyle = '#2b313d';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [entries, size, spinning, selectedId]);

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
      const profile = createSpinProfile(duration, resolvePullBack(to - from));

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
          drawRef.current();
          frameRef.current = null;
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

const LABEL_FONT_FAMILY = 'system-ui, "Segoe UI", Roboto, sans-serif';
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
    ctx.font = `600 ${size}px ${LABEL_FONT_FAMILY}`;
    if (ctx.measureText(text).width <= maxWidth) return text;
  }

  ctx.font = `600 ${MIN_LABEL_FONT}px ${LABEL_FONT_FAMILY}`;
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
