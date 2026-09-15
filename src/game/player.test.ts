import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createPlayer,
  isProtected,
  isRolling,
  isSpent,
  relaunchPlayer,
  setPlayerDirection,
  tryRoll,
  updatePlayer,
  type Player,
} from './player.ts'

const PASS = 1 / 60 / 4

/** Runs passes from `time`, returning the new time and every shot fired. */
function fly(player: Player, seconds: number, time = 0, speed = 1.5, power = 1.5) {
  const shots = []
  const passes = Math.round(seconds / PASS)
  for (let i = 0; i < passes; i++) {
    time += PASS
    shots.push(...updatePlayer(player, PASS, time, speed, power))
  }
  return { time, shots }
}

function controlled(): Player {
  const player = createPlayer(0)
  player.flyingIn = false
  player.y = 800
  return player
}

describe('player fly-in', () => {
  it('launches at (270, 1020), protected for 3 s', () => {
    const player = createPlayer(10)
    assert.deepEqual([player.x, player.y, player.flyingIn], [270, 1020, true])
    assert.ok(isProtected(player, 12.99))
    assert.ok(!isProtected(player, 13))
  })

  it('flies straight up at 620 u/s ignoring input, then is placed at (270, 800)', () => {
    const player = createPlayer(0)
    setPlayerDirection(player, 1, 0)
    fly(player, 0.1)
    assert.equal(player.x, 270)
    assert.ok(Math.abs(player.y - (1020 - 62)) < 1e-9)

    let time = 0.1
    while (player.flyingIn) time = fly(player, PASS, time).time
    assert.deepEqual([player.x, player.y], [270, 800])
    assert.ok(Math.abs(time - 220 / 620) < PASS)

    fly(player, PASS, time)
    assert.ok(Math.abs(player.x - (270 + 450 * PASS)) < 1e-9)
  })
})

describe('player steering', () => {
  it('moves at 300 × speed multiplier in the normalised input direction', () => {
    const player = controlled()
    setPlayerDirection(player, 3, 4)
    assert.ok(Math.abs(player.directionX - 0.6) < 1e-12 && Math.abs(player.directionY - 0.8) < 1e-12)

    fly(player, 0.1, 0, 2)
    assert.ok(Math.abs(player.x - (270 + 600 * 0.1 * 0.6)) < 1e-9)
    assert.ok(Math.abs(player.y - (800 + 600 * 0.1 * 0.8)) < 1e-9)
  })

  it('stops on a zero vector', () => {
    const player = controlled()
    setPlayerDirection(player, 0, 0)
    fly(player, 0.2)
    assert.deepEqual([player.x, player.y, player.directionX, player.directionY], [270, 800, 0, 0])
  })

  it('clamps x to [24, 516] and y to [24, 936]', () => {
    const player = controlled()
    setPlayerDirection(player, -1, -1)
    fly(player, 5, 0, 2)
    assert.deepEqual([player.x, player.y], [24, 24])
    setPlayerDirection(player, 1, 1)
    fly(player, 5, 0, 2)
    assert.deepEqual([player.x, player.y], [516, 936])
  })
})

describe('player guns', () => {
  it('fires its first volley 0.1333 s into the run, during the fly-in', () => {
    const player = createPlayer(0)
    assert.equal(fly(player, 0.125).shots.length, 0)
    assert.equal(fly(player, 0.0125, 0.125).shots.length, 2)
    assert.ok(player.flyingIn)
  })

  it('fires two parallel bullets at 780 u/s from (x ∓ 13, y − 26) for 7.5 × power', () => {
    const player = controlled()
    const shots = updatePlayer(player, 0.14, 0.14, 1.5, 2)
    assert.deepEqual(
      shots.map((shot) => [shot.x, shot.y, shot.heading, shot.speed, shot.damage]),
      [
        [257, 774, -90, 780, 15],
        [283, 774, -90, 780, 15],
      ],
    )
  })

  it('keeps firing 7.5 volleys per second and keeps the remainder', () => {
    const player = createPlayer(0)
    assert.equal(fly(player, 3.9).shots.length, 29 * 2)
  })

  it('fires several volleys in one pass when the timer holds them', () => {
    const player = createPlayer(0)
    assert.equal(updatePlayer(player, 0.3, 0.3, 1, 1).length, 4)
  })
})

describe('barrel roll', () => {
  it('is allowed at once, lasts 1.2 s and is allowed again 2.4 s after it started', () => {
    const player = controlled()
    player.invulnerableUntil = 0
    assert.ok(tryRoll(player, 5))
    assert.ok(isRolling(player, 6.19) && !isRolling(player, 6.2))
    assert.ok(isProtected(player, 6.19) && !isProtected(player, 6.2))
    assert.ok(isSpent(player, 7.39) && !isSpent(player, 7.4))
    assert.ok(!tryRoll(player, 7.39))
    assert.ok(tryRoll(player, 7.4))
  })

  it('never shortens existing protection', () => {
    const player = createPlayer(0)
    assert.ok(tryRoll(player, 0.5))
    assert.equal(player.invulnerableUntil, 3)
  })

  it('silences the guns but caps the fire timer at one interval, so a volley leaves right after', () => {
    const player = controlled()
    fly(player, 0.2)
    assert.ok(tryRoll(player, 0.2))

    const during = fly(player, 1.1, 0.2)
    assert.equal(during.shots.length, 0)
    assert.equal(player.fireTimer, 1 / 7.5)

    const after = fly(player, PASS, 1.4 + 1e-9)
    assert.equal(after.shots.length, 2)
  })

  it('is cleared by a relaunch, which keeps the fire timer and resets the direction', () => {
    const player = controlled()
    setPlayerDirection(player, 1, 0)
    player.fireTimer = 0.05
    tryRoll(player, 1)
    relaunchPlayer(player, 1.5)

    assert.deepEqual(
      [player.x, player.y, player.flyingIn, player.directionX, player.directionY, player.fireTimer],
      [270, 1020, true, 0, 0, 0.05],
    )
    assert.ok(!isRolling(player, 1.5) && !isSpent(player, 1.5))
    assert.ok(tryRoll(player, 1.5))
    assert.equal(player.invulnerableUntil, 4.5)
  })
})
