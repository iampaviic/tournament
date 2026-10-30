import { vi } from 'vitest';

/** Vitest setup for `*.db.spec.ts`: services that fetch get a mock `fetch` of their own, so a
 * real request means a test reached past its mock (e.g. Steam with a developer's key). */
vi.stubGlobal('fetch', (input: RequestInfo | URL) =>
	Promise.reject(new Error(`Database tests may not reach the network (${String(input)}).`))
);
