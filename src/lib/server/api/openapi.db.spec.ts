import { describe, expect, it } from 'vitest';
import { endpoints, openApiDocument } from './endpoints';
import type { Endpoint, Method } from './openapi';

const METHODS: Method[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

/** Every `$ref` in a JSON value. */
function refs(value: unknown): string[] {
	if (Array.isArray(value)) return value.flatMap(refs);
	if (!value || typeof value !== 'object') return [];
	return Object.entries(value).flatMap(([key, item]) =>
		key === '$ref' && typeof item === 'string' ? [item] : refs(item)
	);
}

describe('the OpenAPI document', () => {
	const { paths, components } = openApiDocument;

	it('describes an API with bearer keys', () => {
		expect(openApiDocument.openapi).toBe('3.1.0');
		expect(openApiDocument.servers[0].url).toBe('/api/v1');
		expect(components.securitySchemes.apiKey).toMatchObject({ type: 'http', scheme: 'bearer' });
		expect(openApiDocument.security).toEqual([{ apiKey: [] }]);
		expect(components.schemas.Error).toBeDefined();
		// It survives being served.
		expect(JSON.parse(JSON.stringify(openApiDocument))).toEqual(openApiDocument);
	});

	it('lists every endpoint once, with its tag and path parameters', () => {
		const tags = openApiDocument.tags.map((tag) => tag.name);
		for (const endpoint of endpoints) {
			const operation = paths[endpoint.path]?.[endpoint.method.toLowerCase() as 'get'];
			expect(operation?.operationId, endpoint.operationId).toBe(endpoint.operationId);
			expect(tags).toContain(operation!.tags[0]);
			for (const [, name] of endpoint.path.matchAll(/\{(\w+)\}/g)) {
				expect(operation!.parameters, `${endpoint.operationId} ${name}`).toContainEqual(
					expect.objectContaining({ name, in: 'path', required: true })
				);
			}
		}
		const ids = endpoints.map((endpoint) => endpoint.operationId);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('only refers to schemas it defines', () => {
		const all = refs(openApiDocument);
		expect(all.length).toBeGreaterThan(0);
		for (const ref of all) {
			expect(ref).toMatch(/^#\/components\/schemas\//);
			expect(components.schemas, ref).toHaveProperty([ref.replace('#/components/schemas/', '')]);
		}
		for (const schema of Object.values(components.schemas)) {
			expect(schema).not.toHaveProperty('$schema');
			expect(schema).not.toHaveProperty('$id');
		}
	});
});

describe('the API routes', () => {
	const routes = import.meta.glob<Record<string, unknown>>('/src/routes/api/v1/**/+server.ts', {
		eager: true
	});

	it('serve exactly the documented endpoints', () => {
		const served = new Set<Endpoint>();
		for (const [file, route] of Object.entries(routes)) {
			if (file.includes('/openapi.json/') || file.includes('/[...path]/')) continue;
			const path = file
				.replace('/src/routes/api/v1', '')
				.replace('/+server.ts', '')
				.replace(/\[(\w+)\]/g, '{$1}');
			expect(route.fallback, file).toBeTypeOf('function');
			for (const method of METHODS) {
				if (!route[method]) continue;
				const endpoint = (route[method] as { endpoint?: Endpoint }).endpoint;
				expect(endpoint, `${method} ${path}`).toMatchObject({ method, path });
				expect(endpoints).toContain(endpoint);
				served.add(endpoint!);
			}
		}
		expect(served.size).toBe(29);
		expect(served.size).toBe(endpoints.length);
	});
});
