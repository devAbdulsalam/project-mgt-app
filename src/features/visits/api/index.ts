// Visits, from whichever source is active.
//
// The visit state machine lives on the server: which moves are legal, and the
// timestamp each one stamps. The UI's five words map onto seven server states,
// so the mapping below is the one place that knows both vocabularies.

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { useDb } from '@/mocks/db';
import { statusCategory } from '@/mocks/seed';
import { isLiveApi } from '@/shared/lib/live-api';
import { toast } from '@/shared/lib/toast-store';
import type { Priority, Ticket, Visit, VisitStatus } from '@/mocks/types';
import { useVisits, type VisitDto } from '@/api/resources';
import type { TicketPage } from '@/features/tickets/api/contracts';
import { ticketDtoToDomain } from '@/features/tickets/api/mapper';

/**
 * Server state to the word the UI shows.
 *
 * `no_access` — the engineer arrived and could not get in — has no UI word yet;
 * it reads as unscheduled, because that is what has to happen next.
 */
const STATUS_LABEL: Record<string, VisitStatus> = {
	unscheduled: 'Unscheduled',
	scheduled: 'Scheduled',
	dispatched: 'En route',
	on_site: 'On site',
	completed: 'Done',
	cancelled: 'Unscheduled',
	no_access: 'Unscheduled',
};

const STATUS_VALUE: Record<VisitStatus, string> = {
	Unscheduled: 'unscheduled',
	Scheduled: 'scheduled',
	'En route': 'dispatched',
	'On site': 'on_site',
	Done: 'completed',
};

const PRIORITY_LABEL: Record<string, Priority> = { p1: 'P1', p2: 'P2', p3: 'P3', p4: 'P4' };

/** A stable spread for the decorative map: the real one has no coordinates to draw. */
function pinFor(id: string) {
	let hash = 0;
	for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
	return { mapX: 12 + (hash % 76), mapY: 18 + ((hash >>> 8) % 56) };
}

/**
 * The checklist the visit card shows.
 *
 * Server-side the checklist is free-form jsonb that nothing writes yet, so
 * unless one was stored it is derived from the timestamps the state machine
 * does stamp: a visit is never `on_site` without an `arrived_at`.
 */
function checkpointsOf(dto: VisitDto): Visit['checkpoints'] {
	if (dto.checkpoints?.length) return dto.checkpoints;

	const at = (iso?: string | null) => (iso ? Date.parse(iso) : undefined);
	return [
		{ label: 'Dispatched', at: at(dto.dispatched_at), done: Boolean(dto.dispatched_at) },
		{ label: 'Checked in', at: at(dto.arrived_at), done: Boolean(dto.arrived_at) },
		{ label: 'Working', done: Boolean(dto.completed_at) },
		{ label: 'Completed', at: at(dto.completed_at), done: Boolean(dto.completed_at) },
	];
}

function toDomain(dto: VisitDto): Visit {
	const start = dto.scheduled_for ? Date.parse(dto.scheduled_for) : undefined;
	const end = dto.window_end ? Date.parse(dto.window_end) : undefined;

	return {
		id: dto.id,
		ticketKey: dto.ticket_key ?? '',
		title: dto.summary ?? dto.ticket_key ?? 'Visit',
		clientId: dto.client_id ?? '',
		site: dto.site_name ?? '',
		address: dto.site_address ?? dto.site_city ?? '',
		priority: PRIORITY_LABEL[dto.ticket_priority ?? ''] ?? 'P3',
		engineerId: dto.engineer_id ?? undefined,
		status: STATUS_LABEL[dto.status] ?? 'Unscheduled',
		startAt: start,
		durationMin: start && end ? Math.max(15, Math.round((end - start) / 60_000)) : 60,
		checkpoints: checkpointsOf(dto),
		parts: dto.parts ?? [],
		region: dto.site_region ?? dto.site_city ?? '',
		...pinFor(dto.id),
	};
}

export function useVisitList(orgSlug: string, filters: { engineer?: string; status?: string; client_id?: string } = {}) {
	const live = isLiveApi();
	const mock = useDb((s) => s.visits);
	const query = useVisits(orgSlug, filters);

	const visits = useMemo(() => (query.data ?? []).map(toDomain), [query.data]);

	if (!live) {
		const scoped = filters.client_id ? mock.filter((v) => v.clientId === filters.client_id) : mock;
		return { visits: scoped, loading: false, error: null, refetch: () => {} };
	}
	return { visits, loading: query.isPending, error: query.error, refetch: () => void query.refetch() };
}

/**
 * Open tickets a visit could be booked against.
 *
 * Live, the newest 100 open ones (the API's page ceiling), narrowed to one
 * client when the dialog was opened from a client. A visit for an older ticket
 * is reachable from that ticket's client page.
 */
export function useSchedulableTickets(orgSlug: string, clientId?: string) {
	const live = isLiveApi();
	const mock = useDb((s) => s.tickets);

	const query = useQuery({
		queryKey: ['org', orgSlug, 'schedulable-tickets', clientId ?? null],
		queryFn: async ({ signal }): Promise<Ticket[]> => {
			const page = await api.get<TicketPage>(`/orgs/${orgSlug}/tickets`, {
				query: { tab: 'open', sort: 'updated', limit: 100, client_id: clientId },
				signal,
			});
			return page.data.map(ticketDtoToDomain);
		},
		enabled: live,
		staleTime: 15_000,
	});

	const tickets = useMemo(
		() => (live ? (query.data ?? []) : mock.filter((t) => statusCategory[t.status] !== 'done')),
		[live, query.data, mock],
	);

	return { tickets, loading: live && query.isPending };
}

/** What the schedule dialog collects; the mock stores it as is, the API derives most of it from the ticket. */
export interface NewVisit {
	ticketKey: string;
	title: string;
	clientId: string;
	site: string;
	address: string;
	priority: Priority;
	durationMin: number;
	region: string;
	engineerId?: string;
	startAt?: number;
}

export function useVisitActions(orgSlug: string) {
	const live = isLiveApi();
	const db = useDb();
	const queryClient = useQueryClient();

	const invalidate = () => queryClient.invalidateQueries({ queryKey: ['org', orgSlug] });
	const report = (err: unknown, fallback: string) =>
		toast(err instanceof ApiError ? err.message : fallback, { tone: 'danger' });

	const windowEnd = (startAt: number, durationMin: number) => new Date(startAt + durationMin * 60_000).toISOString();

	// Every action resolves to whether it worked, so a caller can toast success
	// only when it did; failures have already been reported here.
	return {
		/** Sets the time and the engineer; the server moves it to `scheduled`. */
		async schedule(visit: Visit, startAt: number, engineerId?: string): Promise<boolean> {
			if (!live) {
				// The mock takes (id, engineerId, startAt) in that order.
				db.scheduleVisit(visit.id, engineerId ?? '', startAt);
				return true;
			}
			try {
				await api.patch(`/orgs/${orgSlug}/visits/${visit.id}`, {
					json: {
						scheduled_for: new Date(startAt).toISOString(),
						// The window has to move with the start or the database refuses it.
						window_end: windowEnd(startAt, visit.durationMin),
						engineer_id: engineerId ?? null,
					},
				});
				if (visit.status === 'Unscheduled') {
					await api.post(`/orgs/${orgSlug}/visits/${visit.id}/status`, { json: { status: 'scheduled' } });
				}
				await invalidate();
				return true;
			} catch (err) {
				report(err, 'Could not schedule that visit.');
				return false;
			}
		},

		async unschedule(visit: Visit): Promise<boolean> {
			if (!live) {
				db.unscheduleVisit(visit.id);
				return true;
			}
			try {
				// The status move first: the server may refuse it (an engineer already
				// on the road cannot be unscheduled), and then nothing else changes.
				await api.post(`/orgs/${orgSlug}/visits/${visit.id}/status`, { json: { status: 'unscheduled' } });
				// Clear the slot too, or the visit would still sit on a timeline.
				await api.patch(`/orgs/${orgSlug}/visits/${visit.id}`, {
					json: { scheduled_for: null, window_end: null, engineer_id: null },
				});
				await invalidate();
				return true;
			} catch (err) {
				report(err, 'Could not unschedule that visit.');
				return false;
			}
		},

		/** Moves to the next state. The server refuses an illegal move. */
		async advance(visit: Visit, to: VisitStatus): Promise<boolean> {
			if (!live) {
				db.advanceVisit(visit.id);
				return true;
			}
			try {
				await api.post(`/orgs/${orgSlug}/visits/${visit.id}/status`, { json: { status: STATUS_VALUE[to] } });
				await invalidate();
				return true;
			} catch (err) {
				report(err, 'Could not update that visit.');
				return false;
			}
		},

		/** Resolves to the new visit's id. */
		async create(input: NewVisit): Promise<string | undefined> {
			if (!live) return db.createVisit(input).id;
			try {
				const created = await api.post<{ id: string }>(`/orgs/${orgSlug}/visits`, {
					json: {
						// Client, site and summary default from the ticket on the server.
						ticket_key: input.ticketKey,
						engineer_id: input.engineerId || undefined,
						scheduled_for: input.startAt ? new Date(input.startAt).toISOString() : undefined,
						window_end: input.startAt ? windowEnd(input.startAt, input.durationMin) : undefined,
					},
					idempotencyKey: crypto.randomUUID(),
				});
				await invalidate();
				return created.id;
			} catch (err) {
				report(err, 'Could not create that visit.');
				return undefined;
			}
		},

		/** Signs off every part that was waiting on the client. */
		async approveParts(visit: Visit): Promise<boolean> {
			if (!live) {
				visit.parts.filter((p) => p.approval === 'needs approval').forEach((p) => db.approvePart(visit.id, p.name));
				return true;
			}
			try {
				await api.patch(`/orgs/${orgSlug}/visits/${visit.id}`, {
					json: { parts: visit.parts.map((p) => (p.approval === 'needs approval' ? { ...p, approval: 'approved' } : p)) },
				});
				await invalidate();
				return true;
			} catch (err) {
				report(err, 'Could not approve those parts.');
				return false;
			}
		},
	};
}
