import { z } from 'zod';

export const reportsSearchSchema = z.object({
	report: z.enum(['service', 'projects']).default('service'),
	range: z.enum(['30d', '90d', 'quarter']).default('30d'),
	client: z.string().optional(),
	region: z.string().optional(),
	compare: z.boolean().optional(),
});
export type ReportsSearch = z.infer<typeof reportsSearchSchema>;
export const rangeLabel = { '30d': 'Aug 11 – Sep 10, 2026', '90d': 'Jun 12 – Sep 10, 2026', quarter: 'Q3 2026 (Jul 1 – Sep 10)' } as const;
/** The same three labels, computed from today's date rather than the demo's fixed one. */
export function liveRangeLabel(now: number): Record<ReportsSearch['range'], string> {
	const fmt = (ms: number, withYear = false) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) }).format(ms);
	const d = new Date(now);
	const quarter = Math.floor(d.getMonth() / 3);
	const quarterStart = new Date(d.getFullYear(), quarter * 3, 1).getTime();
	return {
		'30d': `${fmt(now - 29 * 86_400_000)} – ${fmt(now, true)}`,
		'90d': `${fmt(now - 89 * 86_400_000)} – ${fmt(now, true)}`,
		quarter: `Q${quarter + 1} ${d.getFullYear()} (${fmt(quarterStart)} – ${fmt(now)})`,
	};
}
export const rangeShort = { '30d': 'last 30 days', '90d': 'last 90 days', quarter: 'this quarter' } as const;

function rng(seed: number) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

export interface ServiceReport {
	kpis: { label: string; value: string; sub: string; tone?: 'good' | 'bad' | 'muted' }[];
	/** A null is a period in which nothing of that priority was resolved, drawn as a gap. */
	resolution: { day: string; p1: number | null; p2: number | null; p3: number | null; monthEnd?: boolean }[];
	heat: number[][]; // 6 rows (Mon–Sat) × 12 cols (7..18), each 0–1
	/** Tickets in the busiest cell, to turn a 0–1 value back into a count. The mock's scale is 40. */
	heatMax?: number;
	utilisation: { id: string; name: string; billable: number; travel: number; idle: number; note?: string }[];
	categories: { name: string; count: number; avg: string }[];
	csat: { client: string; score: number; count: number }[];
	insight: string;
	/** Live only: the window the figures cover. */
	window?: { start: number; end: number };
}

export function serviceReport(range: ReportsSearch['range'], scale = 1): ServiceReport {
	const days = range === '30d' ? 30 : range === '90d' ? 90 : 72;
	const rand = rng(range === '30d' ? 7 : range === '90d' ? 13 : 21);
	const step = days > 40 ? 3 : 1;
	const resolution: ServiceReport['resolution'] = [];
	for (let i = days; i >= 0; i -= step) {
		const d = new Date(Date.now() - i * 86_400_000);
		const monthEnd = d.getDate() >= 29 || d.getDate() <= 1;
		resolution.push({ day: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), p1: +(1.2 + rand() * 0.9 + (monthEnd ? 0.8 : 0)).toFixed(1), p2: +(2.6 + rand() * 1.4 + (monthEnd ? 1.6 : 0)).toFixed(1), p3: +(9 + rand() * 4 + (monthEnd ? 5 : 0)).toFixed(1), monthEnd });
	}
	const heat = Array.from({ length: 6 }, (_, r) => Array.from({ length: 12 }, (_, c) => { const hour = 7 + c; const base = hour >= 9 && hour <= 11 ? 0.8 : hour >= 14 && hour <= 16 ? 0.55 : 0.25; const dayF = r === 5 ? 0.35 : r >= 3 ? 0.75 : 1; return Math.round(Math.min(1, base * dayF + rand() * 0.25) * 100) / 100; }));
	const f = range === '30d' ? 1 : range === '90d' ? 2.9 : 2.3;
	return {
		kpis: [
			{ label: 'Tickets resolved', value: Math.round(1148 * f * scale).toLocaleString(), sub: '+6% vs prev', tone: 'good' },
			{ label: 'Median first response', value: range === '30d' ? '22 min' : '25 min', sub: '−9 min', tone: 'good' },
			{ label: 'Median resolution', value: range === '30d' ? '5h 40m' : '6h 10m', sub: '+35 min', tone: 'bad' },
			{ label: 'SLA met', value: range === '30d' ? '91.6%' : '90.4%', sub: 'Target 92%', tone: 'muted' },
			{ label: 'CSAT', value: '4.6', sub: `${Math.round(512 * f)} responses · 44%`, tone: 'muted' },
			{ label: 'Billable hours', value: `${Math.round(1212 * f).toLocaleString()}h`, sub: '₦4.8M overage', tone: 'muted' },
		],
		resolution,
		heat,
		utilisation: [
			{ id: 'u_chinedu', name: 'Chinedu Eze', billable: 62, travel: 22, idle: 16 },
			{ id: 'u_amina', name: 'Amina Yusuf', billable: 55, travel: 24, idle: 21 },
			{ id: 'u_emeka', name: 'Emeka Nwosu', billable: 88, travel: 3, idle: 9 },
			{ id: 'u_funke', name: 'Funke Adeyemi', billable: 86, travel: 2, idle: 12 },
			{ id: 'u_ibrahim', name: 'Ibrahim Musa', billable: 38, travel: 23, idle: 39, note: '23% travel — PH ↔ Lagos trips' },
		],
		categories: [
			{ name: 'Network · ISP / connectivity', count: Math.round(214 * f), avg: '3h 10m' }, { name: 'Power · UPS / generator changeover', count: Math.round(168 * f), avg: '2h 45m' }, { name: 'Microsoft 365 · mail / licences', count: Math.round(141 * f), avg: '5h 20m' }, { name: 'Endpoint · laptops / printers', count: Math.round(133 * f), avg: '1d 2h' }, { name: 'Software · custom apps (L2)', count: Math.round(97 * f), avg: '2d 4h' }, { name: 'Security · malware / phishing', count: Math.round(41 * f), avg: '6h 05m' }, { name: 'POS / payments', count: Math.round(38 * f), avg: '2h 30m' },
		],
		csat: [
			{ client: 'Lekki Fintech Ltd', score: 4.8, count: 22 }, { client: 'Port Harcourt Logistics', score: 4.7, count: 14 }, { client: 'Surulere MFB', score: 4.7, count: 9 }, { client: 'Abuja Health Cooperative', score: 4.3, count: 18 }, { client: 'Ibadan University Press', score: 4.2, count: 7 }, { client: 'Kano Textiles Plc', score: 3.4, count: 11 },
		],
		insight: 'Peak 09:00–11:00 Mon–Wed. Consider a second helpdesk agent 08:30–12:00.',
	};
}

export interface ProjectsReport {
	kpis: { label: string; value: string; sub: string; tone?: 'good' | 'bad' | 'muted' }[];
	velocity: { sprint: string; committed: number; completed: number }[];
	cycle: { week: string; days: number }[];
	epics: { name: string; done: number; total: number; due: string }[];
}

export function projectsReport(range: ReportsSearch['range']): ProjectsReport {
	const n = range === '30d' ? 4 : 6;
	const velocity = [['Sprint 19', 28, 24], ['Sprint 20', 30, 27], ['Sprint 21', 32, 26], ['Sprint 22', 30, 30], ['Sprint 23', 30, 26], ['Sprint 24', 32, 18]].slice(-n).map(([s, c, d]) => ({ sprint: s as string, committed: c as number, completed: d as number }));
	const cycle = Array.from({ length: range === '30d' ? 5 : 12 }, (_, i) => ({ week: `W${36 - (range === '30d' ? 4 : 11) + i}`, days: +(3.9 - i * 0.05 + (i % 3) * 0.3).toFixed(1) }));
	return {
		kpis: [
			{ label: 'Issues completed', value: String(velocity.reduce((s, v) => s + v.completed, 0) * 3), sub: '+11% vs prev', tone: 'good' },
			{ label: 'Avg velocity', value: `${Math.round(velocity.reduce((s, v) => s + v.completed, 0) / velocity.length)} pts`, sub: `${velocity.length} sprints`, tone: 'muted' },
			{ label: 'Cycle time', value: '3.4d', sub: '−0.6d vs 30-day avg', tone: 'good' },
			{ label: 'Carry-over', value: '14%', sub: '2 issues last sprint', tone: 'bad' },
			{ label: 'Bugs opened', value: '23', sub: '9 P1/P2', tone: 'muted' },
			{ label: 'Epic on-time', value: '3 / 5', sub: 'Reconciliation at risk', tone: 'bad' },
		],
		velocity,
		cycle,
		epics: [{ name: 'Client portal v2', done: 24, total: 39, due: '30 Sep' }, { name: 'Bank API integration', done: 17, total: 20, due: '19 Sep' }, { name: 'Reconciliation module', done: 2, total: 18, due: '31 Oct' }, { name: 'USSD channel', done: 0, total: 26, due: '28 Nov' }, { name: 'Offline-first sync', done: 9, total: 14, due: '10 Oct' }],
	};
}
