import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { TitleScreen } from './TitleScreen'

it('shows the logo under the base path and both prompts', () => {
  render(<TitleScreen onContinue={vi.fn()} />)

  const logo = screen.getByRole('img', { name: 'SKY-1945' })
  expect(logo.getAttribute('src')).toBe(`${import.meta.env.BASE_URL}logo.webp`)
  expect(logo.parentElement?.tagName).toBe('H1')
  expect(screen.getByText('PRESS ANY KEY').tagName).toBe('SPAN')
  expect(screen.getByText('TAP TO START').tagName).toBe('SPAN')
})

it('continues on any keydown', () => {
  const onContinue = vi.fn()
  render(<TitleScreen onContinue={onContinue} />)

  fireEvent.keyDown(window, { key: 'Control' })

  expect(onContinue).toHaveBeenCalledTimes(1)
})

it('continues on pointer down anywhere on the screen', () => {
  const onContinue = vi.fn()
  const { container } = render(<TitleScreen onContinue={onContinue} />)

  fireEvent.pointerDown(container.querySelector('.title__prompt') as Element)

  expect(onContinue).toHaveBeenCalledTimes(1)
})
