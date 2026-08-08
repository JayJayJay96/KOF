/**
 * Renders the impact flash and the big arcade word (K.O., BLOCK, MARKED…).
 *
 * Non-interactive: `pointer-events: none` in CSS so it can never intercept a
 * host click mid-round.
 *
 * The screen shake is NOT applied here — it belongs on the game scene so the
 * host panel stays still (PROJECT_SPEC.md §28).
 */

import type { ActiveEffect } from '../hooks/useScreenEffects';

type EffectLayerProps = {
  effect: ActiveEffect | null;
};

export function EffectLayer({ effect }: EffectLayerProps) {
  if (!effect) return null;

  return (
    <div className="effects" aria-hidden="true">
      {effect.flash && (
        <div
          key={`flash-${effect.key}`}
          className={`effects__flash effects__flash--${effect.tone}`}
        />
      )}
      {effect.title && (
        <div
          key={`title-${effect.key}`}
          className={`effects__title effects__title--${effect.tone}`}
        >
          {effect.title}
        </div>
      )}
    </div>
  );
}
