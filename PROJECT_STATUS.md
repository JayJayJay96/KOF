# PROJECT_STATUS.md — KOF Current Development Status

# KOF — King of Fate

> This file is the current development handoff.
>
> It must be updated at the end of **every development session**.
>
> Keep this document concise and factual.  
> Product requirements belong in `PROJECT_SPEC.md`.  
> Development sequencing belongs in `DEVELOPMENT_ROADMAP.md`.

---

# Current Version

```text
Pre-MVP
```

# Current Pass

```text
PASS 1 — MVP
```

# Current Phase

```text
Phase 8 — Full-Game Validation          (NOT STARTED — requires a human)

Phase 7 — MVP Arcade Presentation       COMPLETE
Phase 6 — Host Safety & Persistence     COMPLETE
Phase 5 — Game Phases & Endgame         COMPLETE
Phase 4 — Advanced MVP Fate Abilities   COMPLETE
Phase 3 — Core Fate Ability System      COMPLETE
Phase 2 — Core Two-Wheel Game Loop      COMPLETE
Phase 1 — Main Wheel Vertical Slice     COMPLETE
Phase 0 — Project Foundation            COMPLETE
```

# Phase Status

```text
Phase 7 COMPLETE — the game has effects, sound and an arcade look.
Phase 8 NOT STARTED. It is a playtesting phase and cannot be completed
by an agent alone — see Next Tasks.
```

# Live Deployment

```text
https://kof-ten.vercel.app/
```

Publicly reachable, no Vercel Deployment Protection.
Auto-deploys from `main` on push (live ~15s after push).

# Current Objective

Every MVP feature is built. The roadmap now requires a deliberate stop:
**Phase 8 is playtesting, not coding.** Real games have to be played before the
Enhancement Pass begins.

---

# Repository

```text
GitHub   https://github.com/JayJayJay96/KOF
Branch   main
```

---

# Completed Before This Session

**Phases 0–2.** React 19 + TypeScript + Vite 8; pure reducer; reusable Canvas
wheel with deterministic landing; ability registry; shared attack flow.

**Phase 3.** Event queue that suspends on blocking events; status panel.

**Phase 4.** All eight MVP Fates, Death Mark as a status trigger, Hunter/Duel
as multi-step target-spin abilities.

**Phase 5.** Phase transitions, Sudden Death atmosphere, winner screen.

**Phase 6.** Undo (snapshots), versioned localStorage save/resume, event
history, host panel.

---

# Completed This Session

## Phase 7 — MVP Arcade Presentation

**No reducer logic changed.** Effects and audio are subscribers to events the
engine already emitted. The only engine additions were a `SET_AUDIO` action and
an optional `muted` flag, so audio preferences persist with the save.

### Audio — the asset blocker is gone

The previous handoff flagged audio as blocked on sourcing legally usable assets.
**Every cue is now synthesised at runtime** from oscillators and a deterministic
noise buffer:

- each sound is original work, satisfying PROJECT_SPEC.md §26;
- zero asset bytes in the bundle;
- the noise generator uses a fixed seed rather than `Math.random`, so a cue
  sounds identical on every playback (AGENTS.md §7.5).

Twelve cues: wheel tick, wheel stop, fate reveal, eliminate, shield block,
shield gain, death mark, hunter, duel, revive, phase change, winner.

`audio/audioManager.ts` is defensive throughout — a blocked context, a failed
cue or a missing Web Audio implementation leaves the game running silently.
An AudioContext stays suspended until a real gesture, so the first pointer or
key event unlocks it.

**The wheel's `onTick` callback, unused since Phase 1, is now the ticking sound.**

### Effects

- `effects/effectRegistry.ts` maps events to flash / shake / impact word.
- `effects/EffectLayer.tsx` renders them; `pointer-events: none` so it can never
  swallow a host click.
- Impact words: `K.O.`, `BLOCK`, `SHIELD`, `MARKED`, `REVIVE`, `TARGET`, `DUEL`.
- **Only elimination shakes.** If everything shook, nothing would read as impact.
- Shake is applied to the game scene, not the page root, so the host panel and
  its controls stay still (spec §28).

### Shared subscription

`hooks/useNewEvents.ts` reports only events appended since the last render, and
**resyncs without replaying when the history shrinks**. Without that, undoing an
elimination would re-fire the K.O. flash and sound.

### Theme

Angled panels and buttons via `clip-path`, a marquee-style accent rule under the
title, and per-phase accent colours carried by the `data-phase` hook added in
Phase 5.

### Host panel

Audio section added — mute toggle and volume slider. These were deliberately
omitted in Phase 6 because there was nothing to control.

---

# In Progress

Nothing. Phase 7 is closed and nothing was left half-written.

---

# Next Tasks

**Phase 8 — Full-Game Validation.** The roadmap is explicit that this phase is
mandatory and that development should stop here: *"Stop feature development
temporarily and play the game."*

**This phase cannot be completed by an agent.** It needs real games with real
people, and judgements about whether the game is *fun*. What an agent can do is
prepare and record; what it cannot do is decide that Revive is annoying.

Required test runs, per the roadmap: 5, 8, 12 and 15+ players.

Edge cases already verified in code but **not yet observed live by a human**:
repeated Again, Death Mark + Shield, Hunter + Shield, Duel + Shield, Revive with
one eliminated player, multiple Revives, Revive crossing a phase boundary,
Hunter with two players, Duel with two players, refresh during a game, undo
after elimination, undo after Revive.

Still genuinely untested anywhere: very long names, duplicate names, rapid
double clicks during animation, browser resize mid-game, and a real streamed
session at 1280×720.

Balance questions the roadmap wants answered from play, not theory: average game
duration, how quickly people die, whether Revive is annoying, whether Again
happens too often, whether Final Five drags, whether Sudden Death feels fair,
whether Duel is fun enough, which abilities generate the most reaction.

**Then Phase 9** — tag `v0.1.0-mvp` — and only after that the Enhancement Pass.

---

# Known Issues / Blockers

No blockers.

Non-blocking:

- **No automated tests.** The largest remaining gap, and it has grown every
  phase. The roadmap schedules them in Enhancement Phase 0, which is now the
  next coding work after playtesting.
- **No music.** `config.audio.music` exists but nothing plays a loop; the
  roadmap's Phase 7 audio list is SFX-only and phase music is Enhancement 7E.
- **"Clear save" during a live game is re-written by autosave** on the next
  action. Intended, but easy to mistake for a bug.
- **Fate Wheel segments are equal-sized** while selection is weighted. Open
  product decision from Phase 2 — the wheel still does not communicate that
  Eliminate is far likelier than Safe.
- **Duel has no VS scene.** Enhancement Phase 4 owns it.
- **PixiJS not used.** Correct: CSS/DOM effects have not become limiting, and
  Guardrail 4 says not to add it for fun. Enhancement Phase 7C is the decision
  point.

---

# Important Decisions Made This Session

1. **Audio is synthesised, not sourced.** This removed a blocker rather than
   deferring it again. Every cue is generated from oscillators and noise, which
   makes it original work under spec §26, costs zero bundle bytes, and means no
   licence audit is ever needed. The trade-off is that the sounds are
   deliberately simple and arcade-like rather than produced samples — worth
   revisiting in Enhancement 7D if the flavour needs more depth.
2. **Deterministic noise.** A fixed seed instead of `Math.random` keeps stray
   randomness out of the codebase and makes every playback identical.
3. **Only elimination shakes.** Impact has to be scarce to read as impact.
4. **The event subscription never replays on rewind.** Undo shrinks the history;
   replaying it would re-fire effects for events the host just undid.
5. **Shake targets the game scene, not the root** — spec §28 requires host
   controls not to shake.
6. **Audio settings live in `config`, not a separate store**, so they persist
   with the save and survive resume for free. `muted` is optional so
   pre-Phase-7 saves still load, with absent meaning unmuted — no version bump
   needed.
7. **Theme kept restrained.** Angled clipping and a marquee rule deliver the
   arcade read without the layered shadows and distortion that Enhancement
   Phase 7 owns. Phase 7's exit criterion is comprehension, not spectacle.

---

# Verification Performed

- `npm run build` (`tsc -b && vite build`) — **passes**, 62 modules, no type errors.
- `npm run lint` (oxlint) — **clean**.
- `npx prettier --check` — **all files conform**.
- No duplicate CSS rules left behind by the theme pass.

## Registries — exercised against the real modules

| Check | Result |
|---|---|
| Every ability outcome maps to an effect | PASS |
| Every ability outcome maps to a sound | PASS |
| `ATTACK_PLAYER` and `WAIT_FOR_HOST` are silent | PASS |
| Hunter and Duel target requests map to distinct cues | PASS |
| Only `ELIMINATE_PLAYER` sets `shake` | PASS |
| `PHASE_CHANGED` / `GAME_WON` have no impact effect (own overlays) | PASS |

## Audio manager

| Check | Result |
|---|---|
| All twelve cues render without throwing | PASS |
| Muting silences without throwing | PASS |
| An unknown cue name is a safe no-op | PASS |
| `unlockAudio` is safe to call with no gesture | PASS |

## Event subscription (the undo trap)

| Check | Result |
|---|---|
| Only newly appended events are delivered | PASS |
| Re-rendering the same history delivers nothing | PASS |
| **A shrinking history (undo) replays nothing** | PASS |
| Events appended after an undo are delivered once | PASS |

## Against the live deployment (https://kof-ten.vercel.app/)

Asset hash matched the local build.

- **`K.O.` impact word and screen shake both fired** during a real elimination.
- `TARGET` fired on a Hunter roll.
- Host panel sections: Game, Save, **Audio**, Players, Event history.
- Volume slider present; toggling Mute **persisted into the save**
  (`state.config.audio.muted: true`).
- Effect layer computed `pointer-events: none`.
- No page overflow, no console errors.

## Phase 7 exit criterion

> "A person watching the stream should understand what happened without needing
> the host to explain every state change."

Each outcome now announces itself three ways: an impact word, a distinct sound,
and a log line. **Met in construction — but this criterion is about a human
viewer, and confirming it is exactly what Phase 8 is for.**

---

# Files / Areas Changed

```text
src/audio/audioManager.ts               (new — synthesised cues)
src/audio/soundRegistry.ts              (new — event to sound)
src/effects/effectRegistry.ts           (new — event to effect)
src/effects/EffectLayer.tsx             (new)
src/hooks/useNewEvents.ts               (new — shared subscription)
src/hooks/useGameAudio.ts               (new)
src/hooks/useScreenEffects.ts           (new)

src/game/types/game.ts                  (audio.muted)
src/game/config/defaultConfig.ts        (muted default)
src/game/engine/reducer.ts              (SET_AUDIO)
src/components/MainWheel/MainWheel.tsx  (tick + stop audio)
src/components/FateWheel/FateWheel.tsx  (tick + stop audio)
src/components/GameScreen/GameScreen.tsx (effect layer, shake)
src/components/HostPanel/HostPanel.tsx  (audio controls)
src/app/App.tsx                         (audio subscriber, footer)
src/styles/globals.css                  (effects, shake, arcade theme)

PROJECT_STATUS.md
README.md
```

Commit: `33f3d06` — *feat: Phase 7 arcade presentation, effects and audio*

---

# Notes for Next Agent

**Read this first: the next phase is not a coding phase.**

DEVELOPMENT_ROADMAP.md Phase 8 says "Stop feature development temporarily and
play the game" and "Do not immediately begin Enhancement Pass without testing
the actual complete MVP". Every MVP feature now exists. The correct next action
is to help the user *play*, capture observations, and fix only what real games
expose — not to start Enhancement Phase 0.

If asked to continue coding regardless, the highest-value work that does not
skip ahead is **adding the test suite** (Enhancement Phase 0), because it
protects everything built so far and the engine is pure and ready for it.

Architecture boundaries are holding after seven phases:

- `src/game/` decides outcomes. Components render and dispatch.
- Randomness goes through `src/utils/random.ts`.
- Abilities emit events. Only `eventResolver.ts` changes state; only
  `eventQueue.ts` decides ordering.
- Every elimination goes through `attackPlayer()`.
- Undo wraps the reducer from outside; snapshots, never replay.
- **Effects and audio are subscribers.** Adding a cue or an effect means adding
  a registry entry, never touching the engine.

Phase 7 needed no reducer logic changes at all, which is the clearest signal yet
that the event vocabulary is carrying its weight.

If a new presentation feature seems to need an engine change, the missing piece
is almost certainly an event type, not a branch.

---

# Last Updated

```text
2026-08-08
```
