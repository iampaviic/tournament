import { randomBytes, timingSafeEqual } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#lib/server/db/index.ts';
import { apiKeys, users } from '#lib/server/db/schema.ts';
import { hashToken } from '#lib/server/auth/token.ts';
import { m } from '#lib/paraglide/messages.js';

/**
 * API keys look like `tm_<prefix>_<secret>`. The 8-character hex prefix identifies the key and is
 * safe to display; only a hash of the whole key is stored.
 */
const KEY_PATTERN = /^tm_([0-9a-f]{8})_([A-Za-z0-9_-]{43})$/;

export const apiKeyNameSchema = z
	.string()
	.trim()
	.min(1, { error: () => m.validation_name_required() })
	.max(64, { error: () => m.validation_name_max({ max: 64 }) });

export function generateApiKey() {
	const prefix = randomBytes(4).toString('hex');
	return { prefix, key: `tm_${prefix}_${randomBytes(32).toString('base64url')}` };
}

export function parseApiKey(key: string) {
	const match = KEY_PATTERN.exec(key);
	return match ? { prefix: match[1] } : null;
}

/** Creates a key and returns it. This is the only time the full key is available. */
export async function createApiKey(orgId: string, name: string, createdBy: string) {
	const { prefix, key } = generateApiKey();
	await db.insert(apiKeys).values({ orgId, name, prefix, hash: hashToken(key), createdBy });
	return { prefix, key };
}

export async function listApiKeys(orgId: string) {
	return db
		.select({
			id: apiKeys.id,
			name: apiKeys.name,
			prefix: apiKeys.prefix,
			createdAt: apiKeys.createdAt,
			lastUsedAt: apiKeys.lastUsedAt,
			createdBy: users.username
		})
		.from(apiKeys)
		.leftJoin(users, eq(apiKeys.createdBy, users.id))
		.where(eq(apiKeys.orgId, orgId))
		.orderBy(desc(apiKeys.createdAt));
}

export async function revokeApiKey(orgId: string, keyId: string) {
	await db.delete(apiKeys).where(and(eq(apiKeys.orgId, orgId), eq(apiKeys.id, keyId)));
}

/** `lastUsedAt` is written at most this often, so a busy key doesn't write on every request. */
const LAST_USED_INTERVAL = 60_000;

/**
 * Returns the key's id, organization and name if `key` is valid, and records that it was used
 * (at most once a minute).
 */
export async function verifyApiKey(key: string, now = new Date()) {
	const parsed = parseApiKey(key);
	if (!parsed) return null;
	const [row] = await db.select().from(apiKeys).where(eq(apiKeys.prefix, parsed.prefix));
	if (!row) return null;

	const expected = Buffer.from(row.hash, 'hex');
	const actual = Buffer.from(hashToken(key), 'hex');
	if (!timingSafeEqual(expected, actual)) return null;

	if (!row.lastUsedAt || now.getTime() - row.lastUsedAt.getTime() >= LAST_USED_INTERVAL) {
		await db.update(apiKeys).set({ lastUsedAt: now }).where(eq(apiKeys.id, row.id));
	}
	return { id: row.id, orgId: row.orgId, name: row.name };
}
