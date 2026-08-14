/**
 * Wheel maths — Enhancement Phase 1.
 *
 * The landing behaviour here was previously only ever checked by throwaway
 * browser harnesses. Those found real bugs, but they were rebuilt every session
 * and one of them silently produced a false result, so the properties that
 * matter are written down here instead.
 *
 * The load-bearing ones:
 *
 *   - the pointer resolves to the segment the engine chose, for every offset,
 *     segment count and turn count
 *   - the spin ends at exactly 1, so the wheel stops ON the target angle
 *   - the crawl covers exactly CRAWL_DISTANCE, which is what puts a boundary in
 *     play at the end
 *   - a short duration degrades rather than inverting the velocity solve
 */

import { describe, expect, it } from 'vitest';

import {
  ACCEL_TIME,
  CRAWL_DISTANCE,
  CRAWL_MS,
  MAX_CRAWL_FRACTION,
  MAX_LANDING_OFFSET,
  MIN_EDGE_MARGIN_RAD,
  PULL_BACK_RAD,
  RATCHET_TEETH,
  TWO_PI,
  WIND_UP_MS,
  createSpinProfile,
  edgeBiasedOffset,
  normalizeAngle,
  resolveMaxLandingOffset,
  resolvePullBack,
  resolveTargetRotation,
  segmentArc,
  segmentAtPointer,
  spinProgress,
} from './wheelGeometry';

const COUNTS = [2, 3, 5, 8, 12, 20];

describe('landing', () => {
  it('resolves to the chosen segment for every offset and count', () => {
    let checked = 0;

    for (const count of COUNTS) {
      for (let index = 0; index < count; index += 1) {
        for (let step = 0; step <= 20; step += 1) {
          const offset = -1 + step / 10;
          const from = (step * 0.37 + index) % TWO_PI;
          const turns = 4 + (step % 5) * 0.4;

          const to = resolveTargetRotation(from, index, count, turns, offset);
          expect(segmentAtPointer(to, count)).toBe(index);
          checked += 1;
        }
      }
    }

    expect(checked).toBeGreaterThan(1000);
  });

  it('always travels forward by at least the requested turns', () => {
    for (const count of COUNTS) {
      const from = 1.234;
      const to = resolveTargetRotation(from, 0, count, 4, 0);

      expect(to - from).toBeGreaterThanOrEqual(4 * TWO_PI);
    }
  });

  it('keeps a readable gap to the boundary at every count', () => {
    for (const count of COUNTS) {
      const halfArc = segmentArc(count) / 2;
      const limit = resolveMaxLandingOffset(count);
      const gap = halfArc * (1 - limit);

      // Either the angular floor binds, or the fractional ceiling does.
      const bindsOnAngle = Math.abs(gap - MIN_EDGE_MARGIN_RAD) < 1e-9;
      const bindsOnFraction = Math.abs(limit - MAX_LANDING_OFFSET) < 1e-9;

      expect(bindsOnAngle || bindsOnFraction).toBe(true);
      expect(gap).toBeGreaterThan(0);
    }
  });

  it('never lands outside the winning segment even at the extremes', () => {
    for (const count of COUNTS) {
      for (const offset of [-1, -0.999, 0, 0.999, 1]) {
        const index = 1 % count;
        const to = resolveTargetRotation(0, index, count, 4, offset);
        expect(segmentAtPointer(to, count)).toBe(index);
      }
    }
  });
});

describe('edge-biased offset', () => {
  it('stays within [-1, 1] and clamps out-of-range input', () => {
    for (const u of [-5, -0.1, 0, 0.5, 1, 1.7]) {
      const offset = edgeBiasedOffset(u);
      expect(offset).toBeGreaterThanOrEqual(-1);
      expect(offset).toBeLessThanOrEqual(1);
    }
  });

  it('is symmetric about the centre', () => {
    expect(edgeBiasedOffset(0.5)).toBeCloseTo(0, 10);
    expect(edgeBiasedOffset(0)).toBeCloseTo(-edgeBiasedOffset(1), 10);
  });

  it('puts more landings near the edges than uniform would', () => {
    let outerThird = 0;
    const samples = 20000;

    for (let i = 0; i < samples; i += 1) {
      if (Math.abs(edgeBiasedOffset((i + 0.5) / samples)) > 2 / 3) outerThird += 1;
    }

    // Uniform would give ~33%. The bias is the whole point of the curve.
    expect(outerThird / samples).toBeGreaterThan(0.42);
  });
});

describe('spin profile', () => {
  it('gives every duration the same wall-clock crawl', () => {
    for (const duration of [6200, 7800]) {
      const profile = createSpinProfile(duration);
      const crawlMs = duration * (1 - profile.windUp) * profile.crawl;

      expect(crawlMs).toBeCloseTo(CRAWL_MS, 6);
    }
  });

  it('clamps the crawl on a short spin instead of inverting the solve', () => {
    for (const duration of [400, 1000, 2000, 3000]) {
      const profile = createSpinProfile(duration);

      expect(profile.crawl).toBeLessThanOrEqual(MAX_CRAWL_FRACTION);
      expect(profile.decel).toBeGreaterThan(0);
      expect(profile.peakVelocity).toBeGreaterThan(profile.crawlVelocity);
    }
  });

  it('keeps acceleration, deceleration and crawl summing to the whole throw', () => {
    for (const duration of [1000, 5200, 6200, 7800, 20000]) {
      const profile = createSpinProfile(duration);
      expect(profile.accel + profile.decel + profile.crawl).toBeCloseTo(1, 10);
      expect(profile.accel).toBeCloseTo(ACCEL_TIME, 10);
    }
  });

  it('survives a degenerate duration', () => {
    for (const duration of [0, -100, Number.EPSILON]) {
      const profile = createSpinProfile(duration);
      expect(Number.isFinite(profile.peakVelocity)).toBe(true);
      expect(profile.decel).toBeGreaterThan(0);
    }
  });

  it('fits the full 1.5s pull AND the full 3.3s tail on both wheels', () => {
    // The reason the clamps were raised. At the old ceilings a 1.5s pull was
    // silently cut to 1.17s and the Fate Wheel's tail to 2.8s.
    const pull = resolvePullBack(5 * TWO_PI);

    for (const duration of [6200, 7800]) {
      const profile = createSpinProfile(duration, pull);

      expect(duration * profile.windUp).toBeCloseTo(WIND_UP_MS, 6);
      expect(duration * (1 - profile.windUp) * profile.crawl).toBeCloseTo(CRAWL_MS, 6);
      expect(profile.decel).toBeGreaterThan(0.1);
    }
  });

  it('spends no TIME on the pull when there is no pull DISTANCE', () => {
    // A target re-spin skips the wind-up. Without this rule it would still sit
    // motionless for 1.5s, which reads as a hang rather than a saving.
    const skipped = createSpinProfile(7800, 0);

    expect(skipped.windUp).toBe(0);
    expect(skipped.pullBack).toBe(0);
    // The whole duration goes to the throw, so the tail is still exact.
    expect(7800 * skipped.crawl).toBeCloseTo(CRAWL_MS, 6);
  });
});

describe('pull-back distance', () => {
  it('pulls the same angle regardless of roster size', () => {
    // The pull is a visual choice, not a function of the wheel's contents. An
    // earlier version measured it in segment boundaries so the ratchet would
    // click a fixed number of times, which fell apart at three players — one
    // segment is 120 degrees there, so a capped pull crossed barely one
    // boundary and the ratchet went almost silent. Clicks are counted
    // separately now (RATCHET_TEETH), which frees this to stay constant.
    const travel = 5 * TWO_PI;
    const angle = resolvePullBack(travel) * travel;

    expect(angle).toBeCloseTo(PULL_BACK_RAD, 6);
  });

  it('shrinks as a share of travel when the wheel is thrown harder', () => {
    // A fixed angle over a longer throw is a smaller fraction, so a hard throw
    // is not preceded by a proportionally huge wind-up.
    const gentle = resolvePullBack(4 * TWO_PI);
    const hard = resolvePullBack(6 * TWO_PI);

    expect(hard).toBeLessThan(gentle);
    expect(hard * 6 * TWO_PI).toBeCloseTo(gentle * 4 * TWO_PI, 6);
  });

  it('stays well under half a turn, so it reads as a pull not a reverse spin', () => {
    expect(PULL_BACK_RAD).toBeLessThan(Math.PI);
  });

  it('gives the ratchet enough teeth to have a rhythm', () => {
    // Across a 1.5s pull this is the difference between a ratchet and a click.
    expect(RATCHET_TEETH).toBeGreaterThanOrEqual(6);
    expect(WIND_UP_MS / RATCHET_TEETH).toBeLessThan(300);
  });

  it('refuses a degenerate travel rather than returning nonsense', () => {
    for (const travel of [0, -1, Number.NaN]) {
      expect(resolvePullBack(travel)).toBe(0);
    }
  });
});

describe('spinProgress', () => {
  const profile = createSpinProfile(7800);

  it('starts at 0 and ends at exactly 1', () => {
    expect(spinProgress(0, profile)).toBe(0);
    expect(spinProgress(1, profile)).toBe(1);
    expect(spinProgress(-1, profile)).toBe(0);
    expect(spinProgress(2, profile)).toBe(1);
  });

  it('approaches 1 continuously rather than jumping at the end', () => {
    expect(spinProgress(0.9999, profile)).toBeGreaterThan(0.999);
    expect(spinProgress(0.9999, profile)).toBeLessThanOrEqual(1);
  });

  it('hauls backward and RELEASES FROM THE BACK, not from the origin', () => {
    const pulled = createSpinProfile(7800, 0.08);

    // Deepest point is the end of the pull, not somewhere in the middle: this
    // is a pull-and-release, not a dip that returns to neutral first. An
    // earlier version came back to zero before accelerating, which read as a
    // visibly wasted motion.
    const atRelease = spinProgress(pulled.windUp * 0.999, pulled);
    expect(atRelease).toBeCloseTo(-0.08, 3);

    const samples = Array.from({ length: 200 }, (_, i) =>
      spinProgress((i / 200) * pulled.windUp, pulled),
    );
    expect(Math.min(...samples)).toBeCloseTo(-0.08, 3);
    expect(samples[0]).toBeCloseTo(0, 6);
  });

  it('is monotonically backward through the pull', () => {
    const pulled = createSpinProfile(7800, 0.08);
    let previous = 0;

    for (let i = 1; i <= 500; i += 1) {
      const current = spinProgress((i / 500) * pulled.windUp, pulled);
      expect(current).toBeLessThanOrEqual(previous + 1e-9);
      previous = current;
    }
  });

  it('still lands exactly on target despite starting behind the origin', () => {
    for (const pull of [0, 0.02, 0.08, 0.2]) {
      const pulled = createSpinProfile(7800, pull);
      expect(spinProgress(1, pulled)).toBe(1);
      expect(spinProgress(0.99999, pulled)).toBeGreaterThan(0.999);
    }
  });

  it('is monotonic after the pull completes', () => {
    let previous = spinProgress(profile.windUp, profile);

    for (let i = 0; i <= 4000; i += 1) {
      const t = profile.windUp + (1 - profile.windUp) * (i / 4000);
      const current = spinProgress(t, profile);

      expect(current).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = current;
    }
  });

  it('reserves exactly CRAWL_DISTANCE for the crawl', () => {
    const crawlStart = profile.windUp + (1 - profile.windUp) * (profile.accel + profile.decel);
    const covered = 1 - spinProgress(crawlStart, profile);

    expect(covered).toBeCloseTo(CRAWL_DISTANCE, 6);
  });

  it('spends the reserved tail slowly — most of it in the first half', () => {
    const crawlStart = profile.windUp + (1 - profile.windUp) * (profile.accel + profile.decel);
    const halfway = crawlStart + (1 - crawlStart) / 2;
    const firstHalf = spinProgress(halfway, profile) - spinProgress(crawlStart, profile);

    // Decelerating, so the first half of the tail covers more ground than the
    // second — that is what makes each successive tick longer than the last.
    expect(firstHalf).toBeGreaterThan(CRAWL_DISTANCE * 0.6);
    expect(firstHalf).toBeLessThan(CRAWL_DISTANCE);
  });

  it('gives the Fate Wheel a far longer tail than the old 34% fraction did', () => {
    // 34% of the old 5200ms was 1.77s — the weaker of the two tails, on the
    // round's punchline. Levelling it up is the point of the absolute crawl.
    const fate = createSpinProfile(6200);
    const tailMs = 6200 * (1 - fate.windUp) * fate.crawl;

    expect(tailMs).toBeGreaterThan(1770 * 1.8);
  });
});

describe('segmentAtPointer', () => {
  it('covers every segment exactly once around the circle', () => {
    for (const count of COUNTS) {
      const seen = new Set<number>();
      const arc = segmentArc(count);

      for (let index = 0; index < count; index += 1) {
        const rotation = normalizeAngle(-(index * arc + arc / 2));
        seen.add(segmentAtPointer(rotation - Math.PI / 2, count));
      }

      expect(seen.size).toBe(count);
    }
  });

  it('is unaffected by how wide a gutter is drawn, because it uses angles only', () => {
    // Gutters are a paint concern; the logical arc is untouched. Landing on the
    // exact centre of a segment must resolve to that segment regardless.
    for (const count of COUNTS) {
      for (let index = 0; index < count; index += 1) {
        const to = resolveTargetRotation(0, index, count, 4, 0);
        expect(segmentAtPointer(to, count)).toBe(index);
      }
    }
  });
});
