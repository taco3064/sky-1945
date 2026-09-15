import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { LifeIcon } from './LifeIcon';

it('draws the wing, then the body, inside a span', () => {
  const { container } = render(<LifeIcon />);

  const icon = container.firstElementChild as HTMLElement;

  expect([icon.tagName, icon.className]).toEqual(['SPAN', 'life-icon']);

  expect([...icon.children].map((part) => part.className))
    .toEqual(['life-icon__wing', 'life-icon__body']);
});
