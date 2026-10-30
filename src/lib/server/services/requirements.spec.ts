import { describe, expect, it } from 'vitest';
import { tetrioModule } from '#lib/server/modules/auth/tetrio.ts';
import type { StoredIdentity } from '#lib/server/modules/types.ts';
import { evaluateRequirements, readModuleConfig } from './requirements';

const tetrio = tetrioModule({ clientId: 'x', clientSecret: 'y' });
const getModule = (id: string) => (id === 'tetrio' ? tetrio : undefined);

const identity = (rank: string, tr: number | null): StoredIdentity & { moduleId: string } => ({
	moduleId: 'tetrio',
	providerUserId: '1',
	username: 'osk',
	data: { rank, tr, bestRank: null, gxe: null, standing: null, country: null, discordId: null },
	fetchedAt: new Date()
});

describe('evaluateRequirements', () => {
	const requirements = [{ moduleId: 'tetrio', config: { minRank: 's' } }];

	it('reports missing, ineligible and eligible identities', () => {
		expect(evaluateRequirements(requirements, [], getModule)).toEqual([
			{ moduleId: 'tetrio', moduleName: 'TETR.IO', status: 'missing' }
		]);
		expect(evaluateRequirements(requirements, [identity('a', 15000)], getModule)).toEqual([
			{
				moduleId: 'tetrio',
				moduleName: 'TETR.IO',
				status: 'ineligible',
				reason: 'Requires rank S or higher.'
			}
		]);
		expect(evaluateRequirements(requirements, [identity('ss', 21000)], getModule)[0].status).toBe(
			'ok'
		);
	});

	it('flags modules that are no longer enabled', () => {
		expect(evaluateRequirements([{ moduleId: 'steam', config: {} }], [], getModule)).toEqual([
			{ moduleId: 'steam', moduleName: 'steam', status: 'unavailable' }
		]);
	});
});

describe('readModuleConfig', () => {
	const form = (entries: Record<string, string>) => {
		const data = new FormData();
		for (const [key, value] of Object.entries(entries)) data.set(key, value);
		return data;
	};

	it('reads the module fields and leaves empty ones out', () => {
		expect(
			readModuleConfig(
				tetrio,
				form({ 'tetrio.minRank': 'a', 'tetrio.maxRank': '', 'tetrio.minTr': '' }),
				'tetrio.'
			)
		).toEqual({ ok: true, config: { minRank: 'a', allowUnranked: false } });
		expect(
			readModuleConfig(
				tetrio,
				form({ 'tetrio.maxTr': '18000', 'tetrio.allowUnranked': 'on' }),
				'tetrio.'
			)
		).toEqual({ ok: true, config: { maxTr: 18000, allowUnranked: true } });
	});

	it("reports the module's validation errors", () => {
		expect(
			readModuleConfig(tetrio, form({ 'tetrio.minRank': 'x', 'tetrio.maxRank': 'a' }), 'tetrio.')
		).toEqual({ ok: false, error: 'TETR.IO: Minimum rank must not be above maximum rank.' });
	});
});
