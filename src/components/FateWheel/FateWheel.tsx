/**
 * Fate Wheel — selects WHAT HAPPENS.
 *
 * Reuses the same <Wheel> renderer as the Main Wheel; only the adapter differs.
 *
 * PROJECT_SPEC.md §9: the contents are NOT a fixed list. Entries come from the
 * registry's availability check, which is recomputed every render, so phase
 * changes and status conditions alter the wheel automatically.
 *
 * The wheel is visibly inactive until a player is selected.
 */

import { useCallback, useMemo } from 'react';
import type { AbilityDefinition } from '../../game/types/ability';
import { Wheel } from '../Wheel/Wheel';
import type { WheelEntry } from '../Wheel/Wheel';
import { playSound } from '../../audio/audioManager';

type FateWheelProps = {
  abilities: AbilityDefinition[];
  selectedId: string | null;
  spinning: boolean;
  active: boolean;
  onSpinComplete: () => void;
};

export function FateWheel({
  abilities,
  selectedId,
  spinning,
  active,
  onSpinComplete,
}: FateWheelProps) {
  // Name only — no icon. With eight abilities the segments are narrow, and the
  // icon glyph cost pushed "Death Mark" down to the 10px floor, which is
  // unreadable after stream compression (PROJECT_SPEC.md §21). Dropping it
  // lifts the smallest label to ~17px. Icons still appear in the result
  // readout, where they render at full size.
  const entries: WheelEntry[] = useMemo(
    () => abilities.map((ability) => ({ id: ability.id, label: ability.name })),
    [abilities],
  );

  const handleComplete = useCallback(() => {
    playSound('wheelStop');
    onSpinComplete();
  }, [onSpinComplete]);

  return (
    <div className={`fate-wheel${active ? '' : ' fate-wheel--inactive'}`}>
      <p className="fate-wheel__caption">{active ? '⚡ Fate' : '🔒 Waiting'}</p>
      <Wheel
        entries={entries}
        selectedId={selectedId}
        spinning={spinning}
        onSpinComplete={handleComplete}
        onTick={() => playSound('wheelTick')}
        spinDurationMs={5200}
        minTurns={3}
      />
    </div>
  );
}
