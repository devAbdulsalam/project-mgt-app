// Access-token refresh, shared by everything that can find the token missing or stale.
//
// The refresh token is single-use: the server rotates it on every exchange and
// treats a second presentation of the old one as theft, ending the whole
// session family. So two refreshes must never run at once with the same cookie.
// Within a tab, concurrent callers share one request; across tabs, a Web Lock
// serialises them so the later one reads the cookie the earlier one just set.
// (React StrictMode's double-run of effects is exactly this race, in dev.)

import { API_BASE_URL } from './config';
import { useTokenStore } from '@/shared/lib/token-store';

/**
 * ok          a new access token is in the token store
 * expired     the server refused the cookie: the session is over, sign in again
 * unreachable the server could not be asked (offline, 5xx): the session may be fine
 */
export type RefreshOutcome = 'ok' | 'expired' | 'unreachable';

let inflight: Promise<RefreshOutcome> | null = null;

export function refreshSession(): Promise<RefreshOutcome> {
	inflight ??= withLock(exchange).finally(() => {
		inflight = null;
	});
	return inflight;
}

function withLock<T>(fn: () => Promise<T>): Promise<T> {
	const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
	return locks ? locks.request('ledge-session-refresh', fn) : fn();
}

async function exchange(): Promise<RefreshOutcome> {
	try {
		const res = await fetch(`${API_BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include', headers: { Accept: 'application/json' } });

		if (res.status === 401 || res.status === 403) {
			useTokenStore.getState().clear();
			return 'expired';
		}
		if (!res.ok) return 'unreachable';

		const body = (await res.json()) as { access_token: string; expires_at: string };
		useTokenStore.getState().setTokens({ accessToken: body.access_token, expiresAt: Date.parse(body.expires_at) });
		return 'ok';
	} catch {
		return 'unreachable';
	}
}

let onSessionLost: (() => void) | null = null;

/** Registered once by the app: what to do when the server says the session is over. */
export function setSessionLostHandler(handler: () => void) {
	onSessionLost = handler;
}

export function notifySessionLost() {
	onSessionLost?.();
}
