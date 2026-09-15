import { render } from '@testing-library/react'
import { expect, it } from 'vitest'
import { SpeedLines } from './index'

it('paints the far layer, then the near layer, paced by the speed multiplier', () => {
  const { container } = render(<SpeedLines pace={1.3} />)

  const root = container.firstElementChild as HTMLElement
  expect(root.className).toBe('speed-lines')
  expect(root.getAttribute('aria-hidden')).toBe('true')
  expect(root.style.getPropertyValue('--pace')).toBe('1.3')
  expect([...root.children].map((layer) => layer.className)).toEqual([
    'speed-lines__layer speed-lines__layer--far',
    'speed-lines__layer speed-lines__layer--near',
  ])
})
