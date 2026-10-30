import { z } from 'zod';
import { formatNumber } from '#lib/format.ts';
import { m } from '#lib/paraglide/messages.js';
import { createAuthorizationURL } from '../oauth2';
import {
	AuthModuleError,
	type AuthModule,
	type ConfigField,
	type ExternalIdentity,
	type StoredIdentity
} from '../types';
import { fetchDiscordUser, discordProvider, type DiscordOptions } from './discord';

/**
 * TETR.IO has no OAuth. Users sign in with Discord, and we look up the TETR.IO account that has
 * that Discord account connected (the connection must be public on TETR.IO).
 * API docs: https://tetr.io/about/api/ — data is cached for 5 minutes, so we never refresh sooner.
 */
const API = 'https://ch.tetr.io/api';

/** TETRA LEAGUE ranks, lowest first. `z` means unranked. */
export const TETRIO_RANKS = [
	'd',
	'd+',
	'c-',
	'c',
	'c+',
	'b-',
	'b',
	'b+',
	'a-',
	'a',
	'a+',
	's-',
	's',
	's+',
	'ss',
	'u',
	'x',
	'x+'
] as const;
export type TetrioRank = (typeof TETRIO_RANKS)[number];

export const tetrioConfig = z
	.object({
		minRank: z.enum(TETRIO_RANKS).optional(),
		maxRank: z.enum(TETRIO_RANKS).optional(),
		minTr: z.number().min(0).max(25000).optional(),
		maxTr: z.number().min(0).max(25000).optional(),
		/** Unranked players skip the rank and TR checks when this is on. */
		allowUnranked: z.boolean().default(false)
	})
	.refine((c) => !c.minRank || !c.maxRank || rankIndex(c.minRank) <= rankIndex(c.maxRank), {
		error: () => m.tetrio_error_rank_order()
	})
	.refine((c) => c.minTr === undefined || c.maxTr === undefined || c.minTr <= c.maxTr, {
		error: () => m.tetrio_error_tr_order()
	});
export type TetrioConfig = z.infer<typeof tetrioConfig>;

export interface TetrioData {
	[key: string]: unknown;
	rank: TetrioRank | 'z';
	bestRank: TetrioRank | 'z' | null;
	tr: number | null;
	gxe: number | null;
	standing: number | null;
	country: string | null;
	discordId: string | null;
}

export function rankIndex(rank: string): number {
	return TETRIO_RANKS.indexOf(rank as TetrioRank);
}

export function formatRank(rank: string): string {
	return rank === 'z' ? m.tetrio_unranked() : rank.toUpperCase();
}

export function checkTetrioEligibility(data: TetrioData, config: TetrioConfig) {
	const ranked = data.rank !== 'z' && data.tr !== null;
	if (!ranked) {
		if (config.allowUnranked) return { ok: true } as const;
		return { ok: false, reason: m.tetrio_need_rank() } as const;
	}
	const rank = rankIndex(data.rank);
	if (config.minRank && rank < rankIndex(config.minRank)) {
		return { ok: false, reason: m.tetrio_min_rank({ rank: formatRank(config.minRank) }) } as const;
	}
	if (config.maxRank && rank > rankIndex(config.maxRank)) {
		return { ok: false, reason: m.tetrio_max_rank({ rank: formatRank(config.maxRank) }) } as const;
	}
	if (config.minTr !== undefined && data.tr! < config.minTr) {
		return { ok: false, reason: m.tetrio_min_tr({ tr: config.minTr }) } as const;
	}
	if (config.maxTr !== undefined && data.tr! > config.maxTr) {
		return { ok: false, reason: m.tetrio_max_tr({ tr: config.maxTr }) } as const;
	}
	return { ok: true } as const;
}

/** The requirement form. A function, so its labels follow the request's locale. */
export function tetrioConfigFields(): ConfigField[] {
	const rankOptions = [
		{ value: '', label: m.tetrio_any() },
		...[...TETRIO_RANKS].reverse().map((rank) => ({ value: rank, label: formatRank(rank) }))
	];
	return [
		{ key: 'minRank', label: m.tetrio_field_min_rank(), type: 'select', options: rankOptions },
		{ key: 'maxRank', label: m.tetrio_field_max_rank(), type: 'select', options: rankOptions },
		{ key: 'minTr', label: m.tetrio_field_min_tr(), type: 'number', min: 0, max: 25000 },
		{ key: 'maxTr', label: m.tetrio_field_max_tr(), type: 'number', min: 0, max: 25000 },
		{
			key: 'allowUnranked',
			label: m.tetrio_field_allow_unranked(),
			hint: m.tetrio_field_allow_unranked_hint(),
			type: 'checkbox'
		}
	];
}

interface Envelope<T> {
	success: boolean;
	data?: T;
	error?: { msg?: string };
}

interface TetrioUser {
	_id: string;
	username: string;
	avatar_revision?: number;
	country: string | null;
	connections?: { discord?: { id: string } };
}

interface LeagueSummary {
	tr: number;
	gxe: number;
	rank: string;
	bestrank?: string;
	standing?: number;
}

const positive = (value: number | undefined) => (value === undefined || value < 0 ? null : value);

export function tetrioModule(options: DiscordOptions): AuthModule<TetrioConfig> {
	const fetch = options.fetch ?? globalThis.fetch;

	/** `sessionId` groups related requests so they hit the same API worker cache. */
	async function get<T>(path: string, sessionId: string): Promise<T | null> {
		const response = await fetch(API + path, {
			headers: { Accept: 'application/json', 'X-Session-ID': sessionId }
		});
		if (!response.ok && response.status !== 404) {
			throw new AuthModuleError(m.tetrio_error_down());
		}
		const body = (await response.json()) as Envelope<T>;
		return body.success ? (body.data ?? null) : null;
	}

	async function loadIdentity(userId: string): Promise<ExternalIdentity> {
		const sessionId = `tm-${userId}`;
		const [user, league] = await Promise.all([
			get<TetrioUser>(`/users/${encodeURIComponent(userId)}`, sessionId),
			get<LeagueSummary>(`/users/${encodeURIComponent(userId)}/summaries/league`, sessionId)
		]);
		if (!user) throw new AuthModuleError(m.tetrio_error_gone());

		const data: TetrioData = {
			rank: (league?.rank ?? 'z') as TetrioData['rank'],
			bestRank: (league?.bestrank ?? null) as TetrioData['bestRank'],
			tr: positive(league?.tr),
			gxe: positive(league?.gxe),
			standing: positive(league?.standing),
			country: user.country,
			discordId: user.connections?.discord?.id ?? null
		};
		return {
			providerUserId: user._id,
			username: user.username,
			avatarUrl:
				user.avatar_revision !== undefined
					? `https://tetr.io/user-content/avatars/${user._id}.jpg?rv=${user.avatar_revision}`
					: undefined,
			data
		};
	}

	return {
		id: 'tetrio',
		name: 'TETR.IO',
		createAuthorizationURL: (request) => createAuthorizationURL(discordProvider(options), request),
		async handleCallback(request) {
			const discord = await fetchDiscordUser(options, request);
			const found = await get<{ users?: { _id: string }[] }>(
				`/users/search/discord:id:${encodeURIComponent(discord.id)}`,
				`tm-discord-${discord.id}`
			);
			const match = found?.users?.[0];
			if (!match) {
				throw new AuthModuleError(m.tetrio_error_no_account({ username: discord.username }));
			}
			return loadIdentity(match._id);
		},
		refreshProfile: (identity) => loadIdentity(identity.providerUserId),
		refreshInterval: 5 * 60 * 1000,
		tournamentConfig: tetrioConfig,
		configFields: tetrioConfigFields,
		checkEligibility: (identity, config) =>
			checkTetrioEligibility(identity.data as TetrioData, config),
		bracketFields(identity: StoredIdentity) {
			const data = identity.data as TetrioData;
			const fields: Record<string, string> = { rank: formatRank(data.rank) };
			if (data.tr !== null) fields.tr = formatNumber(Math.round(data.tr));
			if (data.country) fields.country = data.country;
			return fields;
		}
	};
}
