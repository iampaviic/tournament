import { defineConfig } from '@playwright/test';

const port = 4173;
const databaseUrl =
	process.env.E2E_DATABASE_URL ?? 'postgres://root:mysecretpassword@localhost:5432/tournament_e2e';

export default defineConfig({
	testMatch: '**/*.e2e.{ts,js}',
	use: {
		baseURL: `http://localhost:${port}`,
		// The server trusts this header for its own URL, as it does behind the reverse proxy.
		extraHTTPHeaders: { 'X-Forwarded-Proto': 'http' },
		// Lets the tests use a preinstalled Chromium instead of the one Playwright downloads.
		launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
	},
	webServer: {
		command: 'node scripts/migrate.js && pnpm build && node build',
		port,
		env: {
			DATABASE_URL: databaseUrl,
			PORT: String(port),
			PROTOCOL_HEADER: 'x-forwarded-proto',
			AUTH_MODULES: 'dev',
			TRUSTED_AUTH_MODULES: 'dev',
			ALLOW_DEV_AUTH: 'true'
		}
	}
});
