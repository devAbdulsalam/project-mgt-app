// Thin typed fetch wrapper. No HTTP dependency — the backend plan targets OpenAPI
// codegen (openapi-typescript) later; this layer stays the same behind it.

import { API_BASE_URL, DEFAULT_RETRIES, DEFAULT_TIMEOUT_MS } from './config';
import { fromResponse, parseRetryAfter } from './errors';
import { getAccessToken } from '@/shared/lib/token-store';
import { notifySessionLost, refreshSession } from './session';

export type QueryValue = string | number | boolean;
export type Query = Record<string, QueryValue | QueryValue[] | null | undefined>;

export interface RequestOptions {
	/** Query parameters; array values are serialized as repeated `key=…`. */
	query?: Query;
	/** JSON request body (adds Content-Type). */
	json?: unknown;
	/** Repeat-safe mutation header; retried mutations must send one. */
	idempotencyKey?: string;
	extraHeaders?: HeadersInit;
	/** Abort the request. */
	signal?: AbortSignal;
	/** Retries on HTTP 429 (default 2). */
	retries?: number;
	timeoutMs?: number;
	/** Sparse fieldset, e.g. `['key', 'title', 'status']`. */
	fields?: string[];
	/** Server-side includes to avoid N+1, e.g. `['assignee', 'labels']`. */
	include?: string[];
}

export class ApiClient {
	private readonly baseUrl: string;
	constructor(baseUrl: string = API_BASE_URL) {
		this.baseUrl = baseUrl;
	}

	get<T>(path: string, opts: RequestOptions = {}): Promise<T> {
		return this.request<T>('GET', path, opts);
	}
	post<T>(path: string, opts: RequestOptions = {}): Promise<T> {
		return this.request<T>('POST', path, opts);
	}
	patch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
		return this.request<T>('PATCH', path, opts);
	}
	/** Replaces a resource wholesale — used where PATCH's partial semantics would mislead. */
	put<T>(path: string, opts: RequestOptions = {}): Promise<T> {
		return this.request<T>('PUT', path, opts);
	}
	del<T>(path: string, opts: RequestOptions = {}): Promise<T> {
		return this.request<T>('DELETE', path, opts);
	}

	private async request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
		const url = this.buildUrl(path, opts);
		const retries = opts.retries ?? DEFAULT_RETRIES;
		let refreshed = false;

		for (let attempt = 0; ; attempt++) {
			// Built per attempt: a refresh in between changes the token.
			const headers = this.buildHeaders(opts);
			const controller = new AbortController();
			const onAbort = () => controller.abort();
			opts.signal?.addEventListener('abort', onAbort, { once: true });
			const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
			try {
				const res = await fetch(url, { method, headers, body: opts.json !== undefined ? JSON.stringify(opts.json) : undefined, signal: controller.signal });
				if (res.status === 429 && attempt < retries) {
					const after = parseRetryAfter(res.headers.get('retry-after'));
					await sleep(Math.min((after ?? 0.5) * 1000, 10_000));
					continue;
				}
				// An expired access token is routine (they last minutes); the refresh
				// cookie is what proves the session. Auth routes are exempt — a 401 from
				// sign-in is a wrong password, not a stale token.
				if (res.status === 401 && !refreshed && !path.startsWith('/auth/')) {
					refreshed = true;
					const outcome = await refreshSession();
					if (outcome === 'ok') {
						attempt--;
						continue;
					}
					if (outcome === 'expired') notifySessionLost();
				}
				if (!res.ok) throw await fromResponse(res);
				const ct = res.headers.get('content-type') ?? '';
				if (ct.includes('application/json')) return (await res.json()) as T;
				return (await res.text()) as unknown as T;
			} finally {
				clearTimeout(timer);
				opts.signal?.removeEventListener('abort', onAbort);
			}
		}
	}

	private buildUrl(path: string, opts: RequestOptions): string {
		const base = typeof window !== 'undefined' ? window.location.origin : API_BASE_URL;
		const url = new URL(`${this.baseUrl}${path}`, base);
		if (opts.fields?.length) url.searchParams.set('fields', opts.fields.join(','));
		if (opts.include?.length) url.searchParams.set('include', opts.include.join(','));
		for (const [key, value] of Object.entries(opts.query ?? {})) {
			if (value === null || value === undefined || value === '') continue;
			if (Array.isArray(value)) {
				for (const item of value) url.searchParams.append(`${key}[]`, String(item));
			} else {
				url.searchParams.set(key, String(value));
			}
		}
		return url.toString();
	}

	private buildHeaders(opts: RequestOptions): Headers {
		const headers = new Headers(opts.extraHeaders);
		headers.set('Accept', 'application/json');
		if (opts.json !== undefined) headers.set('Content-Type', 'application/json');
		if (opts.idempotencyKey) headers.set('Idempotency-Key', opts.idempotencyKey);
		const token = getAccessToken();
		if (token) headers.set('Authorization', `Bearer ${token}`);
		return headers;
	}
}

export const api = new ApiClient();

function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}