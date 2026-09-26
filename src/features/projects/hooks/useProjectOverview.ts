// The numbers behind a project's overview page, from whichever source is active.
//
// Live, the API computes them in one request (`/projects/{key}/overview`). In
// mock mode they are derived from the in-browser store, as the page always did.
// Either way the page receives the same view model and never asks which.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { epics as mockEpics, useDb } from '@/mocks/db';
import { statusCategory } from '@/mocks/seed';
import { isLiveApi } from '@/shared/lib/live-api';
import { useNow } from '@/shared/lib/time';
import type { Project, Status, TicketType } from '@/mocks/types';
import { statusToLabel } from '@/features/tickets/api/mapper';
import type { WireStatus } from '@/features/tickets/api/contracts';

const DAY = 86_400_000;

export interface OverviewEpic {
	id: string;
	name: string;
	done: number;
	total: number;
	status: 'To do' | 'In progress' | 'Done';
	dueLabel: string;
}

export interface OverviewSprint {
	name: string;
	daysLeft: number;
	points: number;
	remaining: number;
	burndown: number[];
	totalDays: number;
	startLabel: string;
}

export interface OverviewDue {
	key: string;
	title: string;
	type: TicketType;
	status: Status;
	assigneeId?: string;
	dueAt: number;
}

export interface OverviewActivity {
	id: string;
	actorName: string;
	actorId?: string;
	text: string;
	ticketKey?: string;
	at: number;
}

export interface ProjectOverview {
	loading: boolean;
	openCount: number;
	openDelta: string;
	resolved7d: number;
	cycleDays: number;
	cycleDelta: string;
	overdueCount: number;
	overdueDelta: string;
	dueSoon: OverviewDue[];
	dueThisWeekCount: number;
	distribution: { label: string; count: number; color: string }[];
	epics: OverviewEpic[];
	sprint?: OverviewSprint;
	activity: OverviewActivity[];
	/** Open issues per member id. */
	openByMember: Record<string, number>;
	memberIds: string[];
}

// -- Wire shape -------------------------------------------------------------

interface OverviewDto {
	stats: {
		open: number;
		overdue: number;
		due_this_week: number;
		resolved_7d: number;
		open_prev_7d: number;
		cycle_days: number | null;
		cycle_days_prev: number | null;
	};
	statuses: { status: WireStatus; count: number }[];
	epics: { id: string; name: string; status: string; due_at: string | null; ticket_count: number; done_count: number }[];
	sprint: {
		name: string;
		state: string;
		starts_at: string | null;
		started_at: string | null;
		ends_at: string | null;
		points_total: number;
		points_done: number;
		burndown: { day: string; remaining_points: number }[];
	} | null;
	due_soon: { key: string; title: string; type: TicketType; status: WireStatus; assignee_id: string | null; due_at: string }[];
	activity: { id: string; actor_id: string | null; actor_name: string | null; text: string; system: boolean; ticket_key: string; created_at: string }[];
	team: { user_id: string; open_count: number }[];
}

const STATUS_COLOR: Record<string, string> = {
	new: '#e0a100',
	open: '#e0a100',
	scheduled: '#3b5baa',
	in_progress: '#2b5aa0',
	dispatched: '#2e6f86',
	waiting_on_client: '#b45309',
	awaiting_vendor: '#b45309',
	in_review: '#6b3fa0',
	blocked: '#d93f3f',
};

const EPIC_STATUS = { open: 'To do', in_progress: 'In progress', done: 'Done' } as const;

const dayMonth = (ms: number) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(ms);

function signed(n: number, unit: string, suffix: string) {
	if (n === 0) return `no change ${suffix}`;
	return `${n > 0 ? '+' : '-'}${Math.abs(n)}${unit} ${suffix}`;
}

function fromDto(dto: OverviewDto, now: number, memberIds: string[]): Omit<ProjectOverview, 'loading'> {
	const { stats } = dto;
	const prev = stats.open_prev_7d;
	const sprint = dto.sprint;
	const startMs = sprint ? Date.parse(sprint.started_at ?? sprint.starts_at ?? '') : NaN;
	const endMs = sprint?.ends_at ? Date.parse(sprint.ends_at) : NaN;

	return {
		openCount: stats.open,
		openDelta: prev > 0 ? signed(Math.round(((stats.open - prev) / prev) * 100), '%', 'vs last week') : '',
		resolved7d: stats.resolved_7d,
		cycleDays: stats.cycle_days ?? 0,
		cycleDelta: stats.cycle_days != null && stats.cycle_days_prev != null
			? signed(Math.round((stats.cycle_days - stats.cycle_days_prev) * 10) / 10, 'd', 'vs prior 2 weeks')
			: '',
		overdueCount: stats.overdue,
		overdueDelta: '',
		dueSoon: dto.due_soon.map((t) => ({
			key: t.key,
			title: t.title,
			type: t.type,
			status: statusToLabel(t.status),
			assigneeId: t.assignee_id ?? undefined,
			dueAt: Date.parse(t.due_at),
		})),
		dueThisWeekCount: stats.due_this_week,
		distribution: dto.statuses
			.filter((s) => s.status !== 'resolved' && s.status !== 'closed')
			.map((s) => ({ label: statusToLabel(s.status), count: s.count, color: STATUS_COLOR[s.status] ?? '#8a97a0' })),
		epics: dto.epics.map((e) => ({
			id: e.id,
			name: e.name,
			done: e.done_count,
			total: e.ticket_count,
			status: EPIC_STATUS[e.status as keyof typeof EPIC_STATUS] ?? 'To do',
			dueLabel: e.due_at ? `Due ${dayMonth(Date.parse(e.due_at))}` : '',
		})),
		sprint: sprint && sprint.points_total > 0
			? {
					name: sprint.name,
					daysLeft: Number.isFinite(endMs) ? Math.max(0, Math.ceil((endMs - now) / DAY)) : 0,
					points: sprint.points_total,
					remaining: sprint.points_total - sprint.points_done,
					burndown: sprint.burndown.map((p) => p.remaining_points),
					totalDays: Number.isFinite(startMs) && Number.isFinite(endMs) ? Math.max(1, Math.round((endMs - startMs) / DAY)) : Math.max(1, sprint.burndown.length),
					startLabel: Number.isFinite(startMs) ? dayMonth(startMs) : '',
				}
			: undefined,
		activity: dto.activity.map((a) => ({
			id: a.id,
			actorName: a.actor_name ?? 'Automation',
			actorId: a.actor_id ?? undefined,
			// The page appends the ticket key as a link after the sentence. Where the
			// API's sentence already ends with it, split it off; where the key sits
			// mid-sentence, leave the sentence whole and skip the link.
			text: a.text.endsWith(a.ticket_key) ? a.text.slice(0, -a.ticket_key.length).trimEnd() : a.text,
			ticketKey: a.text.includes(a.ticket_key) && !a.text.endsWith(a.ticket_key) ? undefined : a.ticket_key,
			at: Date.parse(a.created_at),
		})),
		openByMember: Object.fromEntries(dto.team.map((m) => [m.user_id, m.open_count])),
		memberIds: dto.team.length ? dto.team.map((m) => m.user_id) : memberIds,
	};
}

export function useProjectOverview(orgSlug: string, project: Project): ProjectOverview {
	const live = isLiveApi();
	const now = useNow(60_000);
	const allTickets = useDb((s) => s.tickets);

	const query = useQuery({
		queryKey: ['project-overview', orgSlug, project.key],
		queryFn: ({ signal }) => api.get<OverviewDto>(`/orgs/${orgSlug}/projects/${project.key}/overview`, { signal }),
		enabled: live && Boolean(orgSlug),
		staleTime: 15_000,
	});

	const liveView = useMemo(() => (query.data ? fromDto(query.data, now, project.memberIds) : undefined), [query.data, now, project.memberIds]);

	const mockView = useMemo(() => {
		if (live) return undefined;
		const tickets = allTickets.filter((t) => t.projectKey === project.key);
		const open = tickets.filter((t) => statusCategory[t.status] !== 'done');
		const overdue = open.filter((t) => t.dueAt && t.dueAt < now);
		// Seeded projects carry an aggregate count standing in for a larger dataset.
		const seeded = project.key === 'KS' ? 15 : project.key === 'PB' ? 8 : project.key === 'MOB' ? 3 : project.key === 'NET' ? 2 : 0;
		const dueSoon = open.filter((t) => t.dueAt && t.dueAt < now + 7 * DAY).sort((a, b) => a.dueAt! - b.dueAt!);
		const activity = [
			...tickets.flatMap((t) => t.activity.map((a) => ({ id: `${t.key}-${a.id}`, actorName: a.actorName, text: `${a.text} on`, ticketKey: t.key, at: a.at }))).filter((a) => a.at > now - 6 * 3600_000),
			...project.activity,
		].sort((a, b) => b.at - a.at).slice(0, 6);
		const s = project.sprint;
		return {
			openCount: project.stats.open + Math.max(0, open.length - seeded),
			openDelta: project.stats.openDelta,
			resolved7d: tickets.filter((t) => t.resolvedAt && t.resolvedAt > now - 7 * DAY).length,
			cycleDays: project.stats.cycleDays,
			cycleDelta: project.stats.cycleDelta,
			overdueCount: project.stats.overdue + overdue.length - (project.key === 'MOB' ? 1 : 0),
			overdueDelta: project.stats.overdueDelta,
			dueSoon: dueSoon.map((t) => ({ key: t.key, title: t.title, type: t.type, status: t.status, assigneeId: t.assigneeId, dueAt: t.dueAt! })),
			dueThisWeekCount: dueSoon.length,
			distribution: project.statusDistribution ?? [],
			epics: mockEpics.filter((e) => e.projectKey === project.key),
			sprint: s ? { ...s, startLabel: '3 Sep' } : undefined,
			activity,
			openByMember: Object.fromEntries(project.memberIds.map((id) => [id, tickets.filter((t) => t.assigneeId === id && statusCategory[t.status] !== 'done').length])),
			memberIds: project.memberIds,
		};
	}, [live, allTickets, project, now]);

	const view = live ? liveView : mockView;
	if (view) return { loading: false, ...view };

	return {
		loading: live ? query.isPending : false,
		openCount: 0, openDelta: '', resolved7d: 0, cycleDays: 0, cycleDelta: '', overdueCount: 0, overdueDelta: '',
		dueSoon: [], dueThisWeekCount: 0, distribution: [], epics: [], activity: [], openByMember: {}, memberIds: project.memberIds,
	};
}
