/**
 * Pure wheel maths — no canvas, no React, no DOM.
 *
 * Kept separate from Wheel.tsx so deterministic landing can be reasoned about
 * and unit-tested without rendering anything.
 *
 * Angle convention matches the canvas 2D context: 0 rad points along +x
 * (3 o'clock) and angles increase clockwise on screen, because canvas y grows
 * downward. The pointer sits at the top of the wheel.
 */

export const TWO_PI = Math.PI * 2;

/** The pointer is at 12 o'clock, aimed inward. */
export const POINTER_ANGLE = -Math.PI / 2;

export function segmentArc(count: number): number {
  return TWO_PI / count;
}

/** Angle of the middle of segment `index`, in wheel-local space. */
export function segmentCenterAngle(index: number, count: number): number {
  const arc = segmentArc(count);
  return index * arc + arc / 2;
}

export function normalizeAngle(angle: number): number {
  const wrapped = angle % TWO_PI;
  return wrapped < 0 ? wrapped + TWO_PI : wrapped;
}

/**
 * The rotation that parks segment `index` exactly under the pointer, chosen so
 * the wheel travels at least `minTurns` full turns beyond its current rotation.
 *
 * This is what makes landing deterministic: the engine's chosen result decides
 * the final angle up front, and the animation simply interpolates to it.
 */
/**
 * How far from a segment's centre the pointer may stop, as a fraction of the
 * arc's half-width.
 *
 * Landing dead centre every time drains the tension out of a spin — a near-miss
 * against the edge is most of the drama. 0.78 keeps the pointer clearly inside
 * the winning segment (never closer than ~11% of the arc to a boundary), so the
 * result stays unambiguous to a viewer.
 */
export const MAX_LANDING_OFFSET = 0.78;

export function resolveTargetRotation(
  currentRotation: number,
  index: number,
  count: number,
  minTurns: number,
  /**
   * Where within the segment to stop: -1 is one edge, 0 the centre, +1 the
   * other edge. Supplied by the caller so this stays a pure function and the
   * landing point remains reproducible.
   */
  offsetWithinSegment = 0,
): number {
  const clamped = Math.max(-1, Math.min(1, offsetWithinSegment)) * MAX_LANDING_OFFSET;
  const jitter = (segmentArc(count) / 2) * clamped;

  const base = POINTER_ANGLE - segmentCenterAngle(index, count) - jitter;
  const minimum = currentRotation + minTurns * TWO_PI;
  const turns = Math.ceil((minimum - base) / TWO_PI);
  return base + turns * TWO_PI;
}

/**
 * Inverse of the above: which segment currently sits under the pointer.
 * Used for tick feedback and to assert landing correctness.
 */
export function segmentAtPointer(rotation: number, count: number): number {
  const local = normalizeAngle(POINTER_ANGLE - rotation);
  return Math.floor(local / segmentArc(count)) % count;
}

/**
 * Spin easing — three phases: wind up, slow down, then CRAWL.
 *
 * The crawl is the whole point. An ordinary ease-out spends its travel early:
 * the previous quartic profile covered 94% of the distance in the first half
 * of its deceleration, so the wheel parked deep inside a segment almost
 * immediately and the remaining "slowdown" crept across a sliver of arc nobody
 * could read. No boundary was ever genuinely in play.
 *
 * Here the last CRAWL_TIME of the spin is reserved to cover CRAWL_DISTANCE of
 * the travel — several segments, slowly, each tick longer than the last. That
 * is where "it's on A but it's RIGHT at the edge of B" lives.
 *
 *   0 .. a          constant acceleration, velocity 0 -> V
 *   a .. a+b        linear decay, V -> vCrawl        (the blur, bleeding off)
 *   a+b .. 1        linear decay, vCrawl -> 0        (the greasy final creep)
 *
 * Velocity is continuous across both joins, so there is no visual jerk, and V
 * is solved so total normalised distance is exactly 1 — the wheel still stops
 * precisely on the target angle rather than "close enough".
 *
 * Returns progress in [0, 1] for input t in [0, 1].
 */

/** Share of the spin spent winding up to full speed. */
export const ACCEL_TIME = 0.12;
/** Share of the spin spent in the final creep. */
export const CRAWL_TIME = 0.34;
/** Share of the total travel saved for that creep. */
export const CRAWL_DISTANCE = 0.085;

const DECEL_TIME = 1 - ACCEL_TIME - CRAWL_TIME;
/** Speed entering the crawl; solved so the crawl covers exactly CRAWL_DISTANCE. */
const CRAWL_VELOCITY = (2 * CRAWL_DISTANCE) / CRAWL_TIME;
/** Peak speed, solved so the three phases sum to exactly 1. */
const PEAK_VELOCITY =
  (1 - CRAWL_DISTANCE - (CRAWL_VELOCITY * DECEL_TIME) / 2) / ((ACCEL_TIME + DECEL_TIME) / 2);

const ACCEL_DISTANCE = (PEAK_VELOCITY * ACCEL_TIME) / 2;
const DECEL_DISTANCE = ((PEAK_VELOCITY + CRAWL_VELOCITY) * DECEL_TIME) / 2;

export function spinProgress(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  // Wind up.
  if (t < ACCEL_TIME) {
    return (PEAK_VELOCITY * t * t) / (2 * ACCEL_TIME);
  }

  // Bleed off speed.
  if (t < ACCEL_TIME + DECEL_TIME) {
    const u = t - ACCEL_TIME;
    return (
      ACCEL_DISTANCE +
      PEAK_VELOCITY * u +
      ((CRAWL_VELOCITY - PEAK_VELOCITY) * u * u) / (2 * DECEL_TIME)
    );
  }

  // Creep home.
  const w = t - ACCEL_TIME - DECEL_TIME;
  return (
    ACCEL_DISTANCE +
    DECEL_DISTANCE +
    CRAWL_VELOCITY * w -
    (CRAWL_VELOCITY * w * w) / (2 * CRAWL_TIME)
  );
}

/**
 * Font size that keeps a label inside its segment.
 *
 * The binding constraint at high player counts is the segment's arc height:
 * 20 players gives 18 degrees per segment, so labels must shrink or they
 * collide. PROJECT_SPEC.md §21 also requires names stay readable after stream
 * compression, hence the floor.
 */
export function resolveLabelFontSize(count: number, radius: number): number {
  const arcHeight = segmentArc(count) * radius * 0.72;
  return Math.max(11, Math.min(26, arcHeight * 0.62));
}
