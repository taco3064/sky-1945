import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ControlsTable } from './ControlsTable';

it('lists every binding under KEYS and TOUCH', () => {
  render(<ControlsTable />);

  const table = screen.getByRole('table', { name: 'CONTROLS' });

  const rows = [...table.querySelectorAll('tr')].map((row) =>
    [...row.children].map((cell) => `${cell.tagName}:${cell.getAttribute('scope') ?? ''}:${cell.textContent}`),
  );

  expect(rows).toEqual([
    ['TD::', 'TH:col:KEYS', 'TH:col:TOUCH'],
    ['TH:row:STEER', 'TD::ARROW KEYS', 'TD::DRAG ANYWHERE'],
    ['TH:row:ROLL', 'TD::SPACE', 'TD::TAP OR 2ND FINGER'],
    ['TH:row:PAUSE', 'TD::ESC', 'TD::❚❚ BUTTON'],
    ['TH:row:PULSE', 'TD::X', 'TD::PULSE BUTTON'],
  ]);
});
