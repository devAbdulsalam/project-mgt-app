// Query keys for the operator console.
//
// One `[entity, scope, params]` shape, matching src/features/tickets/api/queryKeys.ts.
// The `all` prefix per entity exists so a mutation can invalidate every list and
// every detail in one call: an operator who suspends a workspace must not be
// looking at a stale row on any screen.
//
// Note there is deliberately no key for the enrolment secret. A TOTP seed does
// not belong in a cache with a 5-minute staleTime — see EnrolmentDraft in
// model.ts for where it does live.

export const operatorKeys = {
	/** The signed-in operator's standing, enrolment and elevation. */
	me: () => ['super-admin', 'me'] as const,
} as const;

export const userKeys = {
	all: ['super-admin', 'users'] as const,
	lists: ['super-admin', 'users', 'list'] as const,
	list: (search: string | undefined, limit: number, offset: number) => ['super-admin', 'users', 'list', { search: search ?? null, limit, offset }] as const,
	detail: (userId: string) => ['super-admin', 'users', 'detail', userId] as const,
} as const;

export const orgKeys = {
	all: ['super-admin', 'orgs'] as const,
	lists: ['super-admin', 'orgs', 'list'] as const,
	list: (search: string | undefined, review: string | undefined, limit: number, offset: number) =>
		['super-admin', 'orgs', 'list', { search: search ?? null, review: review ?? null, limit, offset }] as const,
	detail: (slug: string) => ['super-admin', 'orgs', 'detail', slug] as const,
} as const;

export const operatorListKeys = {
	all: ['super-admin', 'operators'] as const,
} as const;

export const auditKeys = {
	all: ['super-admin', 'audit'] as const,
	list: (params: { action?: string; targetId?: string; before?: string; limit: number }) => ['super-admin', 'audit', 'list', params] as const,
} as const;
