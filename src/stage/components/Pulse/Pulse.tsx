import type { Ref } from 'react';
import './Pulse.css';

interface PulseProps {
  ref?: Ref<HTMLDivElement>;
}

/**
 * The active Pulse Drive around the aircraft (PULSE DRIVE 10). `ref` is the placed
 * element; its size comes from the gameplay radius placed each frame.
 */
export function Pulse({ ref }: PulseProps) {
  return <div ref={ref} className="pulse" />;
}
