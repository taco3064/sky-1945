import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import App from './App'

it('starts on the title screen', () => {
  render(<App />)

  expect(screen.getByRole('img', { name: 'SKY-1945' })).toBeTruthy()
})

it('leaves the title screen on any key', () => {
  const { container } = render(<App />)

  fireEvent.keyDown(window, { key: 'a' })

  expect(container.innerHTML).toBe('')
})
