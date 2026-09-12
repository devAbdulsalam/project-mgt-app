import { Ticket as TicketIcon, MessageSquare } from 'lucide-react';
import { PriorityPill, StatusPill } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { relativeTime } from '@/shared/lib/time';
import { clientById, slaAtRisk, useDb } from '@/mocks/db';
import type { Ticket } from '@/mocks/types';
import { SlaCountdown, DueChip } from './TicketBits';

/** Mobile card list, matching the "My Tickets" design. */
export function TicketCards({ tickets, now, onOpen, className }: { tickets: Ticket[]; now: number; onOpen: (key: string) => void; className?: string }) {
	const projects = useDb((s) => s.projects);
	return (
		<div className={cn('space-y-3', className)}>
			{tickets.map((t) => {
				const client = clientById(t.clientId);
				const project = projects.find((p) => p.key === t.projectKey);
				const risk = slaAtRisk(t, now);
				return (
					<button
						key={t.key}
						type="button"
						onClick={() => onOpen(t.key)}
						className={cn('block w-full rounded-md bg-white p-3.5 text-left shadow-card', risk && 'border-s-[3px] border-danger')}
					>
						<div className="flex items-start justify-between gap-2.5 text-[15px] leading-tight font-semibold">
							<span>{t.title}</span>
							{t.priority === 'P1' || t.priority === 'P2' ? <PriorityPill priority={t.priority} long /> : <StatusPill status={t.status} />}
						</div>
						<div className="my-1.5 truncate text-[13px] font-medium text-brand-600">{client ? `${client.name}${t.site ? ` · ${t.site}` : ''}` : `${project?.name ?? t.projectKey}${t.sprint ? ` · ${t.sprint}` : ''}`}</div>
						<div className="flex items-center justify-between text-xs text-t2">
							<span className="flex items-center gap-1.5">
								<TicketIcon size={13} aria-hidden /> {t.key}
								{t.priority === 'P1' || t.priority === 'P2' ? <StatusPill status={t.status} className="ms-1" /> : null}
							</span>
							{t.sla && client ? (
								<SlaCountdown ticket={t} now={now} withIcon />
							) : t.dueAt ? (
								<DueChip dueAt={t.dueAt} now={now} />
							) : t.comments.length ? (
								<span className="flex items-center gap-1.5">
									<MessageSquare size={13} aria-hidden /> {t.comments.length} · {relativeTime(t.updatedAt, now)}
								</span>
							) : (
								<span>{relativeTime(t.updatedAt, now)}</span>
							)}
						</div>
					</button>
				);
			})}
		</div>
	);
}
