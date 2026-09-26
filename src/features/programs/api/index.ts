// Programmes, activities and attendees, from whichever source is active.
//
// The API speaks snake_case with ISO timestamps; the app's domain types are
// camelCase with epoch milliseconds. Everything that differs is translated
// here, so a component never has to know which side a value came from.

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { useDb } from '@/mocks/db';
import { isLiveApi } from '@/shared/lib/live-api';
import { toast } from '@/shared/lib/toast-store';
import { useActor } from '@/features/tickets/hooks/useActor';
import type {
	ActivityKind,
	ActivityStatus,
	BudgetSummary,
	ParticipantKind,
	ParticipantStatus,
	Program,
	ProgramActivity,
	ProgramParticipant,
} from '@/mocks/types';

// -- Wire shapes ------------------------------------------------------------

interface ProgramDto {
	id: string;
	key: string;
	name: string;
	description: string | null;
	client_id: string | null;
	client_name: string | null;
	lead_id: string | null;
	lead_name: string | null;
	status: Program['status'];
	starts_on: string | null;
	ends_on: string | null;
	budget_amount: number | null;
	currency: string;
	archived: boolean;
	activity_count: number;
	upcoming_count: number;
	created_at: string;
}

interface ActivityDto {
	id: string;
	key: string;
	program_id: string;
	program_key: string | null;
	kind: ActivityKind;
	title: string;
	description: string | null;
	status: ActivityStatus;
	starts_at: string | null;
	ends_at: string | null;
	location: string | null;
	meeting_url: string | null;
	facilitator_id: string | null;
	facilitator_name: string | null;
	client_id: string | null;
	client_name: string | null;
	capacity: number | null;
	registered_count: number;
	attended_count: number;
	places_left: number | null;
	full: boolean;
	budget_amount: number | null;
	currency: string | null;
	meta: { transitions: { to: ActivityStatus; name: string }[] };
}

interface ParticipantDto {
	id: string;
	activity_id: string;
	kind: ParticipantKind;
	name: string | null;
	email: string | null;
	user_id: string | null;
	client_contact_id: string | null;
	status: ParticipantStatus;
	registered_at: string;
	checked_in_at: string | null;
	notes: string | null;
}

interface BudgetDto {
	budget_amount: number | null;
	currency: string;
	spent: number;
	pending: number;
	invoiced: number;
	expense_count: number;
	remaining: number | null;
	over_budget: boolean;
	used_pct: number | null;
	margin: number | null;
	by_category?: { category: string; total: number; count: number }[];
}

const ms = (iso: string | null | undefined) => {
	if (!iso) return undefined;
	const value = Date.parse(iso);
	return Number.isNaN(value) ? undefined : value;
};

function toProgram(dto: ProgramDto): Program {
	return {
		id: dto.id,
		key: dto.key,
		name: dto.name,
		description: dto.description ?? '',
		clientId: dto.client_id ?? undefined,
		clientName: dto.client_name ?? undefined,
		leadId: dto.lead_id ?? undefined,
		leadName: dto.lead_name ?? undefined,
		status: dto.status,
		// Calendar days stay strings — see the note on the domain type.
		startsOn: dto.starts_on ?? undefined,
		endsOn: dto.ends_on ?? undefined,
		budgetAmount: dto.budget_amount ?? undefined,
		currency: dto.currency,
		archived: dto.archived,
		activityCount: dto.activity_count,
		upcomingCount: dto.upcoming_count,
		createdAt: ms(dto.created_at) ?? 0,
	};
}

function toActivity(dto: ActivityDto): ProgramActivity {
	return {
		id: dto.id,
		key: dto.key,
		programId: dto.program_id,
		programKey: dto.program_key ?? dto.key.split('-')[0],
		kind: dto.kind,
		title: dto.title,
		description: dto.description ?? '',
		status: dto.status,
		startsAt: ms(dto.starts_at),
		endsAt: ms(dto.ends_at),
		location: dto.location ?? undefined,
		meetingUrl: dto.meeting_url ?? undefined,
		facilitatorId: dto.facilitator_id ?? undefined,
		facilitatorName: dto.facilitator_name ?? undefined,
		clientId: dto.client_id ?? undefined,
		clientName: dto.client_name ?? undefined,
		capacity: dto.capacity ?? undefined,
		registeredCount: dto.registered_count,
		attendedCount: dto.attended_count,
		placesLeft: dto.places_left,
		full: dto.full,
		budgetAmount: dto.budget_amount ?? undefined,
		currency: dto.currency ?? undefined,
		transitions: dto.meta?.transitions ?? [],
	};
}

function toParticipant(dto: ParticipantDto): ProgramParticipant {
	return {
		id: dto.id,
		activityId: dto.activity_id,
		kind: dto.kind,
		name: dto.name ?? 'Unknown',
		email: dto.email ?? undefined,
		userId: dto.user_id ?? undefined,
		clientContactId: dto.client_contact_id ?? undefined,
		status: dto.status,
		registeredAt: ms(dto.registered_at) ?? 0,
		checkedInAt: ms(dto.checked_in_at),
		notes: dto.notes ?? undefined,
	};
}

function toBudget(dto: BudgetDto): BudgetSummary {
	return {
		budgetAmount: dto.budget_amount,
		currency: dto.currency,
		spent: dto.spent,
		pending: dto.pending,
		invoiced: dto.invoiced,
		expenseCount: dto.expense_count,
		remaining: dto.remaining,
		overBudget: dto.over_budget,
		usedPct: dto.used_pct,
		margin: dto.margin,
		byCategory: (dto.by_category ?? []) as BudgetSummary['byCategory'],
	};
}

// -- Reads ------------------------------------------------------------------

export const programKeys = {
	all: ['programs'] as const,
	list: (org: string, archived: boolean) => ['programs', 'list', org, archived] as const,
	detail: (org: string, key: string) => ['programs', 'detail', org, key] as const,
	budget: (org: string, key: string) => ['programs', 'budget', org, key] as const,
	activities: (org: string, programKey?: string) => ['programs', 'activities', org, programKey ?? 'all'] as const,
	activity: (org: string, key: string) => ['programs', 'activity', org, key] as const,
	participants: (org: string, key: string) => ['programs', 'participants', org, key] as const,
};

export function useProgramList(org: string, includeArchived = false) {
	const live = isLiveApi();
	const mock = useDb((s) => s.programs);

	const query = useQuery({
		queryKey: programKeys.list(org, includeArchived),
		queryFn: async ({ signal }) => {
			const page = await api.get<{ data: ProgramDto[] }>(`/orgs/${org}/programs`, {
				query: includeArchived ? { archived: true } : {},
				signal,
			});
			return page.data.map(toProgram);
		},
		enabled: live && Boolean(org),
		staleTime: 30_000,
	});

	const mockVisible = useMemo(
		() => (includeArchived ? mock : mock.filter((p) => !p.archived)),
		[mock, includeArchived],
	);

	if (!live) return { programs: mockVisible, loading: false };
	return { programs: query.data ?? [], loading: query.isPending };
}

export function useProgram(org: string, key: string | undefined) {
	const live = isLiveApi();
	const mock = useDb((s) => s.programs.find((p) => p.key === key));

	const query = useQuery({
		queryKey: programKeys.detail(org, key ?? ''),
		queryFn: async ({ signal }) => toProgram(await api.get<ProgramDto>(`/orgs/${org}/programs/${key}`, { signal })),
		enabled: live && Boolean(org && key),
	});

	if (!live) return { program: mock, loading: false };
	return { program: query.data, loading: query.isPending };
}

export function useActivities(org: string, programKey?: string) {
	const live = isLiveApi();
	const mockAll = useDb((s) => s.activities);

	const query = useQuery({
		queryKey: programKeys.activities(org, programKey),
		queryFn: async ({ signal }) => {
			const page = await api.get<{ data: ActivityDto[] }>(`/orgs/${org}/activities`, {
				query: programKey ? { program: programKey } : {},
				signal,
			});
			return page.data.map(toActivity);
		},
		enabled: live && Boolean(org),
		staleTime: 15_000,
	});

	const mock = useMemo(
		() => (programKey ? mockAll.filter((a) => a.programKey === programKey) : mockAll),
		[mockAll, programKey],
	);

	if (!live) return { activities: mock, loading: false };
	return { activities: query.data ?? [], loading: query.isPending };
}

export function useActivity(org: string, key: string | undefined) {
	const live = isLiveApi();
	const mock = useDb((s) => s.activities.find((a) => a.key === key));

	const query = useQuery({
		queryKey: programKeys.activity(org, key ?? ''),
		queryFn: async ({ signal }) => toActivity(await api.get<ActivityDto>(`/orgs/${org}/activities/${key}`, { signal })),
		enabled: live && Boolean(org && key),
	});

	if (!live) return { activity: mock, loading: false };
	return { activity: query.data, loading: query.isPending };
}

export function useParticipants(org: string, activityKey: string | undefined, activityId?: string) {
	const live = isLiveApi();
	const mock = useDb((s) => s.participants.filter((p) => p.activityId === activityId));

	const query = useQuery({
		queryKey: programKeys.participants(org, activityKey ?? ''),
		queryFn: async ({ signal }) => {
			const page = await api.get<{ data: ParticipantDto[] }>(
				`/orgs/${org}/activities/${activityKey}/participants`,
				{ signal },
			);
			return page.data.map(toParticipant);
		},
		enabled: live && Boolean(org && activityKey),
	});

	if (!live) return { participants: mock, loading: false };
	return { participants: query.data ?? [], loading: query.isPending };
}

/**
 * Planned versus actual.
 *
 * In mock mode this is computed from the local expense list using the same rule
 * the server applies — only approved and paid count — so the two agree.
 */
export function useProgramBudget(org: string, programKey: string | undefined) {
	const live = isLiveApi();
	const program = useDb((s) => s.programs.find((p) => p.key === programKey));
	const expenses = useDb((s) => s.expenses);

	const query = useQuery({
		queryKey: programKeys.budget(org, programKey ?? ''),
		queryFn: async ({ signal }) =>
			toBudget(await api.get<BudgetDto>(`/orgs/${org}/programs/${programKey}/budget`, { signal })),
		enabled: live && Boolean(org && programKey),
		staleTime: 15_000,
	});

	const mockBudget = useMemo<BudgetSummary | undefined>(() => {
		if (live || !program) return undefined;

		const mine = expenses.filter((e) => e.programKey === program.key);
		const spent = mine.filter((e) => e.countsAsSpent).reduce((sum, e) => sum + e.amount, 0);
		const pending = mine.filter((e) => e.status === 'submitted').reduce((sum, e) => sum + e.amount, 0);
		const budget = program.budgetAmount ?? null;

		const byCategory = Object.entries(
			mine
				.filter((e) => e.countsAsSpent)
				.reduce<Record<string, { total: number; count: number }>>((acc, e) => {
					acc[e.category] = { total: (acc[e.category]?.total ?? 0) + e.amount, count: (acc[e.category]?.count ?? 0) + 1 };
					return acc;
				}, {}),
		)
			.map(([category, v]) => ({ category, total: v.total, count: v.count }))
			.sort((a, b) => b.total - a.total);

		return {
			budgetAmount: budget,
			currency: program.currency,
			spent,
			pending,
			invoiced: 0,
			expenseCount: mine.length,
			remaining: budget === null ? null : budget - spent,
			overBudget: budget !== null && spent > budget,
			usedPct: budget === null || budget === 0 ? null : Math.round((spent / budget) * 100),
			margin: null,
			byCategory: byCategory as BudgetSummary['byCategory'],
		};
	}, [live, program, expenses]);

	if (!live) return { budget: mockBudget, loading: false };
	return { budget: query.data, loading: query.isPending };
}

// -- Writes -----------------------------------------------------------------

export interface ProgramActions {
	createProgram: (input: {
		key: string;
		name: string;
		description?: string;
		currency: string;
		budgetAmount?: number;
		startsOn?: string;
		endsOn?: string;
		leadId?: string;
		clientId?: string;
	}) => Promise<string | null>;
	updateProgram: (key: string, patch: Record<string, unknown>) => Promise<void>;
	setArchived: (key: string, archived: boolean) => Promise<void>;
	deleteProgram: (key: string) => Promise<void>;
	createActivity: (
		programKey: string,
		input: {
			kind: ActivityKind;
			title: string;
			description?: string;
			startsAt?: number;
			endsAt?: number;
			location?: string;
			capacity?: number;
			facilitatorId?: string;
			budgetAmount?: number;
		},
	) => Promise<string | null>;
	transitionActivity: (key: string, to: ActivityStatus) => Promise<boolean>;
	deleteActivity: (key: string) => Promise<void>;
	addParticipant: (
		activityKey: string,
		activityId: string,
		input: { kind: ParticipantKind; name?: string; email?: string; userId?: string; clientContactId?: string },
	) => Promise<boolean>;
	setParticipantStatus: (id: string, status: ParticipantStatus) => Promise<void>;
	removeParticipant: (id: string) => Promise<void>;
}

export function useProgramActions(org: string): ProgramActions {
	const live = isLiveApi();
	const db = useDb();
	const actor = useActor();
	const queryClient = useQueryClient();

	const refresh = () => queryClient.invalidateQueries({ queryKey: programKeys.all });

	const report = (err: unknown, fallback: string) => {
		if (err instanceof ApiError) {
			// The server's message is written for a person to read.
			toast(err.message || fallback, { tone: 'danger' });
			return;
		}
		toast(fallback, { tone: 'danger' });
	};

	if (!live) {
		return {
			async createProgram(input) {
				return db.createProgram({ ...input, description: input.description ?? '' }, actor).key;
			},
			async updateProgram(key, patch) {
				db.updateProgram(key, patch as never);
			},
			async setArchived(key, archived) {
				db.archiveProgram(key, archived);
			},
			async deleteProgram(key) {
				db.deleteProgram(key);
			},
			async createActivity(programKey, input) {
				return db.createActivity(programKey, { ...input, description: input.description ?? '' }).key;
			},
			async transitionActivity(key, to) {
				const ok = db.transitionActivity(key, to);
				if (!ok) toast('That is not a valid move from here.', { tone: 'danger' });
				return ok;
			},
			async deleteActivity(key) {
				db.deleteActivity(key);
			},
			async addParticipant(_activityKey, activityId, input) {
				db.addParticipant(activityId, {
					kind: input.kind,
					name: input.name ?? 'Attendee',
					email: input.email,
					userId: input.userId,
					clientContactId: input.clientContactId,
				});
				return true;
			},
			async setParticipantStatus(id, status) {
				db.setParticipantStatus(id, status);
			},
			async removeParticipant(id) {
				db.removeParticipant(id);
			},
		};
	}

	return {
		async createProgram(input) {
			try {
				const created = await api.post<ProgramDto>(`/orgs/${org}/programs`, {
					json: {
						key: input.key.toUpperCase(),
						name: input.name,
						description: input.description,
						currency: input.currency,
						budget_amount: input.budgetAmount,
						starts_on: input.startsOn,
						ends_on: input.endsOn,
						lead_id: input.leadId,
						client_id: input.clientId,
					},
					idempotencyKey: crypto.randomUUID(),
				});
				await refresh();
				return created.key;
			} catch (err) {
				report(err, 'Could not create that programme.');
				return null;
			}
		},

		async updateProgram(key, patch) {
			try {
				await api.patch(`/orgs/${org}/programs/${key}`, { json: patch });
				await refresh();
			} catch (err) {
				report(err, 'Could not save that programme.');
			}
		},

		async setArchived(key, archived) {
			try {
				await api.patch(`/orgs/${org}/programs/${key}`, { json: { archived } });
				await refresh();
			} catch (err) {
				report(err, 'Could not archive that programme.');
			}
		},

		async deleteProgram(key) {
			try {
				await api.del(`/orgs/${org}/programs/${key}`);
				await refresh();
			} catch (err) {
				report(err, 'Could not delete that programme.');
			}
		},

		async createActivity(programKey, input) {
			try {
				const created = await api.post<ActivityDto>(`/orgs/${org}/programs/${programKey}/activities`, {
					json: {
						kind: input.kind,
						title: input.title,
						description: input.description,
						starts_at: input.startsAt ? new Date(input.startsAt).toISOString() : undefined,
						ends_at: input.endsAt ? new Date(input.endsAt).toISOString() : undefined,
						location: input.location,
						capacity: input.capacity,
						facilitator_id: input.facilitatorId,
						budget_amount: input.budgetAmount,
					},
					idempotencyKey: crypto.randomUUID(),
				});
				await refresh();
				return created.key;
			} catch (err) {
				report(err, 'Could not schedule that.');
				return null;
			}
		},

		async transitionActivity(key, to) {
			try {
				await api.post(`/orgs/${org}/activities/${key}/status`, { json: { status: to } });
				await refresh();
				return true;
			} catch (err) {
				report(err, 'Could not move that activity.');
				return false;
			}
		},

		async deleteActivity(key) {
			try {
				await api.del(`/orgs/${org}/activities/${key}`);
				await refresh();
			} catch (err) {
				report(err, 'Could not delete that activity.');
			}
		},

		async addParticipant(activityKey, _activityId, input) {
			try {
				await api.post(`/orgs/${org}/activities/${activityKey}/participants`, {
					json: {
						user_id: input.userId,
						client_contact_id: input.clientContactId,
						external_name: input.kind === 'external' ? input.name : undefined,
						external_email: input.kind === 'external' ? input.email : undefined,
					},
				});
				await refresh();
				return true;
			} catch (err) {
				report(err, 'Could not add that attendee.');
				return false;
			}
		},

		async setParticipantStatus(id, status) {
			try {
				await api.post(`/orgs/${org}/participants/${id}/status`, { json: { status } });
				await refresh();
			} catch (err) {
				report(err, 'Could not update that attendee.');
			}
		},

		async removeParticipant(id) {
			try {
				await api.del(`/orgs/${org}/participants/${id}`);
				await refresh();
			} catch (err) {
				report(err, 'Could not remove that attendee.');
			}
		},
	};
}
