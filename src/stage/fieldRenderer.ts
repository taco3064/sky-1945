import type { Boss } from '../game/boss.ts'
import type { Enemy } from '../game/enemies.ts'
import { isProtected, isRolling, isSpent, type Player } from '../game/player.ts'
import { pulseRadius, type PulseDrive } from '../game/pulse.ts'
import type { Beam, Bullet, Burst, Simulation } from '../game/simulation.ts'
import { drawAlly, drawBeam, drawBoss, drawBullet, drawBurst, drawEnemy, drawPulse } from './drawings.ts'
import { entityTransform, nextLean, pulseOpacity } from './placement.ts'

type View = {
  element: HTMLElement
  previousX: number | null
  lean: number
  transform: string
  leanText: string
  seen: number
}

/**
 * One paint-order group of entities. Views are created in order of creation and removed when their
 * entity leaves the simulation.
 */
class EntityLayer<T extends { x: number; y: number }> {
  readonly #group: HTMLElement
  readonly #views = new Map<T, View>()
  readonly #angle: number
  readonly #draw: (entity: T) => HTMLElement
  #frame = 0

  constructor(root: HTMLElement, angle: number, draw: (entity: T) => HTMLElement) {
    this.#group = document.createElement('div')
    this.#group.className = 'field-group'
    root.append(this.#group)
    this.#angle = angle
    this.#draw = draw
  }

  /** Places every entity for one displayed frame and returns each one's element to `update`. */
  sync(entities: readonly T[], update?: (entity: T, element: HTMLElement) => void): void {
    const frame = ++this.#frame

    for (const entity of entities) {
      let view = this.#views.get(entity)
      if (!view) {
        view = { element: this.#draw(entity), previousX: null, lean: 0, transform: '', leanText: '', seen: 0 }
        this.#views.set(entity, view)
        this.#group.append(view.element)
      }
      view.seen = frame
      place(view, entity.x, entity.y, this.#angle)
      update?.(entity, view.element)
    }

    for (const [entity, view] of this.#views) {
      if (view.seen === frame) continue
      view.element.remove()
      this.#views.delete(entity)
    }
  }

  element(entity: T): HTMLElement | undefined {
    return this.#views.get(entity)?.element
  }
}

function place(view: View, x: number, y: number, angle: number): void {
  const slide = view.previousX === null ? 0 : x - view.previousX
  view.previousX = x
  view.lean = nextLean(view.lean, slide)

  const transform = entityTransform(x, y, angle)
  if (transform !== view.transform) {
    view.transform = transform
    view.element.style.transform = transform
  }
  const leanText = view.lean.toFixed(3)
  if (leanText !== view.leanText) {
    view.leanText = leanText
    view.element.style.setProperty('--lean', leanText)
  }
}

function setFlag(element: Element, name: string, on: boolean): void {
  if (element.hasAttribute(name) !== on) element.toggleAttribute(name, on)
}

function setData(element: HTMLElement, name: string, value: string | null): void {
  if (element.getAttribute(name) === value) return
  if (value === null) element.removeAttribute(name)
  else element.setAttribute(name, value)
}

const ENEMY_ANGLE = 180

/** Draws the simulation's entities into the field, in the spec's paint order, with the Pulse over them all. */
export class FieldRenderer {
  readonly #root: HTMLElement
  readonly #player: EntityLayer<Player>
  readonly #bullets: EntityLayer<Bullet>
  readonly #enemies: EntityLayer<Enemy>
  readonly #boss: EntityLayer<Boss>
  readonly #beam: EntityLayer<Beam>
  readonly #bursts: EntityLayer<Burst>
  /** Placed on the aircraft, since the Pulse follows it. */
  readonly #pulse: EntityLayer<Player>

  constructor(root: HTMLElement) {
    this.#root = root
    this.#player = new EntityLayer(root, 0, drawAlly)
    this.#bullets = new EntityLayer(root, 0, (bullet) => drawBullet(bullet.side))
    this.#enemies = new EntityLayer(root, ENEMY_ANGLE, (enemy) => drawEnemy(enemy.kind))
    this.#boss = new EntityLayer(root, ENEMY_ANGLE, (boss) => drawBoss(boss.size))
    this.#beam = new EntityLayer(root, 0, drawBeam)
    this.#bursts = new EntityLayer(root, 0, drawBurst)
    this.#pulse = new EntityLayer(root, 0, drawPulse)
  }

  /** One displayed frame: every entity's position, bank and state. */
  render(sim: Simulation): void {
    this.#player.sync([sim.player], () => this.renderPlayerState(sim))
    this.#bullets.sync(sim.bullets)
    this.#enemies.sync(sim.enemies)
    this.#boss.sync(sim.boss ? [sim.boss] : [], (boss, element) => {
      setData(element, 'data-pose', boss.stance)
      setData(element, 'data-move', boss.attack)
    })
    this.#beam.sync(sim.beam ? [sim.beam] : [])
    this.#bursts.sync(sim.bursts)
    // Sized from simulated time, so the circle freezes with the simulation while paused.
    this.#pulse.sync(sim.pulseDrive ? [sim.player] : [], (_, element) => {
      const elapsed = sim.time - (sim.pulseDrive as PulseDrive).startedAt
      element.style.setProperty('--pulse-radius', `${pulseRadius(elapsed).toFixed(2)}px`)
      element.style.opacity = pulseOpacity(elapsed).toFixed(3)
    })
  }

  /** Shows the aircraft's protected / rolling / spent state without waiting for the next frame. */
  renderPlayerState(sim: Simulation): void {
    const craft = this.#player.element(sim.player)?.firstElementChild
    if (!craft) return
    setFlag(craft, 'data-protected', isProtected(sim.player, sim.time))
    setFlag(craft, 'data-rolling', isRolling(sim.player, sim.time))
    setFlag(craft, 'data-spent', isSpent(sim.player, sim.time))
  }

  destroy(): void {
    this.#root.replaceChildren()
  }
}
