import type { Channel, KeyedChannel } from './types';

export function createChannel<T>(): Channel<T> {
  const listeners = new Set<(value: T) => void>();

  return {
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    send(value) {
      for (const listener of listeners) {
        listener(value);
      }
    },

    clear: () => listeners.clear(),
  };
}

export function createKeyedChannel<K, T>(): KeyedChannel<K, T> {
  const buckets = new Map<K, Set<(value: T) => void>>();

  return {
    subscribe(key, listener) {
      const bucket = buckets.get(key) ?? new Set<(value: T) => void>();

      bucket.add(listener);
      buckets.set(key, bucket);

      return () => {
        bucket.delete(listener);
      };
    },

    send(key, value) {
      const bucket = buckets.get(key);

      if (!bucket) {
        return;
      }

      for (const listener of bucket) {
        listener(value);
      }
    },

    clear: () => buckets.clear(),
  };
}
