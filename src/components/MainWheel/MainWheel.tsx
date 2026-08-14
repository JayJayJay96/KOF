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
import { Wheel } from '../Wheel/Wheel';
import type { WheelEntry, WheelMarker } from '../Wheel/Wheel';
import { playSound } from '../../audio/audioManager';

/**
 * Status colours. Chosen to sit apart from the gold landed-highlight and from
 * every phase accent (danger orange, sudden-death red), so a marked player is
 * never confused with the winning segment or the phase mood.
 */
const DEATH_MARK_COLOR = '#b45cff';
const SHIELD_COLOR = '#5cc8ff';
/** Bomb: hot orange, the one colour on the wheel that reads as a burning fuse. */
const BOMB_COLOR = '#ff8a3d';

type MainWheelProps = {
  players: Player[];
  selectedId: string | null;
  spinning: boolean;
  onSpinComplete: () => void;
};

export function MainWheel({ players, selectedId, spinning, onSpinComplete }: MainWheelProps) {
  // Stable identity while the roster is unchanged — a new array every render
  // would restart the spin animation mid-flight.
  //
  // Status is painted onto the segment rim so the stakes are visible during the
  // spin itself. The status panel already lists who is marked, but nobody is
  // looking down there while the pointer is crawling — they are watching the
  // wheel (PROJECT_SPEC.md §13).
  const entries: WheelEntry[] = useMemo(
    () =>
      players.map((player) => {
        const markers: WheelMarker[] = [];
        // Ordered by how urgently each one needs to be seen, outermost first.
        // The bomb leads: it is the only status the whole table is tracking at
        // once, and on the last tick it is the reason to care about this spin.
        if (player.bombFuse !== undefined) markers.push({ color: BOMB_COLOR, icon: '💣' });
        if (player.deathMark) markers.push({ color: DEATH_MARK_COLOR, icon: '💀' });
        if (player.shield > 0) markers.push({ color: SHIELD_COLOR, icon: '🛡' });

        return {
          id: player.id,
          label: player.name,
          markers: markers.length > 0 ? markers : undefined,
        };
      }),
    [players],
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
      onTick={() => playSound('wheelTick')}
    />
  );
}
