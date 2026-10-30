// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Session, User } from '#lib/server/db/schema.ts';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: User | null;
			session: Session | null;
			/** Whether the session was created with a trusted auth module (see `TRUSTED_AUTH_MODULES`). */
			trusted: boolean;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
