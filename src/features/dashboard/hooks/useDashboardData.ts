// The dashboard's numbers, from whichever source is active.
//
// Live, `GET /orgs/{org}/dashboard/overview` computes everything in SQL over
// every ticket in the workspace. In mock mode the figures are derived from the
// in-browser store, as the page always did. The page receives one `DashboardData`
// either way and never asks which.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import type { Channel, Kpi } from '@/mocks/data';
import { useDb } from '@/mocks/db';
import { isLiveApi } from '@/shared/lib/live-api';
import type { TicketDto } from '@/features/tickets/api/contracts';
import { ticketDtoToDomain } from '@/features/tickets/api/mapper';
import { getDashboardData, type DashboardData, type Range, type SeriesPoint } from '../model';

interface OverviewDto {
	kpis: {
		open: number;
		open_at_start: number;
		resolved: number;
		created: number;
		first_response_min: number | null;
		first_response_min_previous: number | null;
		sla_met_pct: number | null;
		sla_met_pct_previous: number | null;
		csat: number | null;
	};
	series: { bucket: string; whatsapp: number; email: number; phone: number; portal: number; internal: number }[];
	sla: {
		met_pct: number | null;
		at_risk_pct: number | null;
		breached_pct: number | null;
		by_priority: { priority: string; pct: number | null; total: number }[];
	};
	top_clients: { id: string; name: string; industry: string | null; tier: string | null; open_tickets: number; health_pct: number | null }[];
	client_total: number;
	workload: { user_id: string; name: string; open_count: number; points: number }[];
	needs_attention: (TicketDto & { client?: { id: string; name: string | null } | null })[];
}

const CHANNELS: Channel[] = ['whatsapp', 'email', 'phone', 'portal'];

const PRIORITY_LABEL: Record<string, string> = { p1: 'P1 · Critical', p2: 'P2 · High', p3: 'P3 · Normal' };

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Same labels the mock series uses, so the chart reads identically in both modes. */
function bucketLabel(iso: string, range: Range, timeZone: string) {
	const d = new Date(iso);
	if (range === 'today') return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }).format(d);
	if (range === '90d') {
		const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone }).format(d);
		const month = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone }).format(d);
		return `w/c ${day} ${month}`;
	}
	return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', timeZone }).format(d);
}

function duration(min: number | null) {
	if (min === null) return '—';
	if (min < 60) return `${min} min`;
	return `${Math.floor(min / 60)}h ${min % 60}m`;
}

const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(n)}`;

function fromDto(dto: OverviewDto, range: Range, timeZone: string): DashboardData {
	const k = dto.kpis;

	const openDelta = k.open_at_start > 0 ? Math.round(((k.open - k.open_at_start) / k.open_at_start) * 100) : null;
	const frtDelta = k.first_response_min !== null && k.first_response_min_previous !== null ? k.first_response_min - k.first_response_min_previous : null;
	const slaDelta = k.sla_met_pct !== null && k.sla_met_pct_previous !== null ? Math.round((k.sla_met_pct - k.sla_met_pct_previous) * 10) / 10 : null;

	const kpis: Kpi[] = [
		{
			id: 'open',
			label: 'Open tickets',
			value: String(k.open),
			icon: 'ticket',
			tint: 'teal',
			...(openDelta === null
				? { note: `${k.created} created this period` }
				: { trend: { direction: openDelta > 0 ? 'up' : openDelta < 0 ? 'down' : 'flat', label: `${signed(openDelta)}% vs start of period`, good: openDelta <= 0 } }),
		},
		{
			id: 'frt',
			label: 'First response',
			value: duration(k.first_response_min),
			icon: 'clock',
			tint: 'blue',
			...(frtDelta === null
				? { note: k.first_response_min === null ? 'No replies in this period' : 'Median · no earlier period to compare' }
				: { trend: { direction: frtDelta > 0 ? 'up' : frtDelta < 0 ? 'down' : 'flat', label: `${signed(frtDelta)} min vs previous period`, good: frtDelta <= 0 } }),
		},
		{
			id: 'sla',
			label: 'SLA compliance',
			value: k.sla_met_pct === null ? '—' : `${k.sla_met_pct}%`,
			icon: 'shield',
			tint: 'green',
			...(slaDelta === null
				? { note: k.sla_met_pct === null ? 'No SLA-bound tickets due in this period' : 'No earlier period to compare' }
				: { trend: { direction: slaDelta > 0 ? 'up' : slaDelta < 0 ? 'down' : 'flat', label: `${signed(slaDelta)}% vs previous period`, good: slaDelta >= 0 } }),
		},
		// No ratings are collected yet, so this says so rather than showing a number.
		{ id: 'csat', label: 'CSAT', value: '—', icon: 'smile', tint: 'yellow', note: 'No ratings collected yet' },
	];

	const series: SeriesPoint[] = dto.series.map((p) => ({
		day: bucketLabel(p.bucket, range, timeZone),
		whatsapp: p.whatsapp,
		email: p.email,
		phone: p.phone,
		portal: p.portal,
	}));

	// Share of the four customer-facing channels; internal tickets are not a channel a customer chose.
	const totals = CHANNELS.map((channel) => ({ channel, n: dto.series.reduce((sum, p) => sum + p[channel], 0) }));
	const total = totals.reduce((sum, t) => sum + t.n, 0);
	const share = totals.map((t) => ({ channel: t.channel, pct: total ? Math.round((t.n / total) * 100) : 0 }));

	const peak = series.reduce<SeriesPoint | undefined>((best, p) => {
		const sum = p.whatsapp + p.email + p.phone + p.portal;
		return !best || sum > best.whatsapp + best.email + best.phone + best.portal ? p : best;
	}, undefined);
	const peakTotal = peak ? peak.whatsapp + peak.email + peak.phone + peak.portal : 0;

	const clientNames: Record<string, string> = {};
	const needsAttention = dto.needs_attention.map((t) => {
		if (t.client?.name) clientNames[t.key] = t.client.name;
		return ticketDtoToDomain(t);
	});

	return {
		kpis,
		series,
		share,
		sla: {
			metPct: dto.sla.met_pct,
			breakdown: [
				{ key: 'met', label: 'Met', pct: dto.sla.met_pct ?? 0, color: '#22a05b' },
				{ key: 'risk', label: 'At risk', pct: dto.sla.at_risk_pct ?? 0, color: '#e0a100' },
				{ key: 'breached', label: 'Breached', pct: dto.sla.breached_pct ?? 0, color: '#d93f3f' },
			],
			byPriority: dto.sla.by_priority.map((p) => ({ label: PRIORITY_LABEL[p.priority] ?? p.priority, pct: p.pct })),
		},
		clients: dto.top_clients.map((c) => ({
			id: c.id,
			name: c.name,
			industry: c.industry ?? 'Client',
			tier: c.tier ? capitalise(c.tier) : 'No tier',
			openTickets: c.open_tickets,
			healthPct: c.health_pct,
		})),
		clientTotal: dto.client_total,
		needsAttention,
		clientNames,
		workload: dto.workload.map((w) => ({ id: w.user_id, name: w.name, openCount: w.open_count, points: w.points })),
		note: peakTotal > 0 && peak ? `Busiest: ${peak.day} · ${peakTotal} tickets` : '',
	};
}

const EMPTY: DashboardData = {
	kpis: [],
	series: [],
	share: [],
	sla: { metPct: null, breakdown: [], byPriority: [] },
	clients: [],
	clientTotal: 0,
	needsAttention: [],
	clientNames: {},
	note: '',
};

export interface DashboardState {
	data: DashboardData;
	loading: boolean;
	error: Error | null;
	refetch: () => Promise<unknown>;
}

export function useDashboardData(orgSlug: string, timeZone: string, range: Range, now: number): DashboardState {
	const live = isLiveApi();
	const tickets = useDb((s) => s.tickets);

	const query = useQuery({
		queryKey: ['dashboard-overview', orgSlug, range, timeZone],
		queryFn: ({ signal }) => api.get<OverviewDto>(`/orgs/${orgSlug}/dashboard/overview`, { query: { range, tz: timeZone }, signal }),
		enabled: live && Boolean(orgSlug),
		staleTime: 30_000,
	});

	const liveData = useMemo(() => (query.data ? fromDto(query.data, range, timeZone) : undefined), [query.data, range, timeZone]);
	const mockData = useMemo(() => (live ? undefined : getDashboardData(range, tickets, now)), [live, range, tickets, now]);

	if (!live) return { data: mockData!, loading: false, error: null, refetch: async () => {} };
	return { data: liveData ?? EMPTY, loading: query.isPending, error: (query.error as Error | null) ?? null, refetch: query.refetch };
}
