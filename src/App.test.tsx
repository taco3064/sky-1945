import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from './App'

beforeEach(() => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0)
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function slider() {
  return screen.getByRole('slider') as HTMLInputElement
}

it('starts on the title screen', () => {
  render(<App />)

  expect(screen.getByRole('img', { name: 'SKY-1945' })).toBeTruthy()
})

it('goes from the title to the loadout on any key, with 5 points on speed', () => {
  render(<App />)

  fireEvent.keyDown(window, { key: 'a' })

  expect(slider().value).toBe('5')
})

it('starts a fresh run from the loadout: round 1, 3 lives', () => {
  const { container } = render(<App />)
  fireEvent.pointerDown(screen.getByRole('img', { name: 'SKY-1945' }))

  fireEvent.click(screen.getByRole('button', { name: 'START' }))

  expect(container.firstElementChild?.className).toBe('stage')
  expect(screen.getByText('ROUND 1')).toBeTruthy()
  expect(container.querySelectorAll('.hud__lives > .life-icon').length).toBe(3)
})

it('returns to the title from QUIT and offers the same allocation again', () => {
  render(<App />)
  fireEvent.keyDown(window, { key: 'a' })
  fireEvent.keyDown(window, { key: 'ArrowRight' })
  fireEvent.keyDown(window, { key: 'Enter' })

  fireEvent.keyDown(window, { key: 'Escape' })
  fireEvent.click(screen.getByRole('button', { name: 'QUIT' }))
  expect(screen.getByRole('img', { name: 'SKY-1945' })).toBeTruthy()

  fireEvent.keyDown(window, { key: 'a' })
  expect(slider().value).toBe('6')
})
