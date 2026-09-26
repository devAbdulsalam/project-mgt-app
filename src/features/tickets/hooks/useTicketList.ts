// One hook, two data sources.
//
// In mock mode the whole ticket list is already in memory, so filtering,
// counting and slicing happen locally. Against the live API the server does all
// three, and paging is by cursor rather than page number.
//
// The component consuming this should not care which it got, so both paths
// return the same shape.

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDb } from '@/mocks/db';
import { useAuthStore } from '@/shared/lib/auth-store';
import { useNow } from '@/shared/lib/time';
import { isLiveApi } from '@/shared/lib/live-api';
import type { Ticket } from '@/mocks/types';
import { filterTickets, PAGE_SIZE, tabCounts, type TicketSearch } from '../model/filters';
import { ticketCountsQuery, ticketListQuery } from '../api/queries';

export interface TicketListState {
	items: Ticket[];
	counts: Record<string, number>;
	loading: boolean;
	error: Error | null;
	/** Cursor paging, used when the list comes from the server. */
	cursored: boolean;
	canPrevious: boolean;
	canNext: boolean;
	goNext: () => void;
	goPrevious: () => void;
	/** Offset paging, used against the mock store. */
	page: number;
	pageCount: number;
	total: number;
	/** How many rows the page in view holds. */
	pageSize: number;
}

export function useTicketList(search: TicketSearch, orgSlug: string, projectKey?: string): TicketListState {
	const live = isLiveApi();
	const now = useNow(15_000);
	const user = useAuthStore((s) => s.user);
	const tickets = useDb((s) => s.tickets);

	// A stack rather than a single cursor: each entry is the cursor that opened
	// a page, so stepping back is a pop instead of a second round trip.
	const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
	const cursor = cursors[cursors.length - 1];

	const scope = { org: orgSlug, projectKey };

	const listQuery = useQuery({
		...ticketListQuery(scope, { ...search, project: projectKey ?? search.project }, cursor),
		enabled: live,
	});

	const countsQuery = useQuery({ ...ticketCountsQuery(scope), enabled: live });

	// -- Mock path ----------------------------------------------------------
	const localCounts = useMemo(
		() => (live || !user ? {} : tabCounts(tickets, user.id, now, projectKey)),
		[live, tickets, user, now, projectKey],
	);

	const localFiltered = useMemo(
		() => (live || !user ? [] : filterTickets(tickets, search, user.id, now, projectKey)),
		[live, tickets, search, user, now, projectKey],
	);

	if (!live) {
		const pageCount = Math.max(1, Math.ceil(localFiltered.length / PAGE_SIZE));
		const page = Math.min(search.page, pageCount);

		return {
			items: localFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
			counts: localCounts,
			loading: false,
			error: null,
			cursored: false,
			canPrevious: page > 1,
			canNext: page < pageCount,
			goNext: () => {},
			goPrevious: () => {},
			page,
			pageCount,
			total: localFiltered.length,
			pageSize: PAGE_SIZE,
		};
	}

	// -- Live path ----------------------------------------------------------
	const result = listQuery.data;

	return {
		items: result?.items ?? [],
		counts: (countsQuery.data ?? {}) as unknown as Record<string, number>,
		loading: listQuery.isPending,
		error: (listQuery.error as Error | null) ?? null,
		cursored: true,
		canPrevious: cursors.length > 1,
		canNext: Boolean(result?.nextCursor),
		goNext: () => {
			if (result?.nextCursor) setCursors((stack) => [...stack, result.nextCursor!]);
		},
		goPrevious: () => setCursors((stack) => (stack.length > 1 ? stack.slice(0, -1) : stack)),
		page: cursors.length,
		pageCount: cursors.length + (result?.nextCursor ? 1 : 0),
		pageSize: PAGE_SIZE,
		total: result?.page.total ?? 0,
	};
}
