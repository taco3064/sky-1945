import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { inwardSign, pathPosition, type Edge, type PathName, type Point } from './paths.ts'

function assertNear(actual: number, expected: number, label: string) {
  assert.ok(Math.abs(actual - expected) <= 0.005 + 1e-9, `${label}: ${actual} ≉ ${expected}`)
}

function sample(path: PathName, edge: Edge, entry: Point, travelled: number): Point {
  return pathPosition(path, edge, entry, travelled, travelled / 165, inwardSign(edge, entry))
}

// §14.5 — entry (150, −40) from the top, age = travelled / 165
const FROM_TOP: Record<PathName, [number, number][]> = {
  dive: [[150, -40], [150, 90], [150, 220], [150, 360], [150, 480], [150, 660], [150, 860]],
  weave: [[150, -40], [80.91, 90], [172.26, 220], [207.02, 360], [107.78, 480], [143.35, 660], [187.84, 860]],
  arc: [[150, -40], [254.67, 90], [324.71, 220], [335.24, 360], [287.33, 480], [150, 660], [150, 860]],
  hover: [[150, -40], [150, 90], [150, 220], [150, 220], [150, 220], [150, 320], [150, 520]],
  feint: [[150, -40], [150, 237.13], [150, 390], [150, 358.94], [150, 220], [150, 400], [150, 600]],
}
const TOP_DISTANCES = [0, 130, 260, 400, 520, 700, 900]

// §14.5 — entry (−40, 200) from the left
const FROM_LEFT: Record<PathName, [number, number][]> = {
  dive: [[-40, 200], [220, 200], [480, 200], [660, 200]],
  weave: [[-40, 200], [220, 177.74], [480, 242.22], [660, 206.65]],
  arc: [[-40, 200], [220, 374.71], [480, 337.33], [660, 200]],
  hover: [[-40, 200], [220, 200], [220, 200], [320, 200]],
  feint: [[-40, 200], [390, 200], [220, 200], [400, 200]],
}
const LEFT_DISTANCES = [0, 260, 520, 700]

describe('flight paths', () => {
  for (const [path, points] of Object.entries(FROM_TOP) as [PathName, [number, number][]][]) {
    it(`${path} from the top matches the reference samples`, () => {
      points.forEach(([x, y], i) => {
        const at = sample(path, 'top', { x: 150, y: -40 }, TOP_DISTANCES[i])
        assertNear(at.x, x, `${path} x at ${TOP_DISTANCES[i]}`)
        assertNear(at.y, y, `${path} y at ${TOP_DISTANCES[i]}`)
      })
    })
  }

  for (const [path, points] of Object.entries(FROM_LEFT) as [PathName, [number, number][]][]) {
    it(`${path} from the left matches the reference samples`, () => {
      points.forEach(([x, y], i) => {
        const at = sample(path, 'left', { x: -40, y: 200 }, LEFT_DISTANCES[i])
        assertNear(at.x, x, `${path} x at ${LEFT_DISTANCES[i]}`)
        assertNear(at.y, y, `${path} y at ${LEFT_DISTANCES[i]}`)
      })
    })
  }

  it('mirrors the left edge for a right entry', () => {
    const at = pathPosition('weave', 'right', { x: 580, y: 200 }, 260, 260 / 165, 1)
    assertNear(at.x, 320, 'x')
    assertNear(at.y, 222.26, 'y')
  })

  it('bows arcs towards the field centre', () => {
    assert.equal(inwardSign('top', { x: 150, y: -40 }), -1)
    assert.equal(inwardSign('top', { x: 400, y: -40 }), 1)
    assert.equal(inwardSign('left', { x: -40, y: 200 }), 1)
    assert.equal(inwardSign('right', { x: 580, y: 200 }), -1)
  })

  it('bows inwards (sign 1) when the entry is on the centre line', () => {
    assert.equal(inwardSign('top', { x: 270, y: -40 }), 1)
  })
})
