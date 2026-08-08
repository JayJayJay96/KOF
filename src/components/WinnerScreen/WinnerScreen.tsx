/**
 * Winner overlay — PROJECT_SPEC.md §5C / §35 "End Game".
 *
 * ```text
 * KING OF FATE
 *   JASON
 * WINNER
 * ```
 *
 * Confetti is generated deterministically from the piece index rather than
 * Math.random. Two reasons: AGENTS.md §7.5 keeps stray randomness out of the
 * codebase, and deterministic offsets mean the celebration looks identical on
 * every replay of the same game.
 *
 * No victory sound yet — see PROJECT_STATUS.md. The audio manager is Phase 7,
 * and no legally usable asset exists in the repo (spec §26).
 *
 * Handles the no-winner edge case (everyone eliminated) rather than asserting
 * a winner exists.
 */

const CONFETTI_COUNT = 48;
const CONFETTI_COLORS = ['#ffb020', '#ff4d4d', '#4dd2ff', '#7bff9e', '#e8ecf3'];

type WinnerScreenProps = {
  winnerName: string | null;
  onNewGame: () => void;
};

export function WinnerScreen({ winnerName, onNewGame }: WinnerScreenProps) {
  return (
    <div className="winner" role="dialog" aria-modal="true" aria-label="Game over">
      <div className="winner__confetti" aria-hidden="true">
        {Array.from({ length: CONFETTI_COUNT }, (_, i) => (
          <span
            key={i}
            className="winner__confetti-piece"
            style={{
              left: `${(i * 100) / CONFETTI_COUNT}%`,
              backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              animationDelay: `${(i % 12) * 0.18}s`,
              animationDuration: `${2.6 + (i % 5) * 0.45}s`,
              transform: `rotate(${(i % 7) * 26}deg)`,
            }}
          />
        ))}
      </div>

      <div className="winner__panel">
        {winnerName ? (
          <>
            <p className="winner__crown">KING OF FATE</p>
            <p className="winner__name">{winnerName}</p>
            <p className="winner__label">WINNER</p>
          </>
        ) : (
          <>
            <p className="winner__crown">NO SURVIVORS</p>
            <p className="winner__label">Everybody lost</p>
          </>
        )}

        <button type="button" className="button button--primary button--large" onClick={onNewGame}>
          New Game
        </button>
      </div>
    </div>
  );
}
