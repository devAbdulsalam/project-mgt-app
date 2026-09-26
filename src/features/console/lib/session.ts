// Ending a console session.
//
// Signing out of the console has to clear three things, in this order:
//
//   1. the server session, via /auth/logout — this revokes the refresh family,
//      so the httpOnly cookie is dead on every tab, not just this one;
//   2. the access token, which is memory-only but still live in this tab;
//   3. the console's own state, so a back-navigation does not land on a
//      half-signed-in console.
//
// The product auth store is left alone deliberately. An operator who is also a
// tenant user may be mid-task in the app; nuking their product session because
// they stepped out of the console would be a surprising way to lose work. The
// server-side logout is shared, though, so the product's next API call will
// refresh and find the session gone — which is correct, and is what signing out
// means.

import { useQueryClient } from '@tanstack/react-query';
import { useTokenStore } from '@/shared/lib/token-store';
import { useConsoleStore } from '../store';

/** Ends the session server-side, then clears every local trace of it. */
export async function logoutAndReset() {
	// The console has no sign-out endpoint of its own: it reuses the product's
	// /auth/logout, which is the one place a session is ended. That wrapper
	// clears the access token in a finally block, so a failed call still leaves
	// this tab signed out — which is what the operator asked for.
	const { logout } = await import('@/features/auth/live');
	try {
		await logout();
	} catch {
		// Nothing to recover: the token is already gone.
	}
	useTokenStore.getState().clear();
	useConsoleStore.getState().reset();
}

/**
 * Signs out and empties the query cache.
 *
 * Used on sign-out, where leaving another operator's accounts in the cache
 * would be the whole problem: the next person to open the console on this
 * machine would render rows from TanStack's memory before a single request went
 * out.
 */
export function useSignOut() {
	const queryClient = useQueryClient();
	return async () => {
		queryClient.clear();
		await logoutAndReset();
	};
}
