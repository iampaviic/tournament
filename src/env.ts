import { defineEnvVars } from '@sveltejs/kit/env';

const list = (value: string | undefined) =>
	(value ?? '')
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);

const optional = (value: string | undefined) => value || undefined;

export const variables = defineEnvVars({
	// Optional here so the app can be built without a database; required at runtime (see db/index.ts).
	DATABASE_URL: { schema: optional, description: 'The database connection string.' },
	AUTH_MODULES: {
		schema: list,
		description:
			'Comma-separated ids of the auth modules enabled on this instance, e.g. `discord,tetrio`.'
	},
	TRUSTED_AUTH_MODULES: {
		schema: list,
		description:
			'Comma-separated ids of auth modules considered secure. Sessions created with any other module cannot access admin interfaces.'
	},
	ALLOW_DEV_AUTH: {
		schema: (value) => value === 'true',
		description:
			'Allow the insecure `dev` auth module in production builds. Only for e2e tests, never on a real instance.'
	},
	DISCORD_CLIENT_ID: { schema: optional, description: 'Discord OAuth2 application client id.' },
	DISCORD_CLIENT_SECRET: {
		schema: optional,
		description: 'Discord OAuth2 application client secret.'
	}
});
