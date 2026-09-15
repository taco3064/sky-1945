import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Hud, type StagePhase } from './Hud'

const BOSS = { id: 4, size: 1, hp: 450, maxHp: 900, pose: 'firing', move: 'radial' } as const

function setup(overrides: Partial<Parameters<typeof Hud>[0]> = {}) {
  const onPause = vi.fn()
  const view = render(<Hud lives={3} round={2} boss={null} fps={0} worst={0} phase="playing" onPause={onPause} {...overrides} />)
  const hud = view.container.firstElementChild as HTMLElement
  return { onPause, hud, ...view }
}

it('lays out lives, round, boss bar, frame meter and pause button in that order', () => {
  const { hud } = setup({ boss: BOSS })

  expect(hud.className).toBe('hud')
  expect([...hud.children].map((child) => child.className)).toEqual([
    'hud__lives',
    'hud__round',
    'boss-bar boss-bar--normal',
    'hud__frame-meter',
    'hud__pause',
  ])
})

it('shows one life icon per remaining life and the round', () => {
  const { hud } = setup({ lives: 2, round: 11 })

  expect(hud.querySelectorAll('.hud__lives > .life-icon').length).toBe(2)
  expect(screen.getByText('ROUND 11').tagName).toBe('P')
  expect(hud.querySelector('.boss-bar')).toBeNull()
})

it('reads the frame meter, amber when slow', () => {
  const { hud, rerender, onPause } = setup()
  expect(screen.getByText('—').className).toBe('hud__frame-meter')

  rerender(<Hud lives={3} round={2} boss={null} fps={48} worst={33} phase="playing" onPause={onPause} />)

  expect(hud.querySelector('.hud__frame-meter')?.className).toBe('hud__frame-meter hud__frame-meter--slow')
  expect(screen.getByText('48 FPS · 33ms')).toBeTruthy()
})

it.each<[StagePhase, string, string]>([
  ['playing', 'Pause', '❚❚'],
  ['paused', 'Resume', '▶'],
])('while %s the pause button reads %s', (phase, label, glyph) => {
  const { onPause } = setup({ phase })

  const button = screen.getByRole('button', { name: label })
  fireEvent.click(button)

  expect(button.textContent).toBe(glyph)
  expect(onPause).toHaveBeenCalledTimes(1)
})

it('hides the pause button during game over', () => {
  setup({ phase: 'gameover', lives: 0 })

  expect(screen.queryByRole('button')).toBeNull()
})
