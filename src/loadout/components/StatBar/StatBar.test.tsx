import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { StatBar } from './StatBar'

it.each([
  [100, 'scaleX(0)'],
  [150, 'scaleX(0.5)'],
  [200, 'scaleX(1)'],
])('shows %i%% with a fill of %s', (percent, transform) => {
  const { container } = render(<StatBar label="SPEED" percent={percent} />)

  expect(screen.getByText('SPEED').className).toBe('stat-bar__label')
  expect(screen.getByText(`${percent}%`).className).toBe('stat-bar__value')
  const fill = container.querySelector<HTMLElement>('.stat-bar__track > .stat-bar__fill')
  expect(fill?.style.transform).toBe(transform)
})
