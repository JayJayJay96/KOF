/**
 * Main Wheel — selects WHO.
 *
 * Thin adapter: turns alive players into wheel entries and forwards engine
 * state to the generic <Wheel>. All rules stay in the engine.
 *
 * PROJECT_SPEC.md §8: the wheel contains currently alive players and supports
 * dynamic removal / re-entry, which happens naturally because entries are
 * derived from state on every render.
 */

import { useCallback, useMemo } from 'react';
import type { Player } from '../../game/types/player';
import { neighboursIn } from '../../game/engine/selectors';
import type { GamePhase } from '../../game/types/game';
import { Wheel } from '../Wheel/Wheel';
import type { WheelEntry, WheelMarker } from '../Wheel/Wheel';
import { themeForPhase } from './wheelTheme';
import { playSound } from '../../audio/audioManager';

/**
 * Status colours. Chosen to sit apart from the gold landed-highlight and from
 * every phase accent (danger orange, sudden-death red), so a marked player is
 * never confused with the winning segment or the phase mood.
 */
const DEATH_MARK_COLOR = '#b45cff';
const WALL_COLOR = '#9aa3ad';
/**
 * C4 escalation. Hot orange while the fuse has room, warming to red as it runs
 * out — at fuse 5 and fuse 1 the badge digit is the only difference otherwise,
 * so the countdown never builds.
 */
function c4RimColor(fuse: number): string {
  if (fuse <= 1) return '#ff2d20';
  if (fuse <= 2) return '#ff5a2c';
  return '#ff8a3d';
}

/**
 * The blast radius, drawn dimmer than the charge itself.
 *
 * The two wheel-adjacent players die with the holder, and that is the whole
 * reason C4 beats a bomb that passes — the neighbours have a stake because they
 * can SEE what they are standing next to. Until this marker existed they could
 * not, and the mechanic was doing work no one could perceive.
 */
const BLAST_COLOR = '#8f4a22';

type MainWheelProps = {
  players: Player[];
  selectedId: string | null;
  spinning: boolean;
  phase: GamePhase;
  /**
   * True when this spin is picking a Hunter's prey or a Duel's opponent rather
   * than opening a round. The same wheel serves both, so this is the only place
   * that can tell them apart.
   */
  isTargetSpin: boolean;
  onSpinComplete: () => void;
};

export function MainWheel({
  players,
  selectedId,
  spinning,
  phase,
  isTargetSpin,
  onSpinComplete,
}: MainWheelProps) {
  // Stable identity while the roster is unchanged — a new array every render
  // would restart the spin animation mid-flight.
  //
  // Status is painted onto the segment rim so the stakes are visible during the
  // spin itself. The status panel already lists who is marked, but nobody is
  // looking down there while the pointer is crawling — they are watching the
  // wheel (PROJECT_SPEC.md §13).
  // Who dies with the charge if it reaches zero. Computed from the SAME
  // adjacency rule the engine detonates by, so what the audience sees and what
  // happens cannot drift apart.
  //
  // Suppressed during a target spin: the wheel is showing a restricted pool
  // then, so adjacency on screen would not be adjacency in the engine.
  const blastRadius = useMemo(() => {
    if (isTargetSpin) return new Set<string>();
    const holder = players.find((player) => player.c4Fuse !== undefined);
    if (!holder) return new Set<string>();
    return new Set(neighboursIn(players, holder.id).map((player) => player.id));
  }, [players, isTargetSpin]);

  const entries: WheelEntry[] = useMemo(
    () =>
      players.map((player) => {
        const markers: WheelMarker[] = [];
        // Ordered by how urgently each one needs to be seen, outermost first.
        // The charge leads: it is the only status the whole table is tracking at
        // once, and on the last tick it is the reason to care about this spin.
        if (player.c4Fuse !== undefined) {
          markers.push({ color: c4RimColor(player.c4Fuse), icon: '🧨' });
        } else if (blastRadius.has(player.id)) {
          markers.push({ color: BLAST_COLOR, icon: '⚠' });
        }
        if (player.deathMark) markers.push({ color: DEATH_MARK_COLOR, icon: '💀' });
        if (player.wall > 0) markers.push({ color: WALL_COLOR, icon: '🧱' });

        return {
          id: player.id,
          label: player.name,
          markers: markers.length > 0 ? markers : undefined,
        };
      }),
    [players, blastRadius],
  );

  // The wheel exposes onTick per segment boundary; this is where it becomes
  // the ticking sound (PROJECT_SPEC.md §26).
  const handleComplete = useCallback(() => {
    playSound('wheelStop');
    onSpinComplete();
  }, [onSpinComplete]);

  return (
    <Wheel
      entries={entries}
      selectedId={selectedId}
      spinning={spinning}
      onSpinComplete={handleComplete}
      theme={themeForPhase(phase)}
      // A re-spin inside the same round: the wheel is already loaded, so it is
      // not hauled back a second time.
      windUp={!isTargetSpin}
      // Two different physical events share one detector: during the pull the
      // pointer is being dragged over a tooth, during the spin one is flying
      // past it. They should not sound the same.
      onTick={({ windingUp, progress }) =>
        // Ticks bend upward as the wheel slows. The spacing already conveys the
        // slowdown; rising pitch is what turns "running out of energy" into
        // "closing in on a result".
        playSound(windingUp ? 'wheelRatchet' : 'wheelTick', windingUp ? 1 : 1 + 0.5 * progress)
      }
    />
  );
}
