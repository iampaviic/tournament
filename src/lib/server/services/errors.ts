/**
 * What kind of failure a `ServiceError` is. The REST API answers `conflict` with 409 (the
 * tournament's phase or state forbids it), `invalid` with 422 (the input breaks a rule) and
 * `not_found` with 404.
 */
export type ServiceErrorKind = 'conflict' | 'invalid' | 'not_found';

/** A failure caused by the request (not a bug) whose message can be shown to the user. */
export class ServiceError extends Error {
	override name = 'ServiceError';
	readonly kind: ServiceErrorKind;

	constructor(message: string, kind: ServiceErrorKind = 'conflict') {
		super(message);
		this.kind = kind;
	}
}
