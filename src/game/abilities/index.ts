/**
 * Ability registry.
 *
 * AGENTS.md §7.6: abilities are data. Adding one means adding a file and a
 * line here — never editing a wheel, a component, or a switch statement.
 *
 * Phase 2 registers the four starter abilities only. Hunter, Death Mark,
 * Revive and Duel arrive in Phase 4; Double Kill and Fate Swap are Post-MVP.
 */

import type { AbilityDefinition, GameContext } from '../types/ability';
import type { GameState } from '../types/game';
import { selectWeightedItem } from '../../utils/random';
import { filterAlive, getEliminatedPlayers } from '../engine/selectors';
import { eliminateAbility } from './eliminate';
import { shieldAbility } from './shield';
import { safeAbility } from './safe';
import { againAbility } from './again';

export const ABILITIES: readonly AbilityDefinition[] = [
  eliminateAbility,
  shieldAbility,
  safeAbility,
  againAbility,
];

export const ABILITY_BY_ID: Record<string, AbilityDefinition> = Object.fromEntries(
  ABILITIES.map((ability) => [ability.id, ability]),
);

export function getAbility(abilityId: string | null): AbilityDefinition | null {
  if (abilityId === null) return null;
  return ABILITY_BY_ID[abilityId] ?? null;
}

/** Snapshot handed to abilities for eligibility and resolution. */
export function buildGameContext(state: GameState): GameContext {
  return {
    state,
    config: state.config,
    phase: state.phase,
    alivePlayers: filterAlive(state.players),
    eliminatedPlayers: getEliminatedPlayers(state),
  };
}

/**
 * Weight for an ability in the current phase.
 *
 * Config wins when it defines a value, so host tuning (Enhancement Phase 5)
 * works without touching ability code. `getWeight` is the built-in default and
 * covers abilities the config has never heard of.
 */
export function getAbilityWeight(state: GameState, ability: AbilityDefinition): number {
  const configured = state.config.abilities[ability.id]?.weights?.[state.phase];
  return configured ?? ability.getWeight(state.phase);
}

/**
 * Abilities that may appear on the Fate Wheel right now.
 *
 * Recomputed before every Fate spin (PROJECT_SPEC.md §9): availability depends
 * on phase, alive count, eliminated count and statuses, all of which move.
 * Zero-weight abilities are excluded so the wheel never shows an outcome that
 * cannot happen.
 */
export function getAvailableAbilities(state: GameState): AbilityDefinition[] {
  const context = buildGameContext(state);

  return ABILITIES.filter((ability) => {
    if (state.config.abilities[ability.id]?.enabled === false) return false;
    if (!ability.isAvailable(context)) return false;
    return getAbilityWeight(state, ability) > 0;
  });
}

/**
 * Weighted pick over the currently available pool.
 *
 * The engine chooses before the Fate Wheel animates (PROJECT_SPEC.md §16), and
 * randomness routes through utils/random.ts (AGENTS.md §7.5).
 */
export function selectWeightedAbility(state: GameState): AbilityDefinition | null {
  const available = getAvailableAbilities(state);
  if (available.length === 0) return null;

  return selectWeightedItem(
    available.map((ability) => ({ item: ability, weight: getAbilityWeight(state, ability) })),
  );
}
