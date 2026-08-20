/**
 * Ability registry.
 *
 * AGENTS.md §7.6: abilities are data. Adding one means adding a file and a
 * line here — never editing a wheel, a component, or a switch statement.
 *
 * All eight MVP abilities are registered. Double Kill and Fate Swap are
 * Post-MVP and remain disabled in the default config.
 */

import type { AbilityDefinition, GameContext } from '../types/ability';
import type { GameState } from '../types/game';
import { selectWeightedItem } from '../../utils/random';
import { ABILITY_WEIGHTS } from '../config/abilityWeights';
import { filterAlive, getEliminatedPlayers } from '../engine/selectors';
import { eliminateAbility } from './eliminate';
import { wallAbility } from './wall';
import { safeAbility } from './safe';
import { deathMarkAbility } from './deathMark';
import { hunterAbility } from './hunter';
import { reviveAbility } from './revive';
import { duelAbility } from './duel';
import { c4Ability } from './c4';
import { galeAbility } from './gale';
import { demolitionAbility } from './demolition';
import { fateSwapAbility } from './fateSwap';
import { purifyAbility } from './purify';
import { DOUBLE_FATE_ID, doubleFateAbility, setDoubleFatePoolProvider } from './doubleFate';

export const ABILITIES: readonly AbilityDefinition[] = [
  eliminateAbility,
  wallAbility,
  safeAbility,
  deathMarkAbility,
  hunterAbility,
  reviveAbility,
  duelAbility,
  doubleFateAbility,
  c4Ability,
  galeAbility,
  demolitionAbility,
  fateSwapAbility,
  purifyAbility,
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
 * works without touching ability code. `ABILITY_WEIGHTS` is the built-in
 * default table and covers abilities the config has never heard of.
 */
export function getAbilityWeight(state: GameState, ability: AbilityDefinition): number {
  const configured = state.config.abilities[ability.id]?.weights?.[state.phase];
  return configured ?? ABILITY_WEIGHTS[ability.id]?.[state.phase] ?? 0;
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
  // Empty means the draw has not happened yet — this is the PRE-GAME state
  // only (the setup screen, or the instant before START_GAME runs). Treat it
  // as no restriction rather than as "nothing is available", which would
  // leave the Fate Wheel empty.
  //
  // A save written before this field existed does NOT land here: it fails
  // the SAVE_VERSION check in gameStorage.ts and is rejected outright (Task
  // 5), the same gate that already rejects a save whose PhaseThresholds
  // predate Task 3's share-based rework. These fields are deliberately NOT
  // made optional-with-defaults the way `simultaneousSpin?` and
  // `audio.muted?` are — a stale `dangerAt` or `sessionAbilityIds` can't be
  // defaulted sensibly (an old `dangerAt` would silently resolve every game
  // to Chaos), so the version gate is the one designed defence. A per-field
  // fallback here would be unreachable once that gate is in place — the same
  // dead-guard pattern removed from phaseResolver in Task 3.
  const pool = state.sessionAbilityIds.length > 0 ? new Set(state.sessionAbilityIds) : null;

  return ABILITIES.filter((ability) => {
    if (pool !== null && !pool.has(ability.id)) return false;
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
/**
 * Fates that Double Fate may pair.
 *
 * Injected here rather than imported by `doubleFate.ts` so the module graph
 * stays acyclic. Excludes itself (recursion) and anything needing a target
 * spin — the engine tracks one pending target spin at a time, so two would
 * overwrite each other mid-resolution.
 */
setDoubleFatePoolProvider((context) =>
  getAvailableAbilities(context.state).filter(
    (ability) => ability.id !== DOUBLE_FATE_ID && !ability.resolveTargetSpin,
  ),
);

export function selectWeightedAbility(state: GameState): AbilityDefinition | null {
  const available = getAvailableAbilities(state);
  if (available.length === 0) return null;

  return selectWeightedItem(
    available.map((ability) => ({ item: ability, weight: getAbilityWeight(state, ability) })),
  );
}
