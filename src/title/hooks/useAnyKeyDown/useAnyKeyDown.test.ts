import { fireEvent, renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useAnyKeyDown } from './useAnyKeyDown'

it('reports any keydown, including modifiers and auto-repeat', () => {
  const onKeyDown = vi.fn()
  renderHook(() => useAnyKeyDown(onKeyDown))

  fireEvent.keyDown(window, { key: 'a' })
  fireEvent.keyDown(window, { key: 'Shift' })
  fireEvent.keyDown(window, { key: 'a', repeat: true })

  expect(onKeyDown).toHaveBeenCalledTimes(3)
})

it('stops listening once unmounted', () => {
  const onKeyDown = vi.fn()
  const { unmount } = renderHook(() => useAnyKeyDown(onKeyDown))

  unmount()
  fireEvent.keyDown(window, { key: 'Enter' })

  expect(onKeyDown).not.toHaveBeenCalled()
})
