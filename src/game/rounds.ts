import type { Edge, PathName, Point } from './paths.ts'

export type EnemyKind = 'small' | 'medium' | 'large'

export type Squad = {
  /** Position of the squad in the round, counting through the waves in order. */
  slot: number
  /** Round clock time (s) at which every craft of the squad arrives. */
  time: number
  kind: EnemyKind
  path: PathName
  edge: Edge
  lanes: number[]
  entries: Point[]
}

const WAVE_INTERVAL = 2.75
const SQUAD_INTERVAL = 0.7
const SQUAD_SIZE = 4

/** Difficulty multiplier `m`: 1.0 in round 1, +0.1 per round, capped at 2.0 from round 11. */
export function roundMultiplier(round: number): number {
  return 1 + Math.min(Math.max(round - 1, 0), 10) / 10
}

/** The round's four waves, in order: small, small, medium, large. */
export function roundWaves(round: number): { kind: EnemyKind; count: number }[] {
  const g = Math.floor((round - 1) / 2) * 2
  return [
    { kind: 'small', count: Math.min(8 + g, 16) },
    { kind: 'small', count: Math.min(8 + g, 16) },
    { kind: 'medium', count: Math.min(4 + g, 8) },
    { kind: 'large', count: Math.min(2 + g, 4) },
  ]
}

function pathPool(round: number): PathName[] {
  if (round === 1) return ['dive', 'weave']
  if (round <= 3) return ['dive', 'weave', 'arc']
  return ['dive', 'weave', 'arc', 'hover', 'feint']
}

function slotEdge(round: number, slot: number): Edge {
  if (round <= 2 || slot % 3 !== 2) return 'top'
  return slot % 6 === 2 ? 'left' : 'right'
}

function entryPoint(edge: Edge, path: PathName, lane: number): Point {
  switch (edge) {
    case 'top': {
      const inset = (path === 'weave' ? 70 : 0) + 36
      return { x: inset + lane * (540 - 2 * inset), y: -40 }
    }
    case 'left':
      return { x: -40, y: 960 * (0.12 + lane * 0.3) }
    case 'right':
      return { x: 580, y: 960 * (0.12 + lane * 0.3) }
  }
}

/** Every squad of a round, in arrival order. */
export function roundSchedule(round: number): Squad[] {
  const pool = pathPool(round)
  const squads: Squad[] = []

  roundWaves(round).forEach(({ kind, count }, wave) => {
    const squadCount = Math.max(1, Math.ceil(count / SQUAD_SIZE))
    const band = 1 / squadCount

    for (let k = 0; k < squadCount; k++) {
      const slot = squads.length
      const size = Math.floor(count / squadCount) + (k < count % squadCount ? 1 : 0)
      const step = band / (size + 1)
      const path = pool[(round * 3 + slot) % pool.length]
      const edge = slotEdge(round, slot)
      const lanes = Array.from({ length: size }, (_, i) => k * band + step * (i + 1))

      squads.push({
        slot,
        time: wave * WAVE_INTERVAL + k * SQUAD_INTERVAL,
        kind,
        path,
        edge,
        lanes,
        entries: lanes.map((lane) => entryPoint(edge, path, lane)),
      })
    }
  })

  return squads
}
