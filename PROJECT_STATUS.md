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
Phase 8 — Full-Game Validation   (IN PROGRESS — host-led playtesting)

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

Fate rework Waves 2 and 3 are designed but NOT started — see Next Tasks.
```

# Live Deployment

```text
https://kof-ten.vercel.app/
```

Publicly reachable, no Vercel Deployment Protection.
Auto-deploys from `main` on push (live ~15s after push).

# Current Objective

Play real games. Two rounds of changes have now landed without a full session
between them. The measurements say the Fate pool is not dead air and that the
round is 40% shorter; they say nothing about whether it is *fun*. Wave 2 (Bomb)
should wait until this has been felt live.

---

# Repository

```text
GitHub   https://github.com/JayJayJay96/KOF
Branch   main
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

# Completed This Session — Phase 8 edge-case sweep

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

Nothing. Working tree clean.

Playtest round 2 (`ac01826`) and Wave 2 / Bomb (`b28211e`) are both **merged,
pushed and deployed**. The live site is current.

---

# Next Tasks

## Next build work — Enhancement Phase 0 (Technical Cleanup)

The host has closed the Fate pool, so the next phase is consolidation, not
mechanics. `DEVELOPMENT_ROADMAP.md` Enhancement Phase 0 asks for:

- **Unit tests for engine behaviour** — the named list is Shield blocks attack,
  Death Mark triggers once, Hunter excludes self, Duel excludes self, Revive
  only draws from the eliminated pool, winner detection, phase transitions,
  weighted Fate selection. Bomb's pass/tick/detonate cycle now belongs on that
  list too.
- **Architecture review** — duplicated logic, oversized components, registry and
  engine boundaries, event queue, random utility, snapshots, types.
- **Save schema versioning** — already done in Phase 6 (`SAVE_VERSION`), so this
  item is closed.

No test runner is installed. Every verification to date has been a hand-rolled
browser harness, rebuilt each session, and one of them silently produced a false
result this session (see the module-instance bug above).

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

- `npm run build` — passes, 67 modules, no type errors.
- `npm run lint` (oxlint) — clean.
- `npx prettier --check` — all files conform.

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

# Notes for Next Agent

**The next step is playing, not building.** Two rounds of change have landed
without a live session between them. Do not start Wave 2 until the host has
played real games and said what felt wrong.

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
2026-08-14
```
