/**
 * Player data model.
 *
 * Source of truth: PROJECT_SPEC.md §14.
 * Future-ready fields (curse, blessing, frozenRounds) are intentionally omitted
 * until an ability actually needs them.
 */

export type PlayerStatus = 'alive' | 'eliminated';

export type Player = {
  id: string;
  name: string;
  status: PlayerStatus;

  /** MVP range is 0 or 1 (PROJECT_SPEC.md §11.2). */
  shield: number;
  deathMark: boolean;

  /**
   * Rounds left on the bomb this player is holding (PROJECT_SPEC.md §12).
   *
   * Absent means they are not holding it. At most one bomb exists at a time,
   * which `SET_BOMB` enforces by clearing every other holder as it moves — so
   * storing it per player is a convenience for rendering, not a licence for two
   * bombs to be live at once.
   *
   * Optional so saves written before Bomb existed still load.
   */
  bombFuse?: number;

  eliminatedAtRound?: number;
  revivedCount: number;
};
