import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePointerControls } from './pointer';
import type { World } from '~app/engine/world';

function stubWorld(): World {
  return {
    playerId: 1,
    start: vi.fn(),
    pause: vi.fn(),
    dispose: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    subscribeRoster: vi.fn(() => () => {}),
    subscribeCombat: vi.fn(() => () => {}),
    setPlayerDirection: vi.fn(),
    roll: vi.fn(),
    subscribeRound: vi.fn(() => () => {}),
  };
}

function Surface({ world }: { world: World }) {
  const { surface, stick } = usePointerControls(world);

  return (
    <>
      <div ref={surface} data-testid="surface" />
      <div ref={stick} data-testid="stick" />
    </>
  );
}

/** jsdom has no pointer capture; the binding calls it on every first touch. */
function mount(world: World) {
  const view = render(<Surface world={world} />);
  const surface = view.getByTestId('surface');

  surface.setPointerCapture = vi.fn();

  return { surface, stick: view.getByTestId('stick') };
}

/** Dispatch a pointer event on the surface. Short, because it is everywhere. */
function fire(surface: HTMLElement, type: string, init: PointerEventInit): void {
  surface.dispatchEvent(new PointerEvent(type, { bubbles: true, ...init }));
}

function lastDirection(world: World): [number, number] {
  const calls = vi.mocked(world.setPlayerDirection).mock.calls;

  return calls[calls.length - 1] as [number, number];
}

describe('usePointerControls · the first finger steers', () => {
  it('shows the stick where the touch landed', () => {
    const world = stubWorld();
    const { surface, stick } = mount(world);

    fire(surface, 'pointerdown', { pointerId: 1, clientX: 80, clientY: 600 });

    expect(stick.style.getPropertyValue('--stick-x')).toBe('80px');
    expect(stick.style.getPropertyValue('--stick-y')).toBe('600px');
    expect(stick.style.opacity).toBe('1');
  });

  it('steers by the offset from where the finger landed', () => {
    const world = stubWorld();
    const { surface } = mount(world);

    fire(surface, 'pointerdown', { pointerId: 1, clientX: 100, clientY: 500 });
    fire(surface, 'pointermove', { pointerId: 1, clientX: 160, clientY: 460 });

    expect(lastDirection(world)).toEqual([60, -40]);
  });

  // A thumb resting on glass never sits perfectly still.
  it('ignores a tremor inside the deadzone', () => {
    const world = stubWorld();
    const { surface } = mount(world);

    fire(surface, 'pointerdown', { pointerId: 1, clientX: 100, clientY: 500 });
    fire(surface, 'pointermove', { pointerId: 1, clientX: 103, clientY: 502 });

    expect(lastDirection(world)).toEqual([0, 0]);
  });

  it('stops steering when the finger lifts', () => {
    const world = stubWorld();
    const { surface, stick } = mount(world);

    fire(surface, 'pointerdown', { pointerId: 1, clientX: 100, clientY: 500 });
    fire(surface, 'pointermove', { pointerId: 1, clientX: 200, clientY: 500 });
    fire(surface, 'pointerup', { pointerId: 1, clientX: 200, clientY: 500 });

    expect(lastDirection(world)).toEqual([0, 0]);
    expect(stick.style.opacity).toBe('0');
  });

  it('ignores movement from a finger that is not steering', () => {
    const world = stubWorld();
    const { surface } = mount(world);

    fire(surface, 'pointerdown', { pointerId: 1, clientX: 100, clientY: 500 });
    fire(surface, 'pointermove', { pointerId: 9, clientX: 400, clientY: 100 });

    expect(vi.mocked(world.setPlayerDirection)).not.toHaveBeenCalled();
  });
});

describe('usePointerControls · the second finger rolls', () => {
  // Told apart by which finger, never by how long one is held: a
  // long-press-versus-tap split would cost 150ms of lag on movement.
  it('rolls on contact, with the first finger still down', () => {
    const world = stubWorld();
    const { surface } = mount(world);

    fire(surface, 'pointerdown', { pointerId: 1, clientX: 100, clientY: 500 });
    fire(surface, 'pointerdown', { pointerId: 2, clientX: 300, clientY: 300 });

    expect(world.roll).toHaveBeenCalledOnce();
  });

  // Two-handed play: the rolling hand lifts constantly, and the steering
  // thumb must not be released with it.
  it('keeps steering when the rolling finger lifts', () => {
    const world = stubWorld();
    const { surface, stick } = mount(world);

    fire(surface, 'pointerdown', { pointerId: 1, clientX: 100, clientY: 500 });
    fire(surface, 'pointermove', { pointerId: 1, clientX: 200, clientY: 500 });
    fire(surface, 'pointerdown', { pointerId: 2, clientX: 300, clientY: 300 });
    fire(surface, 'pointerup', { pointerId: 2, clientX: 300, clientY: 300 });

    expect(stick.style.opacity).toBe('1');
    expect(lastDirection(world)).toEqual([100, 0]);
  });

  it('does not let the second finger take over steering', () => {
    const world = stubWorld();
    const { surface, stick } = mount(world);

    fire(surface, 'pointerdown', { pointerId: 1, clientX: 100, clientY: 500 });
    fire(surface, 'pointerdown', { pointerId: 2, clientX: 300, clientY: 300 });

    expect(stick.style.getPropertyValue('--stick-x')).toBe('100px');
  });
});

describe('usePointerControls · a quick tap also rolls', () => {
  // So a one-handed player can still dodge.
  it('rolls on a brief tap that barely moved', () => {
    const world = stubWorld();
    const { surface } = mount(world);

    fire(surface, 'pointerdown', { pointerId: 1, clientX: 100, clientY: 500 });
    fire(surface, 'pointerup', { pointerId: 1, clientX: 102, clientY: 501 });

    expect(world.roll).toHaveBeenCalledOnce();
  });

  it('does not roll when the finger actually steered', () => {
    const world = stubWorld();
    const { surface } = mount(world);

    fire(surface, 'pointerdown', { pointerId: 1, clientX: 100, clientY: 500 });
    fire(surface, 'pointermove', { pointerId: 1, clientX: 220, clientY: 500 });
    fire(surface, 'pointerup', { pointerId: 1, clientX: 220, clientY: 500 });

    expect(world.roll).not.toHaveBeenCalled();
  });
});

describe('usePointerControls · the knob stays inside its ring', () => {
  // Dragging far past the ring keeps steering in that direction — the stick
  // is a direction, not a leash — but the dot has to stop at the edge.
  it('caps the dot at the ring while the direction keeps going', () => {
    const world = stubWorld();
    const { surface, stick } = mount(world);

    fire(surface, 'pointerdown', { pointerId: 1, clientX: 100, clientY: 500 });
    fire(surface, 'pointermove', { pointerId: 1, clientX: 400, clientY: 500 });

    expect(stick.style.getPropertyValue('--knob-x')).toBe('56px');
    expect(lastDirection(world)).toEqual([300, 0]);
  });
});

describe('usePointerControls · nothing to attach to', () => {
  it('binds nothing when the refs never land on elements', () => {
    const world = stubWorld();

    function Detached() {
      usePointerControls(world);

      return null;
    }

    render(<Detached />);
    window.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1 }));

    expect(world.roll).not.toHaveBeenCalled();
  });
});

describe('usePointerControls · teardown', () => {
  it('releases the aircraft when a touch is cancelled', () => {
    const world = stubWorld();
    const { surface } = mount(world);

    fire(surface, 'pointerdown', { pointerId: 1, clientX: 100, clientY: 500 });
    fire(surface, 'pointercancel', { pointerId: 1, clientX: 100, clientY: 500 });

    expect(lastDirection(world)).toEqual([0, 0]);
  });

  it('stops listening on unmount', () => {
    const world = stubWorld();
    const view = render(<Surface world={world} />);
    const surface = view.getByTestId('surface');

    surface.setPointerCapture = vi.fn();
    view.unmount();
    fire(surface, 'pointerdown', { pointerId: 1, clientX: 10, clientY: 10 });

    expect(world.roll).not.toHaveBeenCalled();
  });
});
