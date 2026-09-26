// Cursor pagination helpers (backend plan §10.1). List endpoints return Page<T>;
// the opaque cursor string is passed back as `?cursor=` for the next/prev page.
// Total counts come from dedicated `/counts` endpoints, not from pages.

export interface Page<T> {
	data: T[];
	nextCursor: string | null;
	prevCursor: string | null;
}

export function cursorParam(cursor: string | null | undefined): Record<string, string> {
	return cursor ? { cursor } : {};
}

export const EMPTY_PAGE: Page<never> = { data: [], nextCursor: null, prevCursor: null };