import { beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase } from '#lib/server/testing/factories.ts';
import { listMessages } from './services/chat';
import { signIn } from './services/identities';
import { listMatches } from './services/matches';
import { getOrganizationBySlug } from './services/organizations';
import { listParticipants } from './services/participants';
import { getBracket } from './services/stages';
import { listOrgTournaments } from './services/tournaments';
import { ORG_SLUG, ORGANIZER, seed } from './seed';

beforeEach(resetDatabase);

describe('seed', () => {
	it('adds a club with a tournament in every state', async () => {
		expect(await seed()).toEqual({ org: ORG_SLUG, organizer: 'mara', player: 'kestrel' });

		const org = (await getOrganizationBySlug(ORG_SLUG))!;
		const tournaments = await listOrgTournaments(org.id, { includeDrafts: true });
		expect(
			Object.fromEntries(tournaments.map((t) => [t.slug, [t.status, t.participants]]))
		).toEqual({
			'autumn-open': ['running', 8],
			'weekly-swiss-14': ['running', 6],
			'spring-cup': ['completed', 8],
			'winter-invitational': ['registration', 11],
			'club-night-3': ['draft', 0]
		});

		const autumn = tournaments.find((t) => t.slug === 'autumn-open')!;
		const matches = await listMatches(await getBracket(autumn.id));
		const disputed = matches.find((match) => match.progress === 'disputed')!;
		expect((await listMessages(disputed.id)).length).toBe(4);
		expect(matches.filter((match) => match.helpRequested)).toHaveLength(1);
		expect(matches.filter((match) => match.progress === 'reported')).toHaveLength(1);

		const spring = tournaments.find((t) => t.slug === 'spring-cup')!;
		const ranks = (await listParticipants(spring.id)).map((p) => p.finalRank);
		expect(ranks.every((rank) => rank !== null)).toBe(true);
	});

	it('signs its users in through the dev module', async () => {
		await seed();
		expect(
			await signIn('dev', { providerUserId: ORGANIZER, username: ORGANIZER, data: {} })
		).toMatchObject({ created: false });
	});

	it('adds nothing a second time, unless the database is reset', async () => {
		await seed();
		expect(await seed()).toBeNull();
		expect(await seed({ reset: true })).not.toBeNull();
	});
});
