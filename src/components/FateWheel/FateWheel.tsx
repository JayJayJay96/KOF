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
import type { GamePhase } from '../../game/types/game';
import { Wheel } from '../Wheel/Wheel';
import type { WheelEntry } from '../Wheel/Wheel';
import { themeForPhase } from '../MainWheel/wheelTheme';
import { playSound } from '../../audio/audioManager';

type FateWheelProps = {
  abilities: AbilityDefinition[];
  selectedId: string | null;
  spinning: boolean;
  active: boolean;
  onSpinComplete: () => void;
  phase: GamePhase;
  /**
   * Set when both wheels run together, so this one holds still while the Main
   * Wheel has the screen to itself, then launches into it.
   */
  startDelayMs?: number;
};

export function FateWheel({
  abilities,
  selectedId,
  spinning,
  active,
  onSpinComplete,
  phase,
  startDelayMs = 0,
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
        onTick={({ windingUp, progress }) =>
          playSound(windingUp ? 'wheelRatchet' : 'wheelTick', windingUp ? 1 : 1 + 0.5 * progress)
        }
        theme={themeForPhase(phase)}
        // 6200 against the Main Wheel's 7800. The crawl is an absolute 3.3s on
        // both, so the whole difference sits in the fast phase — and this wheel
        // has fewer segments, so it earns less from a long blur.
        spinDurationMs={6200}
        minTurns={3}
        startDelayMs={startDelayMs}
      />
    </div>
  );
}
