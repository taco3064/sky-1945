import { isPulseReady } from '~app/battle/models/pulse';
import './PulseButton.css';

interface PulseButtonProps {
  energy: number;
  onPulse: () => void;
}

/**
 * The touch PULSE button in the HUD, dimmed until PULSE is full (PULSE DRIVE 12). It
 * attempts on pointer down, so a second finger can press it while another steers;
 * click keeps it keyboard-operable. A pointer's own trailing click attempts again and
 * is refused, because a started Pulse has spent the energy.
 */
export function PulseButton({ energy, onPulse }: PulseButtonProps) {
  const ready = isPulseReady(energy);

  return (
    <button
      className={ready ? 'pulse-button' : 'pulse-button pulse-button--charging'}
      type="button"
      aria-disabled={!ready}
      onPointerDown={onPulse}
      onClick={onPulse}
    >
      PULSE
    </button>
  );
}
