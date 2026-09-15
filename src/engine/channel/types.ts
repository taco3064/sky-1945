/** One subscribe-and-broadcast shape. It forwards values and holds nothing else. */
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
