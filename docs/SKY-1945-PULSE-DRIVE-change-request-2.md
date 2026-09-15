# SKY-1945 — PULSE DRIVE Change Request

Add a new **PULSE DRIVE** mechanic to the existing game.

This document describes only the required player-visible behaviour and required numerical rules. Existing game behaviour that is not explicitly changed here must remain unchanged.

---

## 1. Pulse energy

The player has a new resource named **PULSE**.

- Range: `0` to `100`.
- A new run always starts at `0`.
- Energy survives player death and respawn.
- Energy survives round changes.
- Leaving the run and starting another run resets it to `0`.
- Energy can never exceed `100`.

The only way to gain PULSE is by grazing enemy bullets.

---

## 2. Grazing

An enemy bullet grants a graze when all of these are true:

- The bullet has never granted a graze before.
- The player is not flying in after spawn or respawn.
- The player is currently vulnerable.
- The bullet does not hit the player.
- Distance from the player centre to the bullet centre becomes `≤ 28 u`.
- Distance remains greater than the actual bullet/player hit distance.

Player hit radius is `3 u`; enemy bullet hit radius is `4 u`, so a bullet at distance `≤ 7 u` is a hit rather than a graze.

One qualifying enemy bullet grants:

```text
+8 PULSE
```

Each enemy bullet may grant energy **once in its lifetime**, even if it later leaves the graze radius and comes back.

Only ordinary enemy bullets and Boss bullet-pattern projectiles can be grazed.

These do **not** grant graze energy:

- Beam
- Enemy aircraft
- Boss body
- Player bullets

If a bullet would both hit and graze during the same simulation pass, **the hit wins and no PULSE is awarded**.

If an active Pulse Drive destroys a bullet before it reaches the player, that bullet does not grant graze energy.

---

## 3. Activation

PULSE DRIVE can activate only when:

- PULSE is exactly `100`.
- The run is actively playing.
- The player has finished flying in.
- No Pulse Drive is already active.

Activation immediately consumes all energy:

```text
100 → 0
```

Controls:

| Action | Keyboard | Touch |
| --- | --- | --- |
| PULSE | `X` | `PULSE` button |

The Loadout screen's existing controls table must gain this fourth row.

Pressing `X` while paused or during game over does nothing.

Pressing the touch button while paused or during game over does nothing.

Attempting activation below 100 energy does nothing.

---

## 4. Pulse lifetime

One activation lasts:

```text
0.60 s
```

of simulated time.

Pausing freezes its lifetime.

The player remains fully steerable and keeps firing normally during Pulse Drive.

Pulse Drive does not change:

- Player movement speed.
- Player fire rate.
- Player bullet damage.
- Loadout multipliers.

---

## 5. Protection

For the complete `0.60 s` active window, the player is invulnerable.

Pulse protection must never shorten existing protection.

If another source of protection already lasts longer, keep the later expiry.

For example:

- Existing respawn protection ends in 2 seconds.
- PULSE is activated now.
- Protection still lasts 2 seconds, not 0.6 seconds.

Pulse Drive does **not** affect barrel-roll recovery or roll availability.

---

## 6. Pulse radius

The Pulse is centred on the player's **current position** and follows the aircraft while active.

Its gameplay radius grows linearly with elapsed Pulse time:

```text
progress = elapsed / 0.60
radius = 180 × clamp(progress, 0, 1)
```

So:

| Time | Radius |
| ---: | ---: |
| 0.00 s | 0 u |
| 0.15 s | 45 u |
| 0.30 s | 90 u |
| 0.45 s | 135 u |
| 0.60 s | 180 u |

The radius is a filled gameplay area, not only a thin ring.

Anything newly entering the already-expanded area is still affected.

---

## 7. Enemy bullets

While Pulse Drive is active:

Any enemy bullet whose centre is within the current Pulse radius is removed immediately.

This includes:

- Small enemy bullets.
- Medium enemy spread bullets.
- Large enemy radial bullets.
- Boss straight, spread and radial bullets.

Player bullets are unaffected.

The Boss beam is unaffected.

A bullet removed by PULSE:

- Causes no damage.
- Grants no graze energy.
- Creates no explosion.

Within a simulation pass, Pulse bullet removal takes effect before a hostile bullet inside the Pulse area can hit the player.

---

## 8. Damage to enemies

An individual Pulse Drive activation may damage each enemy aircraft **at most once**.

An enemy is hit when:

```text
distance(player centre, enemy centre)
≤ current Pulse radius + enemy hit radius
```

Pulse damage to a normal enemy:

```text
50 HP
```

This damage is fixed.

It is not changed by:

- Player POWER.
- Round multiplier.
- Enemy size.

If Pulse damage kills an enemy, use the normal enemy death behaviour and normal enemy burst.

---

## 9. Boss damage

An individual Pulse activation may damage the Boss **at most once**.

Boss hit condition:

```text
distance(player centre, boss centre)
≤ current Pulse radius + boss current hit radius
```

Pulse damage to the Boss:

```text
120 HP
```

This is fixed and ignores:

- Player POWER.
- Round multiplier.
- Boss size.

Boss size still affects whether the expanding Pulse reaches it, because the Boss hit radius remains `52 × s`.

During the Boss arrival shield, Pulse damage is discarded exactly like player-bullet damage.

The activation still counts as having touched that Boss. The same Pulse must not damage it again after the shield ends.

If Pulse damage kills the Boss:

- Remove the Boss normally.
- Remove an active beam normally.
- Show the normal large Boss burst.
- Advance the round normally.

---

## 10. Visual effect

While active, draw a cyan Pulse around the player.

The visual centre follows the player.

Maximum diameter:

```text
360 u
```

Visual radius must match the gameplay radius.

Appearance:

```css
border: 3px solid #6ee7ff;
border-radius: 50%;
background:
  radial-gradient(
    circle,
    rgb(110 231 255 / 8%) 0%,
    rgb(77 163 255 / 12%) 55%,
    rgb(110 231 255 / 0%) 72%
  );
box-shadow:
  0 0 18px rgb(110 231 255 / 65%),
  inset 0 0 18px rgb(77 163 255 / 35%);
```

Opacity:

```text
0.00 s → 0.85
0.60 s → 0.15
```

Opacity interpolates linearly.

The Pulse visual must freeze when the game is paused because its visible size represents gameplay state.

Reduced-motion mode:

- Keep the required expanding gameplay radius visible.
- Remove additional decorative pulsing or flickering if any is added.
- Do not replace the expanding radius with an instantaneous full-size circle.

The Pulse is drawn:

- Above speed lines.
- Above bullets and aircraft.
- Below HUD and pause/game-over overlays.

---

## 11. HUD meter

Add a PULSE meter to the gameplay HUD.

Position:

```text
bottom: 0.75rem
left: 50%
transform: translateX(-50%)
width: min(42%, 18rem)
```

Structure:

```text
PULSE                     64%
[================---------]
```

Label/value row:

- `font-size: 0.58rem`
- `letter-spacing: 0.18em`
- `color: #9bb4c9`
- Value uses tabular numbers.

Track:

- Height `6px`
- Background `#16202c`
- Border `1px solid #233040`
- Border radius `999px`

Fill:

```css
background: linear-gradient(
  90deg,
  #2b6ba8 0%,
  #4da3ff 55%,
  #6ee7ff 100%
);
```

Fill amount:

```text
energy / 100
```

When energy reaches `100`:

- Value text changes from `100%` to `READY`.
- Label and value colour become `#6ee7ff`.
- Track receives `box-shadow: 0 0 10px rgb(110 231 255 / 45%)`.

Do not animate the meter while paused.

---

## 12. Touch PULSE button

Add a circular gameplay button near the bottom-right of the field HUD.

Position:

```text
right: 0.75rem
bottom: 0.65rem
```

Size:

```text
3rem × 3rem
```

Text:

```text
PULSE
```

Style when ready:

```css
color: #eafcff;
background: rgb(19 28 39 / 90%);
border: 1px solid #6ee7ff;
box-shadow: 0 0 10px rgb(110 231 255 / 35%);
```

Font:

- `font-size: 0.55rem`
- `letter-spacing: 0.08em`

When PULSE < 100:

- Same shape.
- `opacity: 0.35`.
- Border becomes `#233040`.
- Activating it has no effect.

The button is visible while playing.

While paused it remains visible but cannot activate PULSE.

During game over it is hidden.

It must remain usable independently of the steering touch surface.

---

## 13. Death and round behaviour

When the player dies:

- Existing death / burst / life behaviour remains unchanged.
- PULSE energy is preserved.
- Any currently active Pulse Drive ends immediately.
- Respawn protection is applied normally.

When a new round begins:

- PULSE energy is preserved.
- An active Pulse is allowed to continue naturally across the round boundary if it has time remaining.

When leaving to TITLE:

- The current run ends.
- Starting another run begins with PULSE = 0.

---

## 14. Pause behaviour

While paused:

- Pulse lifetime freezes.
- Pulse radius freezes.
- PULSE energy does not change.
- Graze detection stops.
- Pulse damage and bullet clearing stop.
- Pressing `X` does nothing.
- The touch PULSE button does nothing.

Existing CSS animations elsewhere in the game keep their existing pause behaviour.

---

## 15. Required edge cases

The following behaviours are part of the requirement:

1. A bullet may only grant graze energy once.
2. A bullet that actually hits the player grants no graze.
3. An invulnerable player cannot earn graze energy.
4. A bullet removed by Pulse cannot also hit or graze the player in that pass.
5. One Pulse activation can damage the same enemy only once.
6. One Pulse activation can damage the Boss only once.
7. Boss arrival shielding consumes the Pulse's single Boss hit without damage.
8. Pulse protection never shortens a longer respawn or roll protection window.
9. Player death immediately ends the active Pulse but keeps stored PULSE energy.
10. Enemy bullets created inside an already-expanded active Pulse are removed before they can damage the player.
11. The beam is never removed or damaged by Pulse.
12. PULSE can never exceed 100.

---

## 16. Acceptance scenarios

### Graze

Start from `0`.

Graze thirteen different enemy bullets without being hit:

```text
0
8
16
24
32
40
48
56
64
72
80
88
96
100
```

The final gain clamps to 100.

The same bullet passing nearby twice must still grant only `8`.

### Activation

At PULSE `100`:

```text
press X
→ energy immediately becomes 0
→ Pulse radius begins at 0
→ Pulse lasts 0.60 simulated seconds
→ player is protected for that active window
```

### Bullet clearing

At Pulse elapsed time `0.30 s`:

```text
radius = 90 u
```

An enemy bullet at distance `89` from the player is removed.

An enemy bullet at distance `91` remains.

### Normal enemy

At Pulse radius `100`:

A small enemy whose centre is `112 u` from the player is hit because:

```text
112 ≤ 100 + 13
```

It loses exactly `50 HP`.

It cannot take another 50 from the same activation.

### Boss

Boss size:

```text
s = 1.5
hit radius = 78
```

At Pulse radius `100`, a Boss centre at distance `177` is hit:

```text
177 ≤ 100 + 78
```

It loses exactly `120 HP` if not shielded.

At distance `179`, it is not hit.

### Death

Player has:

```text
PULSE = 72
```

Player dies.

After respawn:

```text
PULSE = 72
```

If Pulse Drive was active when death occurred, it is no longer active.

---

## 17. Existing behaviour

Anything not explicitly changed above must continue to match the current game specification.

Do not change unrelated gameplay values, timing, visuals or controls.
