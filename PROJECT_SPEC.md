# KOF — King of Fate

> A host-controlled, arcade-styled elimination party game built around two wheels:
> **Who gets selected?** and **What fate happens to them?**

---

## 1. Project Summary

**KOF — King of Fate** is a browser-based party game designed for a host to run on a normal computer screen while streaming the gameplay process to friends.

The core interaction uses two wheels:

1. **Main Wheel** — selects a player.
2. **Fate Wheel** — determines what happens to that selected player.

Unlike a normal elimination wheel, the selected player is not always eliminated. The Fate Wheel can produce protective, offensive, chaotic, neutral, or special-event outcomes.

The goal is to create a game that feels like an **arcade fighting game presentation**, with a modern UI carrying the flavour of classic 90s/2000s fighting games, without copying any specific existing game's assets or interface.

The experience should focus on:

- suspense before every spin,
- funny pauses and reactions between spins,
- dramatic fate reveals,
- strong sound and impact feedback,
- temporary player statuses,
- escalating danger as the player count decreases,
- a satisfying final winner sequence.

---

# 2. Product Vision

The game should feel less like:

> "a wheel website with some extra buttons"

and more like:

> "an arcade-style elimination party game where wheels are the main randomisation mechanic."

The wheels are therefore **components of the game**, not the game itself.

This distinction is important because future versions may temporarily hide or replace the wheels during:

- Duel events,
- Final Two sequences,
- special fate animations,
- victory scenes,
- future Boss / Jackpot / Team modes.

---

# 3. Primary Use Case

## Current usage

- One host.
- One computer.
- Game is displayed on the host's normal computer screen.
- Host streams the screen/process to friends.
- Host controls all major actions manually.
- No separate mobile controller is required.
- No multiplayer networking is required.
- No player login is required.

## Interaction philosophy

The game should **not auto-rush through events**.

The host should manually trigger major steps because a large part of the fun is expected to happen between actions while everyone reacts, jokes, complains, celebrates, etc.

### Amendment — the player spin flows into the Fate spin

*Changed after Phase 7 playtesting.*

"Who is selected" and "what happens to them" read as **one** question, and making the host click twice for it added a beat without adding drama. Once the Main Wheel lands, the Fate Wheel now starts on its own after a short pause that lets the name register.

The host pauses that remain are the ones where people actually react: **Resolve** and **Next Round**.

This does not apply to:

- **Again**, whose pause is deliberate (§11.4);
- **Death Mark**, which skips the Fate Wheel entirely (§11.6).

During the pause the action button still reads `SPIN FATE`, so an impatient host can click to skip the wait.

Example:

```text
Host clicks SPIN PLAYER
        ↓
Wheel spins
        ↓
JASON selected
        ↓
Short pause / people react
        ↓
Fate Wheel spins automatically
        ↓
HUNTER selected
        ↓
Reveal animation
        ↓
Host clicks CONTINUE / RESOLVE
        ↓
Game proceeds
```

### Amendment — both wheels spin together

*Changed after the second round of playtesting. Supersedes the sequence above.*

The two spins now start at the **same moment**. Auto-advance removed the extra click but not the extra wait: two full spins plus the beat between them ran ~12.9s of animation per round, which is about twelve minutes of watching wheels turn across a 20-player game.

The Fate Wheel is **staggered**: it appears immediately, armed and motionless, and launches three seconds into the Main Wheel's spin.

```text
Main   0.0s ──────────────────────────► 6.8s
Fate            3.0s ──────────────────────────► 8.2s
```

That gives the Main Wheel three seconds alone, which is where "who is it going to be" actually lives, while still overlapping the two spins for most of their length. WHO lands before WHAT with a 1.4s gap between the reveals. The round costs ~8.2s against ~12.9s sequential.

An earlier attempt started both wheels together and made the Fate Wheel 800ms longer instead. The reveal order came out right, but attention split for the whole spin — two wheels moving at once, neither of them clearly the thing to watch. The stagger keeps nearly all of the time saving and none of that problem.

The moment the Main Wheel lands is the best beat in the round: the name is up, the Fate is still crawling, and the situation line says what that player is carrying into it.

Rounds that do **not** spin together:

- **Death Mark is armed on the selected player.** The mark replaces the round's Fate (§11.6), so a Fate rolled alongside it would be discarded and its wheel left turning over a resolution already under way. These rounds fall back to the sequential flow above.
- **No Fate is available at all** — which cannot happen in practice, but is handled rather than assumed.

A **target** spin (Hunter, Duel) is unaffected: it reuses the Main Wheel *after* the Fate resolves, so there is nothing to overlap it with.

The host can switch back to one-at-a-time from the Host Panel (§22). It takes effect on the next round.

### The situation line

Under the WHO → WHAT readout sits one line of plain language explaining the state of play. It is entirely derived — no new state — and it changes through the round:

```text
while both wheels turn   (nothing — a line here would spoil the result)
Main Wheel lands         "Ali is up — 🛡 holding a Shield, 💀 already Marked."
Fate Wheel lands         "Ali is hit — 🛡 the Shield takes it."
awaiting a target spin   "Jason becomes the Hunter — spin for a target."
resolving                "Jason hunts Chris · ☠ Chris eliminated · 🛡 Jason gains a Shield"
```

Two rules make it safe to show:

1. **It never states an unrolled outcome.** A forecast may only repeat what is already visible on the wheel rims and in the status panel. Hunter and Duel say a target is coming without naming it, because the target spin has not happened yet.
2. **The forecast belongs to the Fate, not to the screen.** Each ability supplies its own wording, so a new Fate arrives with its own narration and no component learns its name.

While resolving, the line shows the last few events together rather than only the most recent. Hunter's payoff is three events, and showing only the last of them loses the causality that makes it read as a story.

---

# 4. Visual Direction

## Style

Target direction:

**Modern UI + classic arcade fighting-game flavour**

Not full pixel-art.

Not a direct reproduction of any existing fighting game.

Desired visual ingredients:

- bold typography,
- aggressive angled panels,
- arcade-style transitions,
- metallic / dramatic borders,
- strong contrast,
- impact flashes,
- slash / hit effects,
- screen shake,
- dramatic labels such as:
  - READY
  - FATE
  - DANGER
  - DUEL
  - BLOCK
  - K.O.
  - FINAL TWO
  - WINNER
- subtle retro arcade references,
- modern readability.

## Art direction rule

The game may be inspired by the feeling of classic arcade fighting games, but should avoid directly copying:

- logos,
- character artwork,
- exact UI layouts,
- copyrighted sprites,
- proprietary sound effects,
- recognisable branded visual assets.

KOF in this project stands for:

> **King of Fate**

---

# 5. Technical Direction

## Recommended stack

### Frontend

- **React**
- **TypeScript**
- **Vite**

### Wheel rendering

- HTML Canvas

### UI animation

Start with:

- CSS animations,
- CSS transitions,
- React animation state.

For heavier visual effects later:

- **PixiJS** can be added as an effects layer.

### Audio

- HTML Audio for simple playback.
- Web Audio API where tighter timing / mixing is required.

### Persistence

MVP:

- `localStorage`

No backend required for MVP.

### Hosting

- Vercel

---

# 6. Architecture Principle

The game logic must be separated from the wheel rendering.

The wheel should **display and animate a result**.

The wheel should **not own the game rules**.

Correct relationship:

```text
┌───────────────────┐
│    GAME STATE     │
└─────────┬─────────┘
          │
┌─────────▼─────────┐
│    GAME ENGINE    │
└─────────┬─────────┘
          │
     ┌────┴────┐
     │         │
┌────▼────┐ ┌──▼────────┐
│ MAIN    │ │ FATE      │
│ WHEEL   │ │ WHEEL     │
└────┬────┘ └──┬────────┘
     │          │
     └────┬─────┘
          │
┌─────────▼─────────┐
│ UI / EFFECTS / SFX│
└───────────────────┘
```

This is a core architectural requirement.

---

# 7. Core Game Loop

Each normal round follows this flow:

```text
IDLE
 ↓
SPIN_PLAYER
 ↓
PLAYER_SELECTED
 ↓
WAIT_FOR_HOST
 ↓
SPIN_FATE
 ↓
FATE_SELECTED
 ↓
FATE_REVEAL
 ↓
WAIT_FOR_HOST
 ↓
RESOLVE_FATE
 ↓
PLAY_RESULT_EFFECTS
 ↓
UPDATE_GAME_STATE
 ↓
CHECK_PHASE
 ↓
CHECK_WINNER
 ↓
NEXT_ROUND
```

The host must explicitly trigger major actions.

---

# 8. Main Wheel

## Purpose

Select one currently eligible player.

## Display

The Main Wheel should:

- be the dominant visual element,
- occupy roughly 60–70% of the wheel area on desktop,
- show all currently eligible player names,
- have smooth spin acceleration / deceleration,
- include segment tick feedback,
- use a pointer clearly aimed toward the wheel,
- support dynamic player removal / re-entry.

## Eligibility

Normally the wheel contains all currently alive players.

Some temporary effects may alter eligibility in future versions.

## Player selection

The Game Engine decides the selected player.

The wheel should animate to that result.

This allows:

- reproducible game state,
- undo,
- controlled animation,
- future seeded random support,
- clean separation of logic and visuals.

---

# 9. Fate Wheel

## Purpose

Determine what happens to the currently selected player.

## Activation

The Fate Wheel should be visibly inactive while no player is selected.

Example:

```text
MAIN WHEEL
[ SPIN ]

FATE WHEEL
🔒 WAITING
```

After the Main Wheel selects a player:

```text
JASON SELECTED

FATE WHEEL
⚡ ACTIVE
[ SPIN FATE ]
```

## Dynamic contents

The Fate Wheel must not use a permanently fixed list.

Available Fate entries should depend on:

- current game phase,
- number of alive players,
- eliminated player count,
- player status conditions,
- host configuration,
- specific ability eligibility.

Example:

- `Revive` should not appear if nobody is eliminated.
- `Steal Shield` should not appear if nobody has a shield.
- `Double Kill` should be disabled near the final stage if it could break the intended ending.

---

# 10. Game Phases

The game escalates automatically as players are eliminated.

There are five phases: **Chaos → Danger → Bloodbath → Final Four → Sudden Death**.

## How the bands are computed

The two upper bands are a **share of the starting roster**. The two endgame bands are **absolute counts** of players still alive.

```ts
{
  dangerAtShare: 0.7,     // alive share at or below this enters DANGER
  bloodbathAtShare: 0.4,  // ...                              BLOODBATH
  finalAt: 4,             // alive count at or below this enters FINAL FOUR
  suddenDeathAt: 2,       // ...                                SUDDEN DEATH
}
```

Why the split. An 8-player game and a 30-player game should spend roughly the same _proportion_ of their length in Chaos, so the upper bands scale with the roster. But "four left" means the same thing in both — it is a stage of the game, not a proportion of it — so the endgame bands do not scale.

**The endgame bands are tested first, and an absolute floor always wins.** The resolver checks Sudden Death, then Final Four, and only then computes the share. So the per-phase conditions below are each written as if the bands above them have already been ruled out. This matters most at tiny rosters, which the table below does not reach: `MIN_PLAYERS_TO_START` is 2, so a 5-player game with 4 alive is 80% of its roster — well inside the Chaos share — and still resolves to FINAL FOUR, because 4 is at the absolute floor.

Thresholds used to be absolute throughout (`dangerAt: 11`), which was a real bug rather than a rough edge: any game under 12 players started in DANGER and never saw Chaos at all.

The denominator is the roster the game **started** with — held on state as `startingPlayerCount`, not read from `players.length`. Roster edits are legal while idle, so a host tidying eliminated players away would otherwise shrink the denominator and quietly de-escalate the phase.

## Resulting bands

Alive counts per phase, by starting roster:

| Roster | Chaos | Danger | Bloodbath | Final Four | Sudden Death |
| --- | --- | --- | --- | --- | --- |
| 8 | 8–6 | 5 | never | 4–3 | 2 |
| 12 | 12–9 | 8–5 | never | 4–3 | 2 |
| 16 | 16–12 | 11–7 | 6–5 | 4–3 | 2 |
| 20 | 20–15 | 14–9 | 8–5 | 4–3 | 2 |
| 30 | 30–22 | 21–13 | 12–5 | 4–3 | 2 |

## Bloodbath is not reachable in small games

Bloodbath first appears at a roster of **13**. Below that, 40% of the start is already at or under the Final Four floor of 4, so the game steps straight from DANGER to FINAL FOUR.

That is intended, not a defect. Bloodbath exists to give a large game a step between "half the room is gone" and "four left". A short game has no room for that step, and a phase lasting a single round would be a transition animation rather than a phase.

## Why FINAL FIVE became FINAL FOUR

The endgame floor was 5. At a roster of 8 the 70% Danger band lands at 5 alive — so a floor of 5 would swallow that step and delete DANGER entirely from every game under roughly 12 players. Dropping the floor to 4 keeps Danger reachable at every supported roster size.

## Where the weights live

Per-phase Fate weights are deliberately **not** listed in the subsections below. They live in one table, `src/game/config/abilityWeights.ts`, keyed by ability and phase, with `config.abilities[id].weights` as an override on top (§32). Weights repeated in prose are how the numbers went stale before.

---

## 10.1 CHAOS PHASE

Condition:

```text
alive > 70% of the starting roster
```

Purpose:

- establish the game,
- generate early stories and statuses,
- avoid eliminating too many players too quickly.

Visual mood:

- energetic,
- relatively colourful,
- playful,
- lighter danger.

---

## 10.2 DANGER PHASE

Condition:

```text
alive ≤ 70% of the starting roster, and above the Bloodbath band
```

Transition:

A dedicated phase-change animation should appear:

```text
⚠ DANGER MODE ⚠
```

Purpose:

- increase elimination pressure,
- reduce harmless outcomes,
- introduce more aggressive abilities.

Visual mood:

- darker,
- stronger warning effects,
- more intense soundtrack / ambient loop if enabled.

---

## 10.3 BLOODBATH

Condition:

```text
alive ≤ 40% of the starting roster, and above the Final Four floor
```

Only reachable from a starting roster of 13 or more — see §10 above.

Transition:

```text
🩸 BLOODBATH 🩸
```

Purpose:

- give a large game a distinct step between Danger and the endgame,
- push lethality up before the roster is small enough to feel personal,
- start closing off comeback mechanics rather than cutting them dead.

Visual mood:

- red-shifted, heavier than Danger,
- the point where the game stops looking playful.

---

## 10.4 FINAL FOUR

Condition:

```text
alive ≤ 4
```

An absolute count, not a share — see §10 for why, and for why the floor is 4 rather than the 5 this section originally specified.

Transition:

```text
🔥 FINAL FOUR 🔥
```

Purpose:

- prevent the game from dragging,
- increase danger,
- reduce comeback mechanics.

Comeback and multi-kill Fates are suppressed here, but there is no removal list
any more — this is expressed as a weight of 0 in the `final_four` column of
`abilityWeights.ts`. Revive is the main one; Fate Swap and Double Kill were
never built (§12).

---

## 10.5 FINAL TWO / SUDDEN DEATH

Condition:

```text
2 players alive
```

The game should enter a dedicated endgame presentation.

Suggested label:

```text
☠ SUDDEN DEATH ☠
```

The normal Fate Wheel narrows here on its own, with no separate endgame pool: six of the eleven Fates carry a weight of 0 in the `sudden_death` column of `abilityWeights.ts`, and a weight of 0 keeps a Fate off the wheel entirely.

Goal:

- maintain suspense,
- avoid endless loops,
- reach a clear winner.

---

# 11. MVP Fate Abilities

The MVP should implement a deliberately limited set of abilities.

The internal ability system must still be designed so additional abilities can be added later without rewriting the core engine.

---

## 11.1 ELIMINATE

Icon:

```text
☠
```

Effect:

The selected player receives an elimination attack.

Resolution:

```text
If Shield > 0
    consume Shield
    player survives
Else
    eliminate player
```

Presentation:

- impact sound,
- flash,
- short screen shake,
- large `K.O.` or `ELIMINATED` overlay,
- player becomes visually inactive,
- name is removed from the active Main Wheel.

---

## 11.2 SHIELD

Icon:

```text
🛡
```

Effect:

Selected player gains one Shield charge.

MVP rule:

- maximum Shield stack: 1

Future versions may make this configurable.

Presentation:

- metallic / barrier sound,
- shield flash,
- badge appears beside player.

Example:

```text
JASON 🛡
```

---

## 11.3 SAFE

Icon:

```text
😇
```

Effect:

Nothing harmful happens.

Player remains alive.

Purpose:

- pacing,
- relief,
- comedic anticlimax.

Presentation should still feel intentional rather than "nothing happened."

Example:

```text
SAFE!
NOT TODAY.
```

---

## 11.4 AGAIN — REMOVED

*Removed after Phase 7 playtesting. Replaced by Double Fate (§12).*

Again re-rolled the Fate Wheel without adding anything. Measured over 5,220
rolls it was 8.9% of all outcomes and changed nothing on the board — together
with Safe it made almost a fifth of every spin dead air.

Double Fate keeps the "spin again" energy and turns it into the most explosive
result on the wheel instead of the emptiest.

## 11.4b CLOSE CALL

*Added after Phase 7 playtesting.*

Icon:

```text
😰
```

Effect:

The player survives, but never for free:

```text
Has a Shield  →  the Shield is destroyed absorbing the graze
No Shield     →  survives, but gains a Death Mark
```

That branch is what keeps it from being a reskin of Death Mark. For a shielded
player it is a real loss with no lingering threat; for an exposed player it is
survival bought on credit.

Safe (§11.3) still exists but is now rare. If every roll matters the tension
flatlines — an occasional clean escape is what makes the rest land.

---

## 11.5 HUNTER

Icon:

```text
🎯
```

Effect:

The selected player becomes the Hunter.

The Main Wheel spins again to choose a target.

Example:

```text
JASON
BECOMES THE HUNTER
```

Then:

```text
SPIN TARGET
```

Target receives an elimination attack.

Shield can block the attack.

The original Hunter does not get eliminated by the Hunter ability.

Target selection must exclude the Hunter.

### Bounty

*Added after Phase 7 playtesting.*

If the hunt **kills**, the Hunter gains one Shield.

```text
Target eliminated  →  Hunter gains 🛡
Target blocked     →  no reward
```

This turns Hunter from a coin-flip you survive into an outcome worth rolling. A Shielded target blocks the attack, so a blocked hunt pays nothing — the reward tracks the kill, not the attempt.

The Shield stack cap of 1 (§11.2) still applies, so a Hunter who already holds a Shield gains nothing.

Presentation:

```text
JASON
   VS
KELVIN
```

or:

```text
JASON HUNTS KELVIN
```

---

## 11.6 DEATH MARK

Icon:

```text
💀
```

Effect:

Selected player receives a persistent Death Mark.

Example:

```text
KELVIN 💀
```

Rule:

The next time that player is selected by the Main Wheel:

- do not spin the Fate Wheel,
- Death Mark activates,
- player receives an elimination attack,
- Death Mark is consumed.

Shield interaction:

MVP recommendation:

A Shield **can block** Death Mark activation.

This keeps status rules consistent:

> Shield blocks one elimination attack regardless of source.

---

## 11.7 REVIVE

Icon:

```text
❤️
```

Eligibility:

Only available if at least one player has already been eliminated.

Effect:

Randomly revive one eliminated player.

The revived player:

- returns to Alive,
- re-enters the Main Wheel,
- returns without Shield,
- returns without Death Mark.

MVP selection:

Random revival.

Future:

Could allow special revive modes.

---

## 11.8 DUEL

Icon:

```text
⚔
```

Effect:

The selected player enters a duel with another randomly selected alive player.

Flow:

```text
Amy selected
 ↓
Duel
 ↓
Spin opponent
 ↓
Jason selected
 ↓
AMY VS JASON
 ↓
Host starts Duel
 ↓
50 / 50 result
 ↓
Loser receives elimination attack
```

Shield interaction:

Shield can block the resulting elimination.

Duel opponent must exclude the initiating player.

Presentation can temporarily replace the normal wheel screen.

---

# 12. Post-MVP Fate Abilities

These should not necessarily be implemented in the first version, but the architecture must support them.

---

## DOUBLE KILL

Selected player receives an elimination attack.

Then another random eligible player receives an elimination attack.

Should be disabled when remaining player count is too low.

---

## FATE SWAP

Selected player exchanges temporary status effects with another random player.

Possible statuses:

- Shield
- Death Mark
- future Bomb
- future Curse
- future Blessing

---

## STEAL SHIELD

*Promoted to the live pool after Phase 7 playtesting.*

Selected player steals a Shield from another Shielded player.

If nobody owns a Shield, ability should not appear.

Chosen because only ~21% of rolls involved a second player and those were the
moments people actually reacted to. Steal Shield is the cheapest way to add
another: it needs no target spin, because the victim is simply whoever is
holding a Shield.

The thief's own Shield is irrelevant — a second is still capped at the MVP
maximum of 1 (§11.2), but the victim loses theirs regardless, which is the
point of the roll. If the only Shield holder turns out to be the thief, the
Fate announces that nothing was stolen rather than silently doing nothing.

---

## BOMB

*Promoted to the live pool in Wave 2 of the Fate rework. The open questions
below are now answered.*

A **hot potato**. The selected player is handed the bomb with a fuse of 3.

From then on every Main Wheel selection passes it to whoever was just picked and
drops the fuse by one. When the fuse runs out it goes off in the hands of the
player selected on that tick.

```text
Round 4   Bomb rolls on Daniel        💣3 Daniel
Round 5   Jason is selected           💣2 Jason
Round 6   Priya is selected           💣1 Priya
Round 7   Wei is selected             BOOM — Wei
```

### Why it passes rather than sitting still

A bomb that stays put and counts down is a slower Death Mark: the holder can do
nothing about it and nobody else has a stake in it. Passing it to whoever is
selected inverts that. Every spin becomes "not me", the rim marker visibly
travels around the wheel, and on the last tick being selected simply kills you.
The whole table watches one object for three rounds.

A consequence worth saying out loud: because it moves every round, *holding* it
between ticks is not itself dangerous. The danger is being selected on the final
tick. The bomb is a countdown everyone can see, wearing someone's name.

### Rules

- **One bomb at a time.** The Fate is unavailable while one is live. Two
  countdowns at once would break §45's simplicity requirement.
- **At least four players alive**, or the potato has nowhere to travel.
- **Shield blocks the blast**, through the shared attack flow, and the bomb is
  spent either way — the same rule as a Death Mark.
- **It does not eat the round.** A pass happens alongside the normal Fate. Only
  the detonating tick replaces the Fate Wheel, exactly as a Death Mark does.
- **Revival returns a clean player**, bomb included.
- **Weight 0 in Sudden Death** — a three-round fuse cannot tell its story when
  the game is one elimination from over.

### It dies with its holder, and says so

If the holder is eliminated by anything else, the bomb goes with them. That is
intended: dying to something else is a fair way to take it out of play.

Measured over 200 games, this is how **roughly half** of all bombs end, because
the player who takes the bomb then receives that same round's Fate — and an
Eliminate roll kills the bomb it was just handed. The countdown is therefore
announced when it ends this way, rather than silently vanishing.

If playtesting shows that fizzle rate is unsatisfying, the designed fix is to
move the tick to the **end** of the round, after the Fate has resolved, so the
bomb only ever passes to a player who survived. That was not done first because
it makes the detonation land between rounds, which costs the host an extra click
at the most dramatic moment in the mechanic.

---

## DOUBLE FATE

*Promoted to the live pool after Phase 7 playtesting, replacing Again (§11.4).*

Current selected player receives two Fate rolls.

Conflict rules, now that it ships:

- Both Fates resolve **in the order drawn**, through the normal event queue.
  Shield then Eliminate means the Shield is up in time to absorb the hit;
  Eliminate then Shield means the player is already gone and the Shield is
  discarded, because an eliminated player can never be armed.
- Draws are **without replacement**, so the same Fate never lands twice.
- A Fate whose target is already dead produces no events rather than
  double-killing.

Exclusions:

- **Itself**, which would recurse.
- **Any Fate needing a target spin** (Hunter, Duel). The engine tracks one
  pending target spin at a time, so two would overwrite each other and strand
  the first ability mid-resolution. A real limitation, not an oversight.
- **Sudden Death**, where two stacked Fates can produce an ending nobody can
  follow.

Note that two different Fates can still produce the same effect — Close Call
without a Shield and Death Mark both mark the player. `deathMark` is a boolean,
so this is harmless, but it does waste half the roll.

---

## CHAIN REACTION

One Fate can trigger additional Fate events.

Not MVP.

---

## JACKPOT / KING'S BLESSING

Very rare positive event.

Possible future effect:

- immunity,
- skip phase,
- status cleanse,
- special advantage.

---

# 12b. Session Fate Pool

Not every Fate in the registry is in play in every game.

At `START_GAME` the engine draws the **session pool**: every mandatory Fate, plus a fixed number of the optional ones. Only Fates in that pool can reach the wheel for the rest of the game — `getAvailableAbilities` filters on it before any other eligibility rule.

## Mandatory

Always in, every session:

- Eliminate
- Shield
- Death Mark
- Hunter
- Duel

These are what keeps a game moving. They also make category quotas unnecessary: the two failure modes worth guarding against are a session with no defence and a session with no Fate involving a second player, and Shield rules out the first while Hunter and Duel rule out the second. A quota system would be a second mechanism enforcing something already structurally true.

## Drawn

Four of the six optional Fates — Safe, Close Call, Revive, Steal Shield, Double Fate, Bomb.

Four is the draw size because C(6,4) = 15 distinct pools, and any one optional Fate sits out roughly one game in three. Drawing more would show most of the same Fates every session and the draw would stop being felt.

## The pool is fixed for the whole game

It is drawn once and **never re-rolled** — not on a phase change, not on undo, and not after a Revive.

A pool that moved mid-game would make the wheel a moving target for anyone following it. Half the tension in a late round comes from the room knowing what can still come up; if the set of possible Fates quietly changed under them, that knowledge would be worthless and the wheel would read as arbitrary rather than dangerous.

Because the pool is part of the game's identity, it lives on state (`sessionAbilityIds`) and is persisted with the save, so a resumed game continues with the pool it started with.

---

# 13. Player Status System

## MVP statuses

### Alive

Default active state.

### Eliminated

Player no longer appears in the active Main Wheel.

### Shield

```ts
shield: number
```

MVP range:

```text
0 or 1
```

### Death Mark

```ts
deathMark: boolean
```

---

## Display

Status badges should be visible near player names.

Example:

```text
Jason      🛡
Kelvin     💀
Amy
Daniel     🛡
```

The goal is to let viewers remember ongoing player stories.

---

# 14. Player Data Model

Suggested structure:

```ts
type Player = {
  id: string;
  name: string;
  status: "alive" | "eliminated";

  shield: number;
  deathMark: boolean;

  eliminatedAtRound?: number;
  revivedCount: number;
};
```

Future-ready fields may include:

```ts
bomb?: boolean;
curse?: string | null;
blessing?: string | null;
frozenRounds?: number;
metadata?: Record<string, unknown>;
```

Do not add unnecessary future fields to MVP state until needed.

---

# 15. Ability Definition Model

Abilities must be data-driven rather than hard-coded into giant switch statements.

Concept:

```ts
type AbilityDefinition = {
  id: string;
  name: string;
  icon: string;
  category: "attack" | "defense" | "chaos" | "neutral" | "special";

  isAvailable: (context: GameContext) => boolean;

  /** Always in the session pool when true. See §12b. */
  mandatory?: boolean;

  resolve: (
    context: GameContext,
    selectedPlayerId: string
  ) => GameEvent[];
};
```

Example:

```ts
const reviveAbility: AbilityDefinition = {
  id: "revive",
  name: "Revive",
  icon: "❤️",
  category: "special",

  isAvailable: (context) => context.eliminatedPlayers.length > 0,

  resolve: (...) => {
    // return game events
  }
};
```

**Phase exclusion is a weight of 0, not an availability check.** Revive used to
test `phase !== "final_four" && phase !== "sudden_death"` here; that gate is
gone. It now carries `final_four: 0` and `sudden_death: 0` in
`abilityWeights.ts`, and `getAvailableAbilities` drops anything whose resolved
weight is not above 0.

`isAvailable` is therefore reserved for conditions the weight table cannot
express — board state such as "somebody is eliminated" or "somebody owns a
Shield". A phase restriction written as an availability check is duplicating
what the table already says, and the two can then disagree.

---

# 16. Weighted Random System

The Fate Wheel should support weighted random selection.

Visual segment size may either:

### Option A — reflect actual probability

Larger chance = larger visible wheel segment.

### Option B — keep equal visual segments but use hidden weights

For fairness and readability, MVP recommendation:

> **Use visible segment size matching actual probability where practical.**

This makes the wheel behaviour easier to understand and avoids a misleading display.

The underlying selection must still be performed by the Game Engine before the wheel animation begins.

---

# 17. Event Queue

The game should use an Event Queue for resolving outcomes.

Do not let abilities directly control UI animation.

Example Hunter resolution:

```text
ABILITY_REVEALED: HUNTER
SHOW_MESSAGE: Jason became the Hunter
WAIT_FOR_HOST
REQUEST_TARGET_SPIN
TARGET_SELECTED: Kelvin
SHOW_VERSUS: Jason vs Kelvin
ATTACK_PLAYER: Kelvin
SHIELD_CHECK: Kelvin
ELIMINATE_PLAYER: Kelvin
SHOW_KO: Kelvin
END_ABILITY
```

This allows:

- controlled sequencing,
- animation timing,
- sound timing,
- host pauses,
- undo,
- future replay,
- easier debugging.

---

# 18. Suggested Game Event Types

Initial event vocabulary:

```ts
type GameEvent =
  | { type: "PLAYER_SELECTED"; playerId: string }
  | { type: "ABILITY_SELECTED"; abilityId: string }
  | { type: "SHOW_MESSAGE"; message: string }
  | { type: "WAIT_FOR_HOST" }
  | { type: "REQUEST_PLAYER_SPIN"; purpose: string }
  | { type: "ATTACK_PLAYER"; playerId: string; source: string }
  | { type: "SHIELD_BLOCK"; playerId: string }
  | { type: "ADD_SHIELD"; playerId: string }
  | { type: "ADD_DEATH_MARK"; playerId: string }
  | { type: "REMOVE_DEATH_MARK"; playerId: string }
  | { type: "ELIMINATE_PLAYER"; playerId: string }
  | { type: "REVIVE_PLAYER"; playerId: string }
  | { type: "PHASE_CHANGED"; phase: GamePhase }
  | { type: "GAME_WON"; playerId: string };
```

This list can evolve.

---

# 19. Game State Machine

Recommended high-level states:

```ts
type GameScreenState =
  | "setup"
  | "idle"
  | "spinning_player"
  | "spinning_both"
  | "player_selected"
  | "spinning_fate"
  | "fate_selected"
  | "resolving"
  | "special_event"
  | "phase_transition"
  | "winner";
```

`spinning_both` is both wheels turning at once (§3). It is a presentation state: the engine has already chosen WHO and WHAT, exactly as in the sequential path. It ends when the **Main** Wheel lands, handing over to `spinning_fate` while the Fate Wheel is still turning — which is what keeps the WHO → WHAT reading order even though the spins overlapped.

`player_selected` is now reached only on a sequential round.

Buttons must be enabled / disabled according to state.

Example:

```text
spinning_player
→ Fate Spin button disabled

player_selected
→ Main Spin disabled
→ Fate Spin enabled

resolving
→ all wheel input disabled
```

---

# 20. Main Game Screen

Suggested desktop composition:

```text
┌─────────────────────────────────────────────────────────────┐
│ KOF — KING OF FATE       ROUND 07      ALIVE 10/15          │
│                              ⚠ DANGER                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│             MAIN WHEEL              FATE WHEEL              │
│                                                             │
│              [ LARGE ]                [ SMALL ]              │
│                                                             │
│                WHO?                    WHAT?                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ JASON 🛡   AMY   KELVIN 💀   DANIEL   HAN   ...             │
├─────────────────────────────────────────────────────────────┤
│ LAST EVENT                                                  │
│ 🎯 Jason hunted Kelvin — Kelvin blocked with Shield         │
└─────────────────────────────────────────────────────────────┘
```

---

# 21. Responsive Behaviour

Primary target:

- desktop / laptop.

The app should still remain usable at smaller widths, but mobile is not an MVP priority.

Suggested minimum target:

```text
1280 × 720
```

Should scale cleanly to:

```text
1920 × 1080
```

Because the screen may be streamed, text must remain readable after streaming compression.

Avoid overly small player names.

---

# 22. Host Controls

The main game UI should remain clean.

Advanced controls should live in a hidden / collapsible Host Panel.

Possible shortcut:

```text
Ctrl + Shift + H
```

Host Panel MVP:

### Players

- Add player
- Remove player
- Edit player name
- Reset player list

### Game

- Start Game
- Reset Game
- Undo Last Action
- Save
- Resume
- Fullscreen

### Phase

MVP:

- Auto Phase

Future:

- manual phase override

### Audio

- master volume
- music volume
- SFX volume
- mute

---

# 23. Undo System

Undo is strongly recommended for MVP.

Reason:

Live games can have:

- accidental clicks,
- wrong input,
- browser hiccups,
- misunderstood results.

Implementation approach:

Before every state-changing action:

```ts
historyStack.push(deepClone(currentGameState))
```

Undo restores the most recent snapshot.

MVP:

- at least one-step undo.

Preferred:

- multiple-step undo stack.

Animations do not need to replay in reverse.

---

# 24. Persistence

Use `localStorage`.

Save:

- player list,
- current game state,
- current phase,
- statuses,
- eliminated players,
- round number,
- event history,
- configuration,
- audio preferences.

On page reload:

```text
Previous game detected.

[ RESUME GAME ]
[ START NEW GAME ]
```

---

# 25. Event History

The game should maintain a readable event log.

Example:

```text
Round 01
Jason → 🛡 Shield

Round 02
Amy → ☠ Eliminated

Round 03
Kelvin → 🎯 Hunter
Kelvin targeted Daniel
Daniel → 🛡 Blocked

Round 04
Han → 💀 Death Mark
```

Purpose:

- viewers can follow events,
- host can verify statuses,
- useful for debugging,
- adds narrative to the session.

## The story rail

*Added after the second round of playtesting.*

The log now has two homes, because those four purposes are not one audience:

| | Story rail | Host Panel log (§22) |
|---|---|---|
| Where | on the streamed screen, beside the wheels | behind Ctrl+Shift+H |
| For | viewers following the game | the host checking or debugging |
| Visible | always, unless the host hides it | only when the panel is open |

Both render from the same formatter, so the wording can never drift apart.

Rail rules:

- **Newest round first.** The latest beat must be readable without scrolling.
- **Colour-toned.** Every line carries a tone — `kill`, `threat`, `save`, `crown`, `info` — so a viewer registers that someone died before they finish reading the name. The tone is a property of the *event*, not of the component.
- **Dismissable.** The rail costs the wheels about a fifth of the width, and §8 wants the Main Wheel dominant. The host decides; nothing hides itself at a breakpoint.

---

# 26. Audio Design

Audio is an important part of the product identity.

MVP should support:

## Wheel

- spinning / ticking sound,
- deceleration rhythm,
- stop impact.

## Eliminate

Possible sequence:

```text
whoosh
→ impact
→ K.O. sting
```

## Shield

```text
impact
→ metallic barrier / block
```

## Death Mark

```text
dark sting
→ heartbeat / ominous hit
```

## Hunter

```text
target lock / dramatic cue
```

## Duel

```text
versus impact
→ fight cue
```

## Revive

```text
rising / restoration cue
```

## Phase Change

Dedicated stings:

- Danger
- Bloodbath
- Final Four
- Sudden Death

## Winner

- horn,
- victory sting,
- celebration SFX.

All audio assets should be original, licensed, public-domain, or otherwise legally usable.

---

# 27. Effects System

Effects should be triggered from game events.

Example mapping:

```ts
ELIMINATE_PLAYER
→ red flash
→ shake
→ K.O overlay
→ grayscale player
→ wheel removal

SHIELD_BLOCK
→ white/blue flash
→ shield burst
→ metallic sound

ADD_DEATH_MARK
→ dark overlay
→ skull pulse
→ heartbeat

PHASE_CHANGED
→ full-screen transition

GAME_WON
→ winner title
→ confetti
→ horn
```

---

# 28. Screen Shake

Two future levels are anticipated:

## Level 1 — DOM shake

Use CSS transforms on the main game scene.

Suitable for MVP.

## Level 2 — rendered camera shake

If PixiJS is introduced, shake the effects/game scene independently.

Host controls should not shake.

---

# 29. PixiJS Upgrade Path

PixiJS is **not mandatory for MVP**.

The codebase should allow it to be added later without changing Game Engine rules.

Potential PixiJS responsibilities:

- particles,
- slash trails,
- explosion effects,
- smoke,
- glow,
- animated overlays,
- sprite sheets,
- screen distortion,
- higher-quality impact effects.

React remains responsible for:

- menus,
- buttons,
- configuration,
- wheel coordination,
- state,
- host panel,
- game flow.

---

# 30. Setup Screen

Before starting:

```text
KOF
KING OF FATE

PLAYER SETUP
```

Host can:

- enter player names,
- paste multiline names,
- remove names,
- reorder if needed,
- choose a game preset.

MVP preset:

```text
NORMAL
```

Future presets:

```text
NORMAL
CHAOS
QUICK GAME
CUSTOM
```

---

# 31. Customisation Vision

The final product should eventually allow host customisation.

The MVP does not need to expose every configuration.

Architecture must not prevent it.

Future configuration areas:

---

## Ability Pool

```text
☑ Eliminate
☑ Shield
☑ Hunter
☑ Duel
☐ Revive
☑ Death Mark
```

---

## Ability Weight

Example:

```text
Eliminate    30
Shield       15
Hunter       10
```

---

## Phase Thresholds

Example, at the shipped defaults (§10):

```text
Danger        ≤ 70% of the starting roster
Bloodbath     ≤ 40% of the starting roster
Final Four    ≤ 4 alive
Sudden Death  ≤ 2 alive
```

---

## Game Speed

- Slow
- Normal
- Fast

---

## Sound

- Music
- SFX
- Voice lines
- Master Volume

---

## Visual Intensity

Potential future option:

```text
Low
Normal
MAXIMUM CHAOS
```

---

# 32. Game Configuration Model

Shape as built:

```ts
type GameConfig = {
  preset: "normal" | "chaos" | "quick" | "custom";

  phaseThresholds: {
    // Shares of the STARTING roster (§10).
    dangerAtShare: number;    // 0.7
    bloodbathAtShare: number; // 0.4
    // Absolute alive counts.
    finalAt: number;          // 4
    suddenDeathAt: number;    // 2
  };

  abilities: Record<
    string,
    {
      enabled: boolean;
      /**
       * OVERRIDE map, not the source of truth.
       *
       * Defaults live in one table, `src/game/config/abilityWeights.ts`.
       * Anything set here wins over that table; anything absent falls
       * through to it. Weights used to be declared twice — once per
       * ability file and once in the default config — with the config
       * copy silently winning and the ability-local numbers dead code.
       */
      weights: Partial<Record<GamePhase, number>>;
    }
  >;

  animationSpeed: "slow" | "normal" | "fast";

  simultaneousSpin?: boolean;

  audio: {
    master: number;
    music: number;
    sfx: number;
    muted?: boolean;
  };
};
```

Two fields on the **state** (not the config) are load-bearing for the above and must be persisted with a save:

```ts
type GameState = {
  // ...

  /**
   * The Fates in play for this game — §12b. Drawn at START_GAME,
   * never re-rolled.
   */
  sessionAbilityIds: string[];

  /**
   * The roster size the game began with — the denominator for the
   * share-based phase bands (§10). Captured at START_GAME rather than
   * derived from `players.length`, which is the CURRENT roster and can
   * shrink when a host edits players while idle.
   */
  startingPlayerCount: number;
};
```

Both are required, so a save written before they existed cannot be resumed — see the `SAVE_VERSION` note in `src/storage/gameStorage.ts` (§24).

---

# 33. Randomness

Create a dedicated random utility.

Do not scatter `Math.random()` throughout the application.

Example:

```ts
selectWeightedItem(...)
selectRandomPlayer(...)
shuffle(...)
```

Future benefit:

- seeded games,
- testing,
- deterministic debugging,
- replay.

MVP may internally use `Math.random()` inside the random utility.

---

# 34. Suggested Project Structure

```text
src/
│
├── app/
│   ├── App.tsx
│   └── routes.ts
│
├── components/
│   ├── GameHeader/
│   ├── MainWheel/
│   ├── FateWheel/
│   ├── PlayerList/
│   ├── PlayerBadge/
│   ├── EventLog/
│   ├── HostPanel/
│   ├── FateReveal/
│   ├── PhaseTransition/
│   └── WinnerScreen/
│
├── game/
│   ├── engine/
│   │   ├── gameEngine.ts
│   │   ├── reducer.ts
│   │   └── selectors.ts
│   │
│   ├── abilities/
│   │   ├── eliminate.ts
│   │   ├── shield.ts
│   │   ├── safe.ts
│   │   ├── again.ts
│   │   ├── hunter.ts
│   │   ├── deathMark.ts
│   │   ├── revive.ts
│   │   ├── duel.ts
│   │   └── index.ts
│   │
│   ├── phases/
│   │   ├── phaseConfig.ts
│   │   └── phaseResolver.ts
│   │
│   ├── events/
│   │   ├── eventTypes.ts
│   │   ├── eventQueue.ts
│   │   └── eventResolver.ts
│   │
│   ├── types/
│   │   ├── player.ts
│   │   ├── game.ts
│   │   └── ability.ts
│   │
│   └── config/
│       └── defaultConfig.ts
│
├── effects/
│   ├── EffectLayer.tsx
│   ├── effectRegistry.ts
│   └── screenShake.ts
│
├── audio/
│   ├── audioManager.ts
│   └── soundRegistry.ts
│
├── hooks/
│   ├── useGame.ts
│   ├── useWheel.ts
│   └── useAudio.ts
│
├── storage/
│   └── localStorage.ts
│
├── utils/
│   ├── random.ts
│   ├── weightedRandom.ts
│   └── ids.ts
│
└── styles/
    ├── globals.css
    ├── variables.css
    ├── animations.css
    └── arcade-theme.css
```

---

# 35. MVP Scope

The MVP should be playable from start to finish.

## Required

### Setup

- enter / paste players,
- remove players,
- start game.

### Main Game

- Main Wheel,
- Fate Wheel,
- host-controlled spin flow,
- current round,
- alive count,
- current phase,
- player status display.

### Abilities

- Eliminate
- Shield
- Safe
- Again
- Hunter
- Death Mark
- Revive
- Duel

### Phases

- Chaos
- Danger
- Final Four
- Sudden Death

Bloodbath was added after MVP (§10) and is not required for MVP scope.

### Effects

At minimum:

- wheel tick,
- wheel stop,
- fate reveal,
- eliminate impact,
- Shield block,
- phase transition,
- winner celebration.

### Game Management

- event log,
- undo,
- reset,
- local save,
- resume.

### End Game

- detect final player,
- Winner screen,
- victory sound,
- confetti / celebration.

---

# 36. Explicitly Out of MVP

These should not delay the first playable version:

- player photos,
- accounts,
- backend,
- database,
- phone remote controller,
- online multiplayer,
- AI,
- heavy sprite animation,
- advanced PixiJS scene system,
- complex custom ability editor,
- Bomb,
- Double Fate,
- Chain Reaction,
- Team Battle,
- Boss Mode,
- replay export,
- cloud saves.

---

# 37. MVP Acceptance Criteria

The MVP is considered complete when:

1. Host can add a group of players.
2. Host can start a game.
3. Main Wheel can select an alive player.
4. Fate Wheel activates only after a valid player selection.
5. Fate result follows current phase rules.
6. Every MVP ability resolves correctly.
7. Shield correctly blocks one elimination attack.
8. Death Mark correctly activates on the player's next Main Wheel selection.
9. Hunter cannot target the Hunter.
10. Duel cannot select the same player twice.
11. Revive cannot appear when nobody is eliminated.
12. Eliminated players disappear from normal Main Wheel eligibility.
13. Revived players return to the Main Wheel.
14. Game automatically updates phases based on alive player count.
15. Host remains in control between major game steps.
16. Game cannot accept conflicting inputs while animations are resolving.
17. Event log accurately records major events.
18. Host can undo an accidental action.
19. Refreshing the browser allows game recovery.
20. When one player remains, the game enters Winner state.
21. Winner sequence plays correctly.
22. Game remains comfortably usable on a normal desktop / laptop screen.
23. The codebase keeps Game Engine logic separate from rendering and effects.

---

# 38. Important Edge Cases

The implementation must explicitly handle:

### Hunter with only two players

Target must be the other player.

### Duel with only one eligible opponent

Automatically use that opponent.

### Revive after phase threshold change

After revival, phase should be recalculated.

Example:

Note the roster: with share-based bands an alive count alone no longer
determines a phase, so any example that omits the starting roster is
unverifiable.

```text
Roster 13, 5 alive  →  5/13 = 0.385 ≤ 0.4  →  BLOODBATH
→ Revive
6 alive             →  6/13 = 0.462        →  DANGER
```

Revive is genuinely on the wheel at that point: its Bloodbath weight is 2, and
only a non-zero weight puts a Fate on the wheel. It could **not** have been
drawn one step lower — at 4 alive the phase is always Final Four (an absolute
floor, tested first) and Revive's `final_four` weight is 0.

MVP recommendation:

> Allow phase recalculation both forward and backward.

This creates more chaotic comeback moments.

Can be changed later.

### Shield + Death Mark

If Death Mark activates while Shield exists:

```text
Death Mark consumed
Shield consumed
Player survives
```

### Shield + Duel loss

Shield blocks the Duel elimination.

### Shield + Hunter attack

Shield blocks the Hunter attack.

### Again loops

Repeated Again results are allowed.

Future safeguard can optionally limit excessive repeat chains.

### Revive the same player multiple times

Allowed.

Track:

```ts
revivedCount
```

### Player names

Must support:

- spaces,
- Unicode,
- Chinese,
- Vietnamese,
- emoji where practical.

Duplicate display names should be allowed internally using unique IDs.

---

# 39. Interaction Rules

Buttons must communicate current action clearly.

Examples:

```text
SPIN PLAYER
SPIN FATE
SPIN TARGET
START DUEL
RESOLVE
CONTINUE
NEXT ROUND
```

Avoid using one ambiguous permanent `SPIN` button for every context.

The main action button may change label according to game state.

---

# 40. Presentation Timing

The game should favour suspense over speed.

Recommended pattern:

```text
Spin
→ stop
→ short hold
→ reveal
→ host-controlled continue
```

Avoid immediately resolving Fate at wheel stop.

The host should have room for reactions.

---

# 41. Future Special Scene System

The architecture should anticipate temporary scenes.

Examples:

```text
Normal Wheel Scene
        ↓
Hunter Reveal Scene
        ↓
Target Wheel Scene
        ↓
KO Effect
        ↓
Normal Wheel Scene
```

or:

```text
Normal Wheel
↓
DUEL
↓
AMY VS JASON
↓
DUEL WHEEL
↓
K.O.
↓
Return
```

Potential future scene IDs:

```ts
type GameScene =
  | "wheel"
  | "fate_reveal"
  | "hunter"
  | "duel"
  | "phase_transition"
  | "sudden_death"
  | "winner";
```

---

# 42. Future Expansion Ideas

The architecture should be able to cater for:

- more Fate abilities,
- custom ability pools,
- custom probability,
- preset game modes,
- different visual themes,
- different wheel skins,
- advanced sound packs,
- player portraits,
- remote host controller,
- TV display mode,
- spectator screen,
- team battle,
- boss events,
- random event rounds,
- mystery boxes,
- streaks,
- achievements,
- match statistics,
- post-game recap.

These are not commitments for MVP.

---

# 43. Development Order

Recommended implementation sequence:

## Phase A — Foundation

1. Create React + TypeScript + Vite project.
2. Define core types.
3. Define Game State.
4. Build Game Engine reducer.
5. Build random utility.
6. Build phase resolver.

## Phase B — Wheel System

7. Port / rebuild existing Main Wheel into reusable component.
8. Make wheel receive:
   - entries,
   - selected result,
   - spin command.
9. Build Fate Wheel from same reusable wheel engine.

## Phase C — Basic Game Flow

10. Setup screen.
11. Player spin.
12. Fate spin.
13. Eliminate.
14. Safe.
15. Shield.
16. Again.

At this point, create the first fully playable vertical slice.

## Phase D — Advanced MVP Abilities

17. Death Mark.
18. Hunter.
19. Revive.
20. Duel.

## Phase E — Game Management

21. Phase transitions.
22. Event log.
23. Undo.
24. localStorage.
25. Resume game.

## Phase F — Presentation

26. Arcade UI theme.
27. Fate reveal overlays.
28. screen shake.
29. sounds.
30. Winner sequence.
31. final polish.

---

# 44. Design Principle Checklist

When adding a new feature, ask:

### Does this belong in Game Engine?

If it changes:

- who is alive,
- status,
- ability rules,
- eligibility,
- phase,
- outcome,

then yes.

### Does this belong in UI?

If it changes:

- layout,
- labels,
- buttons,
- display,

then UI.

### Does this belong in Effects?

If it changes:

- flash,
- shake,
- particles,
- animation,
- dramatic overlay,

then Effects.

### Does this belong in Audio?

If it controls sound playback or mixing, keep it in Audio.

Do not mix these responsibilities unnecessarily.

---

# 45. Product Personality

KOF — King of Fate should feel:

- dramatic,
- slightly ridiculous,
- suspenseful,
- playful,
- energetic,
- arcade-like,
- easy to understand while watching a stream.

It should not feel:

- corporate,
- overly clean / sterile,
- mechanically complicated,
- slow due to menus,
- visually cluttered,
- dependent on reading long instructions.

The rules may be sophisticated internally, but the viewer experience should remain simple:

```text
WHO?
 ↓
WHAT FATE?
 ↓
WHAT HAPPENS?
```

---

# 46. Current Decisions

Confirmed:

- Product name: **KOF — King of Fate**
- Visual direction: modern UI with classic arcade fighting-game flavour.
- No player portraits for now.
- Target display: normal computer screen.
- Gameplay will be streamed to friends.
- Host and display use the same device.
- Major game actions are host-controlled rather than fully automatic.
- Customisation is a future requirement.
- MVP should be intentionally simpler but architected for future customisation.
- React architecture is accepted.
- Recommended base:
  - React
  - TypeScript
  - Vite
  - Canvas wheel
  - CSS effects initially
  - optional PixiJS later
  - localStorage
  - Vercel

---

# 47. Open Questions — Non-Blocking

These do **not** block development and can be decided during implementation:

1. Exact default player-count thresholds for each phase.
2. Exact Fate probability values after play-testing.
3. Whether phase transitions can move backward after Revive.
4. Final wording:
   - `Eliminated`
   - `K.O.`
   - or both depending on context.
5. Whether the Duel wheel selects:
   - winner,
   - or loser.
6. Exact audio pack.
7. Exact colour palette.
8. Exact amount of screen shake / visual intensity.
9. Whether Shield stacking will ever be allowed.
10. Whether Fate Wheel segment sizes visually match probability or stay equal.

Current recommendations in this document can be used as defaults until play-testing proves otherwise.

---

# 48. Repository Goal

The repository should be understandable to a developer opening it without prior conversation context.

A developer should be able to understand:

- what the game is,
- what MVP includes,
- what is intentionally postponed,
- how the architecture is separated,
- how abilities are expected to work,
- how game phases work,
- how future abilities should be added,
- what user experience is intended,
- and what technical constraints currently exist.

This document should be treated as the initial source of truth and updated as requirements evolve.

---

## Working Title

# KOF
## KING OF FATE

> **Who gets chosen?  
> What fate awaits them?**
