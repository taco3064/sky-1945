import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import App from './App'

it('starts on the title screen', () => {
  render(<App />)

  expect(screen.getByRole('img', { name: 'SKY-1945' })).toBeTruthy()
})

it('goes from the title to the loadout on any key, with 5 points on speed', () => {
  render(<App />)

  fireEvent.keyDown(window, { key: 'a' })

  expect((screen.getByRole('slider') as HTMLInputElement).value).toBe('5')
})

it('keeps the allocation changes on the loadout screen', () => {
  render(<App />)
  fireEvent.pointerDown(screen.getByRole('img', { name: 'SKY-1945' }))

  fireEvent.keyDown(window, { key: 'ArrowRight' })

  expect((screen.getByRole('slider') as HTMLInputElement).value).toBe('6')
})

it('leaves the loadout on START', () => {
  const { container } = render(<App />)
  fireEvent.keyDown(window, { key: 'a' })

  fireEvent.click(screen.getByRole('button', { name: 'START' }))

  expect(container.innerHTML).toBe('')
})
