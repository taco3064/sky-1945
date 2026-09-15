import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { PulseMeter } from './PulseMeter';

it('reads PULSE and the energy as a percentage, filled to energy / 100', () => {
  const { container } = render(<PulseMeter energy={64} />);

  const meter = container.firstElementChild as HTMLElement;
  const track = screen.getByRole('progressbar', { name: 'PULSE energy' });

  expect(meter.className).toBe('pulse-meter');

  expect([...meter.children].map((child) => child.className))
    .toEqual(['pulse-meter__reading', 'pulse-meter__track']);

  expect(meter.firstElementChild?.textContent).toBe('PULSE64%');
  expect(screen.getByText('64%').className).toBe('pulse-meter__value');

  expect(['aria-valuemin', 'aria-valuemax', 'aria-valuenow']
    .map((name) => track.getAttribute(name))).toEqual(['0', '100', '64']);

  expect((track.firstElementChild as HTMLElement).style.width).toBe('64%');
});

it('starts empty', () => {
  render(<PulseMeter energy={0} />);

  const fill = screen.getByRole('progressbar').firstElementChild as HTMLElement;

  expect(screen.getByText('0%')).toBeTruthy();
  expect(fill.style.width).toBe('0%');
});

it('reads READY instead of 100% once full', () => {
  const { container } = render(<PulseMeter energy={100} />);

  expect(container.firstElementChild?.className).toBe('pulse-meter pulse-meter--ready');
  expect(screen.getByText('READY').className).toBe('pulse-meter__value');
  expect(screen.queryByText('100%')).toBeNull();

  expect((screen.getByRole('progressbar').firstElementChild as HTMLElement).style.width)
    .toBe('100%');
});
