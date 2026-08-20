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

  /** Walls block one hit, then break. Range is 0 or 1 (PROJECT_SPEC.md §11.2). */
  wall: number;
  deathMark: boolean;

  /**
   * Rounds left on the C4 charge planted on this player (PROJECT_SPEC.md §12).
   *
   * Absent means no charge. At most one exists at a time, which `SET_C4`
   * enforces by clearing every other holder as it lands — so storing it per
   * player is a convenience for rendering, not a licence for two live charges.
   *
   * Optional so saves written before the charge existed still load.
   */
  c4Fuse?: number;

  eliminatedAtRound?: number;
  revivedCount: number;
};
