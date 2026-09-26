import { z } from 'zod';
import { totalClients, channelShare as share7d, kpis as kpis7d, slaSummary as sla7d, ticketsByChannel as series7d, topClients as clients7d, type Channel, type Kpi } from '@/mocks/data';
import { clientById, slaAtRisk, slaRunning } from '@/mocks/db';
import { statusCategory } from '@/mocks/seed';
import type { Ticket } from '@/mocks/types';

export const ranges = ['today', '7d', '30d', '90d'] as const;
export type Range = (typeof ranges)[number];
export const rangeLabels: Record<Range, string> = { today: 'Today', '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days' };

export const dashboardSearchSchema = z.object({
	welcome: z.coerce.number().optional(),
	range: z.enum(ranges).default('7d'),
	panel: z.string().optional(),
	tour: z.enum(['choice', 'video', 'interactive']).optional(),
});
export type DashboardSearch = z.infer<typeof dashboardSearchSchema>;

export type SeriesPoint = { day: string } & Record<Channel, number>;

/** Deterministic pseudo-random so a range always shows the same numbers. */
function rng(seed: number) {
	let s = seed;
	return () => {
		s = (s * 16807) % 2147483647;
		return s / 2147483647;
	};
}

function generateSeries(range: Range, now: number): SeriesPoint[] {
	if (range === '7d') return series7d;
	const rand = rng(range === 'today' ? 11 : range === '30d' ? 31 : 91);
	const out: SeriesPoint[] = [];
	if (range === 'today') {
		for (let h = 8; h <= 17; h++) {
			const base = h < 10 || h > 15 ? 3 : 7;
			out.push({ day: `${h.toString().padStart(2, '0')}:00`, whatsapp: Math.round(base * (0.8 + rand() * 0.6)), email: Math.round(base * 0.45 * (0.7 + rand() * 0.6)), phone: Math.round(base * 0.2 * (0.5 + rand())), portal: Math.round(rand() * 2) });
		}
		return out;
	}
	const days = range === '30d' ? 30 : 90;
	const step = range === '30d' ? 1 : 7;
	for (let i = days; i > 0; i -= step) {
		const d = new Date(now - i * 86_400_000);
		const weekend = d.getDay() === 0 || d.getDay() === 6;
		const monthEnd = d.getDate() >= 25;
		const scale = (step === 7 ? 5.2 : 1) * (weekend && step === 1 ? 0.35 : 1) * (monthEnd ? 1.3 : 1);
		out.push({
			day: step === 7 ? `w/c ${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}` : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }),
			whatsapp: Math.round(scale * (26 + rand() * 12)),
			email: Math.round(scale * (11 + rand() * 6)),
			phone: Math.round(scale * (5 + rand() * 4)),
			portal: Math.round(scale * (2 + rand() * 3)),
		});
	}
	return out;
}

export interface SlaSummary {
	/** Null when no SLA-bound ticket fell in the window, rather than a made-up figure. */
	metPct: number | null;
	breakdown: { key: string; label: string; pct: number; color: string }[];
	byPriority: { label: string; pct: number | null }[];
}

export interface DashboardData {
	kpis: Kpi[];
	series: SeriesPoint[];
	share: { channel: Channel; pct: number }[];
	sla: SlaSummary;
	clients: { id: string; name: string; industry: string; tier: string; openTickets: number; healthPct: number | null }[];
	/** How many clients exist, for the "View all" link. */
	clientTotal: number;
	needsAttention: Ticket[];
	/** Client names by ticket key. Live tickets carry only a client id, and clients are not in the mock store. */
	clientNames: Record<string, string>;
	/** Live only: per-person open work. In mock mode the engineer card derives its own rows from the store. */
	workload?: { id: string; name: string; openCount: number; points: number }[];
	note: string;
}

export function getDashboardData(range: Range, tickets: Ticket[], now: number): DashboardData {
	const series = generateSeries(range, now);
	const totals = series.reduce((acc, p) => { acc.whatsapp += p.whatsapp; acc.email += p.email; acc.phone += p.phone; acc.portal += p.portal; return acc; }, { whatsapp: 0, email: 0, phone: 0, portal: 0 });
	const total = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
	const share = range === '7d' ? share7d : (Object.keys(totals) as Channel[]).map((channel) => ({ channel, pct: Math.round((totals[channel] / total) * 100) }));

	const open = tickets.filter((t) => statusCategory[t.status] !== 'done');
	const factor = { today: 0.2, '7d': 1, '30d': 4.1, '90d': 12.4 }[range];
	const kpis: Kpi[] =
		range === '7d'
			? kpis7d
			: [
					{ ...kpis7d[0]!, value: String(164 + (open.length - 27)), trend: { direction: range === 'today' ? 'up' : 'down', label: range === 'today' ? '+3 since 08:00' : range === '30d' ? '-4% vs previous 30 days' : '-11% vs previous quarter', good: range !== 'today' } },
					{ ...kpis7d[1]!, value: range === 'today' ? '19 min' : range === '30d' ? '27 min' : '31 min', trend: { direction: 'down', label: range === 'today' ? '-5 min vs yesterday' : range === '30d' ? '-6 min vs previous 30 days' : '-9 min vs previous quarter', good: true } },
					{ ...kpis7d[2]!, value: range === 'today' ? '94.1%' : range === '30d' ? '90.8%' : '89.9%', trend: { direction: range === 'today' ? 'up' : 'down', label: range === 'today' ? '+2.5% vs yesterday' : range === '30d' ? '-0.8% vs previous 30 days' : '-1.2% vs previous quarter', good: range === 'today' } },
					{ ...kpis7d[3]!, value: range === 'today' ? '4.8' : range === '30d' ? '4.6' : '4.5', note: `${Math.round(128 * factor)} ratings` },
				];

	const sla = range === '7d' ? sla7d : { ...sla7d, metPct: range === 'today' ? 94.1 : range === '30d' ? 90.8 : 89.9, breakdown: sla7d.breakdown.map((b, i) => ({ ...b, pct: range === 'today' ? [88, 7, 5][i]! : range === '30d' ? [81, 10, 9][i]! : [80, 10, 10][i]! })), byPriority: sla7d.byPriority.map((p, i) => ({ ...p, pct: range === 'today' ? [100, 95, 90][i]! : range === '30d' ? [95, 91, 84][i]! : [94, 90, 83][i]! })) };

	const clients = clients7d.map((c) => ({ ...c, openTickets: Math.max(1, Math.round(c.openTickets * (range === 'today' ? 0.3 : range === '7d' ? 1 : range === '30d' ? 3.6 : 10.5))), healthPct: range === '90d' ? Math.max(60, c.healthPct - 3) : c.healthPct }));

	const needsAttention = [...open]
		.filter((t) => t.projectKey === 'KS' || t.projectKey === 'NET')
		.sort((a, b) => {
			const ra = slaAtRisk(a, now) ? 0 : !a.assigneeId ? 1 : a.priority === 'P1' ? 2 : 3;
			const rb = slaAtRisk(b, now) ? 0 : !b.assigneeId ? 1 : b.priority === 'P1' ? 2 : 3;
			if (ra !== rb) return ra - rb;
			const da = slaRunning(a) ? a.sla!.resolveDueAt : Number.POSITIVE_INFINITY;
			const db = slaRunning(b) ? b.sla!.resolveDueAt : Number.POSITIVE_INFINITY;
			return da - db;
		})
		.slice(0, 4);

	const note = range === 'today' ? 'Lunch dip expected 13:00 – 14:00' : range === '7d' ? 'Month-end spike expected 25 – 30 Sep (payroll & bank cut-off)' : range === '30d' ? 'Peak on 29 Aug: payroll cut-off · NEPA outage in Ikeja' : 'Quarter trend: WhatsApp share up from 49% to 58%';

	return { kpis, series, share, sla, clients, clientTotal: totalClients, needsAttention, clientNames: {}, note };
}

export function dashboardCsv(data: DashboardData, range: Range): (string | number)[][] {
	return [
		['Ledge Desk dashboard export', rangeLabels[range], new Date().toISOString()],
		[],
		['KPI', 'Value', 'Trend'],
		...data.kpis.map((k) => [k.label, `${k.value}${k.suffix ?? ''}`, k.trend?.label ?? k.note ?? '']),
		[],
		['Period', 'WhatsApp', 'Email', 'Phone', 'Portal', 'Total'],
		...data.series.map((p) => [p.day, p.whatsapp, p.email, p.phone, p.portal, p.whatsapp + p.email + p.phone + p.portal]),
		[],
		['SLA', 'Percent'],
		...data.sla.breakdown.map((b) => [b.label, b.pct]),
		...data.sla.byPriority.map((p) => [p.label, p.pct ?? '']),
		[],
		['Client', 'Industry', 'Tier', 'Open tickets', 'Contract health %'],
		...data.clients.map((c) => [c.name, c.industry, c.tier, c.openTickets, c.healthPct ?? '']),
		[],
		['Needs attention', 'Title', 'Client', 'Priority', 'Status'],
		...data.needsAttention.map((t) => [t.key, t.title, data.clientNames[t.key] ?? clientById(t.clientId)?.name ?? '', t.priority, t.status]),
	];
}
