/**
 * The live "what is happening right now" line.
 *
 * The readout above it answers WHO and WHAT. This answers SO WHAT — the part a
 * viewer joining mid-round cannot infer from two nouns. Three examples the host
 * asked for, and what produces each:
 *
 * ```text
 * "Ali is up — 🧱 behind a Wall, 💀 already Marked."                 board state
 * "Jason becomes the Hunter — spin for a target."                     a suspended ability
 * "Jason hunts Chris · ☠ Chris eliminated · 🧱 Jason gains a Wall"   the burst
 * ```
 *
 * Everything here is DERIVED. Nothing new is stored, nothing is decided, and no
 * ability is named in a switch: the forecast for a revealed Fate comes from that
 * ability's own `describeStakes`, so a new Fate brings its own narration with it
 * (AGENTS.md §7.6).
 */

import type { GameState } from '../types/game';
import type { Player } from '../types/player';
import { buildGameContext, getAbility } from '../abilities';
import { getAlivePlayers, getCurrentPlayer, neighboursIn } from '../engine/selectors';
import { describeEvent } from '../events/eventLog';

/** How many recent lines the resolution burst may show at once. */
const MAX_BURST_LINES = 3;

const BURST_SEPARATOR = ' · ';
/**
 * The line under the wheels.
 *
 * Two parts: what this round is about, and — if a charge is ticking anywhere —
 * where it is and who is standing beside it.
 *
 * The charge line survives even when the round line is suppressed mid-spin.
 * Going silent during a spin exists to avoid spoiling a result the engine has
 * already chosen; a live countdown spoils nothing, it is already painted on the
 * wheel rim, and the spin is exactly when it is most worth saying out loud.
 */
export function describeSituation(state: GameState): string | null {
  const round = describeRound(state);
  const charge = describeLiveCharge(state);

  if (round === null) return charge;
  return charge ? `${round}  ${charge}` : round;
}

function describeRound(state: GameState): string | null {
  switch (state.screenState) {
    // Nothing is known yet. Any line at all would spoil a result the engine has
    // already chosen but the wheel has not reached.
    //
    // The exception is a TARGET spin, which reuses the Main Wheel: the hunt is
    // already public, and going blank for six seconds mid-story reads as the
    // screen losing its place. TARGET_SELECTED is only appended once the wheel
    // lands, so the burst cannot name the prey early.
    case 'spinning_player':
      return state.pendingTargetSpin !== null ? describeBurst(state) : null;

    case 'spinning_both':
      return null;

    // The player is revealed and the Fate Wheel is still crawling. This is the
    // best moment in the round for board state: naming what they are carrying
    // says nothing about the Fate, so it builds the stakes without spoiling
    // anything. 'player_selected' is the sequential-spin equivalent, reached
    // only when a dual spin was skipped.
    case 'spinning_fate':
    case 'player_selected':
      return describeStanding(getCurrentPlayer(state));

    // The Fate has landed but the host has not resolved it. This is the moment
    // where "Eliminate, but he has a Wall" is worth saying out loud.
    case 'fate_selected':
      return describeStakes(state);

    // An ability is suspended waiting for a target spin (Hunter, Duel).
    case 'special_event': {
      const pending = describeBurst(state);
      return pending ? `${pending} — spin for a target.` : 'Spin for a target.';
    }

    default:
      return describeBurst(state);
  }
}

/** What the selected player brings to the wheel. */
function describeStanding(player: Player | null): string | null {
  if (!player) return null;

  const carried: string[] = [];
  if (player.wall > 0) carried.push('🧱 behind a Wall');
  if (player.deathMark) carried.push('💀 already Marked');
  if (player.c4Fuse !== undefined) carried.push(`🧨 carrying the charge, ${player.c4Fuse} left`);

  return carried.length > 0
    ? `${player.name} is up — ${carried.join(', ')}.`
    : `${player.name} is up — nothing protecting them.`;
}

/**
 * A live charge, wherever it is sitting.
 *
 * Appended to whatever the round is otherwise about, because a countdown the
 * whole table is following should not vanish from the commentary on the rounds
 * that happen to be about someone else — which was most of them.
 */
function describeLiveCharge(state: GameState): string | null {
  const holder = state.players.find(
    (player) => player.status === 'alive' && player.c4Fuse !== undefined,
  );
  if (!holder) return null;

  const beside = neighboursIn(getAlivePlayers(state), holder.id)
    .map((player) => player.name)
    .join(' and ');

  const radius = beside ? `, and ${beside} beside them` : '';
  return `🧨 ${holder.c4Fuse} on ${holder.name}${radius}.`;
}

/**
 * What the revealed Fate is about to do, given the board.
 *
 * Deliberately a forecast rather than a result: it states only what is already
 * visible on the wheel rims and in the status panel, so it builds anticipation
 * without revealing anything the host has not resolved yet.
 */
function describeStakes(state: GameState): string | null {
  const ability = getAbility(state.currentAbilityId);
  const playerId = state.currentPlayerId;
  if (!ability || playerId === null) return null;

  const stakes = ability.describeStakes?.(buildGameContext(state), playerId);
  if (stakes) return stakes;

  const player = getCurrentPlayer(state);
  return player ? `${ability.name} — ${player.name}.` : ability.name;
}

/**
 * The last few narration lines of the current round, oldest first.
 *
 * A single "latest message" was not enough: Hunter's payoff is three events —
 * the hunt, the kill, the bounty — and showing only the last one loses exactly
 * the causality the host wanted to read on screen.
 *
 * The scan stops at PLAYER_SELECTED or a round boundary, so narration never
 * bleeds from one round into the next. Blocking events are invisible here (they
 * produce no line), which is what lets the burst grow naturally as the host
 * clicks Continue through a multi-step ability.
 */
function describeBurst(state: GameState): string | null {
  const lines: string[] = [];

  for (let i = state.history.length - 1; i >= 0; i -= 1) {
    const { event } = state.history[i];
    if (event.type === 'ROUND_STARTED' || event.type === 'PLAYER_SELECTED') break;

    const line = describeEvent(event, state.players);
    if (line === null) continue;

    lines.push(line);
    if (lines.length >= MAX_BURST_LINES) break;
  }

  if (lines.length === 0) return null;
  return lines.reverse().join(BURST_SEPARATOR);
}
