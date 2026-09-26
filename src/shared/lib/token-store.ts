// In-memory access-token store (access tokens are never persisted — frontend plan §9).
// The refresh token lives in an httpOnly Secure SameSite cookie managed by the backend,
// so it is never visible here. Swapped in wholesale by the OIDC adapter when it lands.

import { create } from 'zustand';

interface TokenState {
	accessToken: string | null;
	/** Epoch ms; null when unknown. */
	expiresAt: number | null;
	setTokens: (tokens: { accessToken: string; expiresAt?: number | null }) => void;
	clear: () => void;
}

export const useTokenStore = create<TokenState>()((set) => ({
	accessToken: null,
	expiresAt: null,
	setTokens: ({ accessToken, expiresAt = null }) => set({ accessToken, expiresAt }),
	clear: () => set({ accessToken: null, expiresAt: null }),
}));

/** Read the current access token outside a React component (ApiClient, WS client). */
export function getAccessToken() {
	return useTokenStore.getState().accessToken;
}

/** True when the access token is still valid (with a small safety margin). */
export function hasValidAccessToken(now = Date.now()) {
	const { accessToken, expiresAt } = useTokenStore.getState();
	return !!accessToken && (expiresAt == null || expiresAt > now + 30_000);
}

export function isTokenExpiringWithin(ms: number, now = Date.now()) {
	const { expiresAt } = useTokenStore.getState();
	return expiresAt != null && expiresAt - now < ms;
}