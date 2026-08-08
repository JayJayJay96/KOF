/**
 * Full-screen phase-transition title.
 *
 * PROJECT_SPEC.md §10 supplies the wording; DEVELOPMENT_ROADMAP.md Phase 5 asks
 * only for a simple overlay at this stage — the arcade typography treatment is
 * Enhancement Phase 7A.
 *
 * Non-interactive by design: it must never swallow a host click, so it is
 * pointer-events:none in CSS and carries no controls.
 */

type PhaseAnnouncementProps = {
  title: string | null;
};

export function PhaseAnnouncement({ title }: PhaseAnnouncementProps) {
  if (!title) return null;

  return (
    <div className="phase-announcement" role="status" aria-live="assertive">
      <p className="phase-announcement__title">{title}</p>
    </div>
  );
}
