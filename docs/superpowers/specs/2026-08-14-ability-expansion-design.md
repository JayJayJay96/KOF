# Enhancement Phase 3 — Ability Expansion

**Date:** 2026-08-14
**Status:** implemented — see PROJECT_STATUS.md for measured results
**Roadmap:** `DEVELOPMENT_ROADMAP.md` → Enhancement Phase 3

## Goal

Make every session play differently, and make defence a decision rather than a
free good.

Two changes carry the whole phase. A **session pool** draws four of eight
optional Fates at the start of each game, so no two sessions share a rule set.
And **Shield becomes Wall** — still the thing that blocks one hit, but now also
the thing a Gale can drop on top of you.

Origin: a proposal from the host's coworker, covering sixteen power-ups, a
weighted pool, and percentage-based phase progression. Roughly half of it was
already built. What follows is the merged design.

---

# Part 3a — Framework

No new abilities. Everything here is testable against the pool that already
exists, which is why it ships first.

## Session pool

At `START_GAME` the engine draws **four** of the eight optional Fates and stores
them in state. The five mandatory Fates are always in.

| Mandatory (5) | Optional (8) |
|---|---|
| Eliminate, Wall, Death Mark, Hunter, Duel | Safe, Revive, Double Fate, C4, Demolition, Gale, Fate Swap, Purify |

- `AbilityDefinition` gains `mandatory?: boolean`
- `GameState` gains `sessionAbilityIds: string[]`
- `getAvailableAbilities` gains one filter: mandatory, or drawn this session
- `SAVE_VERSION` 2 → 3

Undo is snapshot-based, so it needs no changes. Double Fate composes for free —
it already draws from `getAvailableAbilities`, so it can only pair Fates that
are in this session.

**Four, not the six the proposal suggested.** Six was written against an
eleven-power optional pool. Against eight it means every session shows 75% of
the same Fates and games feel identical. Four gives 70 distinct combinations and
each game genuinely omits half the pool.

**No category quotas.** The risk was a session drawing no defence or no
two-player Fate. The mandatory core already answers it: Wall guarantees defence,
Hunter and Duel guarantee two-player Fates. One less system.

**Side benefit.** `PROJECT_STATUS.md` lists "Fate Wheel segments are equal-sized
while selection is weighted" as an open product problem. Nine segments is more
readable than thirteen.

## Percentage-based phases, and a fifth

Thresholds are currently absolute — `dangerAt: 11`. The consequence is a bug
nobody had noticed:

> **Any game with fewer than 12 players starts in DANGER and never sees Chaos.**

Phase bands become a share of the **starting roster**, except the endgame, which
stays absolute because the last few rounds are about the stage of the game
rather than the proportion of it.

| Phase | Band |
|---|---|
| 🟢 Chaos | above 70% of starting roster |
| 🟡 Danger | alive ≤ 70% |
| 🔴 Bloodbath | alive ≤ 40% |
| 💀 Final Four | alive ≤ 4 (absolute) |
| ⚔️ Sudden Death | alive ≤ 2 (absolute) |

Read as a cascade, most severe first — exactly how `resolvePhase` already works.

Run against real rosters:

| Roster | Chaos | Danger | Bloodbath | Final Four | Sudden |
|---|---|---|---|---|---|
| 8 | 8–6 | 5 | *never* | 4–3 | 2 |
| 12 | 12–9 | 8–5 | *never* | 4–3 | 2 |
| 16 | 16–12 | 11–7 | 6–5 | 4–3 | 2 |
| 20 | 20–15 | 14–9 | 8–5 | 4–3 | 2 |
| 30 | 30–22 | 21–13 | 12–5 | 4–3 | 2 |

**Bloodbath first appears at 13 players and only becomes a real phase around
16+**, because below that 40% falls at or under the Final Four floor. This is
deliberate and not a defect: a game that ends in six eliminations does not need
five escalation tiers, and one that takes twenty-five does. Skipping a phase is
already safe — `resolvePhase` derives from the alive count and transitions fire
on change, so a phase that is never entered is simply never announced.

Starting roster comes from `players.length`, which retains eliminated players.
Roster edits are only legal at `setup` and `idle` (`reducer.ts` `canEditRoster`),
so it cannot shift mid-round.

### Final Five becomes Final Four

A consequence worth calling out, because it was not asked for.

The endgame floor has to be **4**, not the current 5. At 8 players, 70% is 5.6,
so Danger would trigger at 5 alive — and a Final Five floor of ≤5 would take
that step first. **An 8-player game would skip Danger entirely**, which is the
same class of bug this section exists to fix.

So `final_five` becomes `final_four`, label `FINAL FOUR`, announcement
`🔥 FINAL FOUR 🔥`. The endgame is one step shorter than it is today. Renamed
through the code rather than left as an id saying five while the screen says
four, for the same reason the Shield rename goes all the way down.

## One weights table

Each ability currently holds a local `WEIGHTS: Record<GamePhase, number>` **and**
`defaultConfig.ts` repeats the same numbers, with config winning via
`getAbilityWeight`. Two sources of truth for one fact.

Adding a fifth phase means touching both places for thirteen abilities. The
table is consolidated to one place first, which halves that work and removes the
drift.

Provisional weights, to be tuned by measurement:

| Fate | Chaos | Danger | Bloodbath | Final Four | Sudden |
|---|---|---|---|---|---|
| Eliminate | 18 | 24 | 30 | 34 | 50 |
| Wall | 12 | 10 | 8 | 8 | 12 |
| Death Mark | 10 | 12 | 12 | 8 | 0 |
| Hunter | 14 | 15 | 16 | 18 | 20 |
| Duel | 12 | 14 | 15 | 16 | 0 |
| Safe | 5 | 3 | 2 | 2 | 0 |
| Revive | 6 | 4 | 2 | 0 | 0 |
| Double Fate | 8 | 8 | 7 | 6 | 0 |
| C4 | 8 | 10 | 10 | 0 | 0 |
| Demolition | 6 | 7 | 8 | 6 | 6 |
| Gale | 6 | 8 | 10 | 10 | 12 |
| Fate Swap | 8 | 7 | 5 | 4 | 0 |
| Purify | 7 | 6 | 4 | 3 | 0 |

The shape the proposal asked for: utility falls, lethality rises. Eliminate
drops from its current 22 in Chaos because the session pool means fewer
competitors, so its *share* is roughly unchanged at ~19%.

---

# Part 3b — The pool

## Removed

**Close Call.** Unshielded, it emits `ADD_DEATH_MARK` — it *is* Death Mark with
an extra sentence.

> *"i want to remove the close call as it feels same as death mark"*

This closes a known issue for free. "Double Fate can waste half a roll" was only
ever the Close Call + Death Mark collision; with Close Call gone there is no
remaining pair that emits the same effect twice.

Dead-air check: Wave 1 cut "rolls that change nothing" from 19.4% to 3.3%, and
Close Call was part of that work. But Close Call always *did* something, so
removing it does not bring dead air back. Safe remains the only no-op, at
weight 5.

**Steal Shield → Fate Swap.** Net-neutral on the metric that mattered — both are
two-player Fates, and Wave 1 raised those from 20.7% to 37.1%. Fate Swap is
strictly richer because it moves marks and fuses as well as walls. It also
answers a question asked and rejected last session: Fate Swap is where "steal
the bomb" belongs, because the name is valence-neutral.

**Bomb → C4.** See below.

**Duel pays no bounty.** Considered and rejected: Hunter already owns "a kill
earns you armour", and two Fates paying the same bounty makes both weaker.

## Shield becomes Wall 🧱

Same mechanic — blocks the next elimination, then breaks. `MAX_WALL` stays at 1,
which is already enforced (`MAX_SHIELD = 1`, `eventResolver.ts:18`).

The rename exists to make Gale legible. A shield that attracts lightning asks
the viewer to reason about metal; a wall blowing over onto the person behind it
is instant. It also removes a lie: "Shield" promises safety, so making it lethal
read as a trick. A wall you hid behind falling on you is just what walls do.

**Renamed through the code, not only on screen.** `ADD_WALL`, `REMOVE_WALL`,
`WALL_BLOCK`, `Player.wall`, `MAX_WALL`. A codebase that says shield while the
game says Wall is exactly the drift that costs a future session an hour. The 65
tests catch mistakes, and `SAVE_VERSION` is bumping regardless.

Rim colour moves from light blue toward stone.

## Gale 💨 — new

A target spin across **every** living player, including the one whose Fate it
is. Where it lands:

- **Wall there** → the wall comes down on them. They die.
- **Open ground** → the gust passes. Nothing happens.

Routes through `attackPlayer` with a new `pierce` option, so AGENTS.md §7.7
still holds: elimination has one implementation. Gale only calls it when the
target is walled, and pierce stops the wall from blocking the very thing it
causes.

**Self is included.** Hunter and Duel exclude self because hunting yourself is
incoherent and a duel needs two people; a gale catching the person who called it
is perfectly coherent, and it is the funniest outcome available. A walled player
who rolls Gale is in immediate danger from their own Fate.

**Available at ≥2 walls**, so there is never a spin with one lonely target.

### The risk, stated before it ships

Gale whiffs. At 12 alive with 2 walls it misses 83% of the time, and it costs a
~10s target spin to do it. At weight 8 that adds roughly 6 points back onto a
dead-roll figure Wave 1 spent its whole budget pushing down to 3.3%.

It is not the same thing as Safe — two named people sweat publicly for eight
seconds, which is content. But it is the same *shape* as the complaint the host
made after playtest 1, so it ships measured, not assumed: **whiff rate across
200 games, reported before the phase closes.** If it is uglier than expected the
fix is dropping the weight, not changing the mechanic.

## Demolition 🔨 — new

Every living player loses their wall. Nobody is hurt. No target spin.

Available at **≥1 wall** — with one wall on the board it still clears the board
and pays nobody, so it always does something.

Named Demolition rather than EMP because an electromagnetic pulse does nothing
to masonry. It reads as the merciful opposite of Gale: walls come down on
purpose instead of on top of someone.

## C4 🧨 — replaces Bomb

Planted on the selected player. Ticks down on each Main Wheel selection.

That is the same cadence as "once per round" — there is exactly one selection
per round — but it keeps the countdown inside the status-trigger registry,
where every other status lives, rather than adding a special case to the
reducer.

- **The Main Wheel lands on the holder while it is live** → defused. This
  **consumes the round**, like a Death Mark, because the escape deserves the
  whole beat. No Fate is dealt.
- **The fuse reaches zero** → the holder and their two **wheel-adjacent**
  neighbours are attacked.

Neighbours are adjacency on the wheel — alive players only, wrapping at the
ends. Chosen over a fixed seat order because the audience can *see* it: a blast
that takes the two slices either side of the one that just lit up explains
itself with no commentary.

Neighbours are attacked through `attackPlayer` normally, so a walled neighbour
survives and loses their wall. The holder's own wall saves them too.

**The blast list is deduplicated.** The ≥6 floor governs *planting*, but a
5-round fuse can reach zero with three or two players left, where both
neighbours are the same person or the whole board. Resolve to a unique set, then
attack each once. Without this the last two players could take two hits from one
blast and a walled survivor would lose their wall twice.

**The fuse is not cleared when its holder dies to something else.**
`ELIMINATE_PLAYER` deliberately preserves `bombFuse` today
(`eventResolver.ts:96-98`) so a countdown the table has been following never
vanishes unexplained; C4 inherits that rule and the announcement that goes with
it.

### Why C4 rather than Bomb

Wave 2 argued that a stationary countdown is a slower Death Mark, which is why
Bomb passes from hand to hand. C4 is stationary and beats that objection by two
routes Bomb did not have: the **neighbours have a stake**, because they can see
what they are standing next to, and the **holder has a stake that inverts the
wheel** — being selected normally means dread, and for the C4 holder it means
rescue. That beat does not exist anywhere else in the game.

It also fixes Bomb's measured flaw. 49% of bombs died with their holder and the
countdown simply stopped; Wave 2 patched that with an announcement. C4 can only
end by being defused or by going off, so most fuses end out loud by construction
rather than by patch.

### Fuse length is an open number

At 12 players a 3-round fuse gives a 23% chance of ever being selected — the
only escape — so 77% of C4s detonate and take up to three people, a quarter of
the field in one beat.

Ships at **fuse 5** and an availability floor of **≥6 alive**, both measured the
way Bomb was measured over 200 games before Wave 2 closed. Bomb's floor was 4;
C4 kills up to three, so it needs more room.

`Player.bombFuse` becomes `Player.c4Fuse` and inherits the orange rim.
`bombTrigger.ts` is the template for `c4Trigger.ts`.

## Fate Swap 🔄 — new

Swaps every status — wall, death mark, C4 fuse — between the selected player and
a random other living player. No target spin.

Emitted as a single dedicated event rather than a sequence of primitives.
`SET_C4` clears every other holder as it moves, which is what makes "only one C4
exists" structural; a swap built from primitives could trip that invariant
depending on emit order. One atomic event cannot.

**It can still swap nothing.** Availability is board-level — "at least one
status exists somewhere" — because the Fate is chosen before the player is
known. Two clean players can therefore be paired. The partner is drawn from
players who **differ** from the selected one wherever such a player exists, which
reduces it to a rare case rather than eliminating it; when it does happen it is
narrated as an exchange of nothing rather than left silent.

## Purify ✨ — new

Removes a Death Mark from whoever is carrying one, drawn at random when there
are several. Available whenever a mark exists.

**Death Mark only — it cannot touch a C4.** C4 already has exactly one escape
route, and a second one appearing in half of all sessions would leave the
countdown toothless.

Board-level rather than aimed at the selected player, for a structural reason:
in the dual-spin path `useGame.ts:190` picks the Fate while `currentPlayerId` is
still `null`, so `isAvailable` can only ask questions about the board.
`stealShield.ts:44` already works this way deliberately. Aiming Purify at the
selected player would mean a Fate that does nothing most of the time.

When the selected player is the marked one, they cleanse themselves, which is
the best version of it.

---

## What does not change

**No new persistent statuses, and no new rims.** Demolition, Gale, Fate Swap and
Purify remove, pierce, move and clear what already exists; C4 takes Bomb's field
and its colour. The phase ends with the same three rims it began with — Wall,
Death Mark, C4. The eight-statuses-on-a-three-rim-wheel problem is real but it
is not this phase's problem.

**Target-spin budget.** Hunter, Duel and Gale are the three Fates that spin for
a target; the engine tracks one `pendingTargetSpin` at a time, so Double Fate
continues to exclude all three from what it can pair. Fate Swap and Purify use
random selection partly to keep that list short.

**Both wheels stay at 7800ms.** Unrelated to this phase and load-bearing —
recorded here because it is the constraint most likely to be broken by accident.

---

## Rejected

- **Ghost** (temporarily unselectable). Breaks the invariant that alive count
  drives both phase and wheel roster, deadlocks if everyone remaining is
  ghosted, and on stream "nothing can happen to this person for two rounds"
  removes drama rather than creating it. Wall is the readable version.
- **Bodyguard, Lucky Charm, Revenge, Bounty.** All need engine work this phase
  does not do: an interceptor chain in `attackPlayer` for the first two, kill
  attribution (`sourcePlayerId` on `ATTACK_PLAYER`) for the second two. Deferred
  to a later phase, not dropped.
- **Thief as distinct from Steal Shield.** "Steal one random beneficial status"
  is identical to Steal Shield until more than one beneficial status exists.
- **Global Gale** (every wall collapses on its owner). Makes Demolition
  redundant and makes taking a Wall a death sentence, which kills the only
  defensive power in the game.
- **A session-pool reveal screen.** Wanted eventually; the mechanics come first,
  and whether the pool difference is even noticeable is a question play answers.
- **Category quotas on the session draw.** Solved by the mandatory core instead.
- **Display-only rename of Shield.** Half the work, permanent vocabulary drift.
- **Keeping the Final Five floor at 5.** It collides with the 70% Danger band on
  small rosters and would delete Danger from any game under about 12 players.

---

## Verification plan

Engine tests, extending the existing 65:

- Session pool: mandatory always present; exactly four optional drawn; the pool
  is stable across a whole game; a v2 save is rejected rather than guessed at
- Phase thresholds at rosters of 8, 12, 16, 20 and 30 — including that Danger is
  never skipped, that Bloodbath is correctly absent below 13, and that phase
  still moves backward after a Revive
- Gale: hits a walled target, spares an unwalled one, may hit self, unavailable
  below 2 walls
- Demolition: clears every wall, unavailable at zero
- C4: plant, tick, defuse-on-selection consuming the round, detonation hitting
  three, a walled neighbour surviving and losing their wall, the blast list
  deduplicated at 2 and 3 alive, never two live C4s, never a negative fuse
- Fate Swap: statuses exchange exactly, the one-C4 invariant holds, a partner
  who differs is preferred
- Purify: clears a mark, cannot touch a C4, unavailable with no marks

Measured across 200 games, reported before the phase closes:

- **Gale whiff rate** — the number that decides whether its weight survives
- **C4 outcomes** — defused vs detonated vs died-with-holder, and kills per
  detonation
- Rolls that change nothing, against the 3.3% Wave 1 baseline
- Rolls involving a second player, against the 37.1% Wave 1 baseline
- Valid winner every game, no stuck states
