import { render } from '@testing-library/react'
import { createRef } from 'react'
import { expect, it } from 'vitest'
import { burstShards } from '~app/bursts/lib/shards'
import { Burst } from './index'

it('paints the flash first, then one shard per table row with its direction and spin', () => {
  const ref = createRef<HTMLDivElement>()
  const { container } = render(<Burst ref={ref} tone="ally" size="large" />)

  const anchor = container.firstElementChild as HTMLElement
  expect(ref.current).toBe(anchor)
  expect(anchor.className).toBe('burst burst--ally burst--large')
  const [flash, ...shards] = [...anchor.children] as HTMLElement[]
  expect(flash.className).toBe('burst__flash')
  expect(shards.map((shard) => shard.className)).toEqual(Array(10).fill('burst__shard'))
  expect(
    shards.map((shard) => ['--dx', '--dy', '--spin'].map((name) => shard.style.getPropertyValue(name))),
  ).toEqual(burstShards('large').map(({ dx, dy, spin }) => [String(dx), String(dy), `${spin}deg`]))
})

it('gives a small enemy burst six shards', () => {
  const { container } = render(<Burst tone="enemy" size="small" />)

  expect(container.firstElementChild?.className).toBe('burst burst--enemy burst--small')
  expect(container.querySelectorAll('.burst__shard').length).toBe(6)
})
