import { useEffect, useState } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './router';
import { isLiveApi } from '@/shared/lib/live-api';
import { useAuthStore } from '@/shared/lib/auth-store';
import { restore } from '@/features/auth/live';
import { setSessionLostHandler } from '@/api/session';

// If the server ends the session mid-use (revoked, expired), go to sign-in rather than
// leaving every request failing.
setSessionLostHandler(() => useAuthStore.getState().logout());

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { staleTime: 30_000, gcTime: 30 * 60_000, retry: 1 },
	},
});

/**
 * Restores the session before the router runs its auth guard.
 *
 * The access token is held in memory only — deliberately, so an XSS bug cannot
 * read it out of storage — which means every page load starts without one. The
 * httpOnly refresh cookie is what survives, so on boot we exchange it for a new
 * access token. Until that settles, rendering the router would bounce an
 * authenticated user to the sign-in page for a moment.
 *
 * In mock mode there is nothing to restore, so this resolves immediately.
 */
function useRestoredSession(): boolean {
	const [ready, setReady] = useState(() => !isLiveApi());

	useEffect(() => {
		if (!isLiveApi()) return;

		let cancelled = false;

		restore()
			.then((session) => {
				if (cancelled) return;
				const store = useAuthStore.getState();
				// Server unreachable: keep the persisted session. The first request that
				// gets through will refresh the token; signing out here would punish a
				// bad connection.
				if (session === 'unreachable') return;
				if (session) {
					// A session with no workspace is still a session: someone who
					// signed up but has not created one yet. Signing them out here
					// would strand them — the page that lets them create a workspace
					// needs them signed in to call it.
					store.hydrate({ user: session.user, org: session.org, orgs: session.orgs, permissions: session.permissions });
				} else {
					// The cookie is gone or was revoked; drop the persisted shell of a
					// session so the guard sends them to sign in.
					store.logout();
				}
			})
			.finally(() => {
				if (!cancelled) setReady(true);
			});

		return () => {
			cancelled = true;
		};
	}, []);

	return ready;
}

export function App() {
	const ready = useRestoredSession();

	if (!ready) return null;

	return (
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	);
}
