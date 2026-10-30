// Fills the database with demo data (src/lib/server/seed.ts). `pnpm db:seed --reset` empties the
// whole database first. The services import SvelteKit's modules, so they run through Vite, as
// they do under `pnpm dev` and Vitest, which also reads DATABASE_URL from `.env`.
import { createServer } from 'vite';

const server = await createServer({
	server: { middlewareMode: true, hmr: false, watch: null },
	appType: 'custom',
	logLevel: 'warn'
});
try {
	const { seed } = await server.ssrLoadModule('/src/lib/server/seed.ts');
	const added = await seed({ reset: process.argv.includes('--reset') });
	if (added) {
		console.log(
			`Demo data added: /o/${added.org}. Sign in with the dev module as ${added.organizer} (organizer) or ${added.player} (player).`
		);
	} else {
		console.error(
			'The demo data is already there. To start over, run `pnpm db:seed --reset`, which empties the whole database first.'
		);
		process.exitCode = 1;
	}
} finally {
	const { db } = await server.ssrLoadModule('/src/lib/server/db/index.ts');
	await db.$client.end();
	await server.close();
}
