import { defineConfig } from '@playwright/test';
import { E2E_DATABASE_URL } from './e2e/db';

const port = 4173;

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
			DATABASE_URL: E2E_DATABASE_URL,
			PORT: String(port),
			PROTOCOL_HEADER: 'x-forwarded-proto',
			AUTH_MODULES: 'dev',
			TRUSTED_AUTH_MODULES: 'dev',
			ALLOW_DEV_AUTH: 'true',
			// Turns the game picker on. Tests seed a fresh cache, so it's never sent to Steam.
			STEAM_API_KEY: 'e2e-dummy-key'
		}
	}
});
