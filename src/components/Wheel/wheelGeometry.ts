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
 * Landing spread.
 *
 * Landing dead centre every time drains a spin of tension — the near-miss
 * against the edge is most of the drama. The first version capped the offset at
 * a flat 0.78 of the half-arc, which kept the pointer a full 11% of the arc away
 * from any boundary. The result was unambiguous, and also undramatic: the "it
 * stopped a hair inside A, but LOOK how close B was" moment could not physically
 * occur.
 *
 * The cap is now an ANGULAR margin rather than a fractional one. What makes a
 * result ambiguous to a viewer is how many degrees separate the pointer from the
 * line, not what share of the segment that is — a 2-player wheel and a 20-player
 * wheel need the same absolute gap. So the pointer may stop anywhere in the
 * segment except the last `MIN_EDGE_MARGIN_RAD` at either end.
 */
/** ~1.7 degrees. Wide enough to read on a compressed stream, narrow enough to hurt. */
export const MIN_EDGE_MARGIN_RAD = 0.03;

/** Hard ceiling, so even a very wide segment never lands exactly on the line. */
export const MAX_LANDING_OFFSET = 0.96;

/** The widest usable offset for this segment count, in half-arc fractions. */
export function resolveMaxLandingOffset(count: number): number {
  const halfArc = segmentArc(count) / 2;
  if (halfArc <= 0) return 0;
  return Math.max(0, Math.min(MAX_LANDING_OFFSET, 1 - MIN_EDGE_MARGIN_RAD / halfArc));
}

/**
 * Push a uniform roll toward the segment edges.
 *
 * Uniform landing is "more random" by any statistical measure and still felt
 * mechanical, because the outcomes people NOTICE are the extremes. Most uniform
 * landings sit in the unremarkable middle, so across a game the wheel appears to
 * keep stopping in the same handful of unremarkable places.
 *
 * An exponent below 1 spreads the mass outward: about 45% of spins now finish in
 * the outer third of their segment, against 33% for uniform. The engine's chosen
 * winner is untouched — this only decides where inside it to rest.
 *
 * Input is a uniform [0, 1); output is [-1, 1].
 */
export const EDGE_BIAS_EXPONENT = 0.6;

export function edgeBiasedOffset(uniform: number): number {
  const centred = Math.max(0, Math.min(1, uniform)) * 2 - 1;
  const magnitude = Math.abs(centred) ** EDGE_BIAS_EXPONENT;
  return centred < 0 ? -magnitude : magnitude;
}

export function resolveTargetRotation(
  currentRotation: number,
  index: number,
  count: number,
  /** May be fractional: the extra travel is what varies a spin's speed. */
  minTurns: number,
  /**
   * Where within the segment to stop: -1 is one edge, 0 the centre, +1 the
   * other edge. Supplied by the caller so this stays a pure function and the
   * landing point remains reproducible.
   */
  offsetWithinSegment = 0,
): number {
  const limit = resolveMaxLandingOffset(count);
  const clamped = Math.max(-1, Math.min(1, offsetWithinSegment)) * limit;
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
 * Here the tail of the spin is RESERVED to cover CRAWL_DISTANCE of the travel —
 * several segments, slowly, each tick longer than the last. That is where "it's
 * on A but it's RIGHT at the edge of B" lives.
 *
 *   0   .. w        the wind-up: a backward dip, zero net distance
 *   w   .. w+a      constant acceleration, velocity 0 -> V
 *       .. 1-c      linear decay, V -> vCrawl      (the blur, bleeding off)
 *   1-c .. 1        linear decay, vCrawl -> 0      (the greasy final creep)
 *
 * Velocity is continuous across every join, so there is no visual jerk, and V is
 * solved so the total normalised distance is exactly 1 — the wheel still stops
 * precisely on the target angle rather than "close enough".
 *
 * THE WIND-UP IS NOT MONOTONIC, DELIBERATELY. Progress goes negative during the
 * dip, which is a real backward rotation, and the tick detector fires on the
 * boundaries it crosses. Those ticks should play: a wheel clicking as it is
 * hauled backwards is correct.
 */

/** Share of the throw spent accelerating, once the wind-up is done. */
export const ACCEL_TIME = 0.12;
/** Share of the total travel saved for the final creep. */
export const CRAWL_DISTANCE = 0.085;

/**
 * Wall-clock length of the greasy tail, on every wheel.
 *
 * This used to be a fixed 34% of the spin, which gave the two wheels different
 * tails — 2.3s on the Main Wheel against 1.8s on the Fate Wheel. But the crawl
 * is a felt duration, not a proportion: three seconds of creeping feels like
 * three seconds whatever the spin around it is doing. In milliseconds every
 * wheel gets the same tail, which levels the Fate Wheel up to match rather than
 * leaving the round's punchline with the weaker hold.
 */
export const CRAWL_MS = 3300;
/** Wall-clock length of the backward pull before the throw. */
export const WIND_UP_MS = 350;
/** How far back the wheel is hauled, as a share of the spin's total travel. */
export const WIND_UP_DISTANCE = 0.012;

/**
 * Ceilings, so a short spin degrades instead of breaking.
 *
 * `config.animationSpeed` is meant to shorten spins, and a 3.3s crawl inside a
 * 2s spin would drive the deceleration phase negative and invert the velocity
 * solve. Clamping the crawl means a short spin loses blur rather than tension,
 * which is the right thing to sacrifice.
 */
export const MAX_CRAWL_FRACTION = 0.6;
export const MAX_WIND_UP_FRACTION = 0.15;

/**
 * A spin's timing, solved once per spin rather than once per frame.
 *
 * `windUp` is a share of the WHOLE spin; the other three are shares of the throw
 * that follows it and sum to 1. They are kept on separate timelines because the
 * wind-up is prepended rather than blended in.
 */
export type SpinProfile = {
  windUp: number;
  accel: number;
  decel: number;
  crawl: number;
  peakVelocity: number;
  crawlVelocity: number;
  accelDistance: number;
  decelDistance: number;
};

export function createSpinProfile(durationMs: number): SpinProfile {
  const safeDuration = Math.max(1, durationMs);

  const windUp = Math.min(WIND_UP_MS / safeDuration, MAX_WIND_UP_FRACTION);
  const throwMs = safeDuration * (1 - windUp);

  // Clamped on the INNER timeline, not the outer one: the wind-up has already
  // eaten part of the spin, so clamping the outer share would still allow the
  // inner share to exceed what is left and flip `decel` negative.
  const crawl = Math.min(CRAWL_MS / throwMs, MAX_CRAWL_FRACTION);
  const accel = ACCEL_TIME;
  const decel = 1 - accel - crawl;

  const crawlVelocity = (2 * CRAWL_DISTANCE) / crawl;
  const peakVelocity = (1 - CRAWL_DISTANCE - (crawlVelocity * decel) / 2) / ((accel + decel) / 2);

  return {
    windUp,
    accel,
    decel,
    crawl,
    peakVelocity,
    crawlVelocity,
    accelDistance: (peakVelocity * accel) / 2,
    decelDistance: ((peakVelocity + crawlVelocity) * decel) / 2,
  };
}

/** Profile for the Main Wheel's default duration, for callers that need one. */
export const DEFAULT_SPIN_PROFILE = createSpinProfile(7800);

/**
 * Progress along the spin at normalised time `t`.
 *
 * Returns a value in [-WIND_UP_DISTANCE, 1]: negative through the wind-up, and
 * exactly 1 at t = 1.
 */
export function spinProgress(t: number, profile: SpinProfile = DEFAULT_SPIN_PROFILE): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  const { windUp, accel, decel, crawl, peakVelocity, crawlVelocity } = profile;

  // The dip. A full cosine, so it leaves and returns at exactly zero velocity —
  // no jerk into the throw — and contributes no net distance.
  if (t < windUp) {
    const u = t / windUp;
    return -(WIND_UP_DISTANCE / 2) * (1 - Math.cos(2 * Math.PI * u));
  }

  // Everything below runs on the throw's own timeline.
  const s = (t - windUp) / (1 - windUp);

  if (s < accel) {
    return (peakVelocity * s * s) / (2 * accel);
  }

  if (s < accel + decel) {
    const u = s - accel;
    return (
      profile.accelDistance +
      peakVelocity * u +
      ((crawlVelocity - peakVelocity) * u * u) / (2 * decel)
    );
  }

  const w = s - accel - decel;
  return (
    profile.accelDistance +
    profile.decelDistance +
    crawlVelocity * w -
    (crawlVelocity * w * w) / (2 * crawl)
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
