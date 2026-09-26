// The boards directory: one card per project, from whichever source is active.
//
// Live, projects come from `GET /projects` and the per-status counts from one
// aggregate (`GET /board-summary`) rather than a full board fetch per project.
// Mock mode derives the same cards from the in-browser store.

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { useProjects } from '@/api/resources';
import { useDb } from '@/mocks/db';
import { statusCategory } from '@/mocks/seed';
import type { Status } from '@/mocks/types';
import { statusToLabel } from '@/features/tickets/api/mapper';
import type { WireStatus } from '@/features/tickets/api/contracts';
import { isLiveApi } from '@/shared/lib/live-api';
import { useNow } from '@/shared/lib/time';

const DAY = 86_400_000;

export interface BoardCard {
	id: string;
	key: string;
	name: string;
	color: string;
	kind: 'service' | 'software';
	leadId?: string;
	starred: boolean;
	/** Five status groups, in board order. */
	groups: [string, number][];
	/** Open tickets assigned to the signed-in person. */
	myCount: number;
	sprintName?: string;
	sprintDaysLeft?: number;
}

export interface BoardsDirectory {
	cards: BoardCard[];
	/** Open issues assigned to me, across every board. */
	inFlight: number;
	loading: boolean;
	toggleStar: (card: BoardCard) => void;
}

interface SummaryDto {
	data: {
		project_id: string;
		statuses: Record<string, number>;
		mine: number;
		sprint: { name: string; ends_at: string | null; points_total: number; points_done: number } | null;
	}[];
}

const SOFTWARE_GROUPS: [string, Status[]][] = [
	['To do', ['New', 'Open', 'Scheduled']],
	['In progress', ['In progress', 'Dispatched']],
	['Review', ['In review']],
	['Blocked', ['Blocked', 'Waiting on client', 'Awaiting vendor']],
];
const SERVICE_GROUPS: [string, Status[]][] = [
	['Open', ['New', 'Open']],
	['Scheduled', ['Scheduled']],
	['In progress', ['In progress', 'Dispatched']],
	['Waiting', ['Waiting on client', 'Awaiting vendor', 'Blocked', 'In review']],
];

/** Buckets per-status counts into the five groups a card shows; the last is always "done". */
function group(kind: 'service' | 'software', countOf: (status: Status) => number, doneCount: number): [string, number][] {
	const defs = kind === 'software' ? SOFTWARE_GROUPS : SERVICE_GROUPS;
	return [
		...defs.map(([label, statuses]): [string, number] => [label, statuses.reduce((sum, s) => sum + countOf(s), 0)]),
		[kind === 'software' ? 'Done' : 'Resolved', doneCount],
	];
}

export function useBoardsDirectory(orgSlug: string, meId: string): BoardsDirectory {
	const live = isLiveApi();
	const queryClient = useQueryClient();
	const now = useNow(60_000);

	const mockProjects = useDb((s) => s.projects);
	const mockTickets = useDb((s) => s.tickets);
	const mockToggleStar = useDb((s) => s.toggleStar);

	const projects = useProjects(orgSlug);
	const summary = useQuery({
		queryKey: ['org', orgSlug, '/board-summary'],
		queryFn: ({ signal }) => api.get<SummaryDto>(`/orgs/${orgSlug}/board-summary`, { signal }),
		enabled: live && Boolean(orgSlug),
		staleTime: 30_000,
	});

	const star = useMutation({
		mutationFn: ({ key, starred }: { key: string; starred: boolean }) =>
			starred ? api.del(`/orgs/${orgSlug}/projects/${key}/star`) : api.put(`/orgs/${orgSlug}/projects/${key}/star`),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['org', orgSlug, '/projects'] }),
	});

	const mockCards = useMemo<BoardCard[]>(() => {
		return mockProjects
			.filter((p) => !p.archived)
			.map((p) => {
				const work = mockTickets.filter((t) => t.projectKey === p.key && t.type !== 'epic');
				return {
					id: p.id,
					key: p.key,
					name: p.name,
					color: p.color,
					kind: p.kind,
					leadId: p.leadId,
					starred: p.starred,
					groups: group(p.kind, (s) => work.filter((t) => t.status === s).length, work.filter((t) => statusCategory[t.status] === 'done').length),
					myCount: work.filter((t) => t.assigneeId === meId && statusCategory[t.status] !== 'done').length,
					sprintName: p.sprint?.name,
					sprintDaysLeft: p.sprint?.daysLeft,
				};
			});
	}, [mockProjects, mockTickets, meId]);

	const liveCards = useMemo<BoardCard[]>(() => {
		const byProject = new Map((summary.data?.data ?? []).map((s) => [s.project_id, s]));
		return (projects.data ?? []).map((p) => {
			const s = byProject.get(p.id);
			const counts = s?.statuses ?? {};
			const endsAt = s?.sprint?.ends_at ? Date.parse(s.sprint.ends_at) : NaN;
			return {
				id: p.id,
				key: p.key,
				name: p.name,
				color: p.color ?? '#2e6f86',
				kind: p.kind,
				leadId: p.lead_id ?? undefined,
				starred: p.starred,
				groups: group(
					p.kind,
					(status) => Object.entries(counts).reduce((sum, [wire, n]) => sum + (statusToLabel(wire as WireStatus) === status ? n : 0), 0),
					(counts.resolved ?? 0) + (counts.closed ?? 0),
				),
				myCount: s?.mine ?? 0,
				sprintName: s?.sprint?.name,
				sprintDaysLeft: Number.isFinite(endsAt) ? Math.max(0, Math.ceil((endsAt - now) / DAY)) : undefined,
			};
		});
	}, [projects.data, summary.data, now]);

	const cards = [...(live ? liveCards : mockCards)].sort((a, b) => Number(b.starred) - Number(a.starred));

	return {
		cards,
		inFlight: cards.reduce((sum, c) => sum + c.myCount, 0),
		loading: live && (projects.isPending || summary.isPending),
		toggleStar: (card) => (live ? star.mutate({ key: card.key, starred: card.starred }) : mockToggleStar(card.id)),
	};
}
