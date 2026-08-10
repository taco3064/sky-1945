/**
 * One subscribe-and-broadcast shape, used three times by the world.
 *
 * It exists because the same eight lines were written out for transforms, for
 * the roster, and for combat state — three sets, three loops, three
 * unsubscribes. Same-layer sharing means the shared part wants a home of its
 * own, and this is the smallest one that fits.
 *
 * No `now`, no timers, no bodies: it forwards values and holds nothing else.
 */

export interface Channel<T> {
  /** Listen. Returns its own unsubscribe. */
  subscribe: (listener: (value: T) => void) => () => void;
  /** Deliver to everyone listening. */
  send: (value: T) => void;
  /** Drop every listener. */
  clear: () => void;
}

/** The same thing, but partitioned by key — one bucket of listeners per id. */
export interface KeyedChannel<K, T> {
  subscribe: (key: K, listener: (value: T) => void) => () => void;
  /** Deliver to the listeners on one key. Unknown keys are a no-op. */
  send: (key: K, value: T) => void;
  clear: () => void;
}

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
