import { Link } from '@tanstack/react-router';
import { AlertTriangle, Bell, Clock, MessageSquare, Plus, Target, Ticket, Timer, Wrench, Columns3 } from 'lucide-react';
import { MobileHeader } from '@/shared/layouts/AppShell';
import { PriorityPill, StatusPill } from '@/shared/ui';
import { greeting } from '@/shared/lib/format';
import { clientById, slaAtRisk, slaRunning, useDb } from '@/mocks/db';
import { useSprints } from '@/api/resources';
import { isLiveApi } from '@/shared/lib/live-api';
import { useUnreadCount } from '@/features/notifications/api';
import { useInboxCounts } from '@/features/inbox/hooks/useInboxCounts';
import { useTodaySchedule } from '@/features/inbox/hooks/useTodaySchedule';
import { statusCategory } from '@/mocks/seed';
import { countdown } from '@/shared/lib/time';
import { todaySchedule, type Org, type User } from '@/mocks/data';
import type { Ticket as TicketRow } from '@/mocks/types';

export function MobileHomeHeader({ org, user, now }: { org: Org; user: User; now: number }) {
	const tickets = useDb((s) => s.tickets);
	const unread = useUnreadCount();
	const live = isLiveApi();
	const counts = useInboxCounts(org.slug);
	const activeSprint = useSprints(org.slug, undefined, 'active').data?.[0];
	const mockSprint = useDb((s) => s.projects.find((p) => p.sprint)?.sprint);
	const assigned = live ? (counts.data?.assigned ?? 0) : tickets.filter((t) => t.assigneeId === user.id && statusCategory[t.status] !== 'done').length;
	const risk = live ? (counts.data?.at_risk ?? 0) : tickets.filter((t) => slaAtRisk(t, now)).length;
	const sprint = live
		? activeSprint && activeSprint.points_total > 0
			? { name: activeSprint.name, points: activeSprint.points_total, remaining: activeSprint.points_total - activeSprint.points_done }
			: undefined
		: mockSprint;
	const kpis = [
		{ id: 'assigned', label: 'Assigned', value: String(assigned), icon: AlertTriangle, color: '#f5c542' },
		{ id: 'risk', label: 'SLA at risk', value: String(risk), icon: Timer, color: '#ff8a8a' },
		{ id: 'sprint', label: sprint?.name ?? 'Sprint', value: sprint ? `${Math.round(((sprint.points - sprint.remaining) / sprint.points) * 100)}%` : '—', icon: Target, color: '#8fd3b5' },
	];
	return (
		<MobileHeader>
			<div className="flex items-center justify-between">
				<div>
					<div className="text-[13px] text-on-dark-muted">{greeting()}</div>
					<div className="text-xl font-semibold">
						{user.name.split(' ')[0]} · {org.name.replace(/ Ltd$/, '')}
					</div>
				</div>
				<Link to="/$org/notifications" params={{ org: org.slug }} search={{}} className="relative grid size-10 place-items-center rounded-full bg-brand-800" aria-label={`Notifications, ${unread} unread`}>
					<Bell size={18} />
					{unread ? <span className="absolute top-1.5 right-2 rounded-full bg-danger px-1 text-[9px] font-bold">{unread}</span> : null}
				</Link>
			</div>
			<div className="mt-3.5 grid grid-cols-3 gap-2.5" data-tour="m-kpis">
				{kpis.map((k) => (
					<div key={k.id} className="rounded-md bg-white/10 p-3">
						<k.icon size={16} style={{ color: k.color }} aria-hidden />
						<b className="tabular mt-1.5 block text-[22px]">{k.value}</b>
						<span className="text-xs text-on-dark-muted">{k.label}</span>
					</div>
				))}
			</div>
		</MobileHeader>
	);
}

export function MobileHomeBody({ org, tickets, now, onOpen, onCreate, clientNames }: { org: Org; tickets: TicketRow[]; now: number; onOpen: (key: string) => void; onCreate: () => void; clientNames?: Record<string, string> }) {
	const schedule = useTodaySchedule(org.slug, todaySchedule).events;
	const actions = [
		{ label: 'New ticket', icon: Plus, tint: 'bg-lavender-bg text-lavender-fg', onClick: onCreate },
		{ label: 'Report fault', icon: Wrench, tint: 'bg-tan-bg text-tan-fg', onClick: onCreate },
	] as const;
	return (
		<div className="space-y-3">
			<h2 className="text-base font-semibold">Quick actions</h2>
			<div className="grid grid-cols-3 gap-2.5" data-tour="m-new">
				{actions.map((a) => (
					<button key={a.label} type="button" onClick={a.onClick} className="flex flex-col items-center gap-2 rounded-md bg-white px-2 py-3.5 text-center text-xs font-semibold shadow-card">
						<span className={`grid size-11 place-items-center rounded-md ${a.tint}`} aria-hidden>
							<a.icon size={20} />
						</span>
						{a.label}
					</button>
				))}
				<Link to="/$org/projects/$projectKey/board" params={{ org: org.slug, projectKey: 'PB' }} search={{}} className="flex flex-col items-center gap-2 rounded-md bg-white px-2 py-3.5 text-center text-xs font-semibold shadow-card">
					<span className="grid size-11 place-items-center rounded-md bg-green-bg text-green-fg" aria-hidden>
						<Columns3 size={20} />
					</span>
					My board
				</Link>
			</div>

			<div className="flex items-center justify-between pt-1" data-tour="m-attention">
				<h2 className="text-base font-semibold">Needs attention</h2>
				<Link to="/$org/tickets" params={{ org: org.slug }} search={{ tab: 'risk' }} className="text-[13px] font-medium text-brand-600">
					See all
				</Link>
			</div>
			{tickets.slice(0, 3).map((t) => {
				const risk = slaAtRisk(t, now);
				const clientName = clientNames?.[t.key] ?? clientById(t.clientId)?.name;
				const sla = t.sla && slaRunning(t) ? countdown(t.sla.resolveDueAt, now) : undefined;
				return (
					<button key={t.key} type="button" onClick={() => onOpen(t.key)} className={`block w-full rounded-md bg-white p-3.5 text-left shadow-card ${risk ? 'border-s-[3px] border-danger' : ''}`}>
						<div className="flex items-start justify-between gap-2.5 text-[15px] leading-tight font-semibold">
							{t.title}
							{t.priority === 'P1' ? <PriorityPill priority={t.priority} long /> : <StatusPill status={t.status} />}
						</div>
						<div className="my-1.5 text-[13px] font-medium text-brand-600">{clientName ? `${clientName}${t.site ? ` · ${t.site}` : ''}` : t.projectKey}</div>
						<div className="flex justify-between text-xs text-t2">
							<span className="flex items-center gap-1.5">
								<Ticket size={13} aria-hidden /> {t.key}
							</span>
							{sla ? (
								<span className={`flex items-center gap-1.5 font-semibold ${sla.overdue || sla.minutes < 120 ? 'text-high-fg' : 'text-success-fg'}`}>
									<Timer size={13} aria-hidden /> SLA {sla.overdue ? 'breached' : sla.label}
								</span>
							) : !t.assigneeId ? (
								<span className="flex items-center gap-1.5 text-high-fg">
									<Clock size={13} aria-hidden /> Unassigned
								</span>
							) : (
								<span className="flex items-center gap-1.5">
									<MessageSquare size={13} aria-hidden /> {t.comments.length} comments
								</span>
							)}
						</div>
					</button>
				);
			})}

			<h2 className="pt-1 text-base font-semibold">Today</h2>
			{schedule.length === 0 ? <p className="rounded-md bg-white px-3.5 py-3 text-[13px] text-t3 shadow-card">Nothing scheduled today.</p> : null}
			{schedule.map((s) => (
				<div key={s.time} className="flex items-center gap-3 rounded-md bg-white px-3.5 py-3 shadow-card">
					<span className="tabular w-10 text-[11px] text-t2">{s.time}</span>
					<span className="h-[30px] w-[3px] rounded-sm" style={{ background: s.color }} aria-hidden />
					<div className="min-w-0 text-[13px]">
						<b className="block truncate">{s.title}</b>
						<span className="block truncate text-[11px] text-t2">{s.sub}</span>
					</div>
				</div>
			))}
		</div>
	);
}
