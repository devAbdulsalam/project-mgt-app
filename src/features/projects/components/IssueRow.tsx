import type { DragEvent, ReactNode } from 'react';
import { GripVertical } from 'lucide-react';
import { Avatar, PriorityPill, StatusPill, TypeDot } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { dueLabel } from '@/shared/lib/time';
import { memberById } from '@/mocks/db';
import { statusCategory } from '@/mocks/seed';
import type { Ticket } from '@/mocks/types';

/** Compact issue line used by the workload and calendar views. Optionally draggable (HTML5 DnD). */
export function IssueRow({
	t,
	now,
	onOpen,
	trailing,
	draggable,
	dragging,
	onDragStart,
	onDragEnd,
	showStatus,
	className,
}: {
	t: Ticket;
	now: number;
	onOpen: () => void;
	trailing?: ReactNode;
	draggable?: boolean;
	dragging?: boolean;
	onDragStart?: (e: DragEvent) => void;
	onDragEnd?: () => void;
	showStatus?: boolean;
	className?: string;
}) {
	const m = memberById(t.assigneeId);
	const done = statusCategory[t.status] === 'done';
	const due = t.dueAt && !done ? dueLabel(t.dueAt, now) : undefined;
	return (
		<div
			className={cn('group flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-muted', dragging && 'opacity-40', draggable && 'cursor-grab active:cursor-grabbing', className)}
			draggable={draggable}
			onDragStart={onDragStart}
			onDragEnd={onDragEnd}
		>
			{draggable ? <GripVertical size={14} className="shrink-0 text-t3 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden /> : null}
			<TypeDot type={t.type} />
			<button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-baseline gap-1.5 text-left">
				<span className="shrink-0 font-mono text-xs text-t2">{t.key}</span>
				<span className={cn('truncate', done && 'text-t3 line-through')}>{t.title}</span>
			</button>
			{showStatus ? <StatusPill status={t.status} className="hidden sm:inline-flex" /> : null}
			<PriorityPill priority={t.priority} />
			{due ? <span className={cn('hidden w-[74px] shrink-0 text-right text-xs sm:block', due.tone === 'muted' ? 'text-t2' : 'font-semibold text-high-fg')}>{due.label}</span> : null}
			{m ? <Avatar name={m.name} tint={m.tint} src={m.avatarUrl} size="sm" /> : <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-[10px] text-t3" title="Unassigned">?</span>}
			{trailing}
		</div>
	);
}
