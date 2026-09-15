export interface StatBarProps {
  /** What the bar measures, e.g. `SPEED`. */
  label: string;
  /** Where the value sits, in whole percent. */
  percent: number;
  /** The scale's low end, in whole percent. */
  min: number;
  /** The scale's high end, in whole percent. */
  max: number;
}
