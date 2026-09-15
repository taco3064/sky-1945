import type { Boss } from '../game/boss.ts'
import { PULSE_MAX } from '../game/pulse.ts'
import type { Simulation } from '../game/simulation.ts'

export type BossBarState = 'normal' | 'low' | 'shielded'

export type BossHud = {
  hp: number
  maxHp: number
  /** Flying in: bullets are used up without damage. */
  shielded: boolean
  /** Winding up a beam: the ROLL warning shows. */
  warning: boolean
}

export type HudState = {
  lives: number
  round: number
  boss: BossHud | null
  /** PULSE energy, 0–100. */
  pulse: number
}

export function readHud(sim: Simulation): HudState {
  return { lives: sim.lives, round: sim.round, boss: sim.boss && readBoss(sim.boss), pulse: sim.pulse }
}

function readBoss(boss: Boss): BossHud {
  return {
    hp: boss.hp,
    maxHp: boss.maxHp,
    shielded: boss.stance === 'entering',
    warning: boss.stance === 'winding' && boss.attack === 'beam',
  }
}

export function sameHud(a: HudState, b: HudState): boolean {
  if (a.lives !== b.lives || a.round !== b.round || a.pulse !== b.pulse) return false
  if (a.boss === null || b.boss === null) return a.boss === b.boss
  return (
    a.boss.hp === b.boss.hp &&
    a.boss.maxHp === b.boss.maxHp &&
    a.boss.shielded === b.boss.shielded &&
    a.boss.warning === b.boss.warning
  )
}

export function bossBarFraction({ hp, maxHp }: BossHud): number {
  return maxHp <= 0 ? 0 : Math.min(Math.max(hp / maxHp, 0), 1)
}

export function bossBarState(boss: BossHud): BossBarState {
  if (boss.shielded) return 'shielded'
  return bossBarFraction(boss) <= 0.25 ? 'low' : 'normal'
}

export function isPulseReady(pulse: number): boolean {
  return pulse >= PULSE_MAX
}

/** `{pulse}%`, or `READY` once PULSE is full. */
export function pulseMeterText(pulse: number): string {
  return isPulseReady(pulse) ? 'READY' : `${pulse}%`
}

export function pulseMeterFill(pulse: number): number {
  return pulse / PULSE_MAX
}
