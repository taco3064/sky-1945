import { render } from '@testing-library/react';
import { createRef } from 'react';
import { expect, it } from 'vitest';
import { Beam } from './Beam';

it('draws the beam mount with its core', () => {
  const ref = createRef<HTMLDivElement>();
  const { container } = render(<Beam ref={ref} />);

  const mount = container.firstElementChild;

  expect(ref.current).toBe(mount);
  expect(mount?.className).toBe('beam');
  expect([...(mount?.children ?? [])].map((child) => child.className)).toEqual(['beam__core']);
});
