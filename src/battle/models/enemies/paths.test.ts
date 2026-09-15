import { describe, expect, it } from 'vitest'
import { type EnemyPath, inwardSign, pathPosition } from './paths'

type Sample = [number, number]

function expectSamples(
  edge: 'top' | 'left',
  entry: { x: number; y: number },
  travels: number[],
  path: EnemyPath,
  samples: Sample[],
) {
  travels.forEach((travelled, index) => {
    const position = pathPosition(path, edge, entry, travelled, travelled / 165)
    expect(position.x).toBeCloseTo(samples[index][0], 2)
    expect(position.y).toBeCloseTo(samples[index][1], 2)
  })
}

// game-spec 14.5, entry (150, −40) from the top, age = travelled / 165
describe('from the top', () => {
  const travels = [0, 130, 260, 400, 520, 700, 900]

  it.each<[EnemyPath, Sample[]]>([
    ['dive', [[150, -40], [150, 90], [150, 220], [150, 360], [150, 480], [150, 660], [150, 860]]],
    ['weave', [[150, -40], [80.91, 90], [172.26, 220], [207.02, 360], [107.78, 480], [143.35, 660], [187.84, 860]]],
    ['arc', [[150, -40], [254.67, 90], [324.71, 220], [335.24, 360], [287.33, 480], [150, 660], [150, 860]]],
    ['hover', [[150, -40], [150, 90], [150, 220], [150, 220], [150, 220], [150, 320], [150, 520]]],
    ['feint', [[150, -40], [150, 237.13], [150, 390], [150, 358.94], [150, 220], [150, 400], [150, 600]]],
  ])('%s follows the samples', (path, samples) => {
    expectSamples('top', { x: 150, y: -40 }, travels, path, samples)
  })
})

// game-spec 14.5, entry (−40, 200) from the left
describe('from the left', () => {
  const travels = [0, 260, 520, 700]

  it.each<[EnemyPath, Sample[]]>([
    ['dive', [[-40, 200], [220, 200], [480, 200], [660, 200]]],
    ['weave', [[-40, 200], [220, 177.74], [480, 242.22], [660, 206.65]]],
    ['arc', [[-40, 200], [220, 374.71], [480, 337.33], [660, 200]]],
    ['hover', [[-40, 200], [220, 200], [220, 200], [320, 200]]],
    ['feint', [[-40, 200], [390, 200], [220, 200], [400, 200]]],
  ])('%s follows the samples', (path, samples) => {
    expectSamples('left', { x: -40, y: 200 }, travels, path, samples)
  })
})

describe('from the right', () => {
  it('heads left and mirrors the across offset', () => {
    const entry = { x: 580, y: 331.2 }
    const position = pathPosition('arc', 'right', entry, 350, 0)

    expect(inwardSign('right', entry)).toBe(-1)
    expect(position.x).toBeCloseTo(230, 9)
    expect(position.y).toBeCloseTo(331.2 + 190, 9)
  })
})

describe('inwardSign', () => {
  it('is 1 when the heading points straight at the centre line', () => {
    expect(inwardSign('top', { x: 270, y: -40 })).toBe(1)
    expect(inwardSign('left', { x: -40, y: 480 })).toBe(1)
  })
})
