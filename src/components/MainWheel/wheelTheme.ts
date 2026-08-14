/**
 * Phase to wheel colours.
 *
 * This mapping lives in the adapter layer on purpose. `Wheel` is a renderer and
 * must not learn what a phase is (AGENTS.md §7.2) — it takes colours and paints
 * them, exactly as it takes `WheelMarker` without knowing what a Death Mark is.
 *
 * ONLY THE TINT MOVES. It reaches the rim, the gutters and the hub ring, never a
 * slice fill. That is what keeps the four status colours — gold for the landed
 * slice, purple for Death Mark, light blue for Shield, orange for Bomb — legible
 * in every phase. A full per-phase reskin was considered and rejected for
 * exactly this reason: Danger's orange and Sudden Death's red both collide with
 * the Bomb marker, and the whole status palette would have needed re-picking.
 *
 * The accent stays constant for the same reason. The landed slice means "this
 * one won" in every phase, and a colour shifting underneath it would make that
 * read as a different kind of event.
 */

import type { GamePhase } from '../../game/types/game';
import type { WheelTheme } from '../Wheel/Wheel';

/** Gold. The landed slice, in every phase. */
const ACCENT = '#ffd479';

/**
 * The line between slices. Constant, and bright.
 *
 * Not tinted by phase, for the same reason the separator exists at all: gutters
 * alone were invisible, because a gap between two dark fills is just more dark.
 * Tinting this would send it dark again in Chaos — the phase where the problem
 * was noticed.
 */
const SEPARATOR = '#8b98ab';

const TINTS: Record<GamePhase, string> = {
  // Cool and neutral: nothing has gone wrong yet.
  chaos: '#2b313d',
  // Warming. The first phase where the roster is visibly thinning.
  danger: '#5a3f22',
  // Past warming, not yet hot: the step between Danger's amber and Final
  // Four's full orange.
  bloodbath: '#6d2f1e',
  // Hot.
  final_four: '#7a3a1c',
  // Red. Two players left, and every spin is lethal.
  sudden_death: '#8c2020',
};

export function themeForPhase(phase: GamePhase): WheelTheme {
  return { tint: TINTS[phase], accent: ACCENT, separator: SEPARATOR };
}
