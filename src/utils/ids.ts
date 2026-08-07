/**
 * Stable unique identifiers.
 *
 * Player names are display-only and may be duplicated (PROJECT_SPEC.md §38),
 * so every player needs an id independent of its name.
 */

let fallbackCounter = 0;

export function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  fallbackCounter += 1;
  return `${prefix}_${fallbackCounter.toString(36)}`;
}

export function createPlayerId(): string {
  return createId('player');
}
