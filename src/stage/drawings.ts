import type { EnemyKind } from '../game/rounds.ts'
import type { Bullet, Burst } from '../game/simulation.ts'
import './aircraft.css'
import './effects.css'

function part(className: string, ...children: HTMLElement[]): HTMLElement {
  const element = document.createElement('div')
  element.className = className
  element.append(...children)
  return element
}

/** ALLY-01. The craft is the mount's only child and carries the protected / rolling / spent states. */
export function drawAlly(): HTMLElement {
  return part(
    'ally',
    part(
      'ally-craft',
      part('ally-thrust'),
      part('ally-wing'),
      part('ally-fin-left'),
      part('ally-fin-right'),
      part('ally-body'),
      part('ally-canopy'),
    ),
  )
}

const ENEMY_PARTS: Record<EnemyKind, string[]> = {
  small: ['enemy-wing', 'enemy-body', 'enemy-core'],
  medium: ['enemy-wing', 'enemy-pod-left', 'enemy-pod-right', 'enemy-body', 'enemy-canopy'],
  large: ['enemy-wing', 'enemy-armour', 'enemy-pod-left', 'enemy-pod-right', 'enemy-body', 'enemy-core'],
}

export function drawEnemy(kind: EnemyKind): HTMLElement {
  return part(`enemy enemy-${kind}`, part('enemy-craft', ...ENEMY_PARTS[kind].map((name) => part(name))))
}

/** The boss at its rolled size; pose and move are set on the mount as it fights. */
export function drawBoss(size: number): HTMLElement {
  const craft = part(
    'boss-craft',
    part('boss-wing'),
    part('boss-arm-left'),
    part('boss-arm-right'),
    part('boss-armour'),
    part('boss-pod-left'),
    part('boss-pod-right'),
    part('boss-body'),
    part('boss-spine'),
    part('boss-canopy'),
    part('boss-core'),
    part('boss-muzzle'),
  )
  craft.style.setProperty('--boss-scale', String(size))
  return part('boss', part('boss-charge'), craft)
}

export function drawBullet(side: Bullet['side']): HTMLElement {
  return part(`bullet-${side}`)
}

export function drawBeam(): HTMLElement {
  return part('beam', part('beam-core'))
}

/** The Pulse Drive's filled circle; its radius and opacity are set as it expands. */
export function drawPulse(): HTMLElement {
  return part('pulse')
}

/** Shard directions and spins; a small burst uses the first 6, a large one all 10. */
const SHARDS: [dx: number, dy: number, spin: string][] = [
  [-0.9, -0.5, '210deg'],
  [0.8, -0.7, '-260deg'],
  [0.95, 0.45, '180deg'],
  [-0.2, 1, '-140deg'],
  [-0.85, 0.6, '300deg'],
  [0.25, -1, '-190deg'],
  [-0.55, -0.85, '240deg'],
  [0.6, 0.8, '-220deg'],
  [1, -0.15, '160deg'],
  [-1, 0.1, '-300deg'],
]

export function drawBurst({ tone, size }: Burst): HTMLElement {
  const shards = SHARDS.slice(0, size === 'small' ? 6 : 10).map(([dx, dy, spin]) => {
    const shard = part('burst-shard')
    shard.style.setProperty('--dx', String(dx))
    shard.style.setProperty('--dy', String(dy))
    shard.style.setProperty('--spin', spin)
    return shard
  })
  const burst = part('burst', part('burst-flash'), ...shards)
  burst.dataset.tone = tone
  burst.dataset.size = size
  return burst
}
