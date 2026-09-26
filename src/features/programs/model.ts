import { z } from 'zod';
import type { ActivityKind, ActivityStatus, ExpenseStatus, ProgramStatus } from '@/mocks/types';
import type { PillTone } from '@/shared/ui';

export const programsSearchSchema = z.object({
	tab: z.enum(['active', 'all', 'archived']).default('active'),
	q: z.string().optional(),
});
export type ProgramsSearch = z.infer<typeof programsSearchSchema>;

export const programDetailSearchSchema = z.object({
	tab: z.enum(['overview', 'activities', 'budget']).default('overview'),
	activity: z.string().optional(),
});
export type ProgramDetailSearch = z.infer<typeof programDetailSearchSchema>;

export const kindLabels: Record<ActivityKind, string> = {
	training: 'Training',
	event: 'Event',
	workshop: 'Workshop',
	meeting: 'Meeting',
	other: 'Other',
};

export const activityStatusLabels: Record<ActivityStatus, string> = {
	planned: 'Planned',
	confirmed: 'Confirmed',
	in_progress: 'In progress',
	completed: 'Completed',
	cancelled: 'Cancelled',
};

export const programStatusLabels: Record<ProgramStatus, string> = {
	planned: 'Planned',
	active: 'Active',
	completed: 'Completed',
	cancelled: 'Cancelled',
};

export const expenseStatusLabels: Record<ExpenseStatus, string> = {
	draft: 'Draft',
	submitted: 'Awaiting approval',
	approved: 'Approved',
	rejected: 'Rejected',
	paid: 'Paid',
};

/** Maps a status onto the shared Pill tones the rest of the app already uses. */
export const activityTone: Record<ActivityStatus, PillTone> = {
	planned: 'new',
	confirmed: 'teal',
	in_progress: 'progress',
	completed: 'done',
	cancelled: 'closed',
};

export const expenseTone: Record<ExpenseStatus, PillTone> = {
	draft: 'new',
	submitted: 'pending',
	approved: 'done',
	rejected: 'blocked',
	paid: 'closed',
};

export const programTone: Record<ProgramStatus, PillTone> = {
	planned: 'new',
	active: 'progress',
	completed: 'done',
	cancelled: 'closed',
};

/**
 * Money arrives in minor units — kobo. Formatted whole, because a training
 * budget in naira is never a decimal anybody cares about.
 */
export function formatMoney(minorUnits: number | null | undefined, currency = 'NGN'): string {
	if (minorUnits === null || minorUnits === undefined) return '—';
	const major = minorUnits / 100;
	const symbol = currency === 'NGN' ? '₦' : `${currency} `;
	return symbol + major.toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

export const EXPENSE_CATEGORIES = [
	'venue',
	'materials',
	'catering',
	'transport',
	'facilitator_fee',
	'marketing',
	'equipment',
	'other',
] as const;

export const categoryLabels: Record<string, string> = {
	venue: 'Venue',
	materials: 'Materials',
	catering: 'Catering',
	transport: 'Transport',
	facilitator_fee: 'Facilitator fee',
	marketing: 'Marketing',
	equipment: 'Equipment',
	other: 'Other',
};
