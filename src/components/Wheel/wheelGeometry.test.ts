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
  TWO_PI,
  WIND_UP_DISTANCE,
  createSpinProfile,
  edgeBiasedOffset,
  normalizeAngle,
  resolveMaxLandingOffset,
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

  it('goes backward during the wind-up, and only during the wind-up', () => {
    const lowest = Math.min(
      ...Array.from({ length: 200 }, (_, i) => spinProgress((i / 200) * profile.windUp, profile)),
    );

    expect(lowest).toBeLessThan(0);
    expect(lowest).toBeGreaterThanOrEqual(-WIND_UP_DISTANCE);
    // Back to zero by the time the throw starts, so the dip costs no distance.
    expect(spinProgress(profile.windUp, profile)).toBeCloseTo(0, 6);
  });

  it('is monotonic after the wind-up completes', () => {
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
