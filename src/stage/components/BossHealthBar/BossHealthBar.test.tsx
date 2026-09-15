import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { BossHealthBar } from './BossHealthBar'

it('arrives full, hatched and dashed with ARRIVING while shielded', () => {
  const { container } = render(<BossHealthBar hp={1350} maxHp={1350} pose="entering" move={null} />)

  const track = screen.getByRole('progressbar', { name: 'Boss health, shielded' })
  expect(container.firstElementChild?.className).toBe('boss-bar boss-bar--shielded')
  expect([track.getAttribute('aria-valuemin'), track.getAttribute('aria-valuemax'), track.getAttribute('aria-valuenow')]).toEqual(['0', '1350', '1350'])
  expect((track.firstElementChild as HTMLElement).style.width).toBe('100%')
  expect([...(container.firstElementChild?.children ?? [])].map((child) => child.textContent)).toEqual(['', 'ARRIVING'])
  expect(screen.getByText('ARRIVING').tagName).toBe('P')
})

it('shows the remaining fraction while fighting', () => {
  const { container } = render(<BossHealthBar hp={675} maxHp={900} pose="firing" move="spread" />)

  const track = screen.getByRole('progressbar', { name: 'Boss health' })
  expect(container.firstElementChild?.className).toBe('boss-bar boss-bar--normal')
  expect((track.firstElementChild as HTMLElement).style.width).toBe('75%')
  expect(container.querySelectorAll('p').length).toBe(0)
})

it('turns low at a quarter or less and clamps below zero', () => {
  const { container, rerender } = render(<BossHealthBar hp={225} maxHp={900} pose="recovering" move="ram" />)
  expect(container.firstElementChild?.className).toBe('boss-bar boss-bar--low')

  rerender(<BossHealthBar hp={-30} maxHp={900} pose="recovering" move="ram" />)
  const track = screen.getByRole('progressbar')
  expect(track.getAttribute('aria-valuenow')).toBe('0')
  expect((track.firstElementChild as HTMLElement).style.width).toBe('0%')
})

it('warns ROLL while the boss winds up a beam', () => {
  const { rerender } = render(<BossHealthBar hp={900} maxHp={900} pose="winding" move="beam" />)
  expect(screen.getByText('ROLL').className).toBe('boss-bar__warning')

  rerender(<BossHealthBar hp={900} maxHp={900} pose="winding" move="ram" />)
  expect(screen.queryByText('ROLL')).toBeNull()
})

it('reads an empty bar when there are no hit points to measure', () => {
  render(<BossHealthBar hp={10} maxHp={0} pose="firing" move="beam" />)

  expect((screen.getByRole('progressbar').firstElementChild as HTMLElement).style.width).toBe('0%')
})
