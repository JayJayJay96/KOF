/**
 * Default Fate weights, by ability and phase.
 *
 * ONE table. Before Enhancement Phase 3 these numbers lived twice — a local
 * `WEIGHTS` constant inside each ability file and a duplicate copy in
 * `defaultConfig.ts` — with the config copy silently winning. Two sources of
 * truth for one fact, and adding a phase meant editing both for every ability.
 *
 * Host overrides still live in `GameConfig.abilities[id].weights` and still
 * win; this is the default they override (see `getAbilityWeight`).
 *
 * A missing entry reads as weight 0, which excludes the ability from the wheel.
 * That is deliberate: an ability with no declared weight should never appear
 * rather than quietly default to something.
 *
 * Rebalanced after Phase 7 playtesting. Measured over 5,220 rolls, the old
 * spread left 19.4% of rolls changing nothing (Safe + Again) while only
 * 20.7% involved a second player — and the two-player Fates were where all
 * the reactions came from. These weights cut dead air to roughly 4% and
 * push two-player Fates toward 35%.
 *
 * Those figures predate the Enhancement Phase 3 retune below (eliminate
 * chaos 22→18, wall chaos 10→12, safe chaos 4→5, bomb chaos 10→8, among
 * others) and have not been re-measured against it. The shift is probably too
 * small to invalidate them, but "probably" isn't measured — Task 15 of this
 * phase re-measures over 200 games and updates this comment properly.
 */

import type { GamePhase } from '../types/game';

export type PhaseWeights = Record<GamePhase, number>;

export const ABILITY_WEIGHTS: Record<string, PhaseWeights> = {
  eliminate: { chaos: 18, danger: 24, bloodbath: 30, final_four: 34, sudden_death: 50 },
  // Falls chaos -> bloodbath/final_four then spikes back up at Sudden Death
  // (8 -> 12), the opposite of "utility falls, lethality rises". Carried
  // forward on purpose from the pre-retune Wave 1 table, which already had
  // this shape — not a transcription slip introduced by this retune.
  wall: { chaos: 12, danger: 10, bloodbath: 8, final_four: 8, sudden_death: 12 },
  // Pure relief, now rare. Kept because if EVERY roll matters the tension
  // flatlines — an occasional clean escape is what makes the rest land.
  safe: { chaos: 5, danger: 3, bloodbath: 2, final_four: 2, sudden_death: 0 },
  close_call: { chaos: 10, danger: 8, bloodbath: 6, final_four: 6, sudden_death: 8 },
  hunter: { chaos: 14, danger: 15, bloodbath: 16, final_four: 18, sudden_death: 20 },
  death_mark: { chaos: 10, danger: 12, bloodbath: 12, final_four: 8, sudden_death: 0 },
  revive: { chaos: 6, danger: 4, bloodbath: 2, final_four: 0, sudden_death: 0 },
  duel: { chaos: 12, danger: 14, bloodbath: 15, final_four: 16, sudden_death: 0 },
  steal_wall: { chaos: 9, danger: 8, bloodbath: 6, final_four: 6, sudden_death: 6 },
  double_fate: { chaos: 8, danger: 8, bloodbath: 7, final_four: 6, sudden_death: 0 },
  // Wave 2. Kept modest on purpose: a live bomb colours three whole rounds,
  // so rolling it often would mean it is almost always running and the
  // countdown stops being an event. It gates itself too — one bomb at a
  // time, and never below four players.
  bomb: { chaos: 8, danger: 10, bloodbath: 10, final_four: 0, sudden_death: 0 },
};
