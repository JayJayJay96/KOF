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
import type { WheelEntry } from '../Wheel/Wheel';
import { playSound } from '../../audio/audioManager';

type MainWheelProps = {
  players: Player[];
  selectedId: string | null;
  spinning: boolean;
  onSpinComplete: () => void;
};

export function MainWheel({ players, selectedId, spinning, onSpinComplete }: MainWheelProps) {
  // Stable identity while the roster is unchanged — a new array every render
  // would restart the spin animation mid-flight.
  const entries: WheelEntry[] = useMemo(
    () => players.map((player) => ({ id: player.id, label: player.name })),
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
