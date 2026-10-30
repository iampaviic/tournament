import { z } from 'zod';
import { errorSchema } from './errors';

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** The groups of the documentation, in order. */
export const TAGS = [
	{
		name: 'Tournaments',
		description: "The organization's tournaments, their settings, requirements and theme."
	},
	{ name: 'Lifecycle', description: 'Moving a tournament through its phases until it starts.' },
	{ name: 'Stages', description: 'How the tournament is played: one or two stages.' },
	{ name: 'Participants', description: 'Who plays, in which seed order, and check-in.' },
	{ name: 'Matches', description: "Matches, their results and the players' reports." },
	{ name: 'Messages', description: 'The chat of a match room.' }
] as const;
export type Tag = (typeof TAGS)[number]['name'];

/** One REST operation. The route validates with these schemas, and the OpenAPI document shows them. */
export interface Endpoint {
	operationId: string;
	method: Method;
	/** Relative to `/api/v1`, with `{param}` placeholders. */
	path: string;
	tag: Tag;
	summary: string;
	description?: string;
	params?: z.ZodObject;
	query?: z.ZodObject;
	body?: z.ZodType;
	response:
		| { status: 200 | 201; description: string; schema: z.ZodType }
		| { status: 204; description: string };
	/** Rule violations it can answer with, besides 400/401/404. */
	conflicts?: readonly (409 | 422)[];
}

export const defineEndpoint = <const E extends Endpoint>(endpoint: E) => endpoint;

type JSONSchema = z.core.JSONSchema.JSONSchema;
type Content = { 'application/json': { schema: JSONSchema } };

export interface OpenApiParameter {
	name: string;
	in: 'path' | 'query';
	required: boolean;
	description?: string;
	schema: JSONSchema;
}

export interface OpenApiResponse {
	description: string;
	content?: Content;
}

export interface OpenApiOperation {
	operationId: string;
	tags: Tag[];
	summary: string;
	description?: string;
	parameters?: OpenApiParameter[];
	requestBody?: { required: boolean; content: Content };
	responses: Record<string, OpenApiResponse>;
}

export interface OpenApiDocument {
	openapi: '3.1.0';
	info: { title: string; version: string; description: string };
	servers: { url: string }[];
	security: Record<string, string[]>[];
	tags: { name: Tag; description: string }[];
	paths: Record<string, Partial<Record<Lowercase<Method>, OpenApiOperation>>>;
	components: {
		securitySchemes: Record<string, { type: 'http'; scheme: 'bearer'; description: string }>;
		schemas: Record<string, JSONSchema>;
	};
}

/** `z.toJSONSchema` marks every schema as a document of its own; inside OpenAPI they aren't. */
function embedded(schema: JSONSchema): JSONSchema {
	return Object.fromEntries(
		Object.entries(schema).filter(([key]) => key !== '$schema' && key !== '$id')
	);
}

const json = (schema: JSONSchema): Content => ({ 'application/json': { schema } });

/**
 * The OpenAPI 3.1 document of the endpoints. Bodies and responses must be schemas of the
 * registry (or arrays of them), so each is defined once, in `components`.
 */
export function buildOpenApiDocument(
	endpoints: readonly Endpoint[],
	registry: z.core.$ZodRegistry<{ id: string }>
): OpenApiDocument {
	const uri = (id: string) => `#/components/schemas/${id}`;
	const { schemas } = z.toJSONSchema(registry, { io: 'input', uri });

	const ref = (schema: z.ZodType, operationId: string): JSONSchema => {
		const id = registry.get(schema)?.id;
		if (id) return { $ref: uri(id) };
		const item = schema instanceof z.ZodArray && registry.get(schema.element)?.id;
		if (item) return { type: 'array', items: { $ref: uri(item) } };
		throw new Error(`Register the API schemas of ${operationId}.`);
	};
	const parameters = (place: 'path' | 'query', object?: z.ZodObject): OpenApiParameter[] =>
		Object.entries(object?.shape ?? {}).map(([name, field]: [string, z.ZodType]) => ({
			name,
			in: place,
			required: place === 'path' || !field.isOptional(),
			description: field.description,
			schema: embedded(z.toJSONSchema(field, { io: 'input' }))
		}));
	const failure = (description: string): OpenApiResponse => ({
		description,
		content: json(ref(errorSchema, 'errors'))
	});

	const paths: OpenApiDocument['paths'] = {};
	for (const endpoint of endpoints) {
		const { operationId, response, conflicts = [] } = endpoint;
		const responses: Record<string, OpenApiResponse> = {
			[response.status]:
				'schema' in response
					? { description: response.description, content: json(ref(response.schema, operationId)) }
					: { description: response.description }
		};
		if (endpoint.body || endpoint.query) {
			responses[400] = failure('The request is invalid; `issues` lists each problem.');
		}
		responses[401] = failure('The API key is missing, malformed or revoked.');
		if (endpoint.params) {
			responses[404] = failure(
				"The tournament, or something else in the path, doesn't exist in the key's organization."
			);
		}
		if (conflicts.includes(409)) {
			responses[409] = failure("The tournament's current phase or state doesn't allow this.");
		}
		if (conflicts.includes(422)) {
			responses[422] = failure('The request breaks a rule of the tournament.');
		}

		const params = [...parameters('path', endpoint.params), ...parameters('query', endpoint.query)];
		(paths[endpoint.path] ??= {})[endpoint.method.toLowerCase() as Lowercase<Method>] = {
			operationId,
			tags: [endpoint.tag],
			summary: endpoint.summary,
			...(endpoint.description ? { description: endpoint.description } : {}),
			...(params.length ? { parameters: params } : {}),
			...(endpoint.body
				? { requestBody: { required: true, content: json(ref(endpoint.body, operationId)) } }
				: {}),
			responses
		};
	}

	return {
		openapi: '3.1.0',
		info: {
			title: 'Tournament Manager API',
			version: '1.0.0',
			description:
				"Run an organization's tournaments from servers and bots. Every request acts for the organization of its API key, and bodies are JSON. Send `Content-Type: application/json` with every POST, PUT, PATCH and DELETE, also without a body."
		},
		servers: [{ url: '/api/v1' }],
		security: [{ apiKey: [] }],
		tags: [...TAGS],
		paths,
		components: {
			securitySchemes: {
				apiKey: {
					type: 'http',
					scheme: 'bearer',
					description:
						'An organization API key, `tm_<prefix>_<secret>`. Create one in the organization admin, on the API keys tab.'
				}
			},
			schemas: Object.fromEntries(
				Object.entries(schemas).map(([id, schema]) => [id, embedded(schema)])
			)
		}
	};
}
