import { useMemo, useState, type DragEvent } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Users } from 'lucide-react';
import { Avatar, Button, Card, Checkbox, PriorityPill, TypeDot } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useAuthStore } from '@/shared/lib/auth-store';
import { useNow } from '@/shared/lib/time';
import { toast } from '@/shared/lib/toast-store';
import { memberById } from '@/mocks/db';
import { statusCategory } from '@/mocks/seed';
import type { Ticket } from '@/mocks/types';
import { isLiveApi } from '@/shared/lib/live-api';
import { useProjectTickets } from '@/features/tickets/hooks/useProjectTickets';
import { useTicketActions } from '@/features/tickets/hooks/useTicketActions';
import { TicketDetail } from '@/features/tickets/components/TicketDetail';
import { CreateTicketDialog } from '@/features/tickets/components/CreateTicketDialog';
import { IssueRow } from '../components/IssueRow';
import { addDays, fmtDay, fmtMonth, fmtRange, fromIsoDate, monthGrid, sameDay, startOfDay, startOfWeek, toIsoDate, weekDays } from '../lib/dates';
import { useProject } from '../hooks/useProject';
import { useProjectSprint } from '../hooks/useProjectSprint';
import { useProjectSettings } from '../settings/hooks';
import type { CalendarSearch } from '../model';

const ROUTE = '/authed/$org/projects/$projectKey/calendar' as const;

export function ProjectCalendarPage() {
	const org = useAuthStore((s) => s.org)!;
	const actions = useTicketActions(org.slug);
	const { projectKey } = useParams({ from: ROUTE });
	const search = useSearch({ from: ROUTE });
	const navigate = useNavigate();
	const project = useProject(org.slug, projectKey).project!;
	const { tickets: allTickets } = useProjectTickets(org.slug, projectKey);
	const projectSprint = useProjectSprint(org.slug, project);
	const settings = useProjectSettings(project);
	const now = useNow(60_000);
	const [dragKey, setDragKey] = useState<string>();
	const [overDay, setOverDay] = useState<string>();
	const [creating, setCreating] = useState(false);
	const [selectedDay, setSelectedDay] = useState<number>(() => startOfDay(Date.now()));

	const setSearch = (patch: Partial<CalendarSearch>) => navigate({ to: '/$org/projects/$projectKey/calendar', params: { org: org.slug, projectKey }, search: { ...search, ...patch }, replace: true });

	const startDay = settings.general.startDay;
	const anchor = fromIsoDate(search.date) ?? startOfDay(now);
	const grid = useMemo(() => monthGrid(anchor, startDay), [anchor, startDay]);
	const week = useMemo(() => weekDays(startOfWeek(anchor, startDay)), [anchor, startDay]);
	const anchorMonth = new Date(anchor).getMonth();

	const tickets = useMemo(
		() => allTickets.filter((t) => t.projectKey === projectKey && t.type !== 'epic' && (!search.assignee || t.assigneeId === search.assignee) && (!search.hideDone || statusCategory[t.status] !== 'done')),
		[allTickets, projectKey, search.assignee, search.hideDone],
	);
	const byDay = useMemo(() => {
		const m = new Map<string, Ticket[]>();
		for (const t of tickets) {
			if (!t.dueAt) continue;
			const k = toIsoDate(t.dueAt);
			m.set(k, [...(m.get(k) ?? []), t]);
		}
		for (const list of m.values()) list.sort((a, b) => a.priority.localeCompare(b.priority));
		return m;
	}, [tickets]);
	const unscheduled = useMemo(() => tickets.filter((t) => !t.dueAt && statusCategory[t.status] !== 'done'), [tickets]);
	const assignees = useMemo(() => Array.from(new Set(allTickets.filter((t) => t.projectKey === projectKey).map((t) => t.assigneeId).filter(Boolean))).map((id) => memberById(id!)).filter(Boolean), [allTickets, projectKey]);

	const sprint = projectSprint
		? (() => { const start = startOfDay(addDays(now, -(projectSprint.burndown.length - 1))); return { name: projectSprint.name, start, end: addDays(start, projectSprint.totalDays - 1) }; })()
		: undefined;
	const inSprint = (d: number) => !!sprint && d >= sprint.start && d <= sprint.end;

	const go = (dir: -1 | 0 | 1) => {
		if (dir === 0) return setSearch({ date: undefined });
		const d = new Date(anchor);
		if (search.view === 'month') d.setMonth(d.getMonth() + dir, 1);
		else d.setDate(d.getDate() + dir * 7);
		setSearch({ date: toIsoDate(d.getTime()) });
	};

	const reschedule = (key: string, day: number | undefined) => {
		const t = tickets.find((x) => x.key === key);
		if (!t) return;
		if (day === undefined) {
			if (!t.dueAt) return;
			// Live, a failed write reports itself and the tickets refetch; only the mock
			// (which cannot fail) is told it succeeded.
			void actions.patchFields(t, { due_at: null }).then(() => {
				if (!isLiveApi()) toast(`${t.key} moved to unscheduled`, { tone: 'success' });
			});
			return;
		}
		if (t.dueAt && sameDay(t.dueAt, day)) return;
		const prev = t.dueAt ? new Date(t.dueAt) : undefined;
		const next = new Date(day);
		next.setHours(prev?.getHours() ?? 17, prev?.getMinutes() ?? 0, 0, 0);
		void actions.patchFields(t, { due_at: next.toISOString() }).then(() => {
			if (!isLiveApi()) toast(`${t.key} now due ${fmtDay(next.getTime(), { weekday: 'short', day: 'numeric', month: 'short' })}`, { tone: 'success' });
		});
	};
	const dropProps = (id: string, day: number | undefined) => ({
		onDragOver: (e: DragEvent) => { if (dragKey) { e.preventDefault(); if (overDay !== id) setOverDay(id); } },
		onDragLeave: () => { if (overDay === id) setOverDay(undefined); },
		onDrop: (e: DragEvent) => { e.preventDefault(); if (dragKey) reschedule(dragKey, day); setDragKey(undefined); setOverDay(undefined); },
	});
	const dragProps = (t: Ticket) => ({
		draggable: true,
		onDragStart: (e: DragEvent) => { e.dataTransfer.effectAllowed = 'move'; setDragKey(t.key); },
		onDragEnd: () => { setDragKey(undefined); setOverDay(undefined); },
	});

	const title = search.view === 'month' ? fmtMonth(anchor) : fmtRange(week[0]!, week[6]!);
	const dayNames = week.map((d) => fmtDay(d, { weekday: 'short' }));

	return (
		<>
			<div className="mb-4 flex flex-wrap items-center gap-3">
				<div className="flex items-center gap-1">
					<Button iconOnly onClick={() => go(-1)} aria-label={search.view === 'month' ? 'Previous month' : 'Previous week'}><ChevronLeft size={16} /></Button>
					<Button onClick={() => go(0)}>Today</Button>
					<Button iconOnly onClick={() => go(1)} aria-label={search.view === 'month' ? 'Next month' : 'Next week'}><ChevronRight size={16} /></Button>
				</div>
				<h2 className="text-[17px] font-semibold">{title}</h2>
				{sprint ? <span className="hidden items-center gap-1.5 rounded-full bg-purple-bg px-2.5 py-0.5 text-xs font-medium text-purple-fg sm:inline-flex">{sprint.name} · {fmtRange(sprint.start, sprint.end)}</span> : null}
				<div className="ms-auto flex flex-wrap items-center gap-2">
					<div className="flex overflow-hidden rounded-sm border border-border-strong bg-white" role="group" aria-label="View">
						{(['month', 'week'] as const).map((v) => (
							<button key={v} type="button" onClick={() => setSearch({ view: v })} aria-pressed={search.view === v} className={cn('h-8 px-3 text-[13px] capitalize', search.view === v ? 'bg-brand-100 font-semibold text-brand-900' : 'text-t2 hover:bg-muted')}>{v}</button>
						))}
					</div>
					<div className="flex items-center gap-1" role="group" aria-label="Filter by assignee">
						<Users size={14} className="me-1 text-t3" aria-hidden />
						{assignees.map((m) => (
							<button key={m!.id} type="button" onClick={() => setSearch({ assignee: search.assignee === m!.id ? undefined : m!.id })} className={cn('rounded-full ring-2 ring-offset-1', search.assignee === m!.id ? 'ring-brand-600' : 'ring-transparent hover:ring-border-strong')} aria-pressed={search.assignee === m!.id} aria-label={m!.name} title={m!.name}>
								<Avatar name={m!.name} tint={m!.tint} size="sm" />
							</button>
						))}
					</div>
					<Checkbox label="Hide done" checked={!!search.hideDone} onChange={(e) => setSearch({ hideDone: e.target.checked || undefined })} />
					<Button variant="primary" onClick={() => setCreating(true)}><Plus size={15} aria-hidden /> Create issue</Button>
				</div>
			</div>

			{search.view === 'month' ? (
				<>
					<Card className="overflow-hidden">
						<div className="grid grid-cols-7 border-b border-border bg-muted text-center text-[11px] font-semibold tracking-wider text-t2 uppercase" role="row">
							{dayNames.map((d) => <div key={d} className="py-2" role="columnheader">{d}</div>)}
						</div>
						<div role="grid" aria-label={`${fmtMonth(anchor)} calendar`}>
							{grid.map((row, ri) => (
								<div key={ri} className="grid grid-cols-7" role="row">
									{row.map((d, ci) => {
										const iso = toIsoDate(d);
										const items = byDay.get(iso) ?? [];
										const outside = new Date(d).getMonth() !== anchorMonth;
										const isToday = sameDay(d, now);
										const sprintHere = inSprint(d);
										const showSprintLabel = sprintHere && (ci === 0 || d === sprint!.start);
										const selected = sameDay(d, selectedDay);
										return (
											<div
												key={iso}
												role="gridcell"
												aria-label={`${fmtDay(d, { weekday: 'long', day: 'numeric', month: 'long' })}, ${items.length} issues`}
												className={cn('relative min-h-[64px] border-b border-r border-border p-1 md:min-h-[118px] md:p-1.5', ci === 6 && 'border-r-0', ri === 5 && 'border-b-0', outside && 'bg-canvas/70', overDay === iso && 'bg-brand-100/50', selected && 'md:bg-transparent bg-brand-100/30')}
												{...dropProps(iso, d)}
											>
												<button type="button" onClick={() => setSelectedDay(d)} className="absolute inset-0 md:hidden" aria-label={`Select ${fmtDay(d, { weekday: 'long', day: 'numeric' })}`} />
												<div className="flex items-center justify-between">
													<button type="button" onClick={() => setSearch({ view: 'week', date: iso })} className={cn('grid size-6 place-items-center rounded-full text-xs', isToday ? 'bg-brand-900 font-semibold text-white' : outside ? 'text-t3' : 'text-t1 hover:bg-muted')} title="Open week">{new Date(d).getDate()}</button>
													{items.length ? <span className="text-[10px] text-t3 md:hidden">{items.length}</span> : null}
												</div>
												{sprintHere ? <div className="mt-1 h-1.5 rounded-full bg-purple-bg" title={sprint!.name}>{showSprintLabel ? <span className="sr-only">{sprint!.name}</span> : null}</div> : null}
												{showSprintLabel ? <div className="hidden truncate text-[10px] font-medium text-purple-fg md:block">{sprint!.name}</div> : null}
												<div className="mt-1 hidden md:block">
													{items.slice(0, 3).map((t) => <EventChip key={t.key} t={t} now={now} dragging={dragKey === t.key} onOpen={() => setSearch({ panel: t.key })} {...dragProps(t)} />)}
													{items.length > 3 ? <button type="button" onClick={() => setSearch({ view: 'week', date: iso })} className="mt-0.5 px-1 text-[11px] font-medium text-brand-600 hover:underline">+{items.length - 3} more</button> : null}
												</div>
												<div className="mt-1 flex flex-wrap gap-0.5 md:hidden">
													{items.slice(0, 6).map((t) => <TypeDot key={t.key} type={t.type} />)}
												</div>
											</div>
										);
									})}
								</div>
							))}
						</div>
					</Card>

					<Card className="mt-4 p-4 md:hidden">
						<h3 className="text-sm font-semibold">{fmtDay(selectedDay, { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
						{(byDay.get(toIsoDate(selectedDay)) ?? []).length === 0 ? <p className="mt-2 text-[13px] text-t3">Nothing due on this day.</p> : null}
						<div className="mt-2">
							{(byDay.get(toIsoDate(selectedDay)) ?? []).map((t) => <IssueRow key={t.key} t={t} now={now} onOpen={() => setSearch({ panel: t.key })} showStatus />)}
						</div>
					</Card>
				</>
			) : (
				<div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
					<Card className={cn('p-4 transition-colors lg:sticky lg:top-4 lg:self-start', overDay === 'unscheduled' && 'ring-2 ring-brand-600')} {...dropProps('unscheduled', undefined)}>
						<h3 className="flex items-center gap-2 text-sm font-semibold"><CalendarDays size={15} className="text-t3" /> No due date <span className="text-xs font-normal text-t2">{unscheduled.length}</span></h3>
						<p className="mt-1 text-xs text-t2">Drag onto a day to schedule.</p>
						<ul className="mt-3 max-h-[520px] space-y-1 overflow-y-auto">
							{unscheduled.map((t) => (
								<li key={t.key} {...dragProps(t)} className={cn('cursor-grab rounded-md border border-border bg-white p-2 text-[12px] active:cursor-grabbing', dragKey === t.key && 'opacity-40')}>
									<div className="flex items-center gap-1.5"><TypeDot type={t.type} /><button type="button" onClick={() => setSearch({ panel: t.key })} className="font-mono text-[11px] text-t2 hover:underline">{t.key}</button><PriorityPill priority={t.priority} className="ms-auto" /></div>
									<div className="mt-1 line-clamp-2 leading-snug">{t.title}</div>
								</li>
							))}
							{unscheduled.length === 0 ? <li className="text-[12px] text-t3">Every open issue has a date.</li> : null}
						</ul>
					</Card>

					<Card className="min-w-0 overflow-hidden">
						<div className="grid md:grid-cols-7">
							{week.map((d, i) => {
								const iso = toIsoDate(d);
								const items = byDay.get(iso) ?? [];
								const isToday = sameDay(d, now);
								return (
									<div key={iso} className={cn('min-h-[120px] border-b border-border md:min-h-[460px] md:border-b-0 md:border-r', i === 6 && 'md:border-r-0', overDay === iso && 'bg-brand-100/40', isToday && 'bg-brand-100/15')} {...dropProps(iso, d)}>
										<div className={cn('flex items-center justify-between border-b border-border px-3 py-2 text-[12px]', isToday && 'font-semibold text-brand-900')}>
											<span>{fmtDay(d, { weekday: 'short' })} <span className={cn('ms-0.5 inline-grid size-6 place-items-center rounded-full', isToday && 'bg-brand-900 text-white')}>{new Date(d).getDate()}</span></span>
											<span className="text-t3">{items.length || ''}</span>
										</div>
										{inSprint(d) ? <div className="mx-2 mt-2 truncate rounded bg-purple-bg px-1.5 py-0.5 text-[10px] font-medium text-purple-fg">{sprint!.name}</div> : null}
										<div className="space-y-1.5 p-2">
											{items.map((t) => {
												const m = memberById(t.assigneeId);
												const done = statusCategory[t.status] === 'done';
												const late = !done && t.dueAt! < now;
												return (
													<div key={t.key} {...dragProps(t)} className={cn('cursor-grab rounded-md border bg-white p-2 text-[12px] shadow-card active:cursor-grabbing', dragKey === t.key && 'opacity-40', late ? 'border-high-fg/40' : 'border-border')}>
														<div className="flex items-center gap-1.5"><TypeDot type={t.type} /><button type="button" onClick={() => setSearch({ panel: t.key })} className="font-mono text-[11px] text-t2 hover:underline">{t.key}</button>{m ? <Avatar name={m.name} tint={m.tint} src={m.avatarUrl} size="xs" className="ms-auto" /> : null}</div>
														<button type="button" onClick={() => setSearch({ panel: t.key })} className={cn('mt-1 line-clamp-2 text-left leading-snug hover:underline', done && 'text-t3 line-through')}>{t.title}</button>
														<div className="mt-1.5 flex items-center gap-1.5"><PriorityPill priority={t.priority} />{late ? <span className="text-[10px] font-semibold text-high-fg">Overdue</span> : null}</div>
													</div>
												);
											})}
										</div>
									</div>
								);
							})}
						</div>
					</Card>
				</div>
			)}

			<CreateTicketDialog open={creating} onClose={() => setCreating(false)} defaultProjectKey={projectKey} onCreated={(key) => setSearch({ panel: key })} />
			{search.panel ? <TicketDetail ticketKey={search.panel} orgSlug={org.slug} onClose={() => setSearch({ panel: undefined })} /> : null}
		</>
	);
}

function EventChip({ t, now, dragging, onOpen, ...drag }: { t: Ticket; now: number; dragging: boolean; onOpen: () => void; draggable: boolean; onDragStart: (e: DragEvent) => void; onDragEnd: () => void }) {
	const done = statusCategory[t.status] === 'done';
	const late = !done && !!t.dueAt && t.dueAt < now;
	return (
		<button type="button" onClick={onOpen} {...drag} className={cn('flex w-full cursor-grab items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] hover:bg-muted active:cursor-grabbing', dragging && 'opacity-40', late && 'bg-high-bg/60')} title={`${t.key} · ${t.title}`}>
			<TypeDot type={t.type} />
			<span className="shrink-0 font-mono text-[10px] text-t2">{t.key}</span>
			<span className={cn('truncate', done && 'text-t3 line-through', late && 'font-medium text-high-fg')}>{t.title}</span>
		</button>
	);
}
