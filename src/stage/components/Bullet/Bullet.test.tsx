import { render } from '@testing-library/react';
import { createRef } from 'react';
import { expect, it } from 'vitest';
import { Bullet } from './Bullet';

it.each([
  ['player', 'bullet bullet--player'],
  ['enemy', 'bullet bullet--enemy'],
] as const)('draws a %s bullet as one placed element', (side, className) => {
  const ref = createRef<HTMLDivElement>();
  const { container } = render(<Bullet ref={ref} side={side} />);

  expect(container.firstElementChild?.className).toBe(className);
  expect(container.firstElementChild?.children.length).toBe(0);
  expect(ref.current).toBe(container.firstElementChild);
});
