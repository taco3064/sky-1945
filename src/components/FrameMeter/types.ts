export interface FrameMeterProps {
  /** Frames per second, averaged over the last window. */
  fps: number;
  /** The longest single frame in that window, in milliseconds. */
  worst: number;
}
