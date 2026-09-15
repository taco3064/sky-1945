import { expect, it } from 'vitest';
import { createFrameMeter, recordFrame } from './frameMeter';

it('reads 0 until the first window closes', () => {
  expect(createFrameMeter()).toMatchObject({ fps: 0, worst: 0 });
});

it('publishes fps and the longest frame per 500 ms window, then resets', () => {
  const meter = createFrameMeter();
  const frames = [16.6, 16.8, 40.2, ...Array.from({ length: 27 }, () => 15.8)];

  const published = frames.map((frameMs) => recordFrame(meter, frameMs));

  expect(published.indexOf(true)).toBe(29);
  // 30 frames in 500.2 ms
  expect(meter).toEqual({ windowMs: 0, frames: 0, longestMs: 0, fps: 60, worst: 40 });
});

it('reads 0 fps for a single frame of 2 s or longer', () => {
  const meter = createFrameMeter();

  expect(recordFrame(meter, 2400)).toBe(true);

  expect([meter.fps, meter.worst]).toEqual([0, 2400]);
});
