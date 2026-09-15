/** Every screen a run can be on. */
export type SessionState = 'title' | 'loadout' | 'playing' | 'paused' | 'gameover';

/** Everything that can move a run between screens. */
export type SessionEvent
  = | 'start'
    | 'confirm'
    | 'pause'
    | 'resume'
    | 'abort'
    | 'die'
    | 'reset';
