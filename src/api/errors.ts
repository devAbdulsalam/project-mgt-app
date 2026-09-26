// RFC 9457 problem+json error normalization → ApiError.
// The web app maps these to form-field errors or toasts (frontend plan §8.1).

export interface FieldErrors {
	[field: string]: string[];
}

export interface ProblemDetails {
	type?: string;
	title?: string;
	status: number;
	code?: string;
	detail?: string;
	instance?: string;
	/** The wire spelling (the API is snake_case throughout). */
	field_errors?: FieldErrors;
	/** Tolerated for any older caller that still sends it. */
	fieldErrors?: FieldErrors;
}

export interface ApiErrorOptions {
	status: number;
	code: string;
	message: string;
	detail?: string;
	fieldErrors?: FieldErrors;
	retryAfterMs?: number;
}

/** Normalized API error: status, stable machine code, human message and per-field errors. */
export class ApiError extends Error {
	readonly status: number;
	readonly code: string;
	readonly detail?: string;
	readonly fieldErrors: FieldErrors;
	/** Present when the server responded 429 with a Retry-After header. */
	readonly retryAfterMs?: number;

	constructor(opts: ApiErrorOptions) {
		super(opts.message);
		this.name = 'ApiError';
		this.status = opts.status;
		this.code = opts.code;
		this.detail = opts.detail;
		this.fieldErrors = opts.fieldErrors ?? {};
		this.retryAfterMs = opts.retryAfterMs;
	}
}

export function parseRetryAfter(header: string | null): number | null {
	if (!header) return null;
	const seconds = Number(header);
	if (Number.isFinite(seconds) && seconds >= 0) return seconds;
	const at = Date.parse(header);
	if (Number.isFinite(at)) return Math.max(0, Math.round((at - Date.now()) / 1000));
	return null;
}

/** Builds an ApiError from a non-2xx Response, preferring the RFC 9457 body. */
export async function fromResponse(res: Response): Promise<ApiError> {
	let problem: ProblemDetails | undefined;
	try {
		problem = (await res.json()) as ProblemDetails;
	} catch {
		// Non-JSON error body (proxy/html) — fall back to status text.
	}
	const status = problem?.status ?? res.status;
	// `detail` explains this occurrence; `title` is the generic status label
	// ("Unprocessable Content"), which tells the person nothing they can act on.
	const message = (problem?.detail ?? problem?.title) || res.statusText || `Request failed (${res.status})`;
	const retrySeconds = parseRetryAfter(res.headers.get('retry-after'));
	return new ApiError({
		status,
		code: problem?.code ?? `HTTP_${res.status}`,
		message,
		detail: problem?.detail,
		fieldErrors: problem?.field_errors ?? problem?.fieldErrors,
		retryAfterMs: retrySeconds != null ? retrySeconds * 1000 : undefined,
	});
}

/** True when the error carries per-field validation failures (HTTP 422). */
export function isFieldError(err: unknown): err is ApiError & { fieldErrors: FieldErrors } {
	return err instanceof ApiError && Object.keys(err.fieldErrors).length > 0;
}

export function fieldMessage(err: unknown, field: string): string | undefined {
	if (!isFieldError(err)) return undefined;
	return err.fieldErrors[field]?.[0];
}