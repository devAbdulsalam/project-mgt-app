// Reading the server's refusals.
//
// The operator surface answers 404 rather than 403 to someone without standing
// (backend/src/platform/requirePlatformAdmin.ts). That is the right call on the
// wire — it tells a prober nothing — and it leaves the console with a problem:
// a 404 from /super-admin can mean "no such thing", "not an operator", or
// "this endpoint needs admin and you are support", and the console has to say
// something useful for each.
//
// The server also has two codes that mean "verify yourself", not "you may not":
//
//   elevation_required        no live TOTP on this session family
//   totp_enrolment_required   no second factor at all
//
// Those drive the elevation prompt. Everything else is a message to show.

import { ApiError } from '@/api';

/** Why a call to the operator surface came back refused. */
export type ConsoleRefusal =
	| { kind: 'elevation'; message: string }
	| { kind: 'enrolment'; message: string }
	| { kind: 'not-operator' }
	| { kind: 'insufficient-role'; message: string }
	| { kind: 'forbidden'; message: string }
	| { kind: 'message'; message: string };

/**
 * Classifies an ApiError from the operator surface.
 *
 * A 404 is ambiguous by design, so it is resolved against what the client
 * already knows: if `/auth/me` succeeded, the caller *is* an operator, which
 * means this 404 was a missing row or a role the guard refused. `isOperator`
 * is what breaks the tie, and it is why the console always calls `/auth/me`
 * before anything else.
 */
export function classify(err: unknown, isOperator: boolean): ConsoleRefusal {
	if (!(err instanceof ApiError)) return { kind: 'message', message: 'Something went wrong. Check your connection and try again.' };

	switch (err.code) {
		case 'elevation_required':
			return { kind: 'elevation', message: err.message };
		case 'totp_enrolment_required':
			return { kind: 'enrolment', message: err.message };
		case 'cannot_change_self':
			return { kind: 'forbidden', message: err.message };
		case 'last_owner':
			return { kind: 'forbidden', message: err.message };
		default:
			break;
	}

	if (err.status === 404) {
		return isOperator ? { kind: 'message', message: err.message } : { kind: 'not-operator' };
	}
	// A guard that has already established standing answers 403 for a role the
	// operator does not hold — 'support' reaching an admin-only endpoint.
	if (err.status === 403) return { kind: 'insufficient-role', message: err.message };

	return { kind: 'message', message: err.message };
}

/** A one-line message for a toast or an inline error. */
export function refusalMessage(refusal: ConsoleRefusal): string {
	switch (refusal.kind) {
		case 'not-operator':
			return 'That account is not a platform operator.';
		case 'elevation':
		case 'enrolment':
		case 'insufficient-role':
		case 'forbidden':
		case 'message':
			return refusal.message;
	}
}

/**
 * The message to attach to one form input.
 *
 * Prefers the server's own per-field message and falls back to the problem
 * `detail`, which for this surface is written to be shown to a person. Mirrors
 * the errorMessage helper in features/settings/hooks/useLiveSettings.ts.
 */
export function fieldError(err: unknown, field: string, fallback: string): string {
	if (err instanceof ApiError) return err.fieldErrors[field]?.[0] ?? err.message ?? fallback;
	return fallback;
}
