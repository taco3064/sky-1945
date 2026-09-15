import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Overlay } from './Overlay'

it('shows the title and one button per action', () => {
  const resume = vi.fn()
  const quit = vi.fn()
  const { container } = render(
    <Overlay
      title="PAUSED"
      actions={[
        { label: 'RESUME', onClick: resume },
        { label: 'QUIT', onClick: quit },
      ]}
    />,
  )

  expect([...(container.firstElementChild?.children ?? [])].map((child) => child.className)).toEqual([
    'overlay__title',
    'overlay__actions',
  ])
  expect(screen.getByText('PAUSED').tagName).toBe('P')
  fireEvent.click(screen.getByRole('button', { name: 'QUIT' }))
  fireEvent.click(screen.getByRole('button', { name: 'RESUME' }))
  expect([resume.mock.calls.length, quit.mock.calls.length]).toEqual([1, 1])
})

it('shows the round reached under the title', () => {
  const { container } = render(<Overlay title="GAME OVER" reached={7} actions={[{ label: 'TITLE', onClick: vi.fn() }]} />)

  expect([...(container.firstElementChild?.children ?? [])].map((child) => child.textContent)).toEqual([
    'GAME OVER',
    'REACHED ROUND 7',
    'TITLE',
  ])
})
