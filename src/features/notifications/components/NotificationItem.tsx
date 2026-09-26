import { Timer, AtSign, UserPlus, ArrowRight, Zap, CheckCircle2, MessageSquare, Smile, Check } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Avatar, Button, StatusPill } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { countdown, formatTime, relativeTime } from '@/shared/lib/time';
import { memberById, useDb } from '@/mocks/db';
import { toast } from '@/shared/lib/toast-store';
import { isLiveApi } from '@/shared/lib/live-api';
import type { Notification } from '@/mocks/types';
import type { Ticket } from '@/mocks/types';
import { useTicketActions } from '@/features/tickets/hooks/useTicketActions';
import { useNotificationActions } from '../hooks/useNotificationList';

const kindIcon = {
	sla: { icon: Timer, cls: 'bg-danger-bg text-danger' },
	mention: { icon: AtSign, cls: 'bg-brand-100 text-brand-900' },
	assigned: { icon: UserPlus, cls: 'bg-info-bg text-info-fg' },
	status: { icon: ArrowRight, cls: 'bg-purple-bg text-purple-fg' },
	automation: { icon: Zap, cls: 'bg-brand-100 text-brand-700' },
	sprint: { icon: CheckCircle2, cls: 'bg-success-bg text-success-fg' },
	reply: { icon: MessageSquare, cls: 'bg-tan-bg text-tan-fg' },
	csat: { icon: Smile, cls: 'bg-warning-bg text-warning-fg' },
} as const;

export function NotificationIcon({ n, size = 'md' }: { n: Notification; size?: 'sm' | 'md' }) {
	const actor = memberById(n.actorId);
	if (n.kind === 'mention' || n.kind === 'reply' || (n.kind === 'assigned' && actor)) {
		return <Avatar name={n.actorName ?? '?'} tint={actor?.tint ?? 'tan'} size={size === 'sm' ? 'md' : 'lg'} />;
	}
	const k = kindIcon[n.kind];
	return (
		<span className={cn('grid shrink-0 place-items-center rounded-full', k.cls, size === 'sm' ? 'size-8' : 'size-10')}>
			<k.icon size={size === 'sm' ? 15 : 18} aria-hidden />
		</span>
	);
}

export function NotificationSentence({ n, now, compact }: { n: Notification; now: number; compact?: boolean }) {
	const ticket = useDb((s) => (n.ticketKey ? s.tickets.find((t) => t.key === n.ticketKey) : undefined));
	const [before, after] = n.title.split('{key}');
	const keyEl = n.ticketKey ? <span className="font-mono text-xs text-t2">{n.ticketKey}</span> : null;
	const slaTail = n.kind === 'sla' && ticket?.sla && n.title.includes('resolves in') ? <b className="text-high-fg"> {countdown(ticket.sla.resolveDueAt, now).label}</b> : null;
	return (
		<span className={cn(compact && 'line-clamp-2')}>
			{n.actorName ? <b>{n.actorName}</b> : null}
			{n.actorName ? ' ' : null}
			{n.kind === 'sla' ? <b>{before?.replace(' · ', '')}</b> : before}
			{n.kind === 'sla' && keyEl ? ' · ' : null}
			{compact && n.kind !== 'sla' ? null : keyEl}
			{keyEl && !compact ? ' ' : null}
			{compact ? after?.replace(/ .*$/, '') && (n.kind === 'sla' ? keyEl : after) : after}
			{slaTail}
			{n.status ? <StatusPill status={n.status} className="ms-1.5" /> : null}
		</span>
	);
}

export function NotificationRow({ n, now, onOpen }: { n: Notification; now: number; onOpen?: () => void }) {
	const navigate = useNavigate();
	const live = isLiveApi();
	const { markRead, snooze } = useNotificationActions();
	const ticketActions = useTicketActions();
	const approve = useDb((s) => s.approveNotification);
	const projects = useDb((s) => s.projects);
	const orgSlug = window.location.pathname.split('/')[1] ?? '';
	// The ticket actions address a ticket by its key alone; a notification only carries the key.
	const ticketRef = n.ticketKey ? ({ key: n.ticketKey } as Ticket) : undefined;
	const openTicket = () => {
		markRead(n.id);
		if (n.ticketKey) navigate({ to: '/$org/tickets/$key', params: { org: orgSlug, key: n.ticketKey }, search: {} });
		onOpen?.();
	};
	const snoozed = n.snoozedUntil && n.snoozedUntil > now;
	return (
		<article className={cn('relative flex gap-4 px-6 py-4', !n.read && 'bg-[#f7fafb]')} aria-label={n.title.replace('{key}', n.ticketKey ?? '')}>
			{!n.read ? <span className="absolute top-[26px] left-2.5 size-1.5 rounded-full bg-brand-600" aria-label="Unread" /> : null}
			<NotificationIcon n={n} />
			<div className="min-w-0 flex-1 text-[13px]">
				<button type="button" onClick={openTicket} className="text-left leading-relaxed hover:underline">
					<NotificationSentence n={n} now={now} />
				</button>
				{n.body ? <blockquote className="mt-2 rounded-sm bg-muted px-3.5 py-2.5 text-[13px] text-t1">{n.body.split(/(@[A-Z][a-z]+)/g).map((p, i) => (p.startsWith('@') ? <b key={i} className="text-brand-600">{p}</b> : p))}</blockquote> : null}
				<div className="mt-1 text-xs text-t3">
					{now - n.at < 86_400_000 ? relativeTime(n.at, now) : `${relativeTime(n.at, now)}, ${formatTime(n.at)}`}
					{n.meta ? ` · ${n.meta}` : ''}
					{n.projectName ? ` · ${n.projectName}` : ''}
					{snoozed ? ` · snoozed until ${formatTime(n.snoozedUntil!)}` : ''}
					{n.approved ? ' · approved' : ''}
				</div>
				{n.kind === 'sla' && !n.title.includes('breached') ? (
					<div className="mt-2.5 flex flex-wrap items-center gap-2">
						<Button size="md" variant="primary" onClick={openTicket}>Open ticket</Button>
						<Button size="md" onClick={() => { if (ticketRef) void ticketActions.setPriority(ticketRef, 'P1'); markRead(n.id); toast(`${n.ticketKey} escalated to P1 and ops lead paged`, { tone: 'success' }); }}>Escalate</Button>
						<Button size="md" variant="ghost" onClick={() => { snooze(n.id, 30); toast('Snoozed for 30 minutes'); }}>Snooze 30m</Button>
					</div>
				) : n.kind === 'mention' ? (
					<div className="mt-2.5 flex flex-wrap items-center gap-2">
						<Button size="md" onClick={openTicket}>Reply</Button>
						{n.approved ? <span className="flex items-center gap-1 text-xs text-success-fg"><Check size={13} /> Approved</span> : <Button size="md" variant="ghost" onClick={() => { approve(n.id); toast('Approved', { tone: 'success', description: n.body?.includes('router') ? '₦85,000 4G router purchase approved.' : 'Your approval was recorded on the ticket.' }); }}><Check size={14} aria-hidden /> Approve</Button>}
					</div>
				) : n.kind === 'sprint' ? (
					<div className="mt-2.5"><Button size="md" onClick={() => { markRead(n.id); const p = projects.find((x) => x.name === n.projectName); navigate({ to: '/$org/projects/$projectKey/sprints', params: { org: orgSlug, projectKey: p?.key ?? 'PB' } }); }}>View report</Button></div>
				) : null}
			</div>
			{/* The API can only mark read, so a read row has nothing to offer live. */}
			{live && n.read ? null : <button type="button" onClick={() => markRead(n.id, !n.read)} className="self-start text-xs text-t3 hover:text-t1" aria-label={n.read ? 'Mark unread' : 'Mark read'}>{n.read ? 'Unread' : 'Done'}</button>}
		</article>
	);
}
