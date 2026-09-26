// The numbers on the My work tabs, and the at-risk figure, from the API.
//
// One request counts all of them with the same filter builder the list uses, so
// a badge never disagrees with the list behind it. Inert in mock mode.

import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { isLiveApi } from '@/shared/lib/live-api';

export interface InboxCounts {
	assigned: number;
	mentioned: number;
	watching: number;
	created: number;
	/** My open tickets whose SLA resolves within two hours. */
	at_risk: number;
}

export const inboxCountsKey = (org: string) => ['tickets', 'inbox-counts', org] as const;

export function useInboxCounts(org: string) {
	return useQuery({
		// Under the `tickets` root, so any ticket write refreshes the badges.
		queryKey: inboxCountsKey(org),
		queryFn: ({ signal }) => api.get<InboxCounts>(`/orgs/${org}/tickets/inbox-counts`, { signal }),
		enabled: isLiveApi() && Boolean(org),
		staleTime: 15_000,
	});
}
