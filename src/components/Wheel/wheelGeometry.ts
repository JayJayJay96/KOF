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
 * Spin easing: accelerate, then decelerate — a wheel being pushed, not flicked.
 *
 * Piecewise and C1-continuous:
 *   0..a   constant angular acceleration, velocity 0 -> V
 *   a..1   quartic decay of velocity, V -> 0
 *
 * V is solved so the total normalised distance is exactly 1, which means the
 * wheel always stops precisely on the target angle — never "close enough".
 *
 * Returns progress in [0, 1] for input t in [0, 1].
 */
export function spinProgress(t: number, accelFraction = 0.15): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  const a = Math.min(Math.max(accelFraction, 0.001), 0.5);
  const peakVelocity = 4 / (1 + a);

  if (t < a) {
    return (peakVelocity * t * t) / (2 * a);
  }

  const u = (t - a) / (1 - a);
  const accelDistance = (peakVelocity * a) / 2;
  const decelDistance = (peakVelocity * (1 - a)) / 4;

  return accelDistance + decelDistance * (1 - Math.pow(1 - u, 4));
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
