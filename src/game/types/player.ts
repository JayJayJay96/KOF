/**
 * Player data model.
 *
 * Source of truth: PROJECT_SPEC.md §14.
 * Future-ready fields (bomb, curse, blessing, frozenRounds) are intentionally
 * omitted until an ability actually needs them.
 */

export type PlayerStatus = 'alive' | 'eliminated';

export type Player = {
  id: string;
  name: string;
  status: PlayerStatus;

  /** MVP range is 0 or 1 (PROJECT_SPEC.md §11.2). */
  shield: number;
  deathMark: boolean;

  eliminatedAtRound?: number;
  revivedCount: number;
};
