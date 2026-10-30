import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import type { TestProject } from 'vitest/node';

/** Vitest global setup for `*.db.spec.ts`: migrates the test database from a clean schema. */
export default async function setup(project: TestProject) {
	const url = project.config.env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL must point at a disposable test database');
	const client = postgres(url, { max: 1, onnotice: () => {} });
	await client.unsafe(
		'DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;'
	);
	await migrate(drizzle(client), { migrationsFolder: 'drizzle' });
	await client.end();
}
