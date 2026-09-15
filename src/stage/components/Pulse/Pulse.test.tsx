import { render } from '@testing-library/react';
import { createRef } from 'react';
import { expect, it } from 'vitest';
import { Pulse } from './Pulse';

it('draws the Pulse as a single placed element', () => {
  const ref = createRef<HTMLDivElement>();
  const { container } = render(<Pulse ref={ref} />);

  const pulse = container.firstElementChild as HTMLElement;

  expect(ref.current).toBe(pulse);
  expect(pulse.className).toBe('pulse');
  expect(pulse.children.length).toBe(0);
});
