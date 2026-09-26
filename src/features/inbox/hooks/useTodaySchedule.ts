// "Today" for the signed-in person.
//
// There is no calendar service, so the live schedule is their own site visits.
// Mock mode keeps the hand-written agenda the demo always showed.

import { useMemo } from 'react';
import { useVisits } from '@/api/resources';
import { isLiveApi } from '@/shared/lib/live-api';

export interface ScheduleEvent {
	time: string;
	title: string;
	sub: string;
	color: string;
}

const STATUS_COLOR: Record<string, string> = {
	scheduled: '#2e6f86',
	dispatched: '#e0a100',
	on_site: '#22a05b',
	completed: '#8a97a0',
};

const hhmm = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

export function useTodaySchedule(org: string, mock: ScheduleEvent[]): { events: ScheduleEvent[]; loading: boolean } {
	const live = isLiveApi();
	const day = new Date().toDateString();

	// Bounds are the browser's local day, which is the day the person is looking at.
	const range = useMemo(() => {
		const start = new Date();
		start.setHours(0, 0, 0, 0);
		const end = new Date(start);
		end.setDate(end.getDate() + 1);
		return { from: start.toISOString(), to: end.toISOString() };
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [day]);

	const visits = useVisits(live ? org : '', { engineer: 'me', ...range });

	if (!live) return { events: mock, loading: false };

	const events = (visits.data ?? [])
		.filter((v) => v.scheduled_for && v.status !== 'cancelled')
		.sort((a, b) => Date.parse(a.scheduled_for!) - Date.parse(b.scheduled_for!))
		.map((v) => ({
			time: hhmm.format(new Date(v.scheduled_for!)),
			title: v.summary ?? (v.ticket_key ? `Visit for ${v.ticket_key}` : 'Site visit'),
			sub: [v.ticket_key, v.client_name, v.site_name].filter(Boolean).join(' · '),
			color: STATUS_COLOR[v.status] ?? '#2e6f86',
		}));
	return { events, loading: visits.isPending };
}
