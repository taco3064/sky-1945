import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { PulseButton } from './PulseButton';

it('reads PULSE and looks ready at full energy', () => {
  render(<PulseButton energy={100} onPulse={vi.fn()} />);

  const button = screen.getByRole('button', { name: 'PULSE' });

  expect(button.className).toBe('pulse-button');
  expect(button.getAttribute('type')).toBe('button');
  expect(button.getAttribute('aria-disabled')).toBe('false');
});

it('is dimmed below 100 energy', () => {
  render(<PulseButton energy={96} onPulse={vi.fn()} />);

  const button = screen.getByRole('button', { name: 'PULSE' });

  expect(button.className).toBe('pulse-button pulse-button--charging');
  expect(button.getAttribute('aria-disabled')).toBe('true');
});

it('attempts a Pulse on pointer down and on click', () => {
  const onPulse = vi.fn();

  render(<PulseButton energy={100} onPulse={onPulse} />);
  const button = screen.getByRole('button', { name: 'PULSE' });

  fireEvent.pointerDown(button, { pointerId: 2 });
  expect(onPulse).toHaveBeenCalledTimes(1);

  fireEvent.click(button);
  expect(onPulse).toHaveBeenCalledTimes(2);
});
