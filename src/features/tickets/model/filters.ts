import { z } from 'zod';
import { allChannels, allPriorities, allTypes, statusCategory } from '@/mocks/seed';
import { slaAtRisk, slaRunning, clientById, memberById } from '@/mocks/db';
import type { Ticket } from '@/mocks/types';
import { downloadCsv } from '@/shared/lib/csv';

export const ticketTabs = ['open', 'unassigned', 'mine', 'waiting', 'risk', 'resolved', 'all'] as const;
export type TicketTab = (typeof ticketTabs)[number];

export const tabLabels: Record<TicketTab, string> = {
	open: 'All open',
	unassigned: 'Unassigned',
	mine: 'My queue',
	waiting: 'Waiting on client',
	risk: 'SLA at risk',
	resolved: 'Resolved',
	all: 'All',
};

export const sortOptions = ['sla', 'updated', 'priority', 'created', 'due'] as const;
export type TicketSort = (typeof sortOptions)[number];
export const sortLabels: Record<TicketSort, string> = { sla: 'SLA', updated: 'Updated', priority: 'Priority', created: 'Created', due: 'Due date' };

export const ticketSearchSchema = z.object({
	tab: z.enum(ticketTabs).default('open'),
	q: z.string().optional(),
	channel: z.array(z.enum(allChannels)).optional(),
	priority: z.array(z.enum(allPriorities)).optional(),
	type: z.array(z.enum(allTypes)).optional(),
	client: z.string().optional(),
	assignee: z.string().optional(),
	project: z.string().optional(),
	sort: z.enum(sortOptions).default('sla'),
	page: z.number().int().min(1).default(1),
	view: z.enum(['table', 'cards']).default('table'),
});
export type TicketSearch = z.infer<typeof ticketSearchSchema>;
export const defaultTicketSearch: TicketSearch = ticketSearchSchema.parse({});

export const PAGE_SIZE = 50;

const priorityRank = { P1: 0, P2: 1, P3: 2, P4: 3 } as const;

export function matchesTab(t: Ticket, tab: TicketTab, meId: string, now: number) {
	const open = statusCategory[t.status] !== 'done';
	switch (tab) {
		case 'open':
			return open;
		case 'unassigned':
			return open && !t.assigneeId;
		case 'mine':
			return open && t.assigneeId === meId;
		case 'waiting':
			return t.status === 'Waiting on client' || t.status === 'Awaiting vendor';
		case 'risk':
			return slaAtRisk(t, now);
		case 'resolved':
			return !open;
		case 'all':
			return true;
	}
}

export function matchesQuery(t: Ticket, q: string) {
	const s = q.trim().toLowerCase();
	if (!s) return true;
	const hay = [t.key, t.title, t.category, t.description, clientById(t.clientId)?.name, memberById(t.assigneeId)?.name, ...t.labels].filter(Boolean).join(' ').toLowerCase();
	return s.split(/\s+/).every((w) => hay.includes(w));
}

export function filterTickets(tickets: Ticket[], search: TicketSearch, meId: string, now: number, projectKey?: string) {
	const list = tickets.filter((t) => {
		if (projectKey && t.projectKey !== projectKey) return false;
		if (search.project && t.projectKey !== search.project) return false;
		if (!matchesTab(t, search.tab, meId, now)) return false;
		if (search.channel?.length && !search.channel.includes(t.channel)) return false;
		if (search.priority?.length && !search.priority.includes(t.priority)) return false;
		if (search.type?.length && !search.type.includes(t.type)) return false;
		if (search.client && t.clientId !== search.client) return false;
		if (search.assignee) {
			if (search.assignee === 'unassigned' ? !!t.assigneeId : t.assigneeId !== (search.assignee === 'me' ? meId : search.assignee)) return false;
		}
		if (search.q && !matchesQuery(t, search.q)) return false;
		return true;
	});
	return sortTickets(list, search.sort, now);
}

export function sortTickets(list: Ticket[], sort: TicketSort, now: number) {
	const arr = [...list];
	switch (sort) {
		case 'sla':
			arr.sort((a, b) => {
				const ra = slaRunning(a) ? a.sla!.resolveDueAt - now : Number.POSITIVE_INFINITY;
				const rb = slaRunning(b) ? b.sla!.resolveDueAt - now : Number.POSITIVE_INFINITY;
				if (ra !== rb) return ra - rb;
				return priorityRank[a.priority] - priorityRank[b.priority] || b.updatedAt - a.updatedAt;
			});
			break;
		case 'priority':
			arr.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || b.updatedAt - a.updatedAt);
			break;
		case 'created':
			arr.sort((a, b) => b.createdAt - a.createdAt);
			break;
		case 'due':
			arr.sort((a, b) => (a.dueAt ?? Number.POSITIVE_INFINITY) - (b.dueAt ?? Number.POSITIVE_INFINITY));
			break;
		default:
			arr.sort((a, b) => b.updatedAt - a.updatedAt);
	}
	return arr;
}

export function tabCounts(tickets: Ticket[], meId: string, now: number, projectKey?: string): Record<TicketTab, number> {
	const scoped = projectKey ? tickets.filter((t) => t.projectKey === projectKey) : tickets;
	return Object.fromEntries(ticketTabs.map((tab) => [tab, scoped.filter((t) => matchesTab(t, tab, meId, now)).length])) as Record<TicketTab, number>;
}

export interface SavedView {
	id: string;
	name: string;
	search: Partial<TicketSearch>;
}

export const savedViews: SavedView[] = [
	{ id: 'mine', name: 'Assigned to me', search: { tab: 'mine', sort: 'due' } },
	{ id: 'risk', name: 'SLA at risk', search: { tab: 'risk', sort: 'sla' } },
	{ id: 'p1p2-unassigned', name: 'Unassigned P1 / P2', search: { tab: 'unassigned', priority: ['P1', 'P2'], sort: 'priority' } },
	{ id: 'whatsapp', name: 'WhatsApp queue', search: { tab: 'open', channel: ['whatsapp'], sort: 'updated' } },
	{ id: 'bugs', name: 'Open bugs', search: { tab: 'open', type: ['bug'], sort: 'priority' } },
	{ id: 'resolved', name: 'Resolved recently', search: { tab: 'resolved', sort: 'updated' } },
];

export function activeFilterCount(s: TicketSearch) {
	return (s.channel?.length ? 1 : 0) + (s.priority?.length ? 1 : 0) + (s.type?.length ? 1 : 0) + (s.client ? 1 : 0) + (s.assignee ? 1 : 0) + (s.q ? 1 : 0);
}

export function exportCsv(tickets: Ticket[]) {
	const rows = [
		['Key', 'Title', 'Type', 'Priority', 'Status', 'Channel', 'Client', 'Site', 'Assignee', 'Labels', 'Created', 'Updated'],
		...tickets.map((t) => [t.key, t.title, t.type, t.priority, t.status, t.channel, clientById(t.clientId)?.name ?? '', t.site ?? '', memberById(t.assigneeId)?.name ?? '', t.labels.join(' '), new Date(t.createdAt).toISOString(), new Date(t.updatedAt).toISOString()]),
	];
	downloadCsv(`tickets-${new Date().toISOString().slice(0, 10)}.csv`, rows);
}
