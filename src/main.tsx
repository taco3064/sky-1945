import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import Game from '~app/pages/Game';

import './index.css';

// Root files are wiring, not a layer — no structural rule reaches this file,
// and none should: it is the one place allowed to know both the DOM and the
// top of the app.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Game />
  </StrictMode>,
);
