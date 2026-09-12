import { Link } from '@tanstack/react-router';
import { AlertTriangle, Building2 } from 'lucide-react';
import { Avatar, Card, CardHeader, Pill, ProgressBar, TypeDot, type PillTone } from '@/shared/ui';
import { clientById, useDb, slaRunning } from '@/mocks/db';
import { totalClients, trafficAlert } from '@/mocks/data';
import { statusCategory } from '@/mocks/seed';
import type { TeamMember, Ticket } from '@/mocks/types';
import { countdown } from '@/shared/lib/time';
import type { DashboardData } from '../model';

function healthColor(pct: number) {
	return pct >= 90 ? '#22a05b' : pct >= 80 ? '#e0a100' : '#d93f3f';
}

export function TopClientsCard({ clients, orgSlug }: { clients: DashboardData['clients']; orgSlug: string }) {
	return (
		<Card className="p-5">
			<CardHeader
				title="Top clients"
				sub="By open ticket volume · contract health"
				action={
					<Link to="/$org/customers" params={{ org: orgSlug }} className="text-xs whitespace-nowrap text-brand-600 hover:underline">
						View all {totalClients}
					</Link>
				}
			/>
			<ul className="mt-1.5">
				{clients.map((c) => (
					<li key={c.id} className="flex items-center gap-3 py-2.5 text-[13px]">
						<span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-900" aria-hidden>
							<Building2 size={13} />
						</span>
						<div className="min-w-0 flex-1">
							<div className="truncate font-semibold">{c.name}</div>
							<div className="truncate text-[11px] text-t2">
								{c.industry} · {c.tier}
							</div>
						</div>
						<span className="tabular w-[60px] shrink-0 text-right text-[11px] text-t2">{c.openTickets} tickets</span>
						<ProgressBar value={c.healthPct} color={healthColor(c.healthPct)} className="hidden w-[90px] shrink-0 sm:block" label={`${c.name} contract health`} />
						<b className="tabular w-8 shrink-0 text-right text-[11px]">{c.healthPct}%</b>
					</li>
				))}
			</ul>
		</Card>
	);
}

const presenceTone: Record<TeamMember['presence'], PillTone> = { 'On site': 'done', 'En route': 'teal', Active: 'new', Away: 'closed', Break: 'closed' };

export function EngineerStatusCard({ orgSlug }: { orgSlug: string }) {
	const members = useDb((s) => s.members);
	const tickets = useDb((s) => s.tickets);
	const engineers = members.filter((m) => m.status === 'Active' && (m.role === 'Field engineer' || m.role === 'Support agent')).slice(0, 5);
	const detail = (m: TeamMember) => {
		const current = tickets.find((t) => t.assigneeId === m.id && statusCategory[t.status] !== 'done' && (t.status === 'Dispatched' || t.status === 'In progress'));
		const client = clientById(current?.clientId)?.name.replace(/ (Ltd|Plc|Co\.|Cooperative)$/, '');
		if (m.presence === 'On site' && current) return `On site · ${client} · ${current.key}`;
		if (m.presence === 'En route' && current) return `En route · ${client} · ${current.key}`;
		if (m.presence === 'Break') return `${m.base.split(' · ')[0]} · back 14:00`;
		if (current) return `${m.role === 'Support agent' ? 'Working' : 'Remote session'} · ${client ?? current.key}`;
		return m.base;
	};
	const label = (m: TeamMember) => (m.presence === 'On site' || m.presence === 'En route' ? m.presence : m.presence === 'Break' ? 'Break' : tickets.some((t) => t.assigneeId === m.id && t.status === 'In progress') ? 'Remote' : 'Available');
	return (
		<Card className="p-5">
			<CardHeader
				title="Engineer status"
				action={
					<Link to="/$org/visits" params={{ org: orgSlug }} className="text-xs text-brand-600 hover:underline">
						Dispatch
					</Link>
				}
			/>
			<ul className="mt-1">
				{engineers.map((e) => (
					<li key={e.id} className="flex items-center gap-2.5 py-2 text-[13px]">
						<Avatar name={e.name} tint={e.tint} size="sm" />
						<div className="min-w-0 flex-1">
							<Link to="/$org/users" params={{ org: orgSlug }} search={{ member: e.id }} className="block truncate font-semibold hover:underline">
								{e.name}
							</Link>
							<div className="truncate text-[11px] text-t2">{detail(e)}</div>
						</div>
						<Pill tone={label(e) === 'Remote' ? 'progress' : presenceTone[e.presence]}>{label(e)}</Pill>
					</li>
				))}
			</ul>
			<div className="mt-2 flex items-center gap-2 rounded-sm bg-orange-bg px-2.5 py-2 text-[11px] text-orange-fg" role="status">
				<AlertTriangle size={13} className="shrink-0" aria-hidden />
				{trafficAlert}
			</div>
		</Card>
	);
}

export function NeedsAttentionCard({ tickets, now, onOpen, orgSlug }: { tickets: Ticket[]; now: number; onOpen: (key: string) => void; orgSlug: string }) {
	return (
		<Card className="p-5">
			<CardHeader title="Needs attention" action={<Pill tone="blocked">{tickets.length}</Pill>} />
			<ul className="mt-1">
				{tickets.map((t) => (
					<li key={t.key} className="py-2 text-[13px]">
						<button type="button" onClick={() => onOpen(t.key)} className="flex w-full items-start gap-2.5 rounded-sm text-left hover:underline">
							<TypeDot type={t.type} className="mt-[3px]" />
							<div className="min-w-0 flex-1">
								<div className="font-semibold">{t.title}</div>
								<TicketMeta t={t} now={now} />
							</div>
						</button>
					</li>
				))}
				{tickets.length === 0 ? <li className="py-3 text-[13px] text-t3">Nothing needs attention right now.</li> : null}
			</ul>
			<Link to="/$org/tickets" params={{ org: orgSlug }} search={{ tab: 'risk' }} className="mt-1.5 inline-block text-xs text-brand-600 hover:underline">
				Open queue
			</Link>
		</Card>
	);
}

export function TicketMeta({ t, now }: { t: Ticket; now: number }) {
	const client = clientById(t.clientId)?.name.replace(/ (Ltd|Plc|Co\.)$/, '');
	const sla = t.sla && slaRunning(t) ? countdown(t.sla.resolveDueAt, now) : undefined;
	return (
		<div className="truncate text-[11px] text-t2">
			{t.key} · {client ?? t.projectKey} · {t.priority} ·{' '}
			{sla ? <span className={sla.overdue || sla.minutes < 120 ? 'text-high-fg' : undefined}>SLA {sla.overdue ? 'breached' : sla.label}</span> : !t.assigneeId ? <span className="text-high-fg">unassigned</span> : t.status === 'Waiting on client' ? 'customer waiting' : t.status.toLowerCase()}
		</div>
	);
}
