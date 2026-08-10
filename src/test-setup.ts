import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Root wiring, not a layer — the same category as main.tsx.
//
// The suite runs with `globals: false`, so @testing-library never finds a
// global `afterEach` to register its own cleanup with. Without this line
// every renderHook leaves its component mounted and its window listeners
// bound, and a later test inherits an earlier one's key map. That is how it
// was found: a test asserting an *unmapped* key is left alone kept seeing it
// handled, by a previous test's handler.
afterEach(cleanup);
