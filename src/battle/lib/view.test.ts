import { describe, expect, it } from 'vitest'
import { createBoss } from './boss'
import { createBullet } from './bullet'
import { createBurst } from './burst'
import { createEnemy } from './enemy'
import { roundSchedule } from './waves'
import { tryRoll } from './player'
import { buildView } from './view'
import { createWorld } from './world'

const READINGS = { fps: 0, worst: 0 }

describe('buildView', () => {
  it('shows a fresh run', () => {
    const world = createWorld(5, Math.random)

    expect(buildView(world, READINGS, null)).toEqual({
      lives: 3,
      round: 1,
      gameOver: false,
      player: { id: 1, rolling: false, protected: true, spent: false },
      bullets: [],
      enemies: [],
      boss: null,
      beam: null,
      bursts: [],
      fps: 0,
      worst: 0,
    })
  })

  it('returns the previous view when nothing on screen changed', () => {
    const world = createWorld(5, Math.random)
    world.enemies.push(createEnemy(2, roundSchedule(1)[0], 0))
    const previous = buildView(world, READINGS, null)

    world.enemies[0].x += 5
    world.enemies = [...world.enemies]

    expect(buildView(world, READINGS, previous)).toBe(previous)
  })

  it('lists entities in creation order and replaces only the lists that changed', () => {
    const world = createWorld(5, Math.random)
    world.bullets.push(createBullet(2, { side: 'player', x: 0, y: 0, heading: -90, speed: 780, damage: 1 }))
    world.enemies.push(createEnemy(3, roundSchedule(1)[5], 0))
    const previous = buildView(world, READINGS, null)

    world.bullets.push(createBullet(4, { side: 'enemy', x: 0, y: 0, heading: 90, speed: 260, damage: 8 }))
    world.bursts.push(createBurst(5, 0, 0, 'enemy', 'small'))
    const next = buildView(world, READINGS, previous)

    expect(next).not.toBe(previous)
    expect(next.bullets.map(({ id, side }) => [id, side])).toEqual([[2, 'player'], [4, 'enemy']])
    expect(next.bullets).not.toBe(world.bullets)
    expect(next.enemies).toBe(previous.enemies)
    expect(next.enemies.map(({ id, kind }) => [id, kind])).toEqual([[3, 'large']])
    expect(next.bursts.map(({ id, tone, size }) => [id, tone, size])).toEqual([[5, 'enemy', 'small']])
    expect(next.player).toBe(previous.player)
  })

  it('updates the player state flags', () => {
    const world = createWorld(5, Math.random)
    const previous = buildView(world, READINGS, null)

    tryRoll(world.player, 0)
    world.time = 0.1

    expect(buildView(world, READINGS, previous).player).toEqual({ id: 1, rolling: true, protected: true, spent: true })
  })

  it('shows the boss without a move while entering, then its attack, hit points and beam', () => {
    const world = createWorld(5, Math.random)
    world.boss = createBoss(7, 2, { size: 1.5, seed: 1 })
    const entering = buildView(world, READINGS, null)

    expect(entering.boss).toEqual({ id: 7, size: 1.5, hp: 2325, maxHp: 2325, pose: 'entering', move: null })
    expect(entering.beam).toBeNull()

    Object.assign(world.boss, { pose: 'firing', attack: 'beam', hp: 2000, beam: { id: 8, x: 0, y: 0 } })
    const firing = buildView(world, READINGS, entering)

    expect(firing.boss).toEqual({ id: 7, size: 1.5, hp: 2000, maxHp: 2325, pose: 'firing', move: 'beam' })
    expect(firing.beam).toEqual({ id: 8 })
    expect(buildView(world, READINGS, firing)).toBe(firing)

    world.boss = null
    expect(buildView(world, READINGS, firing)).toMatchObject({ boss: null, beam: null })
  })

  it('carries lives, round, game over and the frame readings', () => {
    const world = createWorld(5, Math.random)
    const previous = buildView(world, READINGS, null)
    Object.assign(world, { lives: 0, round: 4, gameOver: true })

    expect(buildView(world, { fps: 58, worst: 21 }, previous)).toMatchObject({ lives: 0, round: 4, gameOver: true, fps: 58, worst: 21 })
  })
})
