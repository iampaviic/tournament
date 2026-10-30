/** A failure caused by the request (not a bug) whose message can be shown to the user. */
export class ServiceError extends Error {
	override name = 'ServiceError';
}
