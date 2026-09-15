import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { Simulation } from '../game/simulation.ts'
import { bossBarFraction, bossBarState, readHud, sameHud, type BossHud } from './hudState.ts'

const boss = (overrides: Partial<BossHud> = {}): BossHud => ({
  hp: 900,
  maxHp: 900,
  shielded: false,
  warning: false,
  ...overrides,
})

describe('HUD state', () => {
  it('reads lives, round and no boss from a fresh run', () => {
    assert.deepEqual(readHud(new Simulation(5)), { lives: 3, round: 1, boss: null })
  })

  it('reads the boss as shielded while entering and warning while winding up a beam', () => {
    const sim = new Simulation(5)
    const base = { hp: 500, maxHp: 900, x: 0, y: 0, size: 1, seed: 0, age: 0, attackIndex: 0, stanceTime: 0, volleyTime: 0, volleys: 0, aimedX: null }

    sim.boss = { ...base, stance: 'entering', attack: null }
    assert.deepEqual(readHud(sim).boss, { hp: 500, maxHp: 900, shielded: true, warning: false })

    sim.boss = { ...base, stance: 'winding', attack: 'beam' }
    assert.deepEqual(readHud(sim).boss, { hp: 500, maxHp: 900, shielded: false, warning: true })

    sim.boss = { ...base, stance: 'firing', attack: 'beam' }
    assert.equal(readHud(sim).boss?.warning, false)
  })

  it('compares every field', () => {
    const hud = { lives: 3, round: 1, boss: boss() }
    assert.ok(sameHud(hud, { ...hud, boss: boss() }))
    assert.ok(sameHud({ ...hud, boss: null }, { ...hud, boss: null }))
    assert.ok(!sameHud(hud, { ...hud, lives: 2 }))
    assert.ok(!sameHud(hud, { ...hud, round: 2 }))
    assert.ok(!sameHud(hud, { ...hud, boss: null }))
    assert.ok(!sameHud({ ...hud, boss: null }, hud))
    assert.ok(!sameHud(hud, { ...hud, boss: boss({ hp: 1 }) }))
    assert.ok(!sameHud(hud, { ...hud, boss: boss({ maxHp: 1 }) }))
    assert.ok(!sameHud(hud, { ...hud, boss: boss({ shielded: true }) }))
    assert.ok(!sameHud(hud, { ...hud, boss: boss({ warning: true }) }))
  })
})

describe('boss health bar', () => {
  it('fills by hp / maxHp clamped to 0 … 1, and 0 without a maximum', () => {
    assert.equal(bossBarFraction(boss({ hp: 450 })), 0.5)
    assert.equal(bossBarFraction(boss({ hp: -20 })), 0)
    assert.equal(bossBarFraction(boss({ hp: 1000 })), 1)
    assert.equal(bossBarFraction(boss({ maxHp: 0 })), 0)
  })

  it('is shielded while flying in, low at a quarter or less, normal above', () => {
    assert.equal(bossBarState(boss({ shielded: true, hp: 100 })), 'shielded')
    assert.equal(bossBarState(boss({ hp: 225 })), 'low')
    assert.equal(bossBarState(boss({ hp: 226 })), 'normal')
  })
})
