# KOF — King of Fate
# Phase-by-Phase Development Roadmap

> This roadmap is intentionally split into **two complete development passes**.
>
> **Pass 1 — MVP:** build the smallest complete version that can start a game, play through every phase, and reach a winner.
>
> **Pass 2 — Enhancement Pass:** go back through the same product areas again and improve presentation, configurability, advanced mechanics, resilience, and game feel.
>
> **Important rule:** finishing MVP is **not** the end of development.  
> After MVP acceptance, explicitly run the **Phase 1 → Final Phase Enhancement Pass** before calling the project feature-complete.

---

# 1. Development Philosophy

The project should follow this rule:

```text
MAKE IT WORK
    ↓
MAKE IT COMPLETE
    ↓
PLAY A FULL GAME
    ↓
MAKE IT FEEL GOOD
    ↓
MAKE IT FLEXIBLE
    ↓
MAKE IT HARD TO BREAK
```

Do not attempt to build final-quality animations, advanced Fate abilities, full customisation, or PixiJS-heavy effects before the basic game loop works.

Every phase should leave the project in a testable state.

The first major milestone is not:

> "the wheel looks good"

It is:

> "a host can start with a player list and successfully play the entire game until one winner remains."

---

# 2. Overall Roadmap

```text
PASS 1 — MVP
────────────────────────────────────

Phase 0   Project Foundation
Phase 1   Main Wheel Vertical Slice
Phase 2   Core Game Loop
Phase 3   Core Fate Abilities
Phase 4   Advanced MVP Fate Abilities
Phase 5   Game Phases & Endgame
Phase 6   Host Safety & Persistence
Phase 7   MVP Arcade Presentation
Phase 8   Full-Game Validation
Phase 9   MVP Release


PASS 2 — ENHANCEMENT
────────────────────────────────────

Enhancement 0   Technical Cleanup
Enhancement 1   Wheel Polish
Enhancement 2   Game Flow Polish
Enhancement 3   Ability Expansion
Enhancement 4   Special Scenes & Advanced Fate
Enhancement 5   Phase Balancing & Game Modes
Enhancement 6   Advanced Host Controls
Enhancement 7   Arcade Effects / Audio / PixiJS
Enhancement 8   Reliability & Playtesting
Enhancement 9   Feature-Complete Release
```

---

# 3. PASS 1 — MVP

---

# Phase 0 — Project Foundation

## Goal

Create the codebase and game architecture before implementing flashy UI.

At the end of this phase, there does not need to be a real game yet.

The important result is that the code structure supports the game we intend to build.

## Tasks

### Project setup

Create:

```text
React
TypeScript
Vite
ESLint
Prettier
```

Configure:

- Vercel deployment.
- development environment.
- build command.
- production build.
- basic responsive root layout.

### Core folders

Initial structure:

```text
src/
├── components/
├── game/
│   ├── abilities/
│   ├── engine/
│   ├── events/
│   ├── phases/
│   ├── config/
│   └── types/
├── effects/
├── audio/
├── hooks/
├── storage/
├── utils/
└── styles/
```

Do not over-engineer unused folders.

### Define core types

At minimum:

```ts
Player
GameState
GamePhase
GameScreenState
AbilityDefinition
GameEvent
GameConfig
```

### Build random utility

All randomness should go through one module.

Example APIs:

```ts
randomInt()
randomItem()
weightedRandom()
randomEligiblePlayer()
```

Do not scatter direct `Math.random()` calls through components.

### Initial game state

Create a minimal working state containing:

```ts
players
round
phase
screenState
currentPlayerId
currentAbilityId
history
winnerId
```

### Minimal Game Engine

Create basic functions/reducer actions for:

```text
START_GAME
SELECT_PLAYER
SELECT_ABILITY
ELIMINATE_PLAYER
NEXT_ROUND
RESET_GAME
```

No animation logic belongs here.

### Temporary debug UI

Create a deliberately simple temporary developer panel that can:

- add several dummy players,
- select a player,
- eliminate player,
- reset state.

This is disposable scaffolding.

## Phase 0 Exit Criteria

Phase 0 is complete when:

- project builds successfully,
- project deploys successfully to Vercel,
- GameState exists independently from UI,
- reducer/engine can modify player state,
- random utility exists,
- refresh does not produce TypeScript/runtime errors.

## Do NOT add yet

- advanced art,
- Fate animations,
- sound packs,
- PixiJS,
- Duel scene,
- custom game editor.

---

# Phase 1 — Main Wheel Vertical Slice

## Goal

Get one real wheel working inside React.

This phase proves that the existing wheel concept can be ported cleanly into the new architecture.

## Main Wheel requirements

Build a reusable Wheel component.

Suggested API:

```tsx
<Wheel
  entries={entries}
  selectedId={selectedId}
  spinning={spinning}
  onSpinComplete={...}
/>
```

The component should not choose its own winner.

The Game Engine chooses the result first.

The wheel animates toward that result.

## Required features

- Canvas rendering.
- responsive sizing.
- clear inward-facing pointer.
- segment labels.
- natural acceleration.
- natural deceleration.
- tick feedback.
- deterministic landing on selected entry.
- disable input while spinning.

## Player setup screen

Add MVP player entry:

- multiline paste.
- one player per line.
- add/remove player.
- Start Game button.

Example:

```text
Jason
Amy
Kelvin
Daniel
Han
```

## Main game shell

Create a simple screen with:

```text
KOF — KING OF FATE

Round 1
Alive 15 / 15

[ MAIN WHEEL ]

[ SPIN PLAYER ]
```

Do not spend time on final artwork.

## Selection flow

```text
Host clicks SPIN PLAYER
↓
Engine chooses eligible player
↓
Wheel animates
↓
Selected player is shown
↓
Game waits
```

## Phase 1 Exit Criteria

A host can:

1. enter players,
2. start the game,
3. spin the Main Wheel,
4. see it land correctly on the Game Engine result,
5. spin repeatedly without state corruption.

## Development checkpoint

Deploy a working preview.

This is the first useful technical prototype.

---

# Phase 2 — Core Two-Wheel Game Loop

## Goal

Implement the defining mechanic:

```text
WHO?
↓
WHAT FATE?
```

By the end of this phase, the game should already feel recognisably like King of Fate even with minimal styling.

## Fate Wheel

Create the Fate Wheel using the same reusable wheel engine where possible.

It should visually be smaller than the Main Wheel.

## Initial Fate pool

Use only four simple abilities:

```text
Eliminate
Wall
Safe
Again
```

Do not implement Hunter / Duel / Revive yet.

## State flow

Implement:

```text
IDLE
↓
SPINNING_PLAYER
↓
PLAYER_SELECTED
↓
WAITING_FOR_FATE
↓
SPINNING_FATE
↓
FATE_SELECTED
↓
RESOLVING
↓
ROUND_COMPLETE
↓
IDLE
```

## Host-controlled pauses

Do not auto-chain major actions.

Example:

```text
SPIN PLAYER
↓
Jason selected

[ SPIN FATE ]
↓
Wall selected

[ RESOLVE ]
↓
Jason gets Wall

[ NEXT ROUND ]
```

The exact number of buttons may later be reduced, but the first implementation should prioritise clarity.

## Input locking

Prevent:

- spinning Main Wheel while Fate is unresolved,
- spinning Fate before a player exists,
- double-click starting multiple animations,
- conflicting actions while an event is resolving.

## Phase 2 Exit Criteria

A complete round works:

```text
select player
→ select fate
→ resolve fate
→ update state
→ next round
```

All four starter abilities work.

---

# Phase 3 — Core Fate Ability System

## Goal

Turn Fate abilities into a proper extensible system instead of hard-coded UI cases.

## Ability registry

Create:

```ts
abilityRegistry
```

Each Fate defines:

```ts
id
name
icon
category
isAvailable()
getWeight()
resolve()
```

## Implement core MVP abilities properly

### Eliminate

- attacks current player.
- Wall blocks it.
- otherwise player becomes eliminated.

### Wall

- grants one Wall.
- MVP max stack = 1.

### Safe

- no harmful state change.
- still generates an event/history entry.

### Again

- current player remains selected.
- host spins Fate again.
- Main Wheel is not spun again.

## Attack abstraction

Create one common attack flow.

Example:

```ts
attackPlayer(playerId, source)
```

It handles:

```text
Wall?
    YES → consume Wall → survive
    NO  → eliminate
```

Future abilities such as Hunter, Duel, Death Mark and Double Kill must reuse this flow.

## Status display

Add simple player list:

```text
Jason 🧱
Amy
Kelvin
Daniel
```

Eliminated players may appear in a separate section.

## Basic Event Queue

Introduce a minimal event queue.

Example:

```text
ABILITY_SELECTED
SHOW_RESULT
ADD_WALL
END_ROUND
```

It does not need advanced animation choreography yet.

The purpose is architectural separation.

## Phase 3 Exit Criteria

- adding a new ability does not require editing the Wheel component,
- all current abilities resolve through the Game Engine,
- Wall can block Eliminate,
- Again correctly loops back to Fate selection,
- status display reflects GameState.

---

# Phase 4 — Advanced MVP Fate Abilities

## Goal

Add the abilities that give King of Fate its personality.

Implement one ability at a time and test it before starting the next.

---

## Phase 4A — Death Mark

Implement:

```text
💀 Death Mark
```

Rule:

- selected player receives Death Mark,
- next time Main Wheel selects that player:
  - do not spin Fate,
  - Death Mark activates,
  - attack that player,
  - remove Death Mark.

Wall interaction:

```text
Death Mark consumed
Wall consumed
Player survives
```

Test:

- mark,
- spin multiple rounds,
- marked player selected,
- activation occurs exactly once.

---

## Phase 4B — Hunter

Implement:

```text
🎯 Hunter
```

Flow:

```text
Jason selected
↓
Hunter
↓
Jason becomes Hunter
↓
Host clicks SPIN TARGET
↓
Main Wheel selects Kelvin
↓
Jason attacks Kelvin
```

Rules:

- Hunter cannot target self.
- target must be alive.
- Wall can block.
- target spin uses a temporary eligible pool.

---

## Phase 4C — Revive

Implement:

```text
❤️ Revive
```

Rules:

- unavailable if nobody is eliminated.
- revive one random eliminated player.
- revived player returns:
  - alive,
  - Wall = 0,
  - Death Mark = false.

Track:

```ts
revivedCount
```

---

## Phase 4D — Duel

Implement:

```text
⚔ Duel
```

Flow:

```text
Amy selected
↓
Duel
↓
select opponent
↓
Amy VS Jason
↓
Host starts duel
↓
50 / 50 result
↓
loser receives attack
```

For MVP the Duel itself can use a simple two-entry wheel.

No elaborate VS animation required yet.

## Phase 4 Exit Criteria

All eight MVP abilities function:

```text
Eliminate
Wall
Safe
Again
Death Mark
Hunter
Revive
Duel
```

Full games can already produce meaningful variety.

---

# Phase 5 — Game Phases & Endgame

## Goal

Make the game escalate naturally and finish reliably.

---

## Phase 5A — Automatic phase resolver

Implement:

```text
CHAOS
DANGER
BLOODBATH
FINAL FOUR
SUDDEN DEATH
```

Default thresholds:

```text
Danger        alive ≤ 70% of the starting roster
Bloodbath     alive ≤ 40% of the starting roster
Final Four    alive ≤ 4
Sudden Death  alive ≤ 2
```

The upper bands are a share of the starting roster; the endgame bands are absolute counts. Enhancement Phase 3a replaced the original all-absolute thresholds, which put every game under 12 players into DANGER from round one. BLOODBATH and the FINAL FIVE → FINAL FOUR rename landed in the same change. See PROJECT_SPEC.md §10.

## Phase-specific Fate pools

Each phase should change weights and available abilities.

Ability availability must be calculated before every Fate spin.

## Phase transitions

When a threshold is crossed:

```text
PHASE_CHANGED
```

For MVP show a simple overlay:

```text
⚠ DANGER MODE ⚠
```

No final visual polish required yet.

## Revival phase recalculation

MVP rule:

Phase can move backward after Revive.

Example:

The starting roster has to be stated — with share-based bands an alive count
alone no longer determines a phase.

```text
Roster 13, 5 alive  →  5/13 = 0.385 ≤ 0.4  →  BLOODBATH
↓
Revive
6 alive             →  6/13 = 0.462        →  DANGER
```

Revive's Bloodbath weight is 2, so it is genuinely drawable there. At 4 alive it
is not: that is always Final Four, where its weight is 0.

Keep this until playtesting indicates otherwise.

---

## Phase 5B — Sudden Death

When two players remain:

- enter dedicated Sudden Death state,
- use reduced Fate pool,
- prevent abilities that create broken endings.

---

## Phase 5C — Winner

When one player remains:

```text
GAME_WON
```

Show:

```text
KING OF FATE

JASON

WINNER
```

MVP winner presentation:

- overlay,
- confetti,
- victory sound.

## Phase 5 Exit Criteria

Starting from a normal player list, the game can reach one winner without manual state editing.

This is the first point where the product is technically a complete game.

---

# Phase 6 — Host Safety & Persistence

## Goal

Make the game usable during a real streamed session.

---

## Phase 6A — Event History

Log important events:

```text
Round 01
Jason → Wall

Round 02
Amy → Eliminated

Round 03
Kelvin → Hunter
Kelvin targeted Daniel
Daniel blocked with Wall
```

---

## Phase 6B — Undo

Create snapshot history.

Before meaningful state mutation:

```ts
historyStack.push(gameStateSnapshot)
```

Host can:

```text
UNDO LAST ACTION
```

Minimum:

- one-step undo.

Preferred:

- multi-step undo.

---

## Phase 6C — Local Save

Persist:

```text
players
round
phase
statuses
history
configuration
current game state
```

Reload behaviour:

```text
Previous Game Found

[ RESUME ]
[ NEW GAME ]
```

---

## Phase 6D — Host Panel

Add hidden/collapsible Host Panel.

MVP controls:

```text
Add Player
Remove Player
Reset Game
Undo
Save
Fullscreen
Audio Volume
```

Optional shortcut:

```text
Ctrl + Shift + H
```

## Phase 6 Exit Criteria

The host can recover from:

- an accidental action,
- a browser refresh,
- a minor gameplay mistake,

without restarting the entire session.

---

# Phase 7 — MVP Arcade Presentation

## Goal

Give the MVP enough personality that it no longer looks like an engineering prototype.

Do not chase final-quality arcade presentation yet.

## Visual theme

Implement first arcade pass:

- dark modern background,
- bold angled panels,
- strong typography,
- high contrast,
- Main Wheel visually dominant,
- Fate Wheel secondary,
- clear active/inactive state.

## MVP effect registry

Map events to simple effects.

### Eliminate

```text
flash
→ shake
→ K.O.
```

### Wall

```text
impact
→ block flash
→ WALL
```

### Death Mark

```text
dark flash
→ skull
```

### Hunter

```text
target cue
```

### Duel

```text
VS overlay
```

### Phase

```text
full-screen phase title
```

### Winner

```text
confetti
→ victory sound
```

## MVP audio

Required:

- wheel tick,
- wheel stop,
- Fate result impact,
- Wall block,
- Eliminate / KO,
- phase transition,
- winner horn/sting.

Use legally usable assets only.

## Phase 7 Exit Criteria

A person watching the stream should understand what happened without needing the host to explain every state change.

---

# Phase 8 — Full-Game Validation

## Goal

Stop feature development temporarily and play the game.

This phase is mandatory.

Do not immediately begin Enhancement Pass without testing the actual complete MVP.

## Required test runs

Run multiple simulated games:

```text
5 players
8 players
12 players
15+ players
```

Use both normal and intentionally awkward scenarios.

## Edge-case checklist

Test:

- repeated Again.
- Death Mark + Wall.
- Hunter + Wall.
- Duel + Wall.
- Revive with one eliminated player.
- multiple Revives.
- Revive crossing phase boundary.
- Hunter with two players.
- Duel with two players.
- refresh during a game.
- undo after elimination.
- undo after Revive.
- very long names.
- duplicate names.
- Chinese names.
- Vietnamese names.
- emoji names.
- rapid double clicks.
- resizing browser.
- streamed 1280×720.
- 1920×1080.

## Balancing observations

Record:

- average game duration,
- how quickly people die,
- whether Revive is annoying,
- whether Final Four drags,
- whether Sudden Death feels fair,
- whether Duel is fun enough,
- which abilities generate the most reaction.

Do not optimise only from theory.

---

# Phase 9 — MVP Release

## Goal

Create the first stable version that can be used for a real session.

Suggested tag:

```text
v0.1.0-mvp
```

## MVP Definition of Done

The MVP is done only when:

- full game is playable,
- all eight MVP Fates work,
- game phases work,
- winner flow works,
- host pauses work,
- undo works,
- save/resume works,
- core audio works,
- no known game-breaking bug remains,
- a complete test game has been run.

---

# IMPORTANT MILESTONE REMINDER

# DO NOT STOP HERE.

After MVP is stable:

> **Run a second complete development pass through the project.**

The second pass should revisit the same product areas in order.

The objective changes from:

```text
"Does it work?"
```

to:

```text
"Does it feel polished, configurable, dramatic, and robust?"
```

Do not randomly add advanced features across the codebase.

Follow the Enhancement Pass phase by phase.

---

# 4. PASS 2 — ENHANCEMENT PASS

---

# Enhancement Phase 0 — Technical Cleanup

## Goal

Clean the MVP architecture before expanding it.

## Tasks

Review:

- duplicated logic,
- oversized components,
- ability registry,
- Game Engine boundaries,
- event queue design,
- random utility,
- state snapshots,
- TypeScript types,
- localStorage schema.

## Add tests

Prioritise unit tests for Game Engine behaviour:

```text
Wall blocks attack
Death Mark triggers once
Hunter excludes self
Duel excludes self
Revive only uses eliminated pool
Winner detection
Phase transitions
Weighted Fate selection
```

## Version persistence

Add schema version:

```ts
saveVersion
```

Allow future migration of old save states.

---

# Enhancement Phase 1 — Wheel Polish

## Goal

Upgrade both wheels from "functional" to "signature KOF mechanic."

## Improvements

- better wheel typography.
- adaptive text sizing.
- improved segment rendering.
- more natural easing.
- richer tick audio.
- spin anticipation.
- stop impact.
- slight bounce / recoil.
- wheel glow based on state.
- inactive Fate Wheel treatment.
- phase-dependent wheel skin.
- stronger pointer design.
- better resize handling.

## Optional advanced features

- configurable spin duration.
- configurable animation speed.
- seeded random mode for debugging.
- debug display showing actual selected result.
- smoother weighted segment layout.

---

# Enhancement Phase 2 — Game Flow Polish

## Goal

Improve pacing and host interaction.

## Review every pause

Evaluate:

```text
Player selected
Fate selected
Ability reveal
Target selected
Attack resolution
Round end
```

Decide where host control adds humour/suspense and where it adds unnecessary clicking.

## Contextual main action

Instead of many permanent buttons, create one main action that changes:

```text
SPIN PLAYER
SPIN FATE
SPIN TARGET
START DUEL
RESOLVE
CONTINUE
NEXT ROUND
```

## Presentation pacing

Add:

- anticipation delay,
- stop hold,
- reveal timing,
- skip animation option,
- fast-forward for testing.

---

# Enhancement Phase 3 — Ability Expansion

## Goal

Make every session play differently, and make defence a decision rather than a
free good.

Design: `docs/superpowers/specs/2026-08-14-ability-expansion-design.md`
Plan: `docs/superpowers/plans/2026-08-14-ability-expansion.md`

## 3A — Framework (COMPLETE)

- one ability weight table replacing per-ability constants
- BLOODBATH phase; FINAL FIVE becomes FINAL FOUR
- phase thresholds scale to the starting roster
- per-session Fate pool: 5 mandatory + 4 of the optional set

## 3B — Pool (COMPLETE)

Removed: Close Call, Steal Wall, Bomb.
Renamed: Shield became Wall, through the code as well as the UI.
Added: Gale, Demolition, C4, Fate Swap, Purify.

Result: 13 Fates — 5 mandatory, 8 optional, drawn 4 at a time.
Measured over 200 games: 200/200 valid winners, 3.1% inert rolls, 37.7%
two-player rolls, Gale whiffs 58.2%, C4 detonates 33 of 99. No weight changes
needed.

## Deferred, not dropped

Bodyguard, Lucky Charm, Revenge and Bounty all need engine work this phase does
not do — an interceptor chain in `attackPlayer` for the first two, kill
attribution for the second two.

## Dropped

Double Kill (superseded by C4's blast), Jackpot (Purify covers the cleanse),
Ghost (breaks the alive-count invariant, and removes drama rather than adding
it).

---

# Enhancement Phase 4 — Special Scenes

## Goal

Allow the app to temporarily behave like an arcade game rather than always showing two wheels.

## Scene system

Possible scenes:

```text
Wheel
Fate Reveal
Hunter
Duel
Danger Transition
Bloodbath
Final Four
Sudden Death
Winner
```

## Duel scene

Upgrade:

```text
AMY
    VS
JASON
```

with:

- angled player-name panels,
- impact transition,
- FIGHT cue,
- dedicated mini-wheel/result sequence.

No portraits required.

Typography alone should carry the fighting-game flavour.

## Hunter scene

Show:

```text
JASON
TARGET LOCKED
KELVIN
```

Then attack resolution.

## Death Mark activation scene

When marked player is selected:

- Fate Wheel locks,
- screen darkens,
- mark pulses,
- activation sound,
- attack resolves.

---

# Enhancement Phase 5 — Phase Balancing & Game Modes

## Goal

Turn hardcoded MVP balancing into configurable rules.

## Configurable phase thresholds

Host can eventually edit:

```text
Danger At
Final At
Sudden Death At
```

## Configurable Fate weights

Per phase:

```text
Chaos
Danger
Final
Sudden Death
```

## Presets

Create:

### Normal

Balanced default.

### Chaos

More chain events / special Fates.

### Quick

Higher elimination probability.

### Custom

Host controls:

- abilities,
- weights,
- thresholds.

## Balancing tools

Optional debug panel:

- expected Fate percentage,
- current eligible abilities,
- simulated Fate rolls,
- estimated elimination pressure.

This is development/admin tooling, not normal player UI.

---

# Enhancement Phase 6 — Advanced Host Controls

## Goal

Make the game easy to manage live.

## Host options

Add:

- manually add/remove Wall.
- manually add/remove Death Mark.
- revive selected player.
- eliminate selected player.
- force phase.
- skip animation.
- restart current round.
- reset Fate selection.
- inspect event queue.
- inspect current GameState.

These are host/debug powers.

Keep them hidden from the normal game screen.

## Custom game editor

Add UI for:

```text
Ability enabled?
Weight?
Phase availability?
```

Do not allow custom JavaScript abilities in normal UI.

Customisation should remain data-driven and safe.

---

# Enhancement Phase 7 — Arcade Presentation & Effects

## Goal

Deliver the intended **modern UI + classic arcade fighting-game flavour**.

This is where the game becomes visually memorable.

## 7A — Typography

Develop reusable styles for:

```text
READY
FATE
DANGER
BLOCK
TARGET
DUEL
K.O.
SUDDEN DEATH
WINNER
```

Use:

- large outline text,
- skew,
- sharp shapes,
- layered shadows,
- metallic/arcade feel.

## 7B — Screen effects

Improve:

- camera shake,
- directional shake,
- hit-stop,
- white flash,
- red flash,
- vignette,
- slash lines,
- screen distortion.

## 7C — PixiJS decision checkpoint

At this stage evaluate whether CSS is sufficient.

Add PixiJS only if needed for:

- particles,
- animated sprites,
- slash trails,
- smoke,
- explosion layers,
- distortion filters,
- richer compositing.

React remains the game/UI owner.

PixiJS is only the effects renderer.

## 7D — Audio system

Upgrade to proper audio manager.

Categories:

```text
Master
Music
Wheel
UI
Impact
Voice/Stingers
```

Features:

- preloading,
- volume mixing,
- prevent overlapping unwanted sounds,
- fade music,
- phase music transitions.

## 7E — Phase atmosphere

Each phase can subtly change:

### Chaos

energetic.

### Danger

darker / stronger warning atmosphere.

### Bloodbath

red-shifted, heavier than Danger.

### Final Four

high tension.

### Sudden Death

minimal, heartbeat-style tension.

---

# Enhancement Phase 8 — Reliability & Real Playtesting

## Goal

Try to break the finished game before using it live.

## Automated logic tests

Expand tests around:

- all abilities,
- ability chains,
- undo,
- save/restore,
- phase transitions,
- winner state,
- custom weights.

## Stress tests

Simulate large numbers of games.

Check for:

- no winner,
- impossible state,
- infinite Again,
- revive loops,
- phase oscillation,
- empty ability pool,
- two-player deadlock.

## Manual streamed test

Run at least one full game exactly as intended:

```text
Host PC
↓
screen sharing / stream
↓
friends watching
```

Observe:

- text readability,
- audio volume,
- reaction timing,
- stream compression,
- wheel smoothness,
- host usability.

## Performance

Target:

- smooth animation on normal desktop browser.
- stable memory over a full session.
- no repeated audio decoding lag.
- no runaway event queues.

---

# Enhancement Phase 9 — Feature-Complete Release

Suggested tag:

```text
v1.0.0
```

A v1 release should represent:

```text
Playable
Polished
Customisable
Stable
Arcade-styled
Host-friendly
```

---

# 5. GitHub Milestone Structure

Recommended GitHub Milestones:

```text
M0 — Foundation
M1 — Main Wheel
M2 — Core Loop
M3 — Core Abilities
M4 — Advanced MVP Abilities
M5 — Game Phases
M6 — Host & Persistence
M7 — MVP Presentation
M8 — MVP Validation
M9 — MVP Release

E0 — Cleanup
E1 — Wheel Polish
E2 — Flow Polish
E3 — Ability Expansion
E4 — Special Scenes
E5 — Game Modes
E6 — Host Pro Tools
E7 — Arcade Presentation
E8 — Final QA
E9 — v1 Release
```

---

# 6. Suggested Issue Labels

```text
type:feature
type:bug
type:refactor
type:test
type:design
type:audio
type:effect

area:wheel
area:engine
area:fate
area:phase
area:host
area:storage
area:ui
area:audio
area:effects

priority:blocker
priority:high
priority:normal
priority:later

pass:mvp
pass:enhancement
```

---

# 7. Definition of Phase Completion

Do not mark a phase complete only because code exists.

Each phase should satisfy:

```text
IMPLEMENTED
+
MANUALLY TESTED
+
NO KNOWN BLOCKING BUG
+
DEPLOYED PREVIEW WORKS
+
NEXT PHASE CAN BUILD ON IT
```

---

# 8. Development Guardrails

## Guardrail 1

Do not mix game logic into React visual components.

## Guardrail 2

Do not let Wheel components independently decide Fate results.

## Guardrail 3

Do not add advanced abilities until common attack/status abstractions exist.

## Guardrail 4

Do not add PixiJS just because it looks fun.

Add it only when CSS/DOM effects actually become limiting.

## Guardrail 5

Do not optimise Fate probabilities before running complete games.

## Guardrail 6

Every new ability must define:

```text
Eligibility
Weight
Target rules
Resolution
Wall interaction
Phase availability
Edge cases
Event log wording
Presentation events
```

## Guardrail 7

Every persistent status must define:

```text
How acquired
How displayed
When triggered
When removed
Whether Wall interacts
Whether Revive clears it
Whether Fate Swap can move it
```

---

# 9. Current Priority

The immediate goal after repository creation should be:

```text
Phase 0
↓
Phase 1
↓
Phase 2
```

At the end of Phase 2, King of Fate should already have:

```text
player setup
+
working Main Wheel
+
working Fate Wheel
+
host-controlled WHO → FATE loop
+
basic abilities
```

That gives us a real playable vertical slice very early.

Only after that should we deepen the game.

---

# 10. Final Reminder

The intended development loop is:

```text
PASS 1
Phase 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → MVP

                        ↓

               PLAY A REAL GAME

                        ↓

PASS 2
Enhancement 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → v1
```

Do **not** treat advanced polish as random backlog work.

The Enhancement Pass should deliberately revisit the whole game after the MVP is proven.

This preserves the most important priority:

> First make **King of Fate** a complete game.
>
> Then make it a **damn fun arcade game**.
