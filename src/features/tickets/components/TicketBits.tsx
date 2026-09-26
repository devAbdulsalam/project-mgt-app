import { Timer } from 'lucide-react';
import { Avatar } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { countdown, dueLabel } from '@/shared/lib/time';
import { memberById, slaRunning } from '@/mocks/db';
import { statusCategory } from '@/mocks/seed';
import type { Ticket } from '@/mocks/types';

/** Live SLA countdown: red under 2h, amber under 8h, green otherwise; "Paused" while waiting. */
export function SlaCountdown({ ticket, now, withIcon, className }: { ticket: Ticket; now: number; withIcon?: boolean; className?: string }) {
	if (!ticket.sla) return <span className={cn('text-xs text-t3', className)}>—</span>;
	if (statusCategory[ticket.status] === 'done') return <span className={cn('text-xs text-t3', className)}>Met</span>;
	if (!slaRunning(ticket)) return <span className={cn('text-xs text-t2', className)}>Paused</span>;
	const c = countdown(ticket.sla.resolveDueAt, now);
	const tone = c.overdue || c.minutes < 120 ? 'text-high-fg' : c.minutes < 8 * 60 ? 'text-warning-fg' : 'text-success-fg';
	return (
		<span className={cn('tabular inline-flex items-center gap-1 text-xs font-semibold', tone, className)} title={c.overdue ? 'SLA breached' : 'Time until SLA resolution target'}>
			{withIcon ? <Timer size={13} aria-hidden /> : null}
			{c.overdue ? `Breached ${c.label.slice(1)}` : c.label}
		</span>
	);
}

export function AssigneeCell({ assigneeId, size = 'sm', short }: { assigneeId?: string; size?: 'sm' | 'md'; short?: boolean }) {
	const m = memberById(assigneeId);
	if (!m) return <span className="text-[13px] text-t2">Unassigned</span>;
	const [first, last] = m.name.split(' ');
	return (
		<span className="inline-flex items-center gap-2 text-[13px]">
			<Avatar name={m.name} tint={m.tint} src={m.avatarUrl} size={size} />
			<span className="truncate">{short ? `${first} ${last?.[0] ?? ''}.` : m.name}</span>
		</span>
	);
}

export function DueChip({ dueAt, now, className }: { dueAt?: number; now: number; className?: string }) {
	if (!dueAt) return null;
	const d = dueLabel(dueAt, now);
	return <span className={cn('text-xs', d.tone === 'danger' ? 'font-semibold text-high-fg' : d.tone === 'warn' ? 'font-semibold text-high-fg' : 'text-t2', className)}>{d.label}</span>;
}

export function KeyText({ children, className }: { children: string; className?: string }) {
	return <span className={cn('font-mono text-xs text-t2', className)}>{children}</span>;
}
