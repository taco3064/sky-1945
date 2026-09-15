import { fireEvent, renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useKeyboardControls } from './useKeyboardControls'

function setup() {
  const handlers = { onSteer: vi.fn(), onRoll: vi.fn(), onPause: vi.fn() }
  const hook = renderHook(() => useKeyboardControls(handlers))
  return { ...handlers, ...hook }
}

it('publishes the summed direction on every arrow press and release, preventing defaults', () => {
  const { onSteer } = setup()

  expect(fireEvent.keyDown(window, { key: 'ArrowUp', cancelable: true })).toBe(false)
  fireEvent.keyDown(window, { key: 'ArrowRight' })
  fireEvent.keyDown(window, { key: 'ArrowRight', repeat: true })
  fireEvent.keyDown(window, { key: 'ArrowLeft' })
  expect(fireEvent.keyUp(window, { key: 'ArrowUp', cancelable: true })).toBe(false)

  expect(onSteer.mock.calls).toEqual([
    [{ x: 0, y: -1 }],
    [{ x: 1, y: -1 }],
    [{ x: 1, y: -1 }],
    [{ x: 0, y: -1 }],
    [{ x: 0, y: 0 }],
  ])
})

it('attempts a roll on Space, preventing its default', () => {
  const { onRoll } = setup()

  expect(fireEvent.keyDown(window, { key: ' ', cancelable: true })).toBe(false)

  expect(onRoll).toHaveBeenCalledTimes(1)
})

it('toggles pause on Escape, auto-repeat included', () => {
  const { onPause } = setup()

  fireEvent.keyDown(window, { key: 'Escape' })
  fireEvent.keyDown(window, { key: 'Escape', repeat: true })

  expect(onPause).toHaveBeenCalledTimes(2)
})

it('releases every arrow and stops when the window loses focus, even with none held', () => {
  const { onSteer } = setup()
  fireEvent.keyDown(window, { key: 'ArrowDown' })

  fireEvent.blur(window)
  fireEvent.blur(window)
  fireEvent.keyDown(window, { key: 'ArrowLeft' })

  expect(onSteer.mock.calls.slice(1)).toEqual([[{ x: 0, y: 0 }], [{ x: 0, y: 0 }], [{ x: -1, y: 0 }]])
})

it('ignores other keys and stops listening once unmounted', () => {
  const { onSteer, onRoll, onPause, unmount } = setup()

  expect(fireEvent.keyDown(window, { key: 'a', cancelable: true })).toBe(true)
  fireEvent.keyUp(window, { key: ' ' })
  unmount()
  fireEvent.keyDown(window, { key: 'ArrowUp' })
  fireEvent.blur(window)

  expect([onSteer, onRoll, onPause].map((handler) => handler.mock.calls.length)).toEqual([0, 0, 0])
})
