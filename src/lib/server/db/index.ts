import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { building } from '$app/env';
import { DATABASE_URL } from '$app/env/private';
import * as schema from './schema';

if (!DATABASE_URL && !building) throw new Error('DATABASE_URL is not set');

// postgres.js connects lazily, so this is safe while building.
const client = postgres(DATABASE_URL ?? '');

export const db = drizzle(client, { schema });

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
/** Functions that take this can run on their own or as part of a caller's transaction. */
export type Executor = typeof db | Transaction;
