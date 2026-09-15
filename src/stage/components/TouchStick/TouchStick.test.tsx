import { render } from '@testing-library/react'
import { createRef } from 'react'
import { expect, it } from 'vitest'
import { TouchStick } from './index'

it('draws a ring holding the knob and forwards the ring ref', () => {
  const ref = createRef<HTMLDivElement>()
  const { container } = render(<TouchStick ref={ref} />)

  const ring = container.firstElementChild
  expect(ring?.className).toBe('touch-stick')
  expect(ring?.children.length).toBe(1)
  expect(ring?.firstElementChild?.className).toBe('touch-stick__knob')
  expect(ref.current).toBe(ring)
})
