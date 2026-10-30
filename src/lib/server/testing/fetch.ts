type Handler = (request: Request) => Response | Promise<Response> | unknown;

/**
 * A `fetch` stand-in for tests. Keys are `METHOD url-prefix`; a handler returning a non-Response
 * value is sent as JSON. Unmatched requests fail the test.
 */
export function mockFetch(routes: Record<string, Handler>) {
	const calls: Request[] = [];
	const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
		const request = new Request(input, init);
		calls.push(request);
		const key = Object.keys(routes).find((route) => {
			const [method, prefix] = route.split(' ');
			return request.method === method && request.url.startsWith(prefix);
		});
		if (!key) throw new Error(`Unexpected request: ${request.method} ${request.url}`);
		const result = await routes[key](request);
		return result instanceof Response ? result : Response.json(result);
	};
	return { fetch: fetch as typeof globalThis.fetch, calls };
}
