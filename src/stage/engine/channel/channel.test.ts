import { describe, expect, it, vi } from 'vitest';

import { createChannel, createKeyedChannel } from './channel';

describe('createChannel', () => {
  it('delivers to everyone listening', () => {
    const channel = createChannel<number>();
    const first = vi.fn();
    const second = vi.fn();

    channel.subscribe(first);
    channel.subscribe(second);
    channel.send(7);

    expect(first).toHaveBeenCalledWith(7);
    expect(second).toHaveBeenCalledWith(7);
  });

  it('stops delivering to an unsubscribed listener', () => {
    const channel = createChannel<number>();
    const listener = vi.fn();
    const stop = channel.subscribe(listener);

    stop();
    channel.send(1);

    expect(listener).not.toHaveBeenCalled();
  });

  it('delivers nothing after clear', () => {
    const channel = createChannel<number>();
    const listener = vi.fn();

    channel.subscribe(listener);
    channel.clear();
    channel.send(1);

    expect(listener).not.toHaveBeenCalled();
  });

  it('sends to nobody without complaint', () => {
    expect(() => createChannel<number>().send(1)).not.toThrow();
  });
});

describe('createKeyedChannel', () => {
  it('delivers only to the key that was sent', () => {
    const channel = createKeyedChannel<number, string>();
    const onOne = vi.fn();
    const onTwo = vi.fn();

    channel.subscribe(1, onOne);
    channel.subscribe(2, onTwo);
    channel.send(1, 'hello');

    expect(onOne).toHaveBeenCalledWith('hello');
    expect(onTwo).not.toHaveBeenCalled();
  });

  it('delivers to every listener on one key', () => {
    const channel = createKeyedChannel<number, string>();
    const first = vi.fn();
    const second = vi.fn();

    channel.subscribe(1, first);
    channel.subscribe(1, second);
    channel.send(1, 'x');

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  // Bullets despawn constantly, so sending to a key nobody watches is the
  // normal case rather than an error.
  it('ignores a key nobody is watching', () => {
    const channel = createKeyedChannel<number, string>();

    expect(() => channel.send(99, 'x')).not.toThrow();
  });

  it('unsubscribes one listener without disturbing the other', () => {
    const channel = createKeyedChannel<number, string>();
    const kept = vi.fn();
    const dropped = vi.fn();

    channel.subscribe(1, kept);
    const stop = channel.subscribe(1, dropped);

    stop();
    channel.send(1, 'x');

    expect(kept).toHaveBeenCalledOnce();
    expect(dropped).not.toHaveBeenCalled();
  });

  it('delivers nothing after clear', () => {
    const channel = createKeyedChannel<number, string>();
    const listener = vi.fn();

    channel.subscribe(1, listener);
    channel.clear();
    channel.send(1, 'x');

    expect(listener).not.toHaveBeenCalled();
  });
});
