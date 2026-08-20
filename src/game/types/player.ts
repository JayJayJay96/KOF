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

  /**
   * In the blast radius of the live charge.
   *
   * Bound when the charge is PLANTED, not recomputed at detonation. The host
   * can reorder the wheel freely without changing who dies — a shuffle is
   * presentation, and it would be a stealth weapon if it re-rolled the radius.
   *
   * The cost is that the link stops being derivable from geometry once players
   * move apart, so the warning rim and the situation line have to carry it.
   *
   * Members who die before the fuse runs out simply are not there any more: the
   * blast shrinks rather than topping itself up.
   */
  c4Blast?: boolean;

  eliminatedAtRound?: number;
  revivedCount: number;
};
