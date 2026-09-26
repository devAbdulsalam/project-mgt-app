// Query-key convention: [entity, scope, params] — frontend plan §8.1.

import type { TicketSearch } from '../model/filters';

export interface TicketScope {
	org: string;
	projectKey?: string;
}

export const ticketKeys = {
	all: ['tickets'] as const,
	/** Matches every list cache (invalidated when any ticket in scope changes). */
	lists: ['tickets', 'list'] as const,
	list: (scope: TicketScope, search: TicketSearch) => ['tickets', 'list', { org: scope.org, projectKey: scope.projectKey ?? null }, search] as const,
	detail: (key: string) => ['tickets', 'detail', key] as const,
	counts: (scope: TicketScope) => ['tickets', 'counts', { org: scope.org, projectKey: scope.projectKey ?? null }] as const,
} as const;