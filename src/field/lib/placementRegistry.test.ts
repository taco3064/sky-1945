import { expect, it } from 'vitest'
import { createPlacementRegistry } from './placementRegistry'

it('places a registered element and eases its lean from 0 on the first frame', () => {
  const registry = createPlacementRegistry()
  const element = document.createElement('div')
  registry.register(4, element)

  registry.place(4, 100, 200, 180)
  expect(element.style.transform).toBe('translate3d(100px, 200px, 0) rotate(180deg)')
  expect(element.style.getPropertyValue('--lean')).toBe('0.000')

  registry.place(4, 104, 200, 180)
  expect(element.style.getPropertyValue('--lean')).toBe('0.180')

  registry.place(4, 104, 210, 180)
  expect(element.style.getPropertyValue('--lean')).toBe('0.148')
})

it('ignores entities without an element and forgets unregistered ones', () => {
  const registry = createPlacementRegistry()
  const element = document.createElement('div')
  registry.register(4, element)
  registry.register(4, null)

  registry.place(4, 1, 2, 0)
  registry.place(5, 1, 2, 0)

  expect(element.style.transform).toBe('')
})

it('starts the lean over for a newly registered element', () => {
  const registry = createPlacementRegistry()
  const element = document.createElement('div')
  registry.register(1, element)
  registry.place(1, 0, 0, 0)
  registry.place(1, 40, 0, 0)

  registry.register(1, element)
  registry.place(1, 80, 0, 0)

  expect(element.style.getPropertyValue('--lean')).toBe('0.000')
})
