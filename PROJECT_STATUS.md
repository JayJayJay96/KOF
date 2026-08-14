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
Pre-MVP — MVP feature-complete, in playtest iteration
```

# Current Pass

```text
PASS 1 — MVP  (all phases built; Phase 8 playtesting is the open gate)
```

# Current Phase

```text
Enh. Phase 3 — Ability Expansion (3a COMPLETE, 3b not started)

Phase 8 — Full-Game Validation   (IN PROGRESS — host-led playtesting)
Enh. Phase 2 — Game Flow Polish  COMPLETE (one click per round)
Enh. Phase 1 — Wheel Polish      COMPLETE
Enh. Phase 0 — Technical Cleanup NEARLY DONE (1 refactor left, see below)
Phase 8 edge-case sweep          COMPLETE (agent-testable half)
Fate rework Wave 3               DROPPED  (host decision)
Fate rework Wave 2 (Bomb)        COMPLETE
Playtest round 2 changes         COMPLETE
Fate rework Wave 1               COMPLETE
Phases 0-7                       COMPLETE
```

# Phase Status

```text
All MVP features exist and are deployed. The project is in a
playtest-and-tune loop driven by the host, not a build loop.

Round 2 of playtest feedback is shipped: wider landing spread, both
wheels spinning together, a live situation line, and a story rail.

Enhancement Phase 3a (framework) is shipped on branch
enh3-ability-expansion and is releasable. Part 3b (the pool rework)
is designed but NOT started — see Next Tasks.
```

# Live Deployment

```text
https://kof-ten.vercel.app/
```

Publicly reachable, no Vercel Deployment Protection.
Auto-deploys from `main` on push (live ~15s after push).

# Current Objective

**Play real games.** Enhancement Phase 3a is the ship point for the framework
half of the ability expansion: the branch is releasable as it stands and the
host may play it. Part 3b (the pool rework — new Fates, removals, the Shield →
Wall rename) has **not started**.

Three rounds of change have now landed without a full session between them. The
measurements say the Fate pool is not dead air, that the round is 40% shorter,
and that phases now escalate at every roster size; they say nothing about
whether it is *fun*.

---

# Repository

```text
GitHub   https://github.com/JayJayJay96/KOF
Branch   enh3-ability-expansion  (not yet merged to main)
```

---

# Completed Before This Session

**Phases 0–7.** React 19 + TypeScript + Vite 8; pure reducer; reusable Canvas
wheel with deterministic landing; ability registry; shared attack flow; event
queue that suspends on blocking events; all eight original MVP Fates; phase
transitions and winner screen; undo, versioned save/resume, host panel;
synthesised audio and the impact-effect layer.

**Playtest round 1** (`d7aaada`, `b374d59`, `da09a44`, `daa5bf9`): landing
jitter, auto-advance to the Fate spin, Hunter bounty, the reduced-motion skip
fix, greasy deceleration, and Fate rework Wave 1 with status rims. Details in
the git log; the summaries below are kept short so this file stays current.

---

# Completed This Session — Enhancement Phase 3a: Framework

Four changes, none of them a new Fate. 3a is the scaffolding the pool rework in
3b stands on, and it was built first on purpose: adding Fates to the old
structure would have meant editing weights in two places per Fate and fitting
them into a phase model that did not work below twelve players.

## 1. One ability weight table

`src/game/config/abilityWeights.ts` is now the single default table.

Weights used to live **twice** — a local `WEIGHTS` constant in each of eleven
ability files *and* a duplicate in `defaultConfig.ts` — with the config copy
silently winning. The ability-local numbers were dead code that read exactly
like the live ones, which is the worst possible form of duplication: editing the
obvious place had no effect and nothing said so.

`GameConfig.abilities[id].weights` is now explicitly an **override map** over
that table and still wins. `AbilityDefinition` lost `getWeight` and gained
`mandatory?: boolean`.

## 2. A fifth phase, and a rename

`GamePhase` is `chaos | danger | bloodbath | final_four | sudden_death`.

`final_five` became `final_four` because the endgame floor had to drop from 5 to
4. At a roster of 8 the 70% Danger band lands at 5 alive, so a floor of 5 would
swallow that step and **delete DANGER from every game under roughly 12
players**. The rename is a consequence of the threshold fix, not a cosmetic
choice.

## 3. Phase thresholds scale to the roster

`PhaseThresholds` is now
`{ dangerAtShare: 0.7, bloodbathAtShare: 0.4, finalAt: 4, suddenDeathAt: 2 }` —
upper bands a share of the starting roster, endgame bands absolute counts. An
8-player and a 30-player game should spend the same *proportion* in Chaos, but
"four left" is a stage of the game rather than a proportion of it.

This fixed a real bug: with absolute thresholds (`dangerAt: 11`) **any game
under 12 players started in DANGER and never saw Chaos at all**.

`resolvePhase` now takes a named-argument object,
`{ aliveCount, startingCount, thresholds? }`.

Verified bands (alive counts per phase):

| Roster | Chaos | Danger | Bloodbath | Final Four | Sudden |
|---|---|---|---|---|---|
| 8 | 8–6 | 5 | never | 4–3 | 2 |
| 12 | 12–9 | 8–5 | never | 4–3 | 2 |
| 16 | 16–12 | 11–7 | 6–5 | 4–3 | 2 |
| 20 | 20–15 | 14–9 | 8–5 | 4–3 | 2 |
| 30 | 30–22 | 21–13 | 12–5 | 4–3 | 2 |

**Bloodbath first becomes reachable at a roster of 13.** Intended: below that,
40% of the start is already at or under the Final Four floor, and a phase
lasting one round is a transition animation rather than a phase.

## 4. Per-session Fate pool

`GameState.sessionAbilityIds` is drawn at `START_GAME` — every mandatory Fate
plus four of the optional ones — and held for the whole game.
`getAvailableAbilities` filters on it.

Mandatory today: `eliminate`, `shield`, `death_mark`, `hunter`, `duel`.
Optional today: `safe`, `close_call`, `revive`, `steal_shield`, `double_fate`,
`bomb` — six, drawn four at a time, so C(6,4) = **15 distinct pools** and any
one optional Fate sits out about one game in three.

The pool is **never re-rolled** — not on a phase change, not on undo, not after
a Revive. A pool that moved mid-game would make the wheel a moving target for
anyone following it, and half the tension of a late round is the room knowing
what can still come up.

`GameState` also gained `startingPlayerCount`, because `players.length` is the
**current** roster and roster edits are legal at `idle` — a host tidying away
eliminated players was shrinking the denominator and de-escalating the phase.

## `SAVE_VERSION` → 3

Bumped, and this one is not optional the way the round-2 decision was.

A v2 save is a **hard crash**, not a degradation. `GameState` gained two
required fields: `getAvailableAbilities` reads `state.sessionAbilityIds.length`,
`App.tsx` calls it from a `useMemo` on every state, and `.length` of `undefined`
throws before anything renders — resuming would be a **white screen** mid-party.
Separately, `PhaseThresholds` changed shape: an old `dangerAt` key yields a NaN
share and silently resolves every game to Chaos for the rest of the night.

`isPlausibleGameState` checks neither field, so such a save passes validation
and fails later, far from the cause. Version 3 therefore **rejects every v1 and
v2 save** — a host with a game in progress across this deploy loses it, which is
the correct trade against a white screen.

## Not part of 3a

Part 3b — remove Close Call / Steal Shield / Bomb, rename Shield to Wall
(code as well as UI), add Gale, Demolition, C4, Fate Swap and Purify — is
**designed but not started**. Do not describe any of it as done.

---

# Completed Earlier — Enhancement Phases 1 and 2

Both designed with the host before any code was written; specs live in
`docs/superpowers/specs/`. That process is now the agreed shape for every
enhancement phase: question from several angles, propose, agree, spec, build.

## Phase 1 — Wheel Polish

Arcade fighter-select direction. Gutter cells with a **bright separator line**, a
bright edge on the landed slice only, an impact flash, a pawl-shaped pointer,
uppercase condensed labels from system fonts, and a per-phase tint on the rim and
gutters alone.

Timing was rebuilt twice, both times from host feedback:

- **The crawl became absolute** (`CRAWL_MS`, 3.3s) rather than a share of the
  spin. As a fraction it gave the two wheels different tails.
- **The wind-up became a pull-and-release.** The first attempt dipped back and
  returned to exactly zero before accelerating, so the eye saw the wheel reach
  neutral and then start again — a visibly wasted motion. It now releases *from*
  the back, and the pull is 1.5s with a **ratchet** clicking over its own teeth.

Two findings worth keeping:

1. **Ratchet clicks must not be counted off segment boundaries.** A test caught
   it: at three players one segment is 120°, so a capped pull crossed barely one
   boundary and the ratchet fell almost silent. A pawl's teeth are finer than the
   wheel's slices and unrelated to roster size, so `RATCHET_TEETH` is counted
   separately.
2. **Clamps were silently eating the host's request.** Sized for a 350ms pull, at
   1500ms they cut the pull to 1.17s and the Fate Wheel's tail to 2.8s. The real
   constraint is only that deceleration stays positive.

**Both wheels now run 7800ms, and that is load-bearing.** With an absolute crawl,
a shorter wheel gives that tail a larger share of its throw and far less time to
shed speed into it — at 6200ms the Fate Wheel braked about 3.5× harder than the
Main Wheel and read as "stopping on purpose". Equal durations make every phase
ratio equal. **Do not give the two wheels different durations again.**

## Phase 2 — Game Flow

**One click per round.** The host clicks Spin; the Fate resolving, the beats
inside a multi-step Fate, the target spin and the round closing all follow on
timers, and the game rests at `idle` ready for the next click.

The buttons are **not removed** — each still dispatches what its timer is about
to dispatch, so click-to-skip is free, control is returned rather than taken, and
nothing can strand the game. An armed button carries a progress fill, because
otherwise it reads as "press me" when it means "this is about to happen".

Target re-spins skip the pull: the wheel is already loaded inside the round.

Round costs: plain ~14.8s, Hunter/Duel ~24.5s.

---

# Completed Earlier — Enhancement Phase 0: dead code

Six exports referenced nowhere but their own definition, deleted:
`getLatestMessage` and `isGameOver` (selectors), `hasSpinnablePlayers`
(reducer), `isQueuePaused` (eventQueue), `PHASE_ORDER` (phaseConfig),
`getAudioLevels` (audioManager). 40 lines removed, nothing added.

Two were duplicates of a living function under a second name —
`isQueuePaused` of `canContinueEvents`, `hasSpinnablePlayers` of
`canSpinPlayerWheel`. One, `getLatestMessage`, only became dead earlier in this
same session when `describeSituation` replaced it.

A crude unused-export scan flagged 55 symbols; hand-checking left these six. The
rest were types used in their own file's public signatures, constants used
internally, or symbols the new test file imports. `AudioLevels` stayed because
it types `setAudioLevels`, which is used.

---

# Completed Earlier — Enhancement Phase 0: the test suite

**Vitest 4.1.10 installed; 36 tests, one file, 342ms.** `npm test` watches,
`npm run test:run` is the single pass.

`src/game/engine/gameEngine.test.ts` covers every case the roadmap names —
Shield blocks attack, Death Mark triggers once, Hunter excludes self, Duel
excludes self, Revive only draws from the eliminated pool, winner detection,
phase transitions, weighted Fate selection — plus Bomb's whole pass / tick /
detonate cycle, which shipped after that list was written.

Two things this immediately paid for:

1. **A test caught my own wrong assumption.** The "phase moves backward after a
   Revive" case went 4 → 3 → 4 alive, which never leaves Final Five (`finalAt`
   is 5), so it could not have shown a backward move at all. The engine was
   right; the test was wrong. It now drops to 2 (Sudden Death) and revives to 3.
2. **It closes the module-instance trap for good.** A test file imports normally,
   so `setRandomSource` can never again seed a copy the abilities do not use.

Note on the dependency audit: `npm audit` reports one high-severity issue in
`nanoid`, reached through `vite → postcss`. It is **absent from the production
tree** (`npm ls nanoid --omit=dev` is empty), predates this install, and never
reaches the bundle.

---

# Completed Earlier — Phase 8 edge-case sweep

Wave 2 was pushed (`b28211e`), then the agent-testable half of Phase 8's
checklist was finally run — the half that had been listed as untested since
Phase 7.

**One real bug found and fixed.** A 120-character name rendered as a single
1137px chip inside a 1528px roster. It did not overflow, which is why an earlier
numeric check passed it, but it consumed 74% of the row and pushed the other 19
players onto a second line, hiding everyone's status. Only the **name** is now
clamped, not the chip, so the 💣/🛡/💀 badges stay visible; the full name moves
to the chip's `title`. Measured after: 198px, 13% of the row, all chips back on
one line, `🔥🔥🔥💣3` still intact.

The wheel was already correct — a 120-char name measures 806px against a 207px
label budget, and `fitLabel` shrinks then truncates exactly as designed.

**A methodology bug worth remembering.** The browser harness had been importing
modules with cache-busting query strings (`reducer.ts?v=3`). Vite treats
`utils/random.ts` and `utils/random.ts?v=3` as **separate module instances**, so
`setRandomSource` was seeding a copy the abilities never used. A Duel "coin flip
is broken" result turned out to be four genuinely random flips. Re-run with
plain imports, Duel is exact at the 0.5 threshold and 50.1% over 4,000 samples.

This is the strongest argument yet for Enhancement Phase 0: a real test file
imports modules normally and cannot hit this class of error.

---

# Completed Earlier — Wave 2: Bomb

A hot potato. Planted with a fuse of 3, it passes to whoever the Main Wheel
selects and drops a tick each time. When the fuse runs out it goes off in the
hands of the player selected on that tick.

A bomb that sits still and counts down is a slower Death Mark — the holder can
do nothing and nobody else has a stake. Passing it makes every spin "not me",
sends the rim marker travelling around the wheel, and turns the final tick into
a spin where being chosen simply kills you.

## The one structural addition

Status triggers can now fire **without consuming the round**. Death Mark IS its
round's outcome, so it replaces the Fate. A bomb changing hands is not — if it
took the round the same way, every round of a live fuse would lose its Fate and
the game would stall into a three-round cutscene.

So `StatusTrigger` gained `replacesFate`, declared separately from `resolve` so
callers can ask without running the resolution, and `isTriggered` gained the
context — the bomb sits on a player *other* than the selected one, which a
predicate seeing only the selected player cannot express. `findSelectionTriggers`
returns every match, stopping after the first that consumes the round.

That last rule matters: a Death Mark that kills its holder has already decided
the round, and letting the bomb then pass into their hands would hand it to a
corpse.

## The measurement that changed the design

First run: **49% of bombs died with their holder**, and only 0% survived to game
end. The cause is structural — the selected player takes the bomb and then that
same round's Fate resolves on them, so an Eliminate roll kills the bomb it was
just handed.

The rule itself is fine; dying to something else is a fair way to take a bomb
out of play. What was not fine is that the countdown the table had been
following vanished with nothing said. The fuse is now left on the body and
cleared on the next selection with a line explaining it, so every bomb ends
out loud.

| | Result |
|---|---|
| Bombs planted (200 games, 12 players) | 274 |
| Detonated | 122 |
| Announced as lost with their holder | 148 |
| Unexplained disappearances | 3 (revived holders — revival returns a clean player) |

## Narration de-duplication

`SET_BOMB` narrates every hand-off, so the Bomb Fate and the pass both emitting
a `SHOW_MESSAGE` printed the same fact twice in the readout. Both messages are
gone; the event carries the wording, including the explanatory line for a fresh
plant (a full fuse can only mean a plant, since a pass always arrives already
decremented). Only the detonation keeps a message of its own, because "TIME UP"
earns its line. This is the second time this exact duplication has appeared —
Hunter's bounty was the first.

## Presentation

Orange rim on the wheel, drawn outermost because the bomb is the one status the
whole table tracks at once. `WheelMarker` was built generic in Wave 1 for
exactly this, so `Wheel.tsx` was not touched. The status chip carries the fuse
number, not a bare icon — the count is the mechanic.

---

# Completed Earlier — playtest round 2

Four pieces of host feedback, all shipped.

## 1. The spin lands in far more places

> *"the pin normally stops at a few fixed places… or just about to stop at 98%
> but eventually went to the next pie."*

The offset was already random. Two things hid it:

- **The clamp was fractional.** `MAX_LANDING_OFFSET = 0.78` kept the pointer a
  full 11% of the arc from any boundary, so the near-miss the host described was
  not merely rare — it was impossible. The cap is now an **angular** margin
  (`MIN_EDGE_MARGIN_RAD`, ~1.7°), because what makes a result ambiguous to a
  viewer is degrees of arc, not share of segment. A 2-player wheel and a
  20-player wheel now leave the same readable gap.
- **Uniform landing reads as mechanical.** The outcomes people *notice* are the
  extremes, and most uniform landings sit in the forgettable middle.
  `edgeBiasedOffset` pushes the mass outward.

Also: `turnVariance` rolls 0–1.8 extra turns per spin. Duration is fixed, so
every spin now has a different speed curve. Previously every throw was identical.

| | Before | After |
|---|---|---|
| Landings in the outer third of the segment | 14.5% | **49%** |
| Closest the pointer may come to a boundary | 11% of arc | **~1.7°**, any count |

## 2. Both wheels spin together

> *"i think its better to spin both of the wheel at the same time to save time."*

New screen state `spinning_both`. The engine still picks both results before
either wheel moves — this is presentation, not a second way to decide anything.

The Fate Wheel is **staggered by 3s**: it appears at once, armed and
motionless, and launches three seconds into the Main Wheel's spin.

```text
Main   0.0s ──────────────────────────► 6.8s
Fate            3.0s ──────────────────────────► 8.2s
```

The first version started both together and made the Fate Wheel 800ms longer.
Reveal order was right, but attention split for the whole spin — two wheels
moving, neither clearly the one to watch. The stagger gives the Main Wheel three
seconds alone (where "who is it going to be" actually lives) and keeps almost
all of the saving. WHO still lands before WHAT, now 1.4s apart.

The state machine models this exactly — `spinning_both` ends when the *Main*
Wheel lands, handing over to `spinning_fate` while the Fate Wheel is still
turning.

Rounds where a **Death Mark is armed** fall back to sequential: the mark replaces
the Fate, so a parallel Fate would be discarded and its wheel left spinning over
a resolution. The check is in `useGame`, because it is a question about which
presentation to use; the reducer still lets a trigger win if one fires anyway.

Round animation: **12.9s → 8.2s**. Host can switch back from the Host Panel.

## 3. A live situation line

> *"death mark on A but he has a shield. at least describe it there."*

`game/narration/situation.ts` derives one line from state. Nothing is stored.

The forecast for a landed Fate comes from the ability's own optional
`describeStakes`, so a new Fate brings its own narration and no component learns
its name. Two rules keep it safe: it never states an unrolled outcome, and it
goes silent while a wheel that could spoil something is turning.

While resolving it shows the last few events joined, not just the latest —
Hunter's payoff is three events and the causality is the point:

```text
Jason hunts Chris · ☠ Chris eliminated · 🛡 Jason gains a Shield
```

`deathMarkTrigger` now names the Shield in its headline, which is the host's
literal example and the game's most confusing moment ("the mark fired and he
lived?"). Hunter dropped its bounty `SHOW_MESSAGE` — `ADD_SHIELD` already
narrates itself, and the burst was printing the same fact twice.

## 4. Story rail on the main screen

> *"a log for the story line at the side, so that people can read back."*

`buildEventLog` already existed; it was only ever rendered inside the Host
Panel. `StoryLog` puts it on the streamed screen: newest round first, so the
latest beat needs no scrolling, and colour-toned so a death registers before the
name is read. Tone is a property of the **event**, not the component.

Both logs share the one formatter, so the wording cannot drift apart.

The rail is dismissable and nothing hides it automatically at a breakpoint — a
panel that vanishes on its own is worse than one the host chose to close.

## Two latent bugs found while building this

Both were invisible until two wheels could turn at once, and both would have
been intermittent and very hard to diagnose from a stream recording:

- **`Wheel` restarted a spin when its `entries` array changed identity.** A
  parent re-render mid-spin (the Main Wheel landing) hands the Fate Wheel a fresh
  array with identical contents. It now keys off an id-derived string.
- **`Wheel` restarted a spin when a timing prop changed.** The Fate duration
  depends on the round being a dual spin, which stops being true the moment the
  Main Wheel lands — mid-Fate-animation. Caught in the browser: the Fate Wheel
  was still turning at 9.1s against a 7.6s target. Timing is now latched at spin
  start, so a spin in flight finishes on the terms it started with.

## Not changed

`SAVE_VERSION` stays at **2**. `config.simultaneousSpin` is optional and read
through `isSimultaneousSpinEnabled` (`?? true`), so saves written before this
change still load. Bumping would have discarded a host's in-progress game for no
correctness gain.

---

# Reference — playtest round 1

## `d7aaada` — first playtest pass

- **Wheel lands anywhere within a segment**, not dead centre. Engine still picks
  the winner; the wheel picks where inside it the pointer rests. Clamped to 0.78
  of the half-arc so it never lands ambiguously on a boundary.
- **Player spin flows into the Fate spin** — one click, not two. Contradicted
  PROJECT_SPEC.md §3, so the spec was amended rather than left to drift. Does
  not fire after Again, and cancels when a Death Mark intercepts.
- **Hunter bounty** — a successful hunt earns the hunter a Shield. A blocked
  hunt pays nothing; the reward tracks the kill, not the attempt.

## `b374d59` — wheel skip bug

The wheel honoured `prefers-reduced-motion` by **jumping straight to the
result**. On a machine with OS animation effects disabled (the host's setup)
that made the game look broken. Reduced motion should damp decoration, not
delete the mechanic — the spin IS the game. Decorative motion (pointer nudge,
shake, confetti, impact titles) still respects the media query via CSS.

## `da09a44` — greasy deceleration

The old quartic ease-out spent 94% of its travel in the first half of the
deceleration, so the wheel parked deep inside a segment almost immediately. No
boundary was ever genuinely in play.

Now three phases: wind up, bleed off, **crawl**. The final `CRAWL_TIME` (34% of
the spin) is reserved to cover `CRAWL_DISTANCE` (8.5% of travel). Velocity stays
continuous across both joins; peak speed is still solved so total travel is
exactly 1, so landing remains exact.

Durations: main wheel 4200 → **6800ms**, Fate 3200 → **5200ms**.

Measured at 8 players, final five tick gaps went from `124/152/188/264/552ms` to
`252/308/408/524/836ms`; ticks in the final third went from 1 to 3.

## `daa5bf9` — Fate rework Wave 1

Driven by measurement over 5,220 rolls: 19.4% of rolls changed nothing, and only
20.7% involved a second player — yet the two-player Fates were where every
reaction came from.

- **Again removed**, replaced by **Double Fate** (two Fates, order drawn).
- **Close Call** replaces most of Safe: shielded → Shield destroyed; unshielded →
  survives but marked. Always leaves something on the board.
- **Steal Shield** promoted from Post-MVP. No target spin needed.
- **Status rims on the wheel** — purple Death Mark, light blue Shield, concentric
  when both. Status uses the **rim**, the landed result uses the **fill**, so
  both read at once.
- Weights retuned across all four phases.
- `SAVE_VERSION` → 2 (a v1 save mid-round on `again` would strand the round).

| | Before | After |
|---|---|---|
| Rolls that change nothing | 19.4% | **3.3%** |
| Rolls involving a second player | 20.7% | **37.1%** |

180 games: all reached valid winners, zero stuck states, Shield cap never broken.

---

# In Progress

**Enhancement Phase 3b — the pool rework. Not started.** Plan and task order in
`docs/superpowers/plans/2026-08-14-ability-expansion.md`; note the ordering
constraint recorded there — the removals must run *after* the additions, or the
optional pool briefly drops to exactly four and every session draws the
identical pool.

3a is committed on `enh3-ability-expansion` and **not yet merged to `main`**, so
the live site does not have it. Playtest round 2 (`ac01826`) and Wave 2 / Bomb
(`b28211e`) are both merged, pushed and deployed.

---

# Next Tasks

## Unverified by eye — Enhancement Phase 1

Both shipped, both work in code, neither has been seen by a human. They need a
real game rather than a harness:

- **The impact flash.** The landed slice punches white and decays over 260ms.
  Every browser check this session fast-forwards `requestAnimationFrame`, which
  jumps straight past a 260ms decay — so the code path is confirmed to run and
  the *look* is not. `IMPACT_MS` in `Wheel.tsx` if it is too subtle or too much.
- **Phase tints beyond Chaos.** The rim and gutters shift cool → warm → hot → red
  across the four phases, but only Chaos has ever been on screen. Get a game down
  to two players to see Sudden Death's red. Values live in
  `components/MainWheel/wheelTheme.ts`.

## Enhancement Phase 0 — remaining work

Tests **done**. Architecture review **mostly done** — dead code removed, one
finding deliberately left open:

### Open: 20 hand-rolled player lookups — STILL OUTSTANDING after Enh. Phase 3a

`getPlayerById(state, id)` already exists in `selectors.ts` and **nothing outside
that file uses it**. Meanwhile this exact line appears 20 times across the
ability and status modules:

```ts
const player = context.state.players.find((c) => c.id === selectedPlayerId);
```

Spread across `closeCall` (2), `deathMark`, `stealShield` (2), `eliminate`,
`hunter` (4), `safe`, `shield`, `bomb`, `doubleFate`, `duel` (4), `bombTrigger`,
`deathMarkTrigger`. The remedy is one import and a mechanical substitution per
file — abilities already import from `engine/selectors` (`revive.ts`,
`abilities/index.ts`), so no boundary changes.

**Deliberately not done in this session.** It touches twelve files for exactly
zero behaviour change, and the host is about to run a real playtest — landing a
no-op refactor across the whole ability layer immediately beforehand trades real
risk for tidiness. It wants its own commit, on its own, with the tests green
either side.

### Closed

- **Save schema versioning** — done in Phase 6 (`SAVE_VERSION`); the rejection
  path has since been exercised twice, and again at version 3 in Enh. Phase 3a,
  where it is what stands between a v2 save and a white screen.
- **Oversized components** — measured, and nothing is alarming once the comment
  density is accounted for. Largest are `reducer.ts` 441, `Wheel.tsx` 390,
  `GameScreen.tsx` 302. `GameScreen` is the one to watch if it grows again.
- **Engine boundaries, event queue, random utility, snapshots** — reviewed, no
  violations found. Components dispatch and render; only `eventResolver` mutates
  state; only `eventQueue` orders it; randomness all routes through
  `utils/random`.

Worth adding while the runner is new:

- **Component tests.** `jsdom` and Testing Library are not installed, so the
  wheels, rail and status panel are still only covered by hand-driven browser
  checks. The roster-clamp bug found this session was a rendering bug, which is
  exactly the class a component test would catch.
- **A `test` step in whatever CI exists.** There is currently none.

## Also outstanding — play a real session (host-led, cannot be done by an agent)

Two rounds of change have landed without a live game between them. Things to
watch, in rough order of how likely they are to be wrong:

- **Is the 3s stagger the right length?** The Main Wheel gets three seconds
  alone before the Fate Wheel launches. If attention still splits, raise
  `DUAL_FATE_START_DELAY_MS` in `GameScreen.tsx`; if the round drags, lower it.
  It is a single constant and changes nothing else.
- **Is 8.2s now too fast?** The complaint before was that it dragged. The greasy
  crawl still works, but the beat between the two reveals is 1.4s rather than a
  whole spin.
- **Does the situation line get read, or is it noise?** It sits under a very large
  name and a very large Fate. If nobody looks at it, it should get bigger or go.
- **Is the rail worth a fifth of the width?** Judge it on a real stream, not on a
  desktop. If not, close it and it costs nothing.
- **Is Hunter dominant?** Carried over and still unanswered: 16.9% of rolls *and*
  a Shield bounty on a kill. If it feels oppressive, drop the bounty to later
  phases or make it one-off.
- **Does Close Call read as relief or punishment?** It always costs something.
- **Is Double Fate legible?** Two Fates in sequence may be hard to follow live.

## Watch items specific to Bomb

- **Does the fizzle annoy?** Roughly half of bombs end with their holder dying
  to something else. It is announced now rather than silent, but the countdown
  still stops early. The designed fix is to move the tick to the **end** of the
  round, after the Fate resolves, so the bomb only ever passes to a survivor.
  Not done first because it puts the detonation between rounds, costing the host
  an extra click at the most dramatic moment. Play it before deciding.
- **Is a 3-round fuse right?** `BOMB_FUSE` in `statuses/bombTrigger.ts`. Two is
  over before it registers; four risks becoming background noise.
- **Is 10 weight too often?** A live bomb colours three whole rounds, so it is
  running far more of the time than its roll rate suggests.
- **Do two timers collide?** Bomb and Death Mark can now be live at once. The
  rules are defined (a mark consumes the round, the bomb does not pass that
  round), but whether a viewer can follow both is a question only a real session
  answers.

## Wave 3 — Linked Fate: DROPPED (host decision, 2026-08-14)

> *"i think can skip wave 3 and continue with the phases instead, i think its
> getting more and more complicated"*

Not deferred — dropped. The Fate pool is feature-complete at eleven Fates. This
matches PROJECT_SPEC.md §45: Linked Fate would have been a third overlapping
timer alongside Death Mark and Bomb.

**Do not restart it without the host asking.** If a later session wants more
depth, the cheaper move is interaction between the Fates that already exist
rather than a twelfth one.

### Related: Steal Shield taking the Bomb

Asked and answered in the same session. Rejected, and the reasoning is worth
keeping because the idea will occur again:

Under the current design the bomb's **location is cosmetic**. It always passes
to the next selected player, so moving it by any other means does not change who
dies — only which rim carries the marker in the meantime. A "steal the bomb"
Fate would be pure spectacle.

It would also invert Steal Shield's valence: one Fate name that is sometimes a
gain and sometimes a self-inflicted loss, against the one-Fate-one-legible-
outcome rule Waves 1 and 2 were built on.

If it is ever wanted it belongs in **Fate Swap** (§12, still post-MVP) — the
name is valence-neutral and it already covers every status. And it only becomes
a real mechanic if the bomb stops auto-passing, so that holding it is dangerous
and a transfer is the only way out.

## Still outstanding from earlier phases

- **No automated tests.** The largest structural gap. Roadmap schedules them in
  Enhancement Phase 0. Verification is currently done by driving the real modules
  through Vite's dev module graph in the browser — effective, and it has caught
  real bugs, but it is re-done by hand every session.
- Phase 8's untested edge cases: very long names, duplicate names, rapid clicking
  during animation, browser resize mid-game, and a real streamed session.

---

# Known Issues / Blockers

No blockers.

- **Double Fate can waste half a roll.** Close Call (unshielded) and Death Mark
  both emit `ADD_DEATH_MARK`. `deathMark` is a boolean so it is harmless, but the
  pairing produces one effect from two Fates. Fixable by excluding
  effect-colliding pairs; deliberately left to see if it annoys in play.
- **"Clear save" during a live game is re-written by autosave** on the next
  action. Intended, but easy to mistake for a bug.
- **Fate Wheel segments are equal-sized** while selection is weighted. Open
  product decision since Phase 2 — the wheel does not communicate that Eliminate
  is far likelier than Safe.
- **No music.** `config.audio.music` exists but nothing plays a loop.
- **Duel has no VS scene.** Enhancement Phase 4 owns it.

---

# Important Decisions Made This Session

## Wave 2

1. **A status trigger may fire without consuming the round.** This is the whole
   structural cost of Bomb. Without it, Bomb had to either replace the Fate
   every round of its fuse (a three-round cutscene) or live outside the trigger
   registry entirely (a second mechanism doing the same job).
2. **`replacesFate` is declared, not inferred from the events.** Callers need to
   ask the question before resolving — `useGame` decides whether to launch both
   wheels, and resolving twice to find out would be both wasteful and a trap the
   moment a trigger stops being pure.
3. **The bomb passes rather than sitting still.** A stationary countdown is a
   slower Death Mark. Passing it gives everyone a stake and makes the rim marker
   travel, which is most of what makes it watchable.
4. **It dies with its holder — but says so.** Half of all bombs end this way.
   The rule stays; the silence did not. A countdown that stops with no line is
   indistinguishable from a bug.
5. **The event carries the narration, not the ability.** `SET_BOMB` says what
   happened, so neither the Fate nor the pass adds a message. Second occurrence
   of this duplication after Hunter's bounty — worth treating as the default:
   if an event already narrates itself, do not also emit a message.

## Playtest round 2

1. **Landing margin is angular, not fractional.** What makes a result ambiguous
   to a viewer is degrees of arc, not share of segment. The old fractional clamp
   was simultaneously too tight at 8 players and would have been too loose at 40.
2. **Perceived randomness is not statistical randomness.** Uniform landing is
   "more random" by any measure and felt mechanical, because the landings people
   notice are the extremes. Biasing toward the edges is the honest fix for the
   complaint that was actually made.
3. **Reveal order is enforced by a start stagger, not by duration.** The first
   attempt made the Fate Wheel 800ms longer, which ordered the reveals correctly
   and still split attention for the whole spin. Delaying the *start* by 3s
   gives the Main Wheel the screen during the part that matters and costs only
   0.4s of the saving. The lesson generalises: when two animations compete, the
   fix is usually when they begin, not how long they take.
4. **A spin in flight finishes on the terms it started with.** Entries and timing
   are both latched at spin start. Once two wheels can turn at once, a parent
   re-render mid-spin is normal rather than exceptional, and any prop in the
   effect's dependency array becomes a way to silently restart an animation.
5. **The dual/sequential choice lives in the hook, not the reducer.** It is a
   question about which presentation to use. The reducer stays the authority on
   what happens, and still lets a status trigger win if one fires anyway.
6. **Narration is data, like abilities.** `describeStakes` lives on the
   `AbilityDefinition`, so a new Fate arrives with its own wording. The
   alternative — a central map keyed by ability id — is exactly the switch
   statement AGENTS.md §7.6 exists to prevent.
7. **A forecast may only repeat what is already on the board.** That is what
   makes it safe to show before the host resolves. Hunter and Duel therefore
   promise a target without naming one.
8. **Two logs, one formatter.** The rail serves viewers, the Host Panel log
   serves the host. Sharing `buildEventLog` means the wording cannot drift.
9. **Save version deliberately NOT bumped.** The new config field is optional and
   defaulted in one place. Bumping would have discarded a host's in-progress game
   to gain nothing.

---

# Verification Performed

- `npm run build` — passes, 72 modules, no type errors.
- `npm run lint` (oxlint 1.77) — clean, exit 0.
- `npm run test:run` — **96 passed**, 2 files, ~320ms.
- `npx prettier --check .` — 11 files reported, **all pre-existing and all
  Markdown or root config** (`AGENTS.md`, `README.md`, the three product docs,
  the four `docs/superpowers/` files, `tsconfig.json`, `vite.config.ts`). The
  enforced gate is `npm run format:check`, which covers `src/**` only and is
  clean. Do not "fix" these in a feature commit — reformatting every doc would
  bury the actual change in whitespace. If they are to be normalised it wants
  its own commit.

Enhancement Phase 3a is documentation plus one constant, so there is nothing new
to verify in the browser; the engine behaviour it describes was verified by the
96-test suite in Tasks 1–4.

**Enhancement Phases 1–2**, verified in the browser:

| Check | Result |
|---|---|
| Main reveals 7839ms, Fate 10822ms, gap 2983ms | PASS |
| Ratchet: 8 clicks across the pull, gaps widening 136→153ms | PASS |
| Separator visible — 178 bright pixels across 12 boundaries | PASS |
| Gutters, fills, landed accent and full rim tint all render | PASS |
| Pointer renders at 30×34 with its clip-path pawl shape | PASS |
| One click drives a plain round back to rest unattended | PASS |
| One click drives a Hunter round (6 states) back to rest | PASS |
| Armed fill present during holds at 1600/1200/2200ms, absent at rest | PASS |

Exercised against the real modules, in the browser, through Vite's module graph:

| Check | Result |
|---|---|
| Landing resolves to the engine's chosen segment — 2091 cases, 2–20 segments, offsets −1..+1, fractional turns | PASS, 0 wrong |
| Edge margin holds at ~1.72° for 5–20 segments, 3.6° at 2 | PASS |
| Landings in the outer third of a segment: 49% (was 14.5%) | PASS |
| 60 full games via `START_DUAL_SPIN` — valid winner, no stuck states | PASS, 0 stuck |
| 668 dual rounds / 90 sequential — Death Mark rounds correctly opt out | PASS |
| Fate landing before the player is a reducer no-op, then replayed by the hook | PASS, 335 races |
| All 10 abilities implement `describeStakes` | PASS |
| No situation line during `spinning_player` / `spinning_both` (spoiler check) | PASS, 0 leaks |
| 466 Fate spins each carried a board-state line, none naming the Fate | PASS |
| Death Mark on a shielded player narrates the Shield; still consumes it, still spends the mark | PASS |
| Live UI: Main reveals at 6.92s, Fate at 8.24s, 1.32s apart | PASS |
| Fate Wheel measurably still at 0.9s / 1.7s / 2.5s, moving from 3.7s | PASS |
| Reset during the 3s delay clears the pending timer — no stray spin, no errors | PASS |
| Host's one-at-a-time mode unaffected: Main 6.89s, Fate 13.0s | PASS |
| Story rail renders tones, newest round first; toggle collapses and restores | PASS |
| 1280×720: no horizontal overflow, action button at 669px of 720 | PASS |
| Console clean after a full reload (the two React warnings were HMR artefacts) | PASS |

**Phase 8 — edge-case sweep:**

| Check | Result |
|---|---|
| 2 / 5 / 8 / 12 / 15 / 20 players — 40 games each, valid winner every time | PASS, 240/240 |
| Chinese, Vietnamese, emoji-only, 120-char, duplicate and padded names | PASS |
| Blank and whitespace-only names rejected; whitespace trimmed | PASS |
| Duplicate names keep unique ids | PASS |
| Cannot start below `MIN_PLAYERS_TO_START` | PASS |
| Rapid double clicks: second spin ignored, second complete a no-op | PASS |
| Undo after elimination restores the roster; undo past the start is safe | PASS |
| Refresh mid-game: unicode names, bomb fuse, shield and mark all survive | PASS |
| Wrong `saveVersion` and corrupt JSON both rejected, not guessed at | PASS |
| Hunter / Duel with two alive: target forced, self excluded | PASS |
| Hunter vs Shield: blocked, shield spent, no bounty paid | PASS |
| Revive with one candidate; repeat revival increments `revivedCount` | PASS |
| Revived player returns clean (no shield, mark or bomb) | PASS |
| Duel coin flip exact at the 0.5 threshold; 50.1% over 4,000 samples | PASS |
| 20 players + worst-case names at 1280×720 and 1920×1080: no overflow | PASS |
| Resize mid-spin, twice, including during the 3s stagger — still resolves | PASS |
| Roster clamp: 120-char name 1137px → 198px, badges intact | FIXED |

**Wave 2 — Bomb:**

| Check | Result |
|---|---|
| Full cycle: planted 3 → passes 2 → 1 → detonates on the player selected at 0 | PASS |
| The Fate still runs on passing rounds; only the detonating tick replaces it | PASS |
| Shield blocks the blast, is consumed, and the bomb is spent either way | PASS |
| Death Mark consumes the round — bomb does not pass, fuse unchanged | PASS |
| Re-selecting the holder: keeps it, fuse still ticks | PASS |
| Unavailable while a bomb is live, and below 4 alive; absent from the wheel | PASS |
| 200 games: valid winners, 0 stuck, never two live bombs, never a negative fuse | PASS |
| Every bomb accounted for — 122 detonated, 148 announced as lost, 3 revived | PASS |
| Bomb rim renders on the wheel (53 orange pixels across the rim depth) | PASS |
| Status chip shows the fuse: `A💣3`, aria-label "Bomb, 3 rounds left" | PASS |
| One log line per beat — no duplicate narration on plant or pass | PASS |

---

# Browser-harness pitfalls

Verification here means driving the real modules in the dev page. It works and
has caught real bugs, but it has produced a **confidently wrong** reading four
times now. All five traps below cost real time; check them before believing any
verification result — every one of them is the same failure shape, a tool
reporting success while proving nothing.

1. **Query-string imports duplicate the module.** Vite treats
   `utils/random.ts` and `utils/random.ts?v=3` as separate instances, so
   `setRandomSource` seeded a copy the abilities never used. That produced a
   clean-looking "the Duel coin flip is broken" result from four ordinary random
   flips. **Import without query strings.** This is the strongest argument for
   the test files: a real test cannot reach that state.
2. **`requestAnimationFrame` is throttled when the pane is not compositing.**
   Both wheels read as motionless and every timing measurement was garbage. Shim
   it onto `setTimeout` — `cb(performance.now())` for real-time measurement, or
   `cb(performance.now() + 1e7)` to fast-forward whole spins.
3. **Canvas baselines taken at the wrong moment.** A "did the wheel move" probe
   took its baseline while the previous round's gold highlight was still up, so
   the highlight *clearing* registered as motion. Baseline after the state you
   are not measuring has settled.
4. **Budgets that are too short read as stalls.** A loop allowing 6s per round
   bailed mid-round on a Hunter round, which needs ~7.4s of holds alone even with
   spins fast-forwarded — and the next iteration then reported a stall that did
   not exist. Budget from the real timings, not from a guess.
5. **`npx rg` is not ripgrep on this machine.** It resolves to an unrelated npm
   package that prints `README.md already exists` and **exits 0** — reporting
   success while proving nothing — and it tries to write a README into the repo
   root. It already produced one false "verified clean" result during
   Enhancement Phase 3, on a check that no `final_five` survived the rename.
   **Use `git grep -n "pattern" -- src/`** (exit 0 = found, 1 = not found), or
   bare `rg` if it is on PATH. Never accept a clean result from `npx rg`.

Sampling radius matters too: rim markers are concentric bands, so a single
radius can fall between them and report zero. Sweep the depth.

---

# Notes for Next Agent

**The next step is playing, not building.** Three rounds of change have now
landed without a live session between them. Enhancement Phase 3a is the ship
point for the framework half of the ability expansion — the branch is releasable
and the host may play it. Prefer a real game over starting 3b.

**If you do start 3b**, read the ordering constraint in the plan first: the
removals run after the additions, because deleting Close Call and Steal Shield
while the new Fates are still outstanding drops the optional pool to exactly
four, and a draw of four from four is the same pool every session.

**If the host says the overlap still hurts:** the lever is
`DUAL_FATE_START_DELAY_MS` in `GameScreen.tsx`, not a revert. The round length
was a genuine problem and going back reintroduces it. Raising the delay past
~4.5s stops being an overlap at all, at which point disabling
`simultaneousSpin` is the honest choice.

Architecture boundaries have held for seven phases plus two reworks. Keep them:

- `src/game/` decides outcomes. Components render and dispatch.
- Randomness goes through `src/utils/random.ts` — including inside `resolve`.
- Abilities emit events. Only `eventResolver.ts` changes state; only
  `eventQueue.ts` decides ordering.
- Every elimination goes through `attackPlayer()`.
- Undo wraps the reducer from outside; snapshots, never replay.
- Effects and audio are subscribers. Adding a cue means a registry entry.
- **`Wheel` knows nothing about players, abilities or statuses.** Adapters map
  domain state onto generic entries and markers.

Adding a Fate is still a two-file change: write the `AbilityDefinition`, add it
to `ABILITIES`. It can now optionally carry its own `describeStakes` line, which
is still inside those two files.

If a new mechanic seems to need an engine change, the missing piece is usually
an event type or a status trigger, not a branch.

**Adding a status is now a three-file change**, and none of them is the reducer:
write the trigger in `game/statuses/`, register it in `SELECTION_TRIGGERS`, and
map it to a rim colour in `MainWheel`. Decide `replacesFate` deliberately — it
is the difference between a status that IS the round and one that merely happens
during it, and getting it wrong either stalls the game or lets a status be
quietly ignored.

**One trap from the previous session.** `Wheel` deliberately does not depend on
`entries` identity or on its timing props. If you add a prop that must affect a
spin, decide whether it should affect the spin *already running* — the answer is
almost always no, which means latching it in a ref rather than adding it to the
dependency array.

---

# Last Updated

```text
2026-08-14 (Enhancement Phase 3a — framework)
```
