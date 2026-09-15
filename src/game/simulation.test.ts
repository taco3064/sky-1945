import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isOutside } from './field.ts'
import { Simulation } from './simulation.ts'

const STEP = 1 / 60
const PASS = STEP / 4

function sequence(values: number[]): () => number {
  let index = 0
  return () => values[index++ % values.length]
}

/** Size 1, and a seed whose first attack is the given one. */
const STRAIGHT_FIRST = sequence([1 / 6, 0.5 / 0xffffffff])
const BEAM_FIRST = () => sequence([1 / 6, (4294967294 + 0.5) / 0xffffffff])

function run(sim: Simulation, seconds: number, beforeStep?: () => void): void {
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    beforeStep?.()
    sim.step(STEP)
  }
}

function runUntil(sim: Simulation, done: () => boolean, maxSeconds: number, beforeStep?: () => void): void {
  const deadline = sim.time + maxSeconds
  while (!done()) {
    assert.ok(sim.time < deadline, `not reached within ${maxSeconds} s`)
    beforeStep?.()
    sim.step(STEP)
  }
}

/** A run whose aircraft never fires and never dies, stepped until the round's boss appears. */
function untilBoss(random: () => number): Simulation {
  const sim = new Simulation(5, random)
  sim.player.invulnerableUntil = Infinity
  sim.player.fireTimer = -Infinity
  runUntil(sim, () => sim.boss !== null, 60)
  return sim
}

function firstEnemyBullet(sim: Simulation) {
  sim.player.invulnerableUntil = Infinity
  runUntil(sim, () => sim.bullets.some((bullet) => bullet.side === 'enemy'), 10)
  const bullet = sim.bullets.find((b) => b.side === 'enemy')
  assert.ok(bullet)
  return bullet
}

/** A step so short that nothing moves, fires or arrives: it only checks where things are now. */
const INSTANT = 1e-6
/** Out of the way of the aircraft parked by `withEnemyBullets`, and of its relaunch point. */
const PARKED = { x: 480, y: 900 }

/**
 * A run holding at least `count` enemy bullets, all parked and still, with its unarmed aircraft flown in,
 * exposed and standing at (60, 900), away from every enemy.
 */
function withEnemyBullets(count: number) {
  const sim = new Simulation(5)
  sim.player.invulnerableUntil = Infinity
  sim.player.fireTimer = -Infinity
  runUntil(sim, () => sim.bullets.filter((b) => b.side === 'enemy').length >= count, 10)

  Object.assign(sim.player, { flyingIn: false, x: 60, y: 900, directionX: 0, directionY: 0, invulnerableUntil: 0 })
  const bullets = sim.bullets.filter((b) => b.side === 'enemy')
  for (const bullet of bullets) Object.assign(bullet, { ...PARKED, vx: 0, vy: 0 })
  return { sim, bullets }
}

/** Puts an entity `distance` u to the right of the aircraft's centre. */
function beside(sim: Simulation, entity: { x: number; y: number }, distance: number): void {
  Object.assign(entity, { x: sim.player.x + distance, y: sim.player.y })
}

describe('a fresh run', () => {
  it('starts in round 1 with 3 lives, no enemies and the aircraft at launch', () => {
    const sim = new Simulation(5)
    assert.deepEqual([sim.round, sim.lives, sim.enemies.length, sim.bullets.length, sim.boss], [1, 3, 0, 0, null])
    assert.deepEqual([sim.player.x, sim.player.y, sim.player.flyingIn], [270, 1020, true])
  })

  it('steers through the normalised input direction and rolls on request', () => {
    const sim = new Simulation(5)
    sim.setDirection(-2, 0)
    assert.deepEqual([sim.player.directionX, sim.player.directionY], [-1, 0])
    assert.equal(sim.tryRoll(), true)
    assert.equal(sim.tryRoll(), false)
  })

  it('uses the loadout: player speed and bullet damage', () => {
    const sim = new Simulation(10)
    sim.player.flyingIn = false
    sim.player.y = 800
    sim.setDirection(1, 0)
    sim.step(STEP)
    assert.ok(Math.abs(sim.player.x - (270 + 600 * STEP)) < 1e-9)

    run(sim, 0.2)
    assert.ok(sim.bullets.filter((b) => b.side === 'player').every((b) => b.damage === 7.5))
  })
})

describe('waves', () => {
  it('brings the first squad on the first pass and moves it once, so the entry point is never shown', () => {
    const sim = new Simulation(5)
    sim.step(STEP)
    assert.equal(sim.enemies.length, 4)
    for (const enemy of sim.enemies) {
      assert.ok(Math.abs(enemy.travelled - 165 * STEP) < 1e-9)
      assert.ok(enemy.y > -40)
    }
  })

  it('brings squad 1 at 0.7 s on the round clock', () => {
    const sim = new Simulation(5)
    sim.player.invulnerableUntil = Infinity
    runUntil(sim, () => sim.enemies.length > 4, 1)
    assert.ok(sim.time >= 0.7 && sim.time < 0.7 + STEP)
  })

  it('removes enemies that fly more than 60 u off the field, without a burst', () => {
    const sim = new Simulation(5)
    sim.player.invulnerableUntil = Infinity
    sim.player.fireTimer = -Infinity
    run(sim, 7.5)
    assert.ok(sim.enemies.length < 16)
    assert.ok(sim.enemies.every((enemy) => !isOutside(enemy.x, enemy.y, 60)))
    assert.equal(sim.bursts.length, 0)
  })
})

describe('bullets', () => {
  it('moves new bullets once in the pass they are fired and removes them 24 u beyond the field', () => {
    const sim = new Simulation(5)
    sim.player.invulnerableUntil = Infinity
    let sawPlayerBullet = false
    run(sim, 3, () => {
      for (const bullet of sim.bullets) assert.ok(!isOutside(bullet.x, bullet.y, 24))
      const fresh = sim.bullets.find((b) => b.side === 'player' && b.y > sim.player.y - 26 - 780 * PASS * 1.01)
      if (fresh) {
        sawPlayerBullet = true
        assert.ok(fresh.y < sim.player.y - 26)
      }
    })
    assert.ok(sawPlayerBullet)
  })
})

describe('contacts', () => {
  it('costs an unprotected player a life, bursts and relaunches it; the enemy bullet flies on', () => {
    const sim = new Simulation(5)
    const bullet = firstEnemyBullet(sim)
    Object.assign(sim.player, { flyingIn: false, x: bullet.x, y: bullet.y, invulnerableUntil: 0 })

    sim.step(STEP)
    assert.equal(sim.lives, 2)
    assert.ok(sim.bullets.includes(bullet))
    const burst = sim.bursts.find((b) => b.tone === 'ally')
    assert.ok(burst)
    assert.equal(burst.size, 'large')
    assert.deepEqual([sim.player.x, sim.player.flyingIn], [270, true])
    assert.ok(sim.player.invulnerableUntil > sim.time + 2.9)
  })

  it('spends the contact of a protected player: staying overlapped after protection ends is safe', () => {
    const sim = new Simulation(5)
    const bullet = firstEnemyBullet(sim)
    // Protected for the first pass only, when the overlap begins.
    Object.assign(sim.player, { flyingIn: false, x: bullet.x, y: bullet.y, invulnerableUntil: sim.time + 1.5 * PASS })

    sim.step(STEP)
    assert.ok(sim.time > sim.player.invulnerableUntil)
    assert.ok(Math.hypot(bullet.x - sim.player.x, bullet.y - sim.player.y) < 7)
    assert.equal(sim.lives, 3)
  })

  it('damages an enemy with a player bullet and destroys it at 0 HP with a small burst', () => {
    const sim = new Simulation(5)
    sim.player.invulnerableUntil = Infinity
    sim.step(STEP)
    const target = sim.enemies[0]
    target.path = 'dive'
    target.hp = 12
    Object.assign(sim.player, { flyingIn: false, y: 800 })

    runUntil(sim, () => target.hp < 12, 3, () => (sim.player.x = target.x + 13))
    assert.equal(target.hp, 12 - 11.25)

    runUntil(sim, () => !sim.enemies.includes(target), 3, () => (sim.player.x = target.x + 13))
    const burst = sim.bursts.find((b) => b.tone === 'enemy')
    assert.ok(burst)
    assert.deepEqual([burst.size, burst.x, burst.y], ['small', target.x, target.y])
  })

  it('lets one player bullet damage two enemies whose contacts start in the same pass', () => {
    const sim = new Simulation(5)
    sim.player.invulnerableUntil = Infinity
    sim.step(STEP)
    const [a, b] = sim.enemies
    for (const enemy of [a, b]) Object.assign(enemy, { path: 'dive', entry: { x: 200, y: -40 }, hp: 100 })
    b.travelled = a.travelled
    b.age = a.age
    Object.assign(sim.player, { flyingIn: false, x: 213, y: 800 })

    runUntil(sim, () => a.hp < 100, 3)
    assert.equal(a.hp, 88.75)
    assert.equal(b.hp, 88.75)
  })

  it('treats an enemy destroyed earlier in the pass as gone for the contacts that follow', () => {
    const sim = new Simulation(5)
    run(sim, 0.15)
    const [left, right] = sim.bullets.filter((b) => b.side === 'player')
    const target = sim.enemies[0]
    // After this pass's moves: bullet left of the enemy, player on it, bullet right of it — matter-js
    // reports the kill first, then the player's contact, then the second bullet's.
    const y = 300 + 165 * PASS
    Object.assign(target, { path: 'dive', edge: 'top', entry: { x: 200, y: 300 }, travelled: 0, age: 0, hp: 1 })
    Object.assign(sim.player, { flyingIn: false, x: 200, y, directionX: 0, directionY: 0, invulnerableUntil: 0 })
    Object.assign(left, { x: 186, y: y + 780 * PASS })
    Object.assign(right, { x: 214, y: y + 780 * PASS })

    sim.step(STEP)
    assert.ok(!sim.enemies.includes(target))
    assert.equal(sim.bursts.length, 1)
    assert.equal(sim.lives, 3)
    assert.ok(!sim.bullets.includes(left))
    assert.ok(sim.bullets.includes(right))
  })

  it("never costs a life for the player's own bullet", () => {
    const sim = new Simulation(5)
    run(sim, 0.15)
    const bullet = sim.bullets.find((b) => b.side === 'player')
    assert.ok(bullet)
    Object.assign(sim.player, { flyingIn: false, x: bullet.x, y: bullet.y - 780 * PASS, invulnerableUntil: 0 })

    sim.step(STEP)
    assert.equal(sim.lives, 3)
    assert.ok(sim.bullets.includes(bullet))
  })

  it('removes bursts after 0.6 s of simulated time', () => {
    const sim = new Simulation(5)
    const bullet = firstEnemyBullet(sim)
    Object.assign(sim.player, { flyingIn: false, x: bullet.x, y: bullet.y, invulnerableUntil: 0 })
    sim.step(STEP)
    const burst = sim.bursts.find((b) => b.tone === 'ally')
    assert.ok(burst)

    run(sim, 0.58)
    assert.ok(sim.bursts.includes(burst))
    run(sim, 0.04)
    assert.ok(!sim.bursts.includes(burst))
  })

  it('reaches 0 lives when the last life is lost', () => {
    const sim = new Simulation(5)
    const bullet = firstEnemyBullet(sim)
    sim.lives = 1
    Object.assign(sim.player, { flyingIn: false, x: bullet.x, y: bullet.y, invulnerableUntil: 0 })
    sim.step(STEP)
    assert.equal(sim.lives, 0)
  })
})

describe('graze', () => {
  it('starts a run at 0 PULSE and grants 8 per grazing enemy bullet, clamping the 13th to 100', () => {
    const { sim, bullets } = withEnemyBullets(13)
    const readings = [sim.pulse]
    for (const bullet of bullets.slice(0, 13)) {
      beside(sim, bullet, 20)
      sim.step(INSTANT)
      readings.push(sim.pulse)
      Object.assign(bullet, PARKED)
    }
    assert.deepEqual(readings, [0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 100])
    assert.equal(sim.lives, 3)
  })

  it('lets a bullet graze only once, even when it leaves the graze radius and comes back', () => {
    const { sim, bullets } = withEnemyBullets(1)
    const [bullet] = bullets
    beside(sim, bullet, 20)
    sim.step(INSTANT)
    beside(sim, bullet, 100)
    sim.step(INSTANT)
    beside(sim, bullet, 20)
    sim.step(INSTANT)
    assert.equal(sim.pulse, 8)
  })

  it('grazes out to 28 u, and never inside the 7 u hit distance', () => {
    const { sim, bullets } = withEnemyBullets(3)
    const [outside, edge, close] = bullets
    beside(sim, outside, 28.5)
    sim.step(INSTANT)
    assert.equal(sim.pulse, 0)
    beside(sim, edge, 28)
    sim.step(INSTANT)
    assert.equal(sim.pulse, 8)

    Object.assign(edge, PARKED)
    beside(sim, close, 7)
    sim.step(INSTANT)
    assert.deepEqual([sim.pulse, sim.lives], [8, 3])
  })

  it('grants nothing for a bullet that hits the player, nor for any other bullet in that pass', () => {
    const { sim, bullets } = withEnemyBullets(2)
    const [hit, grazing] = bullets
    beside(sim, hit, 0)
    beside(sim, grazing, -20)
    sim.step(INSTANT)
    assert.deepEqual([sim.lives, sim.pulse, grazing.grazed], [2, 0, false])
  })

  it('grants nothing while the player is protected or still flying in', () => {
    const { sim, bullets } = withEnemyBullets(2)
    const [first, second] = bullets
    sim.player.invulnerableUntil = Infinity
    beside(sim, first, 20)
    sim.step(INSTANT)
    assert.equal(sim.pulse, 0)
    Object.assign(first, PARKED)

    Object.assign(sim.player, { flyingIn: true, invulnerableUntil: 0 })
    beside(sim, second, 20)
    sim.step(INSTANT)
    assert.deepEqual([sim.pulse, sim.player.flyingIn], [0, true])
  })

  it("never grants PULSE for the player's own bullets", () => {
    const sim = new Simulation(5)
    run(sim, 0.15)
    const bullet = sim.bullets.find((b) => b.side === 'player')
    assert.ok(bullet)
    Object.assign(sim.player, { flyingIn: false, x: 270, y: 800, invulnerableUntil: 0 })
    Object.assign(bullet, { vx: 0, vy: 0 })
    beside(sim, bullet, 20)
    sim.step(INSTANT)
    assert.equal(sim.pulse, 0)
  })
})

describe('boss', () => {
  it('appears at (270, −52) only when every squad has appeared and no enemy aircraft remain', () => {
    const sim = untilBoss(STRAIGHT_FIRST)
    assert.equal(sim.enemies.length, 0)
    assert.ok(sim.time > 8.25)
    const boss = sim.boss
    assert.ok(boss)
    assert.deepEqual([boss.x, boss.stance, boss.size, boss.seed], [270, 'entering', 1, 0])
    // Summoned at the end of a pass, it has flown down for the rest of that step.
    assert.ok(boss.age < STEP)
    assert.ok(Math.abs(boss.y - (-52 + 420 * boss.age)) < 1e-9)

    run(sim, 5)
    assert.equal(sim.enemies.length, 0)
    assert.equal(sim.round, 1)
  })

  it('uses up player bullets that touch it, discarding their damage while entering', () => {
    const sim = untilBoss(STRAIGHT_FIRST)
    const boss = sim.boss
    assert.ok(boss)
    Object.assign(sim.player, { flyingIn: false, x: 270, y: 60, fireTimer: 0 })

    const touching = () =>
      sim.bullets.filter((b) => b.side === 'player' && Math.hypot(b.x - boss.x, b.y - boss.y) < 52 + 4 - 1)
    run(sim, 0.4, () => {
      assert.equal(touching().length, 0)
      assert.equal(boss.stance, 'entering')
    })
    assert.equal(boss.hp, boss.maxHp)
  })

  it('ends the round when killed: large burst, round + 1, next round squads start on the next pass', () => {
    const sim = untilBoss(STRAIGHT_FIRST)
    const boss = sim.boss
    assert.ok(boss)
    Object.assign(sim.player, { flyingIn: false, y: 800, fireTimer: 0 })
    runUntil(sim, () => boss.stance !== 'entering', 1)
    boss.hp = 20

    runUntil(sim, () => boss.hp < 20, 5, () => (sim.player.x = boss.x))
    assert.ok(sim.boss === boss && boss.hp === 20 - 11.25)
    runUntil(sim, () => sim.boss === null, 5, () => (sim.player.x = boss.x))

    assert.equal(sim.round, 2)
    const burst = sim.bursts.find((b) => b.size === 'large' && b.tone === 'enemy')
    assert.ok(burst)
    assert.deepEqual([burst.x, burst.y], [boss.x, boss.y])

    sim.step(STEP)
    assert.equal(sim.enemies.length, 4)
  })

  it('opens a beam on its muzzle that follows it, and closes it after 1.1 s', () => {
    const sim = untilBoss(BEAM_FIRST())
    const boss = sim.boss
    assert.ok(boss)
    runUntil(sim, () => sim.beam !== null, 3)
    const beam = sim.beam
    assert.ok(beam)
    assert.equal(boss.attack, 'beam')
    assert.equal(boss.stance, 'firing')
    assert.deepEqual([beam.x, beam.y], [boss.x, boss.y + 66 * boss.size + 500])

    sim.step(STEP)
    assert.deepEqual([beam.x, beam.y], [boss.x, boss.y + 66 * boss.size + 500])

    runUntil(sim, () => sim.beam === null, 1.2)
    assert.equal(boss.stance, 'recovering')
  })

  it('lets a player already protected when the beam opens on them survive the whole beam', () => {
    const sim = untilBoss(BEAM_FIRST())
    const boss = sim.boss
    assert.ok(boss)
    Object.assign(sim.player, { flyingIn: false, y: 800 })
    const underBoss = () => (sim.player.x = boss.x)

    runUntil(sim, () => sim.beam !== null, 3, underBoss)
    sim.player.invulnerableUntil = sim.time
    runUntil(sim, () => sim.beam === null, 1.2, underBoss)
    assert.equal(sim.lives, 3)
  })

  it('costs a life when an unprotected player enters the beam', () => {
    const sim = untilBoss(BEAM_FIRST())
    const boss = sim.boss
    assert.ok(boss)
    Object.assign(sim.player, { flyingIn: false, y: 800 })

    runUntil(sim, () => sim.beam !== null, 3, () => (sim.player.x = boss.x + 200))
    sim.player.invulnerableUntil = 0
    sim.step(STEP)
    assert.equal(sim.lives, 3)
    sim.player.x = boss.x
    sim.step(STEP)
    assert.equal(sim.lives, 2)
  })

  it('closes the beam at once when the boss dies', () => {
    const sim = untilBoss(BEAM_FIRST())
    const boss = sim.boss
    assert.ok(boss)
    Object.assign(sim.player, { flyingIn: false, y: 800, fireTimer: 0 })
    const underBoss = () => (sim.player.x = boss.x)

    runUntil(sim, () => sim.beam !== null, 3, underBoss)
    boss.hp = 1
    runUntil(sim, () => sim.boss === null, 1, underBoss)
    assert.equal(sim.beam, null)
  })
})
