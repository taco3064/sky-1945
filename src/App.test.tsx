import { render } from '@testing-library/react'
import { expect, it } from 'vitest'
import App from './App'

it('renders an empty shell', () => {
  const { container } = render(<App />)

  expect(container.innerHTML).toBe('')
})
