import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePlayerInput } from './usePlayerInput';
import { stubWorld } from '~app/fixtures/world.fixtures';
import type { World } from '~app/engine/world';

function Controls({ world, onPause }: { world: World; onPause: () => void }) {
  const { surface, stick } = usePlayerInput(world, onPause);

  return (
    <>
      <div ref={surface} data-testid="surface" />
      <div ref={stick} data-testid="stick" />
    </>
  );
}

/**
 * The composition, not the halves — keyboard.test and pointer.test cover
 * those. What matters here is that one call wires both, so a screen never
 * has to remember to attach two.
 */
describe('usePlayerInput', () => {
  it('hands back both refs', () => {
    const { getByTestId } = render(<Controls world={stubWorld()} onPause={() => {}} />);

    expect(getByTestId('surface')).toBeDefined();
    expect(getByTestId('stick')).toBeDefined();
  });

  it('wires the keyboard', () => {
    const world = stubWorld();

    render(<Controls world={world} onPause={() => {}} />);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

    expect(world.setPlayerDirection).toHaveBeenCalledWith(-1, 0);
  });

  it('wires the pointer', () => {
    const world = stubWorld();
    const { getByTestId } = render(<Controls world={world} onPause={() => {}} />);
    const surface = getByTestId('surface');

    surface.setPointerCapture = vi.fn();

    surface.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true, pointerId: 1, clientX: 50, clientY: 50,
      }),
    );

    expect(getByTestId('stick').style.opacity).toBe('1');
  });

  it('wires pause', () => {
    const onPause = vi.fn();

    render(<Controls world={stubWorld()} onPause={onPause} />);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onPause).toHaveBeenCalledOnce();
  });
});
