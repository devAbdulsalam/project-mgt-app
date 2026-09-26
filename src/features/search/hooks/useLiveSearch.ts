// What the command palette searches, from whichever source is active.
//
// Tickets go to the server's full-text search (`q`), debounced, because the
// palette fires on every keystroke and the workspace may hold far more tickets
// than the browser. Projects and clients are short lists fetched once and
// filtered locally.

import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { useClients, useProjects } from '@/api/resources';
import { useDb } from '@/mocks/db';
import type { Ticket } from '@/mocks/types';
import { useMemberDirectory } from '@/shared/lib/member-directory';
import { isLiveApi } from '@/shared/lib/live-api';
import type { TicketPage } from '@/features/tickets/api/contracts';
import { ticketDtoToDomain } from '@/features/tickets/api/mapper';
import { ticketKeys } from '@/features/tickets/api/queryKeys';
import { matchesQuery } from '@/features/tickets/model/filters';

export interface PaletteProject {
	key: string;
	name: string;
}

export interface PaletteClient {
	id: string;
	name: string;
}

export interface PaletteMember {
	id: string;
	name: string;
	role: string;
	active: boolean;
}

function useDebounced<T>(value: T, ms: number): T {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const timer = window.setTimeout(() => setDebounced(value), ms);
		return () => window.clearTimeout(timer);
	}, [value, ms]);
	return debounced;
}

export function usePaletteData(orgSlug: string, text: string) {
	const live = isLiveApi();
	const debounced = useDebounced(text.trim(), 200);

	const mockTickets = useDb((s) => s.tickets);
	const mockProjects = useDb((s) => s.projects);
	const mockMembers = useDb((s) => s.members);
	const mockClients = useDb((s) => s.clientAccounts);
	const directory = useMemberDirectory((s) => s.members);

	const projects = useProjects(orgSlug);
	const clients = useClients(orgSlug);

	const search = useQuery({
		// Under the `tickets` root, so a write refreshes what the palette shows.
		queryKey: [...ticketKeys.all, 'palette', orgSlug, debounced],
		queryFn: async ({ signal }) => {
			const page = await api.get<TicketPage>(`/orgs/${orgSlug}/tickets`, {
				query: { q: debounced, tab: 'all', limit: 6 },
				include: ['assignee'],
				signal,
			});
			return page.data.map(ticketDtoToDomain);
		},
		enabled: live && Boolean(orgSlug) && debounced.length > 0,
		placeholderData: keepPreviousData,
		staleTime: 10_000,
	});

	const tickets: Ticket[] = live ? (debounced ? (search.data ?? []) : []) : mockTickets.filter((t) => matchesQuery(t, text)).slice(0, 6);

	const projectList: PaletteProject[] = live
		? (projects.data ?? []).map((p) => ({ key: p.key, name: p.name }))
		: mockProjects.filter((p) => !p.archived).map((p) => ({ key: p.key, name: p.name }));

	const clientList: PaletteClient[] = live ? (clients.data ?? []).map((c) => ({ id: c.id, name: c.name })) : mockClients.map((c) => ({ id: c.id, name: c.name }));

	const memberList: PaletteMember[] = (live ? directory : mockMembers).map((m) => ({ id: m.id, name: m.name, role: m.role, active: m.status === 'Active' }));

	return { tickets, projects: projectList, clients: clientList, members: memberList, searching: live && search.isFetching };
}
