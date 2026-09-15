import { render } from '@testing-library/react';
import { createRef } from 'react';
import { expect, it } from 'vitest';
import { EnemyCraft } from './EnemyCraft';

it.each([
  ['small', ['wing', 'body', 'core']],
  ['medium', ['wing', 'pod-left', 'pod-right', 'body', 'canopy']],
  ['large', ['wing', 'armour', 'pod-left', 'pod-right', 'body', 'core']],
] as const)('draws the %s craft parts in paint order inside the placed mount', (kind, parts) => {
  const ref = createRef<HTMLDivElement>();
  const { container } = render(<EnemyCraft ref={ref} kind={kind} />);

  const mount = container.firstElementChild as HTMLElement;

  expect(ref.current).toBe(mount);
  expect(mount.className).toBe(`enemy enemy--${kind}`);
  expect(mount.children.length).toBe(1);
  expect(mount.firstElementChild?.className).toBe('enemy__craft');

  expect([...(mount.firstElementChild?.children ?? [])].map((part) => part.className)).toEqual(
    parts.map((part) => `enemy__${part}`),
  );
});
