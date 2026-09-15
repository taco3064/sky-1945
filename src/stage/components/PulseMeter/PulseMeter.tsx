import { PULSE_MAX, isPulseReady } from '~app/battle/models/pulse';
import './PulseMeter.css';

interface PulseMeterProps {
  energy: number;
}

/** The PULSE meter in the HUD, reading READY once full (PULSE DRIVE 11). */
export function PulseMeter({ energy }: PulseMeterProps) {
  const ready = isPulseReady(energy);
  const percent = (energy / PULSE_MAX) * 100;

  return (
    <div className={ready ? 'pulse-meter pulse-meter--ready' : 'pulse-meter'}>
      <div className="pulse-meter__reading">
        <span>PULSE</span>
        <span className="pulse-meter__value">{ready ? 'READY' : `${percent}%`}</span>
      </div>
      <div
        className="pulse-meter__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={PULSE_MAX}
        aria-valuenow={energy}
        aria-label="PULSE energy"
      >
        <div className="pulse-meter__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
