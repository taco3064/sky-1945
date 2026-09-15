import { expect, it } from 'vitest';
import { createPlacementRegistry } from './placementRegistry';

it('places a registered element and eases its lean from 0 on the first frame', () => {
  const registry = createPlacementRegistry();
  const element = document.createElement('div');

  registry.register(4, element);

  registry.place({ id: 4, x: 100, y: 200, angle: 180 });
  expect(element.style.transform).toBe('translate3d(100px, 200px, 0) rotate(180deg)');
  expect(element.style.getPropertyValue('--lean')).toBe('0.000');

  registry.place({ id: 4, x: 104, y: 200, angle: 180 });
  expect(element.style.getPropertyValue('--lean')).toBe('0.180');

  registry.place({ id: 4, x: 104, y: 210, angle: 180 });
  expect(element.style.getPropertyValue('--lean')).toBe('0.148');
});

it('writes the radius only for entities that have one', () => {
  const registry = createPlacementRegistry();
  const pulse = document.createElement('div');
  const bullet = document.createElement('div');

  registry.register(6, pulse);
  registry.register(7, bullet);

  registry.place({ id: 6, x: 270, y: 800, angle: 0, radius: 45 });
  registry.place({ id: 7, x: 270, y: 700, angle: 0 });

  expect(pulse.style.transform).toBe('translate3d(270px, 800px, 0) rotate(0deg)');
  expect(pulse.style.getPropertyValue('--radius')).toBe('45.00');
  expect(bullet.style.getPropertyValue('--radius')).toBe('');
});

it('ignores entities without an element and forgets unregistered ones', () => {
  const registry = createPlacementRegistry();
  const element = document.createElement('div');

  registry.register(4, element);
  registry.register(4, null);

  registry.place({ id: 4, x: 1, y: 2, angle: 0 });
  registry.place({ id: 5, x: 1, y: 2, angle: 0 });

  expect(element.style.transform).toBe('');
});

it('starts the lean over for a newly registered element', () => {
  const registry = createPlacementRegistry();
  const element = document.createElement('div');

  registry.register(1, element);
  registry.place({ id: 1, x: 0, y: 0, angle: 0 });
  registry.place({ id: 1, x: 40, y: 0, angle: 0 });

  registry.register(1, element);
  registry.place({ id: 1, x: 80, y: 0, angle: 0 });

  expect(element.style.getPropertyValue('--lean')).toBe('0.000');
});
