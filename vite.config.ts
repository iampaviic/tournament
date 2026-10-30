import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const testDatabaseUrl =
	process.env.TEST_DATABASE_URL ??
	'postgres://root:mysecretpassword@localhost:5432/tournament_test';

// SvelteKit fills in `$app/env/private` from the environment (and `.env`) when Vitest loads this
// config, so `test.env` comes too late for it. Set the test values here instead; otherwise the
// tests would run against the database in `.env`, or fail where there is none, as in CI. No test
// may reach Steam, so its key is blanked: the tests that need one build their own cache.
if (process.env.VITEST) {
	process.env.DATABASE_URL = testDatabaseUrl;
	process.env.AUTH_MODULES = 'dev';
	process.env.STEAM_API_KEY = '';
}

export default defineConfig({
	plugins: [
		sveltekit({
			preprocess: vitePreprocess(),
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		}),

		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			emitTsDeclarations: true,
			// Browsers get their Accept-Language locale once messages exist for it; the cookie
			// overrides it. Keep in sync with `paraglide-js compile` in package.json.
			strategy: ['cookie', 'preferredLanguage', 'baseLocale']
		})
	],
	css: {
		preprocessorOptions: {
			// Lets any component `@use 'tokens'` from src/lib/styles.
			scss: { loadPaths: ['src/lib/styles'] }
		}
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				css: {
					preprocessorOptions: {
						// Lets any component `@use 'tokens'` from src/lib/styles.
						scss: { loadPaths: ['src/lib/styles'] }
					}
				},
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}', 'src/**/*.db.{test,spec}.{js,ts}']
				}
			},
			{
				// Tests against a real Postgres database. They share it, so files run one at a time.
				extends: './vite.config.ts',
				test: {
					name: 'db',
					environment: 'node',
					include: ['src/**/*.db.{test,spec}.{js,ts}'],
					globalSetup: ['src/lib/server/testing/db-setup.ts'],
					setupFiles: ['src/lib/server/testing/no-network.ts'],
					fileParallelism: false,
					// Read by the global setup, which recreates this database's schema.
					env: { DATABASE_URL: testDatabaseUrl }
				}
			}
		]
	}
});
