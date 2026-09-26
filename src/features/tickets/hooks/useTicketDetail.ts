// One ticket, from whichever source is active.

import { useQuery } from '@tanstack/react-query';
import { useDb } from '@/mocks/db';
import { isLiveApi } from '@/shared/lib/live-api';
import type { Ticket } from '@/mocks/types';
import { ticketDetailQuery } from '../api/queries';

export function useTicketDetail(key: string, orgSlug: string): { ticket: Ticket | undefined; loading: boolean } {
	const live = isLiveApi();

	const mockTicket = useDb((s) => s.tickets.find((t) => t.key === key));

	const query = useQuery({ ...ticketDetailQuery(orgSlug, key), enabled: live });

	if (!live) return { ticket: mockTicket, loading: false };

	return { ticket: query.data, loading: query.isPending };
}
