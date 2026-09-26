// The two reports, from whichever source is active.
//
// Live, each is one aggregate request (`/reports/service`, `/reports/projects`)
// computed in SQL. Mock mode keeps the generated demo figures. Both hand the
// page the same view models, so it never asks which it has.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { isLiveApi } from '@/shared/lib/live-api';
import { projectsReport, serviceReport, type ProjectsReport, type ReportsSearch, type ServiceReport } from '../model';

type Range = ReportsSearch['range'];
type Tone = 'good' | 'bad' | 'muted';

interface ServiceDto {
	window: { start: string; end: string };
	kpis: {
		resolved: number;
		resolved_previous: number;
		first_response_min: number | null;
		first_response_min_previous: number | null;
		resolution_min: number | null;
		resolution_min_previous: number | null;
		sla_met_pct: number | null;
		sla_met_pct_previous: number | null;
		logged_hours: number;
	};
	resolution: { bucket: string; p1: number | null; p2: number | null; p3: number | null }[];
	heatmap: { dow: number; hour: number; count: number }[];
	utilisation: { user_id: string; name: string; billable_pct: number; travel_pct: number; idle_pct: number }[];
	categories: { name: string; count: number; avg_resolution_min: number | null }[];
}

interface ProjectsDto {
	window: { start: string; end: string };
	kpis: {
		completed: number;
		completed_previous: number;
		open: number;
		cycle_days: number | null;
		cycle_days_previous: number | null;
		bugs_opened: number;
		bugs_urgent: number;
	};
	velocity: { name: string; points_total: number; points_done: number }[];
	cycle: { bucket: string; days: number }[];
	epics: { name: string; due_at: string | null; ticket_count: number; done_count: number }[];
}

const dayMonth = (iso: string, timeZone: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone }).format(new Date(iso));

function duration(min: number | null) {
	if (min === null) return '—';
	if (min < 60) return `${min} min`;
	const h = Math.floor(min / 60);
	return h >= 48 ? `${Math.round(h / 24)}d` : `${h}h ${min % 60}m`;
}

/** "+6% vs prev", or "no earlier period" when there is nothing to compare against. */
function percentDelta(now: number, before: number) {
	if (before === 0) return 'no earlier period';
	const pct = Math.round(((now - before) / before) * 100);
	return `${pct > 0 ? '+' : pct < 0 ? '−' : '±'}${Math.abs(pct)}% vs prev`;
}

function serviceFromDto(dto: ServiceDto, timeZone: string): ServiceReport {
	const k = dto.kpis;
	const minDelta = (now: number | null, before: number | null, unit: string) =>
		now === null || before === null ? 'no earlier period' : `${now - before > 0 ? '+' : now - before < 0 ? '−' : '±'}${Math.abs(now - before)} ${unit} vs prev`;
	const tone = (now: number | null, before: number | null, lowerIsBetter: boolean): Tone =>
		now === null || before === null || now === before ? 'muted' : (now < before) === lowerIsBetter ? 'good' : 'bad';

	// Normalise the heatmap to 0–1 over Mon–Sat, 07:00–18:59, the grid the page draws.
	const cells = dto.heatmap.filter((c) => c.dow <= 6 && c.hour >= 7 && c.hour <= 18);
	const heatMax = Math.max(1, ...cells.map((c) => c.count));
	const heat = Array.from({ length: 6 }, () => Array.from({ length: 12 }, () => 0));
	for (const c of cells) heat[c.dow - 1]![c.hour - 7] = c.count / heatMax;

	const peak = cells.reduce<(typeof cells)[number] | undefined>((best, c) => (!best || c.count > best.count ? c : best), undefined);
	const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	return {
		window: { start: Date.parse(dto.window.start), end: Date.parse(dto.window.end) },
		kpis: [
			{ label: 'Tickets resolved', value: k.resolved.toLocaleString(), sub: percentDelta(k.resolved, k.resolved_previous), tone: k.resolved >= k.resolved_previous ? 'good' : 'bad' },
			{ label: 'Median first response', value: duration(k.first_response_min), sub: minDelta(k.first_response_min, k.first_response_min_previous, 'min'), tone: tone(k.first_response_min, k.first_response_min_previous, true) },
			{ label: 'Median resolution', value: duration(k.resolution_min), sub: minDelta(k.resolution_min, k.resolution_min_previous, 'min'), tone: tone(k.resolution_min, k.resolution_min_previous, true) },
			{ label: 'SLA met', value: k.sla_met_pct === null ? '—' : `${k.sla_met_pct}%`, sub: k.sla_met_pct !== null && k.sla_met_pct_previous !== null ? `${Math.round((k.sla_met_pct - k.sla_met_pct_previous) * 10) / 10}% vs prev` : 'no earlier period', tone: tone(k.sla_met_pct, k.sla_met_pct_previous, false) },
			{ label: 'CSAT', value: '—', sub: 'No ratings collected', tone: 'muted' },
			{ label: 'Logged hours', value: `${k.logged_hours.toLocaleString()}h`, sub: 'From time entries', tone: 'muted' },
		],
		resolution: dto.resolution.map((r) => ({ day: dayMonth(r.bucket, timeZone), p1: r.p1, p2: r.p2, p3: r.p3 })),
		heat,
		heatMax,
		utilisation: dto.utilisation.map((u) => ({ id: u.user_id, name: u.name, billable: u.billable_pct, travel: u.travel_pct, idle: u.idle_pct })),
		categories: dto.categories.map((c) => ({ name: c.name, count: c.count, avg: c.avg_resolution_min === null ? '—' : duration(c.avg_resolution_min) })),
		csat: [],
		insight: peak ? `Busiest: ${DAYS[peak.dow - 1]} ${String(peak.hour).padStart(2, '0')}:00 (${peak.count} tickets in the hour).` : 'Not enough tickets in this period to show a pattern.',
	};
}

function projectsFromDto(dto: ProjectsDto, timeZone: string): ProjectsReport {
	const k = dto.kpis;
	const velocity = dto.velocity.map((v) => ({ sprint: v.name, committed: v.points_total, completed: v.points_done }));
	const avg = velocity.length ? Math.round(velocity.reduce((sum, v) => sum + v.completed, 0) / velocity.length) : 0;
	const now = Date.now();
	const overdue = dto.epics.filter((e) => e.due_at && Date.parse(e.due_at) < now && e.done_count < e.ticket_count).length;

	return {
		kpis: [
			{ label: 'Issues completed', value: String(k.completed), sub: percentDelta(k.completed, k.completed_previous), tone: k.completed >= k.completed_previous ? 'good' : 'bad' },
			{ label: 'Avg velocity', value: `${avg} pts`, sub: `${velocity.length} sprint${velocity.length === 1 ? '' : 's'}`, tone: 'muted' },
			{
				label: 'Cycle time',
				value: k.cycle_days === null ? '—' : `${k.cycle_days}d`,
				sub: k.cycle_days !== null && k.cycle_days_previous !== null ? `${Math.round((k.cycle_days - k.cycle_days_previous) * 10) / 10}d vs prev` : 'no earlier period',
				tone: k.cycle_days === null || k.cycle_days_previous === null || k.cycle_days === k.cycle_days_previous ? 'muted' : k.cycle_days < k.cycle_days_previous ? 'good' : 'bad',
			},
			{ label: 'Open issues', value: String(k.open), sub: 'Right now', tone: 'muted' },
			{ label: 'Bugs opened', value: String(k.bugs_opened), sub: `${k.bugs_urgent} P1/P2`, tone: 'muted' },
			{ label: 'Epics open', value: String(dto.epics.length), sub: overdue ? `${overdue} overdue` : 'None overdue', tone: overdue ? 'bad' : 'good' },
		],
		velocity,
		cycle: dto.cycle.map((c) => ({ week: `w/c ${dayMonth(c.bucket, timeZone)}`, days: c.days })),
		epics: dto.epics.map((e) => ({ name: e.name, done: e.done_count, total: e.ticket_count, due: e.due_at ? dayMonth(e.due_at, timeZone) : '—' })),
	};
}

export interface ReportState<T> {
	report: T;
	loading: boolean;
	error: Error | null;
}

const EMPTY_SERVICE: ServiceReport = { kpis: [], resolution: [], heat: Array.from({ length: 6 }, () => Array.from({ length: 12 }, () => 0)), utilisation: [], categories: [], csat: [], insight: '' };
const EMPTY_PROJECTS: ProjectsReport = { kpis: [], velocity: [], cycle: [], epics: [] };

export function useServiceReport(orgSlug: string, timeZone: string, range: Range, clientId: string | undefined, mockClientScale: number, active: boolean): ReportState<ServiceReport> {
	const live = isLiveApi();
	const query = useQuery({
		queryKey: ['report-service', orgSlug, range, clientId ?? null, timeZone],
		queryFn: ({ signal }) => api.get<ServiceDto>(`/orgs/${orgSlug}/reports/service`, { query: { range, tz: timeZone, ...(clientId ? { client_id: clientId } : {}) }, signal }),
		enabled: live && active && Boolean(orgSlug),
		staleTime: 60_000,
	});
	const liveReport = useMemo(() => (query.data ? serviceFromDto(query.data, timeZone) : undefined), [query.data, timeZone]);
	const mock = useMemo(() => (live ? undefined : serviceReport(range, mockClientScale)), [live, range, mockClientScale]);
	return { report: (live ? liveReport : mock) ?? EMPTY_SERVICE, loading: live && active && query.isPending, error: (query.error as Error | null) ?? null };
}

export function useProjectsReport(orgSlug: string, timeZone: string, range: Range, active: boolean): ReportState<ProjectsReport> {
	const live = isLiveApi();
	const query = useQuery({
		queryKey: ['report-projects', orgSlug, range, timeZone],
		queryFn: ({ signal }) => api.get<ProjectsDto>(`/orgs/${orgSlug}/reports/projects`, { query: { range, tz: timeZone }, signal }),
		enabled: live && active && Boolean(orgSlug),
		staleTime: 60_000,
	});
	const liveReport = useMemo(() => (query.data ? projectsFromDto(query.data, timeZone) : undefined), [query.data, timeZone]);
	const mock = useMemo(() => (live ? undefined : projectsReport(range)), [live, range]);
	return { report: (live ? liveReport : mock) ?? EMPTY_PROJECTS, loading: live && active && query.isPending, error: (query.error as Error | null) ?? null };
}
