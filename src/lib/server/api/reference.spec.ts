import { describe, expect, it } from 'vitest';
import type { OpenApiDocument } from './openapi';
import { apiReference, typeLabel } from './reference';

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const failure = (description: string) => ({
	description,
	content: { 'application/json': { schema: ref('Error') } }
});

const document: OpenApiDocument = {
	openapi: '3.1.0',
	info: { title: 'Test', version: '1.0.0', description: 'A test.' },
	servers: [{ url: '/api/v1' }],
	security: [{ apiKey: [] }],
	tags: [
		{ name: 'Matches', description: 'Matches.' },
		{ name: 'Tournaments', description: 'Tournaments.' }
	],
	paths: {
		'/tournaments': {
			get: {
				operationId: 'listTournaments',
				tags: ['Tournaments'],
				summary: 'List',
				responses: { 200: { description: 'The tournaments.' } }
			}
		},
		'/tournaments/{tournamentId}/matches': {
			get: {
				operationId: 'listMatches',
				tags: ['Matches'],
				summary: 'List matches',
				description: 'Byes are left out.',
				parameters: [
					{
						name: 'tournamentId',
						in: 'path',
						required: true,
						description: 'The tournament id.',
						schema: { type: 'string', format: 'uuid' }
					},
					{ name: 'stage', in: 'query', required: false, schema: { type: 'integer' } }
				],
				responses: {
					200: {
						description: 'The matches.',
						content: { 'application/json': { schema: { type: 'array', items: ref('Match') } } }
					},
					401: failure('No key.'),
					400: failure('Invalid.')
				}
			}
		},
		'/tournaments/{tournamentId}/matches/{matchId}/result': {
			delete: {
				operationId: 'clearResult',
				tags: ['Matches'],
				summary: 'Clear',
				requestBody: { required: true, content: { 'application/json': { schema: ref('Scores') } } },
				responses: { 204: { description: 'Cleared.' } }
			}
		}
	},
	components: {
		securitySchemes: { apiKey: { type: 'http', scheme: 'bearer', description: 'A key.' } },
		schemas: {
			Scores: {
				type: 'array',
				prefixItems: [{ type: 'integer' }, { type: 'integer' }],
				description: 'The scores.'
			},
			Match: {
				type: 'object',
				properties: {
					id: { type: 'string', format: 'uuid' },
					status: { type: 'string', enum: ['draft', 'registration'], description: 'Status.' },
					scores: { anyOf: [ref('Scores'), { type: 'null' }] }
				},
				required: ['id', 'status']
			},
			Error: { type: 'object', properties: { message: { type: 'string' } } }
		}
	}
};

describe('typeLabel', () => {
	it.each([
		[{ type: 'array', items: ref('Match') }, 'Match[]'],
		[{ type: 'string', format: 'uuid' }, 'string (uuid)'],
		[{ type: 'string', enum: ['draft', 'registration'] }, '"draft" | "registration"'],
		[
			{ type: 'array', prefixItems: [{ type: 'integer' }, { type: 'integer' }] },
			'[integer, integer]'
		],
		[{ anyOf: [ref('Scores'), { type: 'null' }] }, 'Scores | null'],
		[
			{ type: 'array', items: { anyOf: [{ type: 'string' }, { type: 'number' }] } },
			'(string | number)[]'
		],
		[{ const: 'x' }, '"x"'],
		[{ type: 'object', additionalProperties: {} }, 'object'],
		[{ type: ['string', 'null'] }, 'string | null'],
		[{}, 'any']
	] as const)('labels %j as %s', (schema, label) => {
		expect(typeLabel(schema as never)).toBe(label);
	});
});

describe('apiReference', () => {
	const reference = apiReference(document);

	it('groups operations by tag, in document order', () => {
		expect(reference.tags.map((tag) => tag.name)).toEqual(['Matches', 'Tournaments']);
		expect(reference.tags.map((tag) => tag.operations.map((operation) => operation.id))).toEqual([
			['listMatches', 'clearResult'],
			['listTournaments']
		]);
	});

	it('shows parameters, bodies and responses with their types', () => {
		const [list, clear] = reference.tags[0].operations;
		expect(list).toMatchObject({
			method: 'GET',
			path: '/api/v1/tournaments/{tournamentId}/matches',
			description: 'Byes are left out.',
			body: null
		});
		expect(list.parameters).toEqual([
			{
				name: 'tournamentId',
				in: 'path',
				type: 'string (uuid)',
				ref: null,
				required: true,
				description: 'The tournament id.'
			},
			{ name: 'stage', in: 'query', type: 'integer', ref: null, required: false, description: null }
		]);
		expect(
			list.responses.map((response) => [response.status, response.type, response.ref])
		).toEqual([
			[200, 'Match[]', 'Match'],
			[400, 'Error', 'Error'],
			[401, 'Error', 'Error']
		]);
		expect(clear).toMatchObject({ method: 'DELETE', description: null });
		expect(clear.body).toEqual({ type: 'Scores', ref: 'Scores' });
		expect(clear.responses).toEqual([
			{ status: 204, description: 'Cleared.', type: null, ref: null }
		]);
	});

	it('lists the schemas by name with their fields', () => {
		expect(reference.schemas.map((schema) => schema.name)).toEqual(['Error', 'Match', 'Scores']);
		const [, match, scores] = reference.schemas;
		expect(match.fields).toEqual([
			{ name: 'id', type: 'string (uuid)', ref: null, required: true, description: null },
			{
				name: 'status',
				type: '"draft" | "registration"',
				ref: null,
				required: true,
				description: 'Status.'
			},
			{ name: 'scores', type: 'Scores | null', ref: 'Scores', required: false, description: null }
		]);
		expect(scores).toMatchObject({
			description: 'The scores.',
			type: '[integer, integer]',
			fields: []
		});
		expect(JSON.parse(scores.json)).toEqual(document.components.schemas.Scores);
	});
});
