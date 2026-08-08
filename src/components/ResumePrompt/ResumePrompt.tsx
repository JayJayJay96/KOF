/**
 * "Previous game detected" — PROJECT_SPEC.md §24.
 *
 * Shown when a save survives a reload. The host chooses; nothing is restored
 * automatically, because silently resuming would be wrong for the common case
 * of simply reopening the tab to start a fresh game.
 *
 * Discarding clears the save, so declining once does not keep re-prompting.
 */

type ResumePromptProps = {
  savedAt: string;
  playerCount: number;
  round: number;
  onResume: () => void;
  onDiscard: () => void;
};

function formatSavedAt(savedAt: string): string {
  if (!savedAt) return 'earlier';
  const when = new Date(savedAt);
  if (Number.isNaN(when.getTime())) return 'earlier';
  return when.toLocaleString();
}

export function ResumePrompt({
  savedAt,
  playerCount,
  round,
  onResume,
  onDiscard,
}: ResumePromptProps) {
  return (
    <div className="resume" role="dialog" aria-modal="true" aria-label="Previous game found">
      <div className="resume__panel">
        <p className="resume__title">Previous game found</p>
        <p className="resume__detail">
          Round {round} · {playerCount} players · saved {formatSavedAt(savedAt)}
        </p>
        <div className="resume__actions">
          <button type="button" className="button button--primary button--large" onClick={onResume}>
            Resume Game
          </button>
          <button type="button" className="button" onClick={onDiscard}>
            Start New Game
          </button>
        </div>
      </div>
    </div>
  );
}
