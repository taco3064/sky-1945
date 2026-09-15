import { render } from '@testing-library/react'
import { createRef } from 'react'
import { expect, it } from 'vitest'
import { AllyCraft } from './index'

it('draws the craft parts in paint order inside the placed mount', () => {
  const ref = createRef<HTMLDivElement>()
  const { container } = render(<AllyCraft ref={ref} rolling={false} protected={false} spent={false} />)

  const mount = container.firstElementChild as HTMLElement
  expect(ref.current).toBe(mount)
  expect(mount.className).toBe('ally')
  expect(mount.firstElementChild?.className).toBe('ally__craft')
  expect([...(mount.firstElementChild?.children ?? [])].map((part) => part.className)).toEqual([
    'ally__thrust',
    'ally__wing',
    'ally__fin ally__fin--left',
    'ally__fin ally__fin--right',
    'ally__body',
    'ally__canopy',
  ])
})

it.each([
  [{ rolling: false, protected: true, spent: false }, 'ally ally--protected'],
  [{ rolling: true, protected: true, spent: true }, 'ally ally--protected ally--rolling ally--spent'],
  [{ rolling: false, protected: false, spent: true }, 'ally ally--spent'],
])('marks the %o state', (state, className) => {
  const { container } = render(<AllyCraft {...state} />)

  expect(container.firstElementChild?.className).toBe(className)
})
