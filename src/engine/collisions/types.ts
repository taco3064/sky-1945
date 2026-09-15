/** A contact worth acting on. `player-hit` carries nothing: contact is fatal. */
export type Hit
  = | { kind: 'enemy-damaged'; enemyId: number; bulletId: number; damage: number }
    | { kind: 'player-hit' };

export interface CollisionWatch {
  /** Everything that collided since the last call. Empties the buffer. */
  drain: () => Hit[];
  /** Stop listening. */
  dispose: () => void;
}
