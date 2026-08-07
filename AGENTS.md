# AGENTS.md — KOF Development Instructions

# KOF — King of Fate

This file defines how any coding agent should work on this repository.

It is not a product requirements document.

Before changing code, every development session must read the source-of-truth files listed below and follow their authority order.

---

# 1. Source of Truth Hierarchy

Use this priority order whenever documents conflict:

1. `PROJECT_SPEC.md`
   - Defines **what the product is**
   - Defines gameplay rules
   - Defines MVP scope
   - Defines ability behaviour
   - Defines architecture intent
   - Defines UX expectations

2. `DEVELOPMENT_ROADMAP.md`
   - Defines **when features should be built**
   - Defines the current development pass
   - Defines the development phase order
   - Defines phase exit criteria

3. `AGENTS.md`
   - Defines **how development work should be performed**
   - Defines coding-agent behaviour
   - Defines documentation discipline
   - Defines architectural guardrails

4. `PROJECT_STATUS.md`
   - Defines **where development currently stands**
   - Defines the active phase
   - Defines what is complete
   - Defines what is in progress
   - Defines the next task
   - Defines known issues / blockers

If any document appears outdated or contradictory:

- Do not silently choose a different interpretation.
- Follow the higher-authority document.
- Record the discrepancy.
- Update the appropriate source-of-truth document if the change is confirmed.

---

# 2. Mandatory Session Startup

At the beginning of every development session:

1. Read `PROJECT_SPEC.md`.
2. Read `DEVELOPMENT_ROADMAP.md`.
3. Read `AGENTS.md`.
4. Read `PROJECT_STATUS.md`.
5. Identify:
   - current development pass,
   - current development phase,
   - current task,
   - known issues,
   - next exit criteria.

Before writing code, confirm internally:

```text
WHAT are we building?
WHAT phase are we in?
WHAT is already done?
WHAT is the next smallest useful task?
WHAT must not be built yet?
```

Do not start from memory alone when these files exist.

---

# 3. Mandatory Session Closeout

At the end of **every development session**, the agent must update `PROJECT_STATUS.md`.

This is mandatory even if:

- the task was small,
- only one bug was fixed,
- no phase was completed,
- work stopped midway,
- the user plans to continue immediately,
- no source code was committed.

`PROJECT_STATUS.md` must reflect the repository's actual state at session end.

At minimum update:

- `Last Updated`
- `Current Pass`
- `Current Phase`
- `Phase Status`
- `Completed This Session`
- `In Progress`
- `Next Tasks`
- `Known Issues / Blockers`
- `Important Decisions Made This Session`
- `Verification Performed`

If a requirement changed during the session:

- update `PROJECT_SPEC.md`.

If development order changed:

- update `DEVELOPMENT_ROADMAP.md`.

If a new permanent development rule was introduced:

- update `AGENTS.md`.

Do not put requirement changes only in `PROJECT_STATUS.md`.

---

# 4. Session Handoff Rule

The repository must be left in a state where another coding agent can continue without needing the previous conversation.

At session end, a new agent should be able to read:

```text
PROJECT_SPEC.md
DEVELOPMENT_ROADMAP.md
AGENTS.md
PROJECT_STATUS.md
```

and understand:

- what the game is,
- what is currently being built,
- what was just completed,
- what remains unfinished,
- what the next task is,
- whether anything is broken,
- what decisions were made.

If this is not true, the session is not properly closed out.

---

# 5. Development Phase Discipline

Work on the current roadmap phase only unless a later-phase change is genuinely required to prevent an architectural dead end.

Do not implement future features simply because they are convenient or interesting.

Examples:

Do not add:

- PixiJS during early MVP phases unless CSS/Canvas has proven insufficient.
- advanced Fate abilities before the common ability / attack system exists.
- full custom game editors before the MVP is playable.
- remote-controller networking during the frontend-only MVP.
- player portraits unless explicitly moved into scope.

When touching a later-phase concern for architecture reasons:

- implement only the minimum interface / abstraction needed,
- do not complete the later feature,
- record why the abstraction was added.

---

# 6. Vertical Slice Priority

Prefer:

```text
working end-to-end flow
```

over:

```text
many partially implemented systems
```

The first priority is to make the game playable from setup to winner.

Polish comes later.

If forced to choose between:

- a beautiful incomplete UI,
- or a basic complete gameplay flow,

choose the complete gameplay flow during the MVP pass.

---

# 7. Architecture Guardrails

These rules are permanent unless explicitly revised.

## 7.1 Game Engine owns game rules

Game Engine is responsible for:

- player eligibility,
- selected player,
- selected Fate,
- status changes,
- elimination,
- revival,
- phase transitions,
- winner detection,
- ability resolution.

React visual components must not independently decide game outcomes.

---

## 7.2 Wheels are renderers, not rule engines

Wheel components may:

- render segments,
- animate rotation,
- play wheel-specific visual feedback,
- report animation completion.

Wheel components must not:

- choose their own winner,
- eliminate players,
- add statuses,
- change phases,
- decide ability availability.

The result should be chosen by game logic before the visual wheel completes.

---

## 7.3 Effects do not mutate game rules

Effects may:

- flash,
- shake,
- animate,
- display overlays,
- trigger particles.

Effects must not directly:

- eliminate players,
- revive players,
- add Shield,
- add Death Mark,
- choose Fate.

Effects respond to Game Events.

---

## 7.4 Audio does not mutate state

Audio responds to events.

Audio must not control gameplay progression.

---

## 7.5 Randomness is centralised

Do not scatter `Math.random()` throughout components.

All randomness must go through shared random utilities.

Examples:

```ts
selectWeightedItem()
selectRandomPlayer()
shuffle()
```

This supports:

- testing,
- deterministic debugging,
- future seeded randomness.

---

## 7.6 Abilities are data-driven

New Fate abilities should use the common ability definition interface.

Every ability must define:

- identity,
- display name,
- icon,
- category,
- availability,
- phase weights,
- target rules,
- resolution,
- event output.

Avoid giant component-level switch statements.

---

## 7.7 Attack behaviour should be shared

Abilities that cause elimination pressure should reuse a common attack mechanism.

Examples:

- Eliminate
- Hunter
- Duel
- Death Mark
- future Double Kill

Shield interaction should not be reimplemented separately in every ability.

---

## 7.8 Persistent statuses require explicit lifecycle rules

Every persistent status must define:

- how it is acquired,
- how it is displayed,
- when it triggers,
- when it is removed,
- whether Shield interacts,
- whether Revive clears it,
- whether Fate Swap can move it,
- whether it persists across rounds.

---

# 8. UI / Game Flow Rules

Major gameplay actions remain host-controlled unless the Product Spec changes.

Do not auto-rush:

```text
Player Spin
→ Fate Spin
→ Resolve
→ Next Round
```

There should be room for reaction between major events.

Buttons should be state-aware and prevent conflicting actions.

Examples:

- Fate cannot spin before a player is selected.
- Main Wheel cannot spin while Fate is unresolved.
- Duplicate clicks must not queue duplicate spins.
- Host actions should be disabled while critical animations are resolving.

---

# 9. Event Queue Rule

Abilities should produce game events rather than directly orchestrating visual UI behaviour.

Example:

```text
ABILITY_SELECTED
SHOW_MESSAGE
REQUEST_TARGET_SPIN
TARGET_SELECTED
ATTACK_PLAYER
SHIELD_BLOCK
ELIMINATE_PLAYER
END_ABILITY
```

UI / effects / audio may react to these events.

Keep game resolution deterministic and inspectable.

---

# 10. MVP vs Enhancement Rule

The project has two deliberate passes:

```text
PASS 1 — MVP
PASS 2 — ENHANCEMENT
```

MVP goal:

> Complete playable game.

Enhancement goal:

> Polish, advanced mechanics, configurability, reliability, and arcade presentation.

Do not treat MVP release as project completion.

After MVP validation, development must explicitly proceed through the Enhancement Pass defined in `DEVELOPMENT_ROADMAP.md`.

---

# 11. Testing Expectations

Every meaningful game-rule change should be verified.

At minimum manually verify the affected flow.

When tests exist, add or update tests for logic changes.

High-priority logic to test:

- Shield blocks one attack.
- Death Mark triggers exactly once.
- Hunter excludes self.
- Duel excludes self.
- Revive only selects eliminated players.
- phase transitions.
- winner detection.
- weighted Fate selection.
- undo restores valid state.
- save/resume restores valid state.

Do not mark a roadmap phase complete without satisfying its exit criteria.

---

# 12. Definition of Done for a Task

A task is done when:

```text
IMPLEMENTED
+
TYPE-CHECKS / BUILDS
+
MANUALLY VERIFIED
+
NO KNOWN BLOCKING REGRESSION
+
STATUS DOCUMENT UPDATED
```

If a task is incomplete, mark it as incomplete.

Do not describe partially working behaviour as complete.

---

# 13. Definition of Done for a Phase

A phase is complete only if:

1. all required phase tasks are implemented,
2. phase exit criteria are satisfied,
3. no known blocker prevents the next phase,
4. deployed preview/build works where applicable,
5. `PROJECT_STATUS.md` is updated,
6. the next phase is explicitly identified.

---

# 14. Scope Change Rule

When the user introduces a new idea:

First classify it as:

```text
A. Current-phase requirement
B. Future MVP requirement
C. Enhancement requirement
D. Nice-to-have / backlog
```

Do not automatically implement it immediately.

If it changes product behaviour:

- update `PROJECT_SPEC.md`.

If it changes development sequencing:

- update `DEVELOPMENT_ROADMAP.md`.

If it changes only current progress:

- update `PROJECT_STATUS.md`.

---

# 15. Requirement Conflict Rule

If implementation uncovers ambiguity in gameplay rules:

Do not silently invent behaviour if the decision has meaningful gameplay impact.

Prefer:

1. check `PROJECT_SPEC.md`,
2. check existing tests / implementation,
3. identify the conflict,
4. make the safest minimal assumption only if work can continue without locking the design,
5. record the assumption in `PROJECT_STATUS.md`,
6. update `PROJECT_SPEC.md` once the final rule is confirmed.

Minor implementation details may use reasonable engineering judgement.

---

# 16. Refactoring Rule

Refactor when it:

- removes real duplication,
- improves architecture required by current work,
- makes the next roadmap step safer,
- fixes a clear maintainability problem.

Do not refactor unrelated working code just because a different structure is personally preferred.

Avoid broad rewrites during feature work unless necessary.

---

# 17. Dependency Rule

Before adding a new dependency, ask:

- Is it required?
- Is there already an existing solution in the project?
- Is native browser / React functionality sufficient?
- Does it belong in the current phase?
- Does it materially simplify the implementation?

Do not add heavy dependencies casually.

Especially:

- PixiJS is an Enhancement checkpoint decision.
- Phaser / Unity / Godot are not part of the current architecture.
- Backend services are not part of MVP unless requirements change.

---

# 18. Persistence Rule

MVP persistence uses `localStorage`.

Any saved-state format should eventually include a schema version.

Do not couple core Game Engine logic directly to localStorage APIs.

Use a storage abstraction.

---

# 19. Styling Rule

Visual direction:

> Modern UI with classic arcade fighting-game flavour.

Do not directly reproduce proprietary:

- KOF layouts,
- logos,
- sprites,
- characters,
- sound effects.

The project name KOF means:

> King of Fate

Prioritise:

- readability,
- stream visibility,
- bold typography,
- impact,
- clear hierarchy.

---

# 20. Commit / Change Hygiene

When possible, keep changes logically grouped.

A change should be explainable as one unit, for example:

```text
Implement deterministic Main Wheel landing
Add Shield status and shared attack resolution
Add Phase Resolver
Fix Death Mark + Shield interaction
```

Avoid mixing unrelated visual redesign, game-rule changes, and refactors in one task.

---

# 21. PROJECT_STATUS.md Update Format

At the end of every session, update these sections:

```text
Current Version
Current Pass
Current Phase
Phase Status
Current Objective

Completed Before This Session
Completed This Session
In Progress
Next Tasks

Known Issues / Blockers
Important Decisions Made This Session
Verification Performed

Files / Areas Changed
Notes for Next Agent
Last Updated
```

Keep it concise.

`PROJECT_STATUS.md` is a handoff document, not a diary.

---

# 22. Final Rule

A coding session is not complete until the repository is left understandable to the next agent.

The minimum handoff requirement is:

```text
CODE STATE IS CLEAR
+
CURRENT PHASE IS CLEAR
+
NEXT TASK IS CLEAR
+
KNOWN PROBLEMS ARE CLEAR
+
PROJECT_STATUS.md IS UPDATED
```
