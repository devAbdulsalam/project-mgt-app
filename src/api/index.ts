// REST API core. Generated OpenAPI types (openapi-typescript) will slot in here;
// the ApiClient surface is stable and is what the feature adapters depend on.

export { ApiClient, api } from './client';
export type { Query, QueryValue, RequestOptions } from './client';
export { ApiError, isFieldError, fieldMessage, parseRetryAfter } from './errors';
export type { FieldErrors, ProblemDetails } from './errors';
export { cursorParam, EMPTY_PAGE } from './pagination';
export type { Page } from './pagination';
export { API_BASE_URL, WS_ENDPOINT, DEFAULT_TIMEOUT_MS } from './config';