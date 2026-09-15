import type { Ref } from 'react';
import './AllyCraft.css';

interface AllyCraftProps {
  ref?: Ref<HTMLDivElement>;
  rolling: boolean;
  protected: boolean;
  spent: boolean;
}

/** ALLY-01, the player's aircraft (game-spec 9.1). `ref` is the outer placed element. */
export function AllyCraft({ ref, rolling, protected: isProtected, spent }: AllyCraftProps) {
  const className = [
    'ally',
    isProtected && 'ally--protected',
    rolling && 'ally--rolling',
    spent && 'ally--spent',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={ref} className={className}>
      <div className="ally__craft">
        <div className="ally__thrust" />
        <div className="ally__wing" />
        <div className="ally__fin ally__fin--left" />
        <div className="ally__fin ally__fin--right" />
        <div className="ally__body" />
        <div className="ally__canopy" />
      </div>
    </div>
  );
}
