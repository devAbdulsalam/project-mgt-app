// Operator session state for the console.
//
// Why this is a separate store from `useAuthStore`:
//
//   The product's auth store is org-shaped. Its sign-in refuses an account with
//   no workspace membership ("Your account is not in any workspace yet"), and
//   its `authenticated` state requires an org. But the operator surface needs
//   neither: backend/src/platform/requirePlatformAdmin.ts gates on a session and
//   a `users.platform_role` column, and a platform operator is explicitly
//   someone who may belong to no workspace at all. Nesting the console under
//   the product's authed route would lock out exactly the people who most need
//   it. So the console keeps its own tiny session, sharing only the two things
//   that must be global — the memory-only access token and the httpOnly refresh
//   cookie.
//
// What is deliberately NOT persisted:
//
//   Standing and elevation are re-read from the server on mount and on a 30s
//   interval. Persisting `elevatedUntil` to sessionStorage would let a stale
//   tab claim an elevation the server has already ended, and elevation is the
//   only thing between this console and every account on the platform. The
//   access token is memory-only (see token-store), so nothing here can be used
//   to reconstruct a session on a reload — the console re-establishes it from
//   the refresh cookie, which the browser alone holds.

import { create } from 'zustand';
import { ApiError } from '@/api';
import { superAdminApi } from './api/client';
import { toOperator } from './api/mapper';
import { useTokenStore } from '@/shared/lib/token-store';
import { useAuthStore } from '@/shared/lib/auth-store';
import { isLiveApi } from '@/shared/lib/live-api';
import { refreshSession } from '@/api/session';
import * as live from '@/features/auth/live';
import type { Operator } from './model';

/**
 * What the console knows about the session.
 *
 * `state` is the gate. The console is a different product surface with a
 * different threat model, so it does not infer its state from the product's
 * store — it establishes it, once, from the server.
 */
export type ConsoleState =
	/** Checking whether a session exists at all. Nothing rendered yet. */
	| 'checking'
	/** No session. The sign-in screen. */
	| 'signed-out'
	/** A session, but /auth/me refused it — not an operator, or disabled. */
	| 'not-an-operator'
	/** An operator. `operator` is always set. */
	| 'ready';

interface ConsoleSession {
	state: ConsoleState;
	operator: Operator | null;
	/** Set when state is 'not-an-operator', to say why. */
	reason: string | null;

	/**
	 * Establishes the session.
	 *
	 * Order matters. A memory token from a previous sign-in is tried first; if
	 * there is none, the refresh cookie is exchanged once. Only then is
	 * `/super-admin/auth/me` called — a standing-only endpoint, so a 404 here is
	 * a clean "not an operator" rather than a confusing elevation prompt.
	 */
	establish: () => Promise<void>;

	/** Re-reads standing, enrolment and elevation. Called after any change. */
	refreshOperator: () => Promise<void>;

	/** Applies a fresh elevation window returned by an elevate/confirm call. */
	setElevatedUntil: (iso: string) => void;

	/** Drops the console's own state. Does not end the session — that is /auth/logout. */
	reset: () => void;
}

/** True when the failure means "sign in again" rather than "you are not allowed". */
function isAuthFailure(err: unknown): boolean {
	return err instanceof ApiError && (err.status === 401 || err.status === 403);
}

export const useConsoleStore = create<ConsoleSession>()((set, get) => ({
	state: 'checking',
	operator: null,
	reason: null,

	async establish() {
		// A token already in memory means this tab signed in a moment ago and
		// something re-mounted the console. Skip the round trip to the cookie.
		if (!useTokenStore.getState().accessToken) {
			const outcome = await refreshSession();
			if (outcome === 'expired') {
				set({ state: 'signed-out', operator: null, reason: null });
				return;
			}
			// 'unreachable' is not a reason to sign out: the network may be down
			// and the session perfectly fine. Fall through and let /auth/me decide.
		}

		try {
			const operator = toOperator(await superAdminApi.me());
			set({ state: 'ready', operator, reason: null });
			hydrateProductSession();
		} catch (err) {
			if (err instanceof ApiError && err.status === 404) {
				// The guard's deliberate silence: this account is not an operator.
				set({ state: 'not-an-operator', operator: null, reason: 'That account is not a platform operator.' });
				return;
			}
			if (isAuthFailure(err)) {
				useTokenStore.getState().clear();
				set({ state: 'signed-out', operator: null, reason: null });
				return;
			}
			// Offline or a 5xx. Signed in as far as anyone can tell, but unable to
			// confirm — say so rather than showing a console that cannot load.
			set({ state: 'signed-out', operator: null, reason: 'We could not reach the server. Try again in a moment.' });
		}
	},

	async refreshOperator() {
		if (get().state !== 'ready') return;
		try {
			const operator = toOperator(await superAdminApi.me());
			set({ operator });
		} catch {
			// A failed background refresh must not tear the console down. The
			// queries below it will surface whatever is actually wrong, and the
			// 30s interval will try again.
		}
	},

	setElevatedUntil(iso) {
		const operator = get().operator;
		if (!operator) return;
		set({ operator: { ...operator, elevatedUntil: Date.parse(iso) } });
	},

	reset() {
		set({ state: 'signed-out', operator: null, reason: null });
	},
}));

/**
 * Mirrors the session into the product's auth store when the operator also
 * belongs to a workspace.
 *
 * Without this, signing in to the console leaves the product still anonymous,
 * so clicking through to the app bounces straight back to /login even though a
 * perfectly good session exists. With it, an operator who is also a tenant user
 * gets one session serving both surfaces.
 *
 * `fetchMe` rather than `restore`: the access token is already in memory from
 * the check above, so re-exchanging the refresh cookie would be a pointless
 * round trip that also rotates the token for nothing.
 *
 * An operator with no membership hydrates nothing, which is correct — there is
 * no workspace for them to land in, and inventing one is the exact gap
 * userflow.md §4 describes. Guarded on isLiveApi() because the product store
 * has a mock mode, and a mock-mode app must not be handed live session data.
 */
function hydrateProductSession() {
	if (!isLiveApi()) return;
	const product = useAuthStore.getState();
	if (product.status === 'authenticated') return;

	void live
		.fetchMe()
		.then((session) => {
			if (!session.org) return;
			useAuthStore.getState().hydrate({ user: session.user, org: session.org, orgs: session.orgs, permissions: session.permissions });
		})
		.catch(() => {
			// The console session stands on its own. If the product store cannot be
			// hydrated, the product's own sign-in will handle it.
		});
}

export const selectIsConsoleReady = (s: ConsoleSession) => s.state === 'ready' && s.operator !== null;
