// Every ticket in a project, from whichever source is active.
//
// Boards, calendars and workload views all want the whole project rather than a
// page of it, so this deliberately asks for a large limit instead of paging.
// That is fine at the sizes a board is readable at, and the server caps it —
// a project with thousands of open tickets has a usability problem before it
// has a performance one.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { useDb } from '@/mocks/db';
import { isLiveApi } from '@/shared/lib/live-api';
import type { Ticket } from '@/mocks/types';
import type { TicketPage } from '../api/contracts';
import { ticketDtoToDomain } from '../api/mapper';
import { ticketKeys } from '../api/queryKeys';

export function useProjectTickets(
	orgSlug: string,
	projectKey: string | undefined,
): { tickets: Ticket[]; loading: boolean } {
	const live = isLiveApi();

	const mockAll = useDb((s) => s.tickets);
	const mock = useMemo(
		() => (projectKey ? mockAll.filter((t) => t.projectKey === projectKey) : mockAll),
		[mockAll, projectKey],
	);

	const query = useQuery({
		// Under the `tickets` root so every ticket write (which invalidates it)
		// refreshes the board, calendar and workload too.
		queryKey: [...ticketKeys.all, 'project', orgSlug, projectKey],
		queryFn: async ({ signal }) => {
			const page = await api.get<TicketPage>(`/orgs/${orgSlug}/tickets`, {
				query: { project: projectKey, limit: 100, sort: 'rank' },
				include: ['assignee', 'client'],
				signal,
			});
			return page.data.map(ticketDtoToDomain);
		},
		enabled: live && Boolean(orgSlug),
		staleTime: 15_000,
	});

	if (!live) return { tickets: mock, loading: false };
	return { tickets: query.data ?? [], loading: query.isPending };
}
