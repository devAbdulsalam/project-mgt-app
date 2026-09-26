// The tickets behind each My work tab, from whichever source is active.
//
// Live, the API does the filtering (`tab=mine` for assigned, `involved=` for the
// rest) and counts each tab with the same filter builder. In mock mode the same
// buckets are computed over the in-browser store. The page gets one shape.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { slaRunning, useDb } from '@/mocks/db';
import { statusCategory } from '@/mocks/seed';
import type { Ticket } from '@/mocks/types';
import { isLiveApi } from '@/shared/lib/live-api';
import type { TicketPage } from '@/features/tickets/api/contracts';
import { priorityToWire, ticketDtoToDomain } from '@/features/tickets/api/mapper';
import { ticketKeys } from '@/features/tickets/api/queryKeys';
import { inboxTabs, type InboxSearch, type InboxTab } from '../model';
import { useInboxCounts } from './useInboxCounts';

function bucket(t: Ticket, tab: InboxTab, meId: string) {
	const open = statusCategory[t.status] !== 'done';
	switch (tab) {
		case 'assigned':
			return open && t.assigneeId === meId;
		case 'mentioned':
			return t.mentionedIds.includes(meId);
		case 'watching':
			return open && t.watcherIds.includes(meId);
		case 'created':
			return t.createdById === meId || t.reporter.id === meId;
	}
}

function sortForTab(list: Ticket[]) {
	return [...list].sort((a, b) => {
		const da = slaRunning(a) ? a.sla!.resolveDueAt : (a.dueAt ?? Number.POSITIVE_INFINITY);
		const db = slaRunning(b) ? b.sla!.resolveDueAt : (b.dueAt ?? Number.POSITIVE_INFINITY);
		return da - db || b.updatedAt - a.updatedAt;
	});
}

/** The query parameters that make the server return one tab. */
const TAB_QUERY: Record<InboxTab, Record<string, string>> = {
	assigned: { tab: 'mine' },
	mentioned: { involved: 'mentioned' },
	watching: { involved: 'watching' },
	created: { involved: 'created' },
};

export interface MyWork {
	list: Ticket[];
	counts: Record<InboxTab, number>;
	/** Mine, open, and due within two hours. */
	atRisk: number | undefined;
	loading: boolean;
}

export function useMyWork(orgSlug: string, meId: string, search: Pick<InboxSearch, 'tab' | 'priority'>): MyWork {
	const live = isLiveApi();
	const tickets = useDb((s) => s.tickets);

	const counts = useInboxCounts(orgSlug);
	const listQuery = useQuery({
		queryKey: [...ticketKeys.all, 'my-work', orgSlug, search.tab, search.priority ?? null],
		queryFn: async ({ signal }) => {
			const page = await api.get<TicketPage>(`/orgs/${orgSlug}/tickets`, {
				query: {
					...TAB_QUERY[search.tab],
					sort: 'sla',
					limit: 100,
					...(search.priority ? { priority: [priorityToWire(search.priority)] } : {}),
				},
				include: ['assignee', 'client'],
				signal,
			});
			return page.data.map(ticketDtoToDomain);
		},
		enabled: live && Boolean(orgSlug),
		staleTime: 15_000,
	});

	const mockCounts = useMemo(
		() => Object.fromEntries(inboxTabs.map((tab) => [tab, tickets.filter((t) => bucket(t, tab, meId)).length])) as Record<InboxTab, number>,
		[tickets, meId],
	);
	const mockList = useMemo(
		() => sortForTab(tickets.filter((t) => bucket(t, search.tab, meId) && (!search.priority || t.priority === search.priority))),
		[tickets, search.tab, search.priority, meId],
	);

	if (!live) return { list: mockList, counts: mockCounts, atRisk: undefined, loading: false };

	const c = counts.data;
	return {
		list: listQuery.data ?? [],
		counts: { assigned: c?.assigned ?? 0, mentioned: c?.mentioned ?? 0, watching: c?.watching ?? 0, created: c?.created ?? 0 },
		atRisk: c?.at_risk ?? 0,
		loading: listQuery.isPending,
	};
}
