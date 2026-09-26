// API base URLs and the live/mock data-source switch.
// When the backend lands, set VITE_API_URL to the API origin (defaults to the app origin
// with the /api mirror per the backend plan). VITE_WS_URL defaults from the same origin.

const env = import.meta.env;

/** Base URL for the REST API. Trailing slash is trimmed. */
export const API_BASE_URL = ((env.VITE_API_URL as string | undefined) ?? '/api/v1').replace(/\/$/, '');

/** WebSocket endpoint for real-time events (backend plan §12). */
export const WS_ENDPOINT = (env.VITE_WS_URL as string | undefined) ?? (() => {
	if (typeof window === 'undefined') return 'ws://localhost:8080/v1/ws';
	const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
	return `${proto}://${window.location.host}/api/v1/ws`;
})();

/** Default request timeout. */
export const DEFAULT_TIMEOUT_MS = 15_000;

/** How many times a 429 (rate limited) request is retried before failing. */
export const DEFAULT_RETRIES = 2;