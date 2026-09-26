import type { TeamMember, Ticket, TicketType } from '@/mocks/types';

/** Default effort when an issue has neither an estimate nor story points. */
const defaultEstimateMin: Record<TicketType, number> = { task: 240, bug: 180, story: 480, epic: 0, subtask: 120, support: 120 };

/** Remaining effort for an open issue, in hours. One story point is half a focus day. */
export function loadHours(t: Ticket) {
	if (t.type === 'epic') return 0;
	const estimate = t.timeEstimateMin ?? (t.storyPoints ? t.storyPoints * 240 : defaultEstimateMin[t.type]);
	return Math.max(estimate - t.timeLoggedMin, 30) / 60;
}

/** Working days a member has in the period, honouring six-day rosters. */
export function memberDays(m: TeamMember | undefined, workingDays: number, weeks: number) {
	const perWeek = m?.capacity?.days === 'Mon–Sat' ? Math.max(workingDays, 6) : workingDays;
	return Math.round(perWeek * weeks);
}

export const fmtHours = (h: number) => (h >= 10 ? `${Math.round(h)}h` : `${Math.round(h * 2) / 2}h`);

export function utilisationTone(pct: number) {
	if (pct > 100) return { bar: '#d93f3f', text: 'text-danger-fg', bg: 'bg-danger-bg', label: 'Over capacity' } as const;
	if (pct >= 80) return { bar: '#e0a100', text: 'text-warning-fg', bg: 'bg-warning-bg', label: 'Near capacity' } as const;
	return { bar: '#22a05b', text: 'text-success-fg', bg: 'bg-success-bg', label: 'Available' } as const;
}
