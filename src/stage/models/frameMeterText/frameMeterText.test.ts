import { expect, it } from 'vitest'
import { frameMeterText, isSlowFrameRate } from './frameMeterText'

it.each([
  [0, 0, '—', false],
  [0, 2400, '—', false],
  [54, 31, '54 FPS · 31ms', true],
  [55, 18, '55 FPS · 18ms', false],
  [120, 9, '120 FPS · 9ms', false],
])('%i fps with a worst frame of %i ms reads "%s" (slow: %s)', (fps, worst, text, slow) => {
  expect(frameMeterText(fps, worst)).toBe(text)
  expect(isSlowFrameRate(fps)).toBe(slow)
})
