import { fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePointerSteering } from './usePointerSteering';

let now = 0;

beforeEach(() => {
  now = 1000;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  HTMLElement.prototype.setPointerCapture = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const STICK_VARS = ['--stick-x', '--stick-y', '--knob-x', '--knob-y'];

interface HarnessProps {
  onSteer: () => void;
  onRoll: () => void;
  withStick?: boolean;
}

function Harness(props: HarnessProps) {
  const { stickRef, ...handlers } = usePointerSteering(props);

  return (
    <>
      <div data-testid="surface" {...handlers} />
      {props.withStick !== false && <div data-testid="stick" ref={stickRef} />}
    </>
  );
}

function setup(withStick = true) {
  const onSteer = vi.fn();
  const onRoll = vi.fn();

  const view = render(
    <Harness onSteer={onSteer} onRoll={onRoll} withStick={withStick} />,
  );

  const surface = view.getByTestId('surface');
  const stick = view.queryByTestId('stick');

  const vars = () => STICK_VARS.map((name) => stick?.style.getPropertyValue(name));

  return { onSteer, onRoll, surface, stick, vars };
}

describe('steering pointer', () => {
  it('captures the first pointer and shows the stick at the touch, knob centred', () => {
    const { surface, stick, vars } = setup();

    fireEvent.pointerDown(surface, { pointerId: 7, clientX: 120, clientY: 640 });

    expect(surface.setPointerCapture).toHaveBeenCalledWith(7);
    expect(vars()).toEqual(['120px', '640px', '0px', '0px']);
    expect(stick?.classList.contains('touch-stick--active')).toBe(true);
  });

  it('steers along the offset outside the dead zone and moves the capped knob', () => {
    const { surface, onSteer, vars } = setup();

    fireEvent.pointerDown(surface, { pointerId: 7, clientX: 100, clientY: 100 });

    fireEvent.pointerMove(surface, { pointerId: 7, clientX: 102, clientY: 101 });
    fireEvent.pointerMove(surface, { pointerId: 7, clientX: 100, clientY: 140 });

    expect(onSteer.mock.calls).toEqual([[{ x: 0, y: 0 }], [{ x: 0, y: 40 }]]);
    expect(vars().slice(2)).toEqual(['0px', '26px']);
  });

  it('ignores moves and releases of other pointers', () => {
    const { surface, onSteer, onRoll } = setup();

    fireEvent.pointerMove(surface, { pointerId: 7, clientX: 150, clientY: 100 });
    fireEvent.pointerUp(surface, { pointerId: 7 });
    fireEvent.pointerDown(surface, { pointerId: 7, clientX: 100, clientY: 100 });

    fireEvent.pointerMove(surface, { pointerId: 8, clientX: 150, clientY: 100 });
    fireEvent.pointerUp(surface, { pointerId: 8 });

    expect([onSteer.mock.calls.length, onRoll.mock.calls.length]).toEqual([0, 0]);
  });
});

describe('release', () => {
  it('rolls on a quick tap, then stops and hides the stick', () => {
    const { surface, stick, onSteer, onRoll, vars } = setup();

    fireEvent.pointerDown(surface, { pointerId: 7, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(surface, { pointerId: 7, clientX: 103, clientY: 100 });

    now = 1150;
    fireEvent.pointerUp(surface, { pointerId: 7 });

    expect(onRoll).toHaveBeenCalledTimes(1);
    expect(onSteer).toHaveBeenLastCalledWith({ x: 0, y: 0 });
    expect(vars().slice(2)).toEqual(['0px', '0px']);
    expect(stick?.classList.contains('touch-stick--active')).toBe(false);
  });

  it('does not roll after a long hold or a drag, and a cancel releases too', () => {
    const { surface, onRoll, onSteer } = setup();

    fireEvent.pointerDown(surface, { pointerId: 7, clientX: 100, clientY: 100 });
    now = 1200;
    fireEvent.pointerCancel(surface, { pointerId: 7 });

    fireEvent.pointerDown(surface, { pointerId: 8, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(surface, { pointerId: 8, clientX: 100, clientY: 95 });
    fireEvent.pointerUp(surface, { pointerId: 8 });

    expect(onRoll).not.toHaveBeenCalled();
    expect(onSteer.mock.calls.at(-1)).toEqual([{ x: 0, y: 0 }]);
  });
});

describe('second pointer', () => {
  it('attempts a roll immediately while another pointer steers', () => {
    const { surface, onRoll } = setup();

    fireEvent.pointerDown(surface, { pointerId: 7, clientX: 100, clientY: 100 });

    fireEvent.pointerDown(surface, { pointerId: 8, clientX: 300, clientY: 100 });

    expect(onRoll).toHaveBeenCalledTimes(1);
    expect(surface.setPointerCapture).toHaveBeenCalledTimes(1);
  });
});

it('steers without a mounted stick', () => {
  const { surface, onSteer } = setup(false);

  fireEvent.pointerDown(surface, { pointerId: 1, clientX: 0, clientY: 0 });
  fireEvent.pointerMove(surface, { pointerId: 1, clientX: 10, clientY: 0 });
  fireEvent.pointerUp(surface, { pointerId: 1 });

  expect(onSteer.mock.calls).toEqual([[{ x: 10, y: 0 }], [{ x: 0, y: 0 }]]);
});
