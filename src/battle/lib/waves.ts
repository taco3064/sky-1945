import { FIELD_HEIGHT, FIELD_WIDTH, type Point } from './field'
import type { EnemyKind } from './kinds'
import type { EnemyPath, EntryEdge } from './paths'

interface Wave {
  kind: EnemyKind
  base: number
  cap: number
}

/** Every round has the same four waves, in order (game-spec 12.6). */
const WAVES: readonly Wave[] = [
  { kind: 'small', base: 8, cap: 16 },
  { kind: 'small', base: 8, cap: 16 },
  { kind: 'medium', base: 4, cap: 8 },
  { kind: 'large', base: 2, cap: 4 },
]

const WAVE_INTERVAL = 2.75
const SQUAD_INTERVAL = 0.7
const CRAFT_PER_SQUAD = 4

const TOP_ENTRY_Y = -40
const TOP_INSET = 36
const WEAVE_INSET = 70
const LEFT_ENTRY_X = -40
const RIGHT_ENTRY_X = 580
const SIDE_BAND_TOP = 0.12
const SIDE_BAND_HEIGHT = 0.3

export interface Squad {
  /** Counts through every squad of the round, in wave order. */
  slot: number
  /** Arrival on the round clock, in seconds. */
  time: number
  kind: EnemyKind
  path: EnemyPath
  edge: EntryEdge
  lanes: number[]
  entries: Point[]
}

/** Every squad of a round, in arrival order. */
export function roundSchedule(round: number): Squad[] {
  const growth = Math.floor((round - 1) / 2) * 2
  const squads: Squad[] = []

  WAVES.forEach((wave, waveIndex) => {
    const count = Math.min(wave.base + growth, wave.cap)
    const squadCount = Math.max(1, Math.ceil(count / CRAFT_PER_SQUAD))

    for (let k = 0; k < squadCount; k++) {
      const craft = Math.floor(count / squadCount) + (k < count % squadCount ? 1 : 0)
      const slot = squads.length
      const path = slotPath(round, slot)
      const edge = slotEdge(round, slot)
      const lanes = squadLanes(k, squadCount, craft)
      squads.push({
        slot,
        time: waveIndex * WAVE_INTERVAL + k * SQUAD_INTERVAL,
        kind: wave.kind,
        path,
        edge,
        lanes,
        entries: lanes.map((lane) => entryPoint(edge, path, lane)),
      })
    }
  })

  return squads
}

function pathPool(round: number): EnemyPath[] {
  if (round <= 1) {
    return ['dive', 'weave']
  }
  return round <= 3 ? ['dive', 'weave', 'arc'] : ['dive', 'weave', 'arc', 'hover', 'feint']
}

function slotPath(round: number, slot: number): EnemyPath {
  const pool = pathPool(round)
  return pool[(round * 3 + slot) % pool.length]
}

function slotEdge(round: number, slot: number): EntryEdge {
  if (round <= 2 || slot % 3 !== 2) {
    return 'top'
  }
  return slot % 6 === 2 ? 'left' : 'right'
}

/** Squad k of `squads` with n craft owns the band [k / squads, (k + 1) / squads). */
function squadLanes(k: number, squads: number, craft: number): number[] {
  const band = 1 / squads
  const step = band / (craft + 1)
  return Array.from({ length: craft }, (_, index) => k * band + step * (index + 1))
}

function entryPoint(edge: EntryEdge, path: EnemyPath, lane: number): Point {
  if (edge === 'top') {
    const inset = (path === 'weave' ? WEAVE_INSET : 0) + TOP_INSET
    return { x: inset + lane * (FIELD_WIDTH - 2 * inset), y: TOP_ENTRY_Y }
  }
  return {
    x: edge === 'left' ? LEFT_ENTRY_X : RIGHT_ENTRY_X,
    y: FIELD_HEIGHT * (SIDE_BAND_TOP + lane * SIDE_BAND_HEIGHT),
  }
}
