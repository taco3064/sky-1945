import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { attackHash, bossAttack, type BossAttack } from './bossAttacks.ts'

// §14.6 — attack indices 0 → 19 for fixed seeds
const SEQUENCES: [seed: number, attacks: string][] = [
  [0, 'straight straight ram ram beam straight spread straight straight straight beam radial radial beam ram beam straight radial straight spread'],
  [1, 'ram straight ram straight radial radial ram straight spread ram ram radial ram spread beam ram beam spread straight ram'],
  [42, 'straight beam ram spread radial beam radial beam straight spread beam ram beam spread straight straight ram ram straight beam'],
  [123456789, 'ram beam radial spread ram ram ram radial radial beam ram radial ram ram straight ram ram ram spread ram'],
  [3735928559, 'ram ram radial ram ram radial beam ram straight ram ram spread beam ram beam radial spread straight beam spread'],
  [4294967294, 'beam straight beam spread straight ram beam ram spread radial beam radial ram beam straight radial ram beam straight straight'],
]

describe('boss attack order', () => {
  for (const [seed, attacks] of SEQUENCES) {
    it(`seed ${seed} matches the reference sequence`, () => {
      const actual = Array.from({ length: 20 }, (_, index) => bossAttack(seed, index))
      assert.deepEqual(actual, attacks.split(' ') as BossAttack[])
    })
  }

  it('hashes to unsigned 32-bit integers', () => {
    for (const seed of [0, 1, 0xfffffffe]) {
      for (let n = 0; n < 50; n++) {
        const h = attackHash(seed, n)
        assert.ok(Number.isInteger(h) && h >= 0 && h <= 0xffffffff)
      }
    }
  })

  it('never draws two beams in a row nor more than three positional attacks in a row', () => {
    for (let seed = 0; seed < 300; seed++) {
      let positionalRun = 0
      let previous: BossAttack | undefined
      for (let index = 0; index < 60; index++) {
        const attack = bossAttack(seed, index)
        assert.ok(!(attack === 'beam' && previous === 'beam'), `seed ${seed} index ${index}`)
        positionalRun = attack === 'beam' || attack === 'ram' ? positionalRun + 1 : 0
        assert.ok(positionalRun <= 3, `seed ${seed} index ${index}`)
        previous = attack
      }
    }
  })
})
