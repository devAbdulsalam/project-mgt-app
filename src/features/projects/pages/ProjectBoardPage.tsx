import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Plus, Users } from 'lucide-react';
import { Avatar, Button, Card, EmptyState, LabelChip, PriorityPill, TypeDot } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useAuthStore } from '@/shared/lib/auth-store';
import { memberById, useDb } from '@/mocks/db';
import { transitions } from '@/mocks/seed';
import { toast } from '@/shared/lib/toast-store';
import type { Status, Ticket } from '@/mocks/types';
import { useActor } from '@/features/tickets/hooks/useActor';
import { TicketDetail } from '@/features/tickets/components/TicketDetail';
import { CreateTicketDialog } from '@/features/tickets/components/CreateTicketDialog';
import { SlaCountdown } from '@/features/tickets/components/TicketBits';
import { useNow } from '@/shared/lib/time';

import type { BoardSearch } from '../model';

interface Column { id: string; title: string; statuses: Status[]; target: Status; wip?: number }

const softwareColumns: Column[] = [
	{ id: 'todo', title: 'To do', statuses: ['New', 'Open', 'Scheduled'], target: 'Open' },
	{ id: 'progress', title: 'In progress', statuses: ['In progress', 'Dispatched'], target: 'In progress', wip: 3 },
	{ id: 'review', title: 'In review', statuses: ['In review'], target: 'In review' },
	{ id: 'blocked', title: 'Blocked', statuses: ['Blocked', 'Waiting on client', 'Awaiting vendor'], target: 'Blocked' },
	{ id: 'done', title: 'Done', statuses: ['Resolved', 'Closed'], target: 'Resolved' },
];
const serviceColumns: Column[] = [
	{ id: 'new', title: 'New / Open', statuses: ['New', 'Open'], target: 'Open' },
	{ id: 'scheduled', title: 'Scheduled', statuses: ['Scheduled'], target: 'Scheduled' },
	{ id: 'progress', title: 'In progress', statuses: ['In progress', 'Dispatched'], target: 'In progress', wip: 6 },
	{ id: 'waiting', title: 'Waiting', statuses: ['Waiting on client', 'Awaiting vendor'], target: 'Waiting on client' },
	{ id: 'blocked', title: 'Blocked', statuses: ['Blocked', 'In review'], target: 'Blocked' },
	{ id: 'done', title: 'Resolved', statuses: ['Resolved', 'Closed'], target: 'Resolved' },
];

function BoardCard({ t, now, onOpen, dragging, onDragStart, onDragEnd }: { t: Ticket; now: number; onOpen: () => void; dragging: boolean; onDragStart: () => void; onDragEnd: () => void }) {
	const m = memberById(t.assigneeId);
	const done = t.subtasks.filter((s) => s.done).length;
	return (
		<div
			draggable
			onDragStart={(e) => { e.dataTransfer.setData('text/plain', t.key); e.dataTransfer.effectAllowed = 'move'; onDragStart(); }}
			onDragEnd={onDragEnd}
			onClick={onOpen}
			onKeyDown={(e) => e.key === 'Enter' && onOpen()}
			tabIndex={0}
			role="button"
			className={cn('cursor-grab rounded-[10px] border border-border bg-white p-3 text-[13px] shadow-card hover:border-border-strong active:cursor-grabbing', dragging && 'opacity-40', t.status === 'Blocked' && 'border-s-[3px] border-s-danger')}
		>
			<div className="flex items-center gap-2 text-xs text-t2"><TypeDot type={t.type} size="sm" /><span className="font-mono">{t.key}</span><PriorityPill priority={t.priority} className="ms-auto" /></div>
			<div className="mt-1.5 font-medium leading-snug">{t.title}</div>
			{t.labels.length ? <div className="mt-2 flex flex-wrap gap-1">{t.labels.slice(0, 3).map((l) => <LabelChip key={l}>{l}</LabelChip>)}</div> : null}
			<div className="mt-2.5 flex items-center gap-2 text-xs text-t2">
				{t.subtasks.length ? <span>{done}/{t.subtasks.length} sub-tasks</span> : null}
				{t.storyPoints ? <span className="rounded-full bg-muted px-1.5 font-semibold">{t.storyPoints}</span> : null}
				{t.sla ? <SlaCountdown ticket={t} now={now} /> : null}
				<span className="ms-auto">{m ? <Avatar name={m.name} tint={m.tint} size="sm" /> : <span className="grid size-6 place-items-center rounded-full bg-muted text-[10px] text-t3">?</span>}</span>
			</div>
		</div>
	);
}

export function ProjectBoardPage() {
	const org = useAuthStore((s) => s.org)!;
	const actor = useActor();
	const { projectKey } = useParams({ from: '/authed/$org/projects/$projectKey/board' });
	const search = useSearch({ from: '/authed/$org/projects/$projectKey/board' });
	const navigate = useNavigate();
	const project = useDb((s) => s.projects.find((p) => p.key === projectKey))!;
	const allTickets = useDb((s) => s.tickets);
	const tickets = useMemo(() => allTickets.filter((t) => t.projectKey === projectKey && t.type !== 'epic'), [allTickets, projectKey]);
	const transition = useDb((s) => s.transition);
	const now = useNow(30_000);
	const [dragKey, setDragKey] = useState<string>();
	const [overCol, setOverCol] = useState<string>();
	const [creating, setCreating] = useState(false);
	const [mobileCol, setMobileCol] = useState(0);

	const columns = project.kind === 'software' ? softwareColumns : serviceColumns;
	const setSearch = (patch: Partial<BoardSearch>) => navigate({ to: '/$org/projects/$projectKey/board', params: { org: org.slug, projectKey }, search: { ...search, ...patch }, replace: true });
	const visible = useMemo(() => tickets.filter((t) => !search.assignee || t.assigneeId === search.assignee), [tickets, search.assignee]);
	const assignees = useMemo(() => Array.from(new Set(tickets.map((t) => t.assigneeId).filter(Boolean))).map((id) => memberById(id!)).filter(Boolean), [tickets]);

	const drop = (col: Column) => {
		if (!dragKey) return;
		const t = tickets.find((x) => x.key === dragKey);
		setDragKey(undefined);
		setOverCol(undefined);
		if (!t || col.statuses.includes(t.status)) return;
		if (transition(t.key, col.target, actor)) toast(`${t.key} moved to ${col.target}`, { tone: 'success' });
		else toast(`Can't move ${t.key} to ${col.target}`, { tone: 'danger', description: `Allowed from ${t.status}: ${transitions[t.status].join(', ')}` });
	};

	const dragging = dragKey ? tickets.find((t) => t.key === dragKey) : undefined;

	return (
		<>
			<div className="mb-4 flex flex-wrap items-center gap-3">
				{project.sprint ? <span className="text-[13px] text-t2"><b className="text-t1">{project.sprint.name}</b> · {project.sprint.daysLeft} days left · {project.sprint.remaining} of {project.sprint.points} pts remaining</span> : <span className="text-[13px] text-t2">{visible.length} issues on the board</span>}
				<div className="ms-auto flex items-center gap-2">
					<div className="flex items-center gap-1" role="group" aria-label="Filter by assignee">
						<Users size={14} className="me-1 text-t3" aria-hidden />
						{assignees.map((m) => (
							<button key={m!.id} type="button" onClick={() => setSearch({ assignee: search.assignee === m!.id ? undefined : m!.id })} className={cn('rounded-full ring-2 ring-offset-1', search.assignee === m!.id ? 'ring-brand-600' : 'ring-transparent hover:ring-border-strong')} aria-pressed={search.assignee === m!.id} aria-label={m!.name} title={m!.name}>
								<Avatar name={m!.name} tint={m!.tint} size="sm" />
							</button>
						))}
					</div>
					<Button variant="primary" onClick={() => setCreating(true)}><Plus size={15} aria-hidden /> Create issue</Button>
				</div>
			</div>

			{/* Desktop columns */}
			<div className="hidden gap-3 overflow-x-auto pb-2 lg:flex" data-tour="board">
				{columns.map((col) => {
					const items = visible.filter((t) => col.statuses.includes(t.status));
					const canDrop = dragging ? transitions[dragging.status].includes(col.target) || col.statuses.includes(dragging.status) : true;
					const over = overCol === col.id;
					return (
						<section
							key={col.id}
							className={cn('flex min-h-[60vh] w-[248px] shrink-0 flex-col rounded-[12px] bg-muted/70 p-2.5 transition-colors xl:w-[calc((100%-48px)/5)] xl:min-w-[232px]', over && canDrop && 'bg-brand-100', over && !canDrop && 'bg-danger-bg/60')}
							onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = canDrop ? 'move' : 'none'; if (overCol !== col.id) setOverCol(col.id); }}
							onDragLeave={() => overCol === col.id && setOverCol(undefined)}
							onDrop={(e) => { e.preventDefault(); if (canDrop) drop(col); else { setDragKey(undefined); setOverCol(undefined); toast(`Can't move to ${col.target} from ${dragging?.status}`, { tone: 'danger' }); } }}
							aria-label={`${col.title} column`}
						>
							<header className="mb-2 flex items-center gap-2 px-1.5 text-[13px] font-semibold">
								{col.title}
								<span className={cn('rounded-full px-1.5 text-[11px]', col.wip && items.length >= col.wip ? 'bg-danger-bg text-danger-fg' : 'bg-white text-t2')}>{col.wip ? `${items.length}/${col.wip}` : items.length}</span>
								{col.wip && items.length >= col.wip ? <span className="text-[11px] font-normal text-danger-fg">WIP limit</span> : null}
							</header>
							<div className="flex flex-1 flex-col gap-2">
								{items.map((t) => (
									<BoardCard key={t.key} t={t} now={now} onOpen={() => setSearch({ panel: t.key })} dragging={dragKey === t.key} onDragStart={() => setDragKey(t.key)} onDragEnd={() => { setDragKey(undefined); setOverCol(undefined); }} />
								))}
								{items.length === 0 ? <div className="rounded-[10px] border border-dashed border-border-strong p-4 text-center text-xs text-t3">{dragging ? (canDrop ? `Drop to move to ${col.target}` : 'Not allowed from here') : 'Empty'}</div> : null}
							</div>
						</section>
					);
				})}
			</div>

			{/* Mobile: one column at a time */}
			<div className="lg:hidden" data-tour="m-board">
				<div className="mb-3 flex items-center justify-between">
					<button type="button" onClick={() => setMobileCol((c) => Math.max(0, c - 1))} disabled={mobileCol === 0} className="grid size-9 place-items-center rounded-full bg-white shadow-card disabled:opacity-40" aria-label="Previous column"><ChevronLeft size={18} /></button>
					<div className="text-center"><b className="text-[15px]">{columns[mobileCol]!.title}</b><div className="mt-1 flex justify-center gap-1">{columns.map((c, i) => <span key={c.id} className={cn('size-1.5 rounded-full', i === mobileCol ? 'bg-brand-900' : 'bg-border-strong')} />)}</div></div>
					<button type="button" onClick={() => setMobileCol((c) => Math.min(columns.length - 1, c + 1))} disabled={mobileCol === columns.length - 1} className="grid size-9 place-items-center rounded-full bg-white shadow-card disabled:opacity-40" aria-label="Next column"><ChevronRight size={18} /></button>
				</div>
				<div className="space-y-2">
					{visible.filter((t) => columns[mobileCol]!.statuses.includes(t.status)).map((t) => (
						<BoardCard key={t.key} t={t} now={now} onOpen={() => setSearch({ panel: t.key })} dragging={false} onDragStart={() => {}} onDragEnd={() => {}} />
					))}
					{visible.filter((t) => columns[mobileCol]!.statuses.includes(t.status)).length === 0 ? <Card><EmptyState title="Nothing here" /></Card> : null}
				</div>
			</div>

			{search.panel ? <TicketDetail ticketKey={search.panel} orgSlug={org.slug} onClose={() => setSearch({ panel: undefined })} /> : null}
			<CreateTicketDialog open={creating} onClose={() => setCreating(false)} defaultProjectKey={projectKey} onCreated={(key) => setSearch({ panel: key })} />
		</>
	);
}
