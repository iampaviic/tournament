import postgres from 'postgres';

/** The e2e server's database. It is kept between runs. */
export const E2E_DATABASE_URL =
	process.env.E2E_DATABASE_URL ?? 'postgres://root:mysecretpassword@localhost:5432/tournament_e2e';

/**
 * Adds games to the server's Steam cache and marks it as just fetched, so the server never asks
 * Steam for the list while the tests run.
 */
export async function seedSteamApps(apps: { appId: number; name: string }[]) {
	const sql = postgres(E2E_DATABASE_URL, { max: 1, onnotice: () => {} });
	try {
		for (const app of apps) {
			await sql`
				insert into steam_apps (app_id, name) values (${app.appId}, ${app.name})
				on conflict (app_id) do update set name = excluded.name`;
		}
		await sql`
			insert into steam_app_list (id, fetched_at, app_count)
			values ('games', now(), (select count(*)::int from steam_apps))
			on conflict (id) do update set fetched_at = excluded.fetched_at, app_count = excluded.app_count`;
	} finally {
		await sql.end();
	}
}
