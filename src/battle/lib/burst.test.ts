import { expect, it } from 'vitest'
import { BURST_LIFETIME, ageBurst, createBurst } from './burst'

it('starts at age 0 where it was created', () => {
  expect(createBurst(3, 120, 40, 'enemy', 'small')).toEqual({
    id: 3,
    x: 120,
    y: 40,
    tone: 'enemy',
    size: 'small',
    age: 0,
  })
})

it('finishes after 0.6 s of simulated time', () => {
  const burst = createBurst(1, 0, 0, 'ally', 'large')

  expect(BURST_LIFETIME).toBe(0.6)
  expect(ageBurst(burst, 0.5)).toBe(false)
  expect(ageBurst(burst, 0.1)).toBe(true)
})
