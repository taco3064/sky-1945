import { render } from '@testing-library/react';
import { createRef } from 'react';
import { expect, it } from 'vitest';
import { BossCraft } from './BossCraft';

it('draws the charge line under the scaled craft, parts in paint order', () => {
  const ref = createRef<HTMLDivElement>();

  const { container } = render(
    <BossCraft ref={ref} size={1.25} pose="winding" move="beam" />,
  );

  const mount = container.firstElementChild as HTMLElement;
  const craft = mount.lastElementChild as HTMLElement;

  expect(ref.current).toBe(mount);
  expect(mount.className).toBe('boss');
  expect(mount.style.getPropertyValue('--boss-scale')).toBe('1.25');

  expect([...mount.children].map((child) => child.className))
    .toEqual(['boss__charge', 'boss__craft']);

  expect([...craft.children].map((part) => part.className)).toEqual([
    'boss__wing',
    'boss__arm-left',
    'boss__arm-right',
    'boss__armour',
    'boss__pod-left',
    'boss__pod-right',
    'boss__body',
    'boss__spine',
    'boss__canopy',
    'boss__core',
    'boss__muzzle',
  ]);
});

it('marks the pose and move for the tells', () => {
  const { container, rerender } = render(<BossCraft size={1} pose="firing" move="ram" />);
  const mount = container.firstElementChild as HTMLElement;

  expect([mount.dataset.pose, mount.dataset.move]).toEqual(['firing', 'ram']);

  rerender(<BossCraft size={1} pose="entering" move={null} />);
  expect(mount.dataset.pose).toBe('entering');
  expect(mount.hasAttribute('data-move')).toBe(false);
});
