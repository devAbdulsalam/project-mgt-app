// TanStack Query options for tickets.
//
// The list is keyset-paginated: the server returns `next_cursor`, which is
// passed straight back as `cursor`. There are no page numbers — a cursor is
// bound to the sort it was issued for and is rejected if replayed against
// another, so the UI pages forward and back rather than jumping to page 7.

import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { api } from '@/api';
import type { Query } from '@/api';
import { PAGE_SIZE, type TicketSearch } from '../model/filters';
import type { TicketCounts, TicketDto, TicketListParams, TicketPage } from './contracts';
import { priorityToWire, statusToWire, ticketDtoToDomain } from './mapper';
import { ticketKeys, type TicketScope } from './queryKeys';

/** Translates the typed URL search into wire query parameters. */
export function toListQuery(search: TicketSearch, cursor?: string): TicketListParams {
	const query: TicketListParams = {
		tab: search.tab,
		sort: search.sort,
		limit: PAGE_SIZE,
		cursor,
	};

	if (search.q) query.q = search.q;
	if (search.channel?.length) query.channel = search.channel;
	// The UI works in display values (P1); the wire wants stored values (p1).
	if (search.priority?.length) query.priority = search.priority.map(priorityToWire);
	if (search.type?.length) query.type = search.type;
	if (search.client) query.client_id = search.client;
	if (search.assignee) query.assignee = search.assignee;
	if (search.project) query.project = search.project;

	return query;
}

function asQuery(params: TicketListParams): Query {
	const query: Query = {
		tab: params.tab,
		sort: params.sort,
		limit: params.limit,
		cursor: params.cursor,
	};

	if (params.q) query.q = params.q;
	// ApiClient serialises arrays as `priority[]=p1&priority[]=p2`, which is what
	// the backend's extended query parser expects.
	if (params.channel?.length) query.channel = params.channel;
	if (params.priority?.length) query.priority = params.priority;
	if (params.type?.length) query.type = params.type;
	if (params.status?.length) query.status = params.status;
	if (params.client_id) query.client_id = params.client_id;
	if (params.assignee) query.assignee = params.assignee;
	if (params.project) query.project = params.project;
	if (params.label) query.label = params.label;

	return query;
}

export interface TicketListResult {
	page: TicketPage;
	items: ReturnType<typeof ticketDtoToDomain>[];
	nextCursor: string | null;
	prevCursor: string | null;
}

export function ticketListQuery(scope: TicketScope, search: TicketSearch, cursor?: string) {
	const params = toListQuery(search, cursor);

	return queryOptions({
		queryKey: [...ticketKeys.list(scope, search), cursor ?? 'first'],
		queryFn: async ({ signal }): Promise<TicketListResult> => {
			const page = await api.get<TicketPage>(`/orgs/${scope.org}/tickets`, {
				query: asQuery(params),
				include: ['assignee', 'client'],
				signal,
			});

			return {
				page,
				items: page.data.map(ticketDtoToDomain),
				nextCursor: page.next_cursor,
				prevCursor: page.prev_cursor,
			};
		},
		// Keeps the previous page on screen while the next one loads, instead of
		// flashing an empty table.
		placeholderData: keepPreviousData,
	});
}

export function ticketCountsQuery(scope: TicketScope) {
	return queryOptions({
		queryKey: ticketKeys.counts(scope),
		queryFn: ({ signal }) =>
			api.get<TicketCounts>(`/orgs/${scope.org}/tickets/count`, {
				query: scope.projectKey ? { project: scope.projectKey } : {},
				signal,
			}),
		staleTime: 30_000,
	});
}

export function ticketDetailQuery(scope: string, key: string) {
	return queryOptions({
		queryKey: ticketKeys.detail(key),
		queryFn: async ({ signal }) => {
			const dto = await api.get<TicketDto>(`/orgs/${scope}/tickets/${key}`, {
				include: ['assignee', 'client', 'comments', 'activity', 'subtasks', 'links'],
				signal,
			});
			return ticketDtoToDomain(dto);
		},
	});
}

/** The raw DTO, for callers that need `version` to send a mutation back. */
export function ticketDtoQuery(scope: string, key: string) {
	return queryOptions({
		queryKey: [...ticketKeys.detail(key), 'dto'],
		queryFn: ({ signal }) =>
			api.get<TicketDto>(`/orgs/${scope}/tickets/${key}`, {
				include: ['assignee', 'client', 'comments', 'activity', 'subtasks', 'links'],
				signal,
			}),
	});
}

export { statusToWire };
