import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Battle } from '~app/battle/hooks/useBattle'
import type { Place } from '~app/battle/models/simulation'
import { Stage } from './Stage'

const battle = vi.hoisted(() => ({
  gameOver: false,
}))

vi.mock('~app/battle/hooks/useBattle', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~app/battle/hooks/useBattle')>()
  return {
    ...actual,
    useBattle: (speedPoints: number, place: Place): Battle => {
      const result = actual.useBattle(speedPoints, place)
      return battle.gameOver ? { ...result, view: { ...result.view, gameOver: true, lives: 0, round: 4 } } : result
    },
  }
})

let frames: FrameRequestCallback[] = []

beforeEach(() => {
  battle.gameOver = false
  frames = []
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => frames.push(callback))
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {
    frames = []
  })
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  HTMLElement.prototype.setPointerCapture = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function setup(speedPoints = 5) {
  const onQuit = vi.fn()
  const view = render(<Stage speedPoints={speedPoints} onQuit={onQuit} />)
  const stage = view.container.firstElementChild as HTMLElement
  return { onQuit, stage, ...view }
}

describe('layout', () => {
  it('paints the field, touch surface, touch stick and HUD in that order', () => {
    const { stage } = setup(8)

    expect(stage.className).toBe('stage')
    expect([...stage.children].map((child) => child.className)).toEqual(['stage__field', 'stage__touch', 'touch-stick', 'hud'])
    const field = stage.firstElementChild as HTMLElement
    expect([...field.children].map((child) => child.className)).toEqual(['speed-lines', 'ally ally--protected'])
    expect((field.firstElementChild as HTMLElement).style.getPropertyValue('--pace')).toBe('1.8')
  })

  it('places the aircraft at its launch point before the first frame', () => {
    const { stage } = setup()

    expect(stage.querySelector<HTMLElement>('.ally')?.style.transform).toBe('translate3d(270px, 1020px, 0) rotate(0deg)')
  })
})

describe('playing', () => {
  it('runs the simulation every animation frame and places new entities in the same frame', () => {
    const { stage } = setup()

    act(() => frames.shift()?.(performance.now() + 16))

    const enemies = stage.querySelectorAll<HTMLElement>('.enemy')
    expect(enemies.length).toBe(4)
    expect(enemies[0].style.transform).toMatch(/rotate\(180deg\)$/)
    expect(frames.length).toBe(1)
  })

  it('steers and rolls from the keyboard and the touch surface', () => {
    const { stage } = setup()

    fireEvent.keyDown(window, { key: ' ' })
    expect(stage.querySelector('.ally')?.className).toBe('ally ally--protected ally--rolling ally--spent')

    const surface = stage.querySelector('.stage__touch') as HTMLElement
    fireEvent.pointerDown(surface, { pointerId: 1, clientX: 50, clientY: 60 })
    expect(stage.querySelector('.touch-stick')?.classList.contains('touch-stick--active')).toBe(true)
  })
})

describe('pause', () => {
  it('pauses on Escape: the overlay covers the stage under the HUD and the simulation stops', () => {
    const { stage } = setup()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect([...stage.children].map((child) => child.className)).toEqual(['stage__field', 'stage__touch', 'touch-stick', 'overlay', 'hud'])
    expect(screen.getByText('PAUSED')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Resume' }).textContent).toBe('▶')
    expect(frames.length).toBe(0)
  })

  it('resumes from RESUME, the pause button and Escape', () => {
    setup()

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    fireEvent.click(screen.getByRole('button', { name: 'RESUME' }))
    expect(screen.queryByText('PAUSED')).toBeNull()

    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    expect(screen.queryByText('PAUSED')).toBeNull()
    expect(frames.length).toBe(1)
  })

  it('quits to the title from QUIT', () => {
    const { onQuit } = setup()
    fireEvent.keyDown(window, { key: 'Escape' })

    fireEvent.click(screen.getByRole('button', { name: 'QUIT' }))

    expect(onQuit).toHaveBeenCalledTimes(1)
  })
})

describe('game over', () => {
  it('shows the round reached, hides the pause button, ignores Escape and stops the simulation', () => {
    battle.gameOver = true
    const { onQuit } = setup()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.getByText('GAME OVER')).toBeTruthy()
    expect(screen.getByText('REACHED ROUND 4')).toBeTruthy()
    expect(screen.queryByText('PAUSED')).toBeNull()
    expect(screen.queryByRole('button', { name: /Pause|Resume/ })).toBeNull()
    expect(frames.length).toBe(0)

    fireEvent.click(screen.getByRole('button', { name: 'TITLE' }))
    expect(onQuit).toHaveBeenCalledTimes(1)
  })
})
