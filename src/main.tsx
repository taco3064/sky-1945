import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';

// Root files are wiring, not a layer — no structural rule reaches this file,
// and none should: it is the one place allowed to know both the DOM and the
// top of the app.
//
// #2 replaces the empty tree with <Game /> from ~app/pages/Game. Until then
// the page is deliberately blank: this issue ends with a governed skeleton
// and no game code.
createRoot(document.getElementById('root')!).render(<StrictMode />);
