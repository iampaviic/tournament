import type { z } from 'zod';
import type { OpenApiDocument, OpenApiOperation } from './openapi';

type JSONSchema = z.core.JSONSchema.JSONSchema;
type AnySchema = z.core.JSONSchema._JSONSchema;

const schemaOf = (schema: AnySchema): JSONSchema => (typeof schema === 'boolean' ? {} : schema);
const refName = (ref: string) => ref.slice(ref.lastIndexOf('/') + 1);

/** A short type for people, e.g. `Match[]`, `string (uuid)` or `"draft" | "running"`. */
export function typeLabel(input: AnySchema): string {
	const schema = schemaOf(input);
	if (schema.$ref) return refName(schema.$ref);
	const members = schema.anyOf ?? schema.oneOf;
	if (members) return members.map((member) => typeLabel(member)).join(' | ');
	if (schema.enum) return schema.enum.map((value) => JSON.stringify(value)).join(' | ');
	if (schema.const !== undefined) return JSON.stringify(schema.const);
	if (schema.type === 'array' && schema.prefixItems) {
		return `[${schema.prefixItems.map((item) => typeLabel(item)).join(', ')}]`;
	}
	if (schema.type === 'array' && schema.items && !Array.isArray(schema.items)) {
		const item = typeLabel(schema.items);
		return item.includes(' | ') ? `(${item})[]` : `${item}[]`;
	}
	if (schema.type === 'string' && schema.format) return `string (${schema.format})`;
	if (schema.type === 'object' && !schema.properties) return 'object';
	if (Array.isArray(schema.type)) return schema.type.join(' | ');
	return schema.type ?? 'any';
}

/** The component a schema shows: itself, its items, or its value when it's nullable. */
function refOf(input: AnySchema): string | null {
	const schema = schemaOf(input);
	if (schema.$ref) return refName(schema.$ref);
	const items = schema.items && !Array.isArray(schema.items) ? schemaOf(schema.items) : {};
	if (schema.type === 'array' && items.$ref) return refName(items.$ref);
	const value = schema.anyOf?.filter((member) => member.type !== 'null');
	if (value?.length === 1 && value[0].$ref) return refName(value[0].$ref);
	return null;
}

const typed = (schema: AnySchema) => ({ type: typeLabel(schema), ref: refOf(schema) });

function operationView(path: string, method: string, operation: OpenApiOperation) {
	return {
		id: operation.operationId,
		method: method.toUpperCase(),
		path: `/api/v1${path}`,
		summary: operation.summary,
		description: operation.description ?? null,
		parameters: (operation.parameters ?? []).map((parameter) => ({
			name: parameter.name,
			in: parameter.in,
			...typed(parameter.schema),
			required: parameter.required,
			description: parameter.description ?? null
		})),
		body: operation.requestBody
			? typed(operation.requestBody.content['application/json'].schema)
			: null,
		responses: Object.entries(operation.responses)
			.sort(([a], [b]) => Number(a) - Number(b))
			.map(([status, response]) => {
				const schema = response.content?.['application/json'].schema;
				return {
					status: Number(status),
					description: response.description,
					...(schema ? typed(schema) : { type: null, ref: null })
				};
			})
	};
}

/** The API docs page's view of the OpenAPI document. */
export function apiReference(document: OpenApiDocument) {
	const operations = Object.entries(document.paths).flatMap(([path, methods]) =>
		Object.entries(methods).flatMap(([method, operation]) =>
			operation ? [{ tag: operation.tags[0], view: operationView(path, method, operation) }] : []
		)
	);
	return {
		tags: document.tags.map((tag) => ({
			name: tag.name,
			description: tag.description,
			operations: operations
				.filter((operation) => operation.tag === tag.name)
				.map((operation) => operation.view)
		})),
		schemas: Object.entries(document.components.schemas)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([name, schema]) => ({
				name,
				description: schema.description ?? null,
				type: typeLabel(schema),
				fields: Object.entries(schema.properties ?? {}).map(([field, value]) => ({
					name: field,
					...typed(value),
					required: schema.required?.includes(field) ?? false,
					description: schemaOf(value).description ?? null
				})),
				json: JSON.stringify(schema, null, 2)
			}))
	};
}
