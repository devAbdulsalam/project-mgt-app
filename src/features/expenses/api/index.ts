// Expenses, from whichever source is active.

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { useDb } from '@/mocks/db';
import { isLiveApi } from '@/shared/lib/live-api';
import { toast } from '@/shared/lib/toast-store';
import { useActor } from '@/features/tickets/hooks/useActor';
import { useAuthStore } from '@/shared/lib/auth-store';
import type { Expense, ExpenseCategory, ExpenseStatus } from '@/mocks/types';
import { programKeys } from '@/features/programs/api';

interface ExpenseDto {
	id: string;
	program_key: string | null;
	program_name: string | null;
	activity_key: string | null;
	activity_title: string | null;
	category: ExpenseCategory;
	description: string | null;
	amount: number;
	currency: string;
	incurred_on: string;
	status: ExpenseStatus;
	counts_as_spent: boolean;
	submitted_by: string | null;
	submitted_by_name: string | null;
	decided_by_name: string | null;
	decided_at: string | null;
	rejection_reason: string | null;
	notes: string | null;
	receipt_count: number;
	created_at: string;
}

interface TotalsDto {
	draft: number;
	submitted: number;
	approved: number;
	paid: number;
	rejected: number;
	awaiting_count: number;
}

const ms = (iso: string | null) => {
	if (!iso) return undefined;
	const v = Date.parse(iso);
	return Number.isNaN(v) ? undefined : v;
};

function toExpense(dto: ExpenseDto): Expense {
	return {
		id: dto.id,
		programKey: dto.program_key ?? undefined,
		programName: dto.program_name ?? undefined,
		activityKey: dto.activity_key ?? undefined,
		activityTitle: dto.activity_title ?? undefined,
		category: dto.category,
		description: dto.description ?? '',
		amount: dto.amount,
		currency: dto.currency,
		// A calendar day stays a string: it has no time and no zone.
		incurredOn: dto.incurred_on,
		status: dto.status,
		countsAsSpent: dto.counts_as_spent,
		submittedById: dto.submitted_by ?? undefined,
		submittedByName: dto.submitted_by_name ?? undefined,
		decidedByName: dto.decided_by_name ?? undefined,
		decidedAt: ms(dto.decided_at),
		rejectionReason: dto.rejection_reason ?? undefined,
		notes: dto.notes ?? undefined,
		receiptCount: dto.receipt_count,
		createdAt: ms(dto.created_at) ?? 0,
	};
}

export interface ExpenseFilters {
	program?: string;
	status?: ExpenseStatus;
	category?: ExpenseCategory;
	mine?: boolean;
}

export interface ExpenseTotals {
	draft: number;
	submitted: number;
	approved: number;
	paid: number;
	rejected: number;
	awaitingCount: number;
}

export function useExpenseList(org: string, filters: ExpenseFilters) {
	const live = isLiveApi();
	const mockAll = useDb((s) => s.expenses);
	const actor = useActor();

	const query = useQuery({
		queryKey: ['expenses', 'list', org, filters],
		queryFn: async ({ signal }) => {
			const page = await api.get<{ data: ExpenseDto[]; totals: TotalsDto }>(`/orgs/${org}/expenses`, {
				query: {
					program: filters.program,
					status: filters.status,
					category: filters.category,
					mine: filters.mine ? true : undefined,
				},
				signal,
			});
			return {
				items: page.data.map(toExpense),
				totals: {
					draft: page.totals.draft,
					submitted: page.totals.submitted,
					approved: page.totals.approved,
					paid: page.totals.paid,
					rejected: page.totals.rejected,
					awaitingCount: page.totals.awaiting_count,
				} satisfies ExpenseTotals,
			};
		},
		enabled: live && Boolean(org),
		staleTime: 15_000,
	});

	// The mock path applies the same filters locally, so the two agree.
	const mock = useMemo(() => {
		const items = mockAll.filter((e) => {
			if (filters.program && e.programKey !== filters.program) return false;
			if (filters.status && e.status !== filters.status) return false;
			if (filters.category && e.category !== filters.category) return false;
			if (filters.mine && e.submittedById !== actor.id) return false;
			return true;
		});

		const sum = (status: ExpenseStatus) =>
			mockAll
				.filter((e) => (filters.program ? e.programKey === filters.program : true) && e.status === status)
				.reduce((total, e) => total + e.amount, 0);

		return {
			items,
			totals: {
				draft: sum('draft'),
				submitted: sum('submitted'),
				approved: sum('approved'),
				paid: sum('paid'),
				rejected: sum('rejected'),
				awaitingCount: mockAll.filter((e) => e.status === 'submitted').length,
			} satisfies ExpenseTotals,
		};
	}, [mockAll, filters, actor.id]);

	if (!live) return { expenses: mock.items, totals: mock.totals, loading: false };
	return { expenses: query.data?.items ?? [], totals: query.data?.totals, loading: query.isPending };
}

export interface ExpenseActions {
	create: (input: {
		programKey?: string;
		activityKey?: string;
		category: ExpenseCategory;
		description: string;
		amount: number;
		incurredOn: string;
		notes?: string;
		submit?: boolean;
	}) => Promise<boolean>;
	setStatus: (id: string, status: ExpenseStatus, rejectionReason?: string) => Promise<boolean>;
	remove: (id: string) => Promise<void>;
}

export function useExpenseActions(org: string): ExpenseActions {
	const live = isLiveApi();
	const db = useDb();
	const actor = useActor();
	const queryClient = useQueryClient();

	const refresh = async () => {
		await queryClient.invalidateQueries({ queryKey: ['expenses'] });
		// A decision changes a budget, so the programme views have to reread too.
		await queryClient.invalidateQueries({ queryKey: programKeys.all });
	};

	const report = (err: unknown, fallback: string) =>
		toast(err instanceof ApiError ? err.message || fallback : fallback, { tone: 'danger' });

	if (!live) {
		return {
			async create(input) {
				db.createExpense(input, actor);
				return true;
			},
			async setStatus(id, status, rejectionReason) {
				db.setExpenseStatus(id, status, rejectionReason);
				return true;
			},
			async remove(id) {
				db.deleteExpense(id);
			},
		};
	}

	return {
		async create(input) {
			try {
				await api.post(`/orgs/${org}/expenses`, {
					json: {
						program_key: input.programKey,
						activity_key: input.activityKey,
						category: input.category,
						description: input.description,
						amount: input.amount,
						incurred_on: input.incurredOn,
						notes: input.notes,
						submit: input.submit ?? false,
					},
					idempotencyKey: crypto.randomUUID(),
				});
				await refresh();
				return true;
			} catch (err) {
				report(err, 'Could not log that expense.');
				return false;
			}
		},

		async setStatus(id, status, rejectionReason) {
			try {
				await api.post(`/orgs/${org}/expenses/${id}/status`, {
					json: { status, rejection_reason: rejectionReason },
				});
				await refresh();
				return true;
			} catch (err) {
				report(err, 'Could not update that expense.');
				return false;
			}
		},

		async remove(id) {
			try {
				await api.del(`/orgs/${org}/expenses/${id}`);
				await refresh();
			} catch (err) {
				report(err, 'Could not delete that expense.');
			}
		},
	};
}

/** Whether the signed-in person may approve. Drives what the list offers. */
export function useCanApprove(): boolean {
	const permissions = useAuthStore((s) => s.permissions);
	// In mock mode there is no permission list, so the demo shows the full flow.
	return !isLiveApi() || (permissions?.includes('expense.approve') ?? false);
}
