import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// `globals: false`, so @testing-library cannot register its own cleanup.
afterEach(cleanup);
