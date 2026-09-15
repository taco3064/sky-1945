import { StrictMode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import App from './App'

const { createRoot, render } = vi.hoisted(() => {
  const render = vi.fn()
  return { render, createRoot: vi.fn(() => ({ render })) }
})

vi.mock('react-dom/client', () => ({ createRoot }))

afterEach(() => {
  document.body.innerHTML = ''
})

it('mounts the app in strict mode into #root', async () => {
  document.body.innerHTML = '<div id="root"></div>'

  await import('./main')

  expect(createRoot).toHaveBeenCalledWith(document.getElementById('root'))
  expect(render).toHaveBeenCalledWith(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
