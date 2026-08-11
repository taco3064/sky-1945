/** Which silhouette to draw. A plain union — components do not read engine types. */
export type EnemyVariant = 'small' | 'medium' | 'large';

export interface EnemyProps {
  /** The engine's id for this aircraft. */
  id: number;
  variant: EnemyVariant;
}
