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

import { useMemo } from 'react';
import type { AbilityDefinition } from '../../game/types/ability';
import { Wheel } from '../Wheel/Wheel';
import type { WheelEntry } from '../Wheel/Wheel';

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
  const entries: WheelEntry[] = useMemo(
    () =>
      abilities.map((ability) => ({ id: ability.id, label: `${ability.icon} ${ability.name}` })),
    [abilities],
  );

  return (
    <div className={`fate-wheel${active ? '' : ' fate-wheel--inactive'}`}>
      <p className="fate-wheel__caption">{active ? '⚡ Fate' : '🔒 Waiting'}</p>
      <Wheel
        entries={entries}
        selectedId={selectedId}
        spinning={spinning}
        onSpinComplete={onSpinComplete}
        spinDurationMs={3200}
        minTurns={3}
      />
    </div>
  );
}
