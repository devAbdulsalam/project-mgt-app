import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { AlertTriangle, ChevronDown, ChevronRight, MoreHorizontal, Plus, Settings2, UserMinus, Wand2 } from 'lucide-react';
import { Avatar, Button, Card, CardHeader, Menu, Pill, Select, StatTile } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useAuthStore } from '@/shared/lib/auth-store';
import { useNow } from '@/shared/lib/time';
import { toast } from '@/shared/lib/toast-store';
import { memberById } from '@/mocks/db';
import { statusCategory } from '@/mocks/seed';
import type { TeamMember, Ticket } from '@/mocks/types';
import { isLiveApi } from '@/shared/lib/live-api';
import { useProjectTickets } from '@/features/tickets/hooks/useProjectTickets';
import { useTicketActions } from '@/features/tickets/hooks/useTicketActions';
import { TicketDetail } from '@/features/tickets/components/TicketDetail';
import { CreateTicketDialog } from '@/features/tickets/components/CreateTicketDialog';
import { IssueRow } from '../components/IssueRow';
import { addDays, fmtDay, sameDay, startOfDay, startOfWeek } from '../lib/dates';
import { fmtHours, loadHours, memberDays, utilisationTone } from '../lib/workload';
import { useProject } from '../hooks/useProject';
import { useProjectSprint } from '../hooks/useProjectSprint';
import { useProjectSettings } from '../settings/hooks';
import type { WorkloadSearch } from '../model';

const ROUTE = '/authed/$org/projects/$projectKey/workload' as const;
const priorityRank = { P1: 0, P2: 1, P3: 2, P4: 3 } as const;

interface Row {
	member: TeamMember;
	issues: Ticket[];
	hours: number;
	capacity: number;
	pct: number;
	dueInPeriod: number;
	overdue: number;
	byDay: number[];
}

export function ProjectWorkloadPage() {
	const org = useAuthStore((s) => s.org)!;
	const actions = useTicketActions(org.slug);
	const { projectKey } = useParams({ from: ROUTE });
	const search = useSearch({ from: ROUTE });
	const navigate = useNavigate();
	const project = useProject(org.slug, projectKey).project!;
	const { tickets: allTickets } = useProjectTickets(org.slug, projectKey);
	const sprint = useProjectSprint(org.slug, project);
	const settings = useProjectSettings(project);
	const now = useNow(60_000);
	const [dragKey, setDragKey] = useState<string>();
	const [overId, setOverId] = useState<string>();
	const [creating, setCreating] = useState(false);
	const [expanded, setExpanded] = useState<Record<string, boolean>>({});

	const setSearch = (patch: Partial<WorkloadSearch>) => navigate({ to: '/$org/projects/$projectKey/workload', params: { org: org.slug, projectKey }, search: { ...search, ...patch }, replace: true });

	const period = search.period === 'sprint' && !sprint ? 'week' : search.period;
	const weeks = period === 'week' ? 1 : period === 'fortnight' ? 2 : Math.max(0.4, (sprint?.daysLeft ?? 7) / 7);
	const periodStart = period === 'sprint' ? startOfDay(now) : startOfWeek(now, settings.general.startDay);
	const periodDays = period === 'sprint' ? Math.max(1, sprint?.daysLeft ?? 7) : Math.round(weeks * 7);
	const periodEnd = addDays(periodStart, periodDays);
	const days = useMemo(() => Array.from({ length: Math.min(periodDays, 14) }, (_, i) => addDays(periodStart, i)), [periodStart, periodDays]);

	const open = useMemo(
		() => allTickets.filter((t) => t.projectKey === projectKey && t.type !== 'epic' && statusCategory[t.status] !== 'done' && (!search.type || t.type === search.type)),
		[allTickets, projectKey, search.type],
	);
	const sortIssues = (list: Ticket[]) => [...list].sort((a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity) || priorityRank[a.priority] - priorityRank[b.priority]);

	const rows = useMemo<Row[]>(() => {
		const members = project.memberIds.map((id) => memberById(id)).filter((m): m is TeamMember => !!m && m.status === 'Active');
		return members.map((member) => {
			const issues = sortIssues(open.filter((t) => t.assigneeId === member.id));
			const hours = issues.reduce((s, t) => s + loadHours(t), 0);
			const capacity = memberDays(member, settings.general.workingDays, weeks) * settings.general.focusHoursPerDay;
			const byDay = days.map((d) => issues.filter((t) => t.dueAt && sameDay(t.dueAt, d)).reduce((s, t) => s + loadHours(t), 0));
			return {
				member,
				issues,
				hours,
				capacity,
				pct: capacity ? Math.round((hours / capacity) * 100) : 0,
				dueInPeriod: issues.filter((t) => t.dueAt && t.dueAt >= periodStart && t.dueAt < periodEnd).length,
				overdue: issues.filter((t) => t.dueAt && t.dueAt < now).length,
				byDay,
			};
		}).sort((a, b) => b.pct - a.pct);
	}, [open, project.memberIds, settings.general, weeks, days, periodStart, periodEnd, now]);

	const unassigned = useMemo(() => sortIssues(open.filter((t) => !t.assigneeId || !project.memberIds.includes(t.assigneeId))), [open, project.memberIds]);
	const totals = useMemo(() => {
		const capacity = rows.reduce((s, r) => s + r.capacity, 0);
		const load = rows.reduce((s, r) => s + r.hours, 0);
		return { capacity, load, pct: capacity ? Math.round((load / capacity) * 100) : 0, over: rows.filter((r) => r.pct > 100).length, unassignedHours: unassigned.reduce((s, t) => s + loadHours(t), 0) };
	}, [rows, unassigned]);

	const suggestions = useMemo(() => {
		const out: { from: Row; to: Row; issue: Ticket }[] = [];
		const load = new Map(rows.map((r) => [r.member.id, r.hours]));
		for (const from of rows.filter((r) => r.pct > 100)) {
			const candidates = [...from.issues].sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority] || (b.dueAt ?? Infinity) - (a.dueAt ?? Infinity));
			for (const issue of candidates.slice(0, 2)) {
				const to = rows.filter((r) => r.member.id !== from.member.id && r.capacity > 0).sort((a, b) => load.get(a.member.id)! / a.capacity - load.get(b.member.id)! / b.capacity)[0];
				if (!to || (load.get(to.member.id)! + loadHours(issue)) / to.capacity > 0.9) continue;
				load.set(to.member.id, load.get(to.member.id)! + loadHours(issue));
				out.push({ from, to, issue });
			}
		}
		return out.slice(0, 4);
	}, [rows]);

	const reassign = (t: Ticket, memberId: string | undefined) => {
		if (t.assigneeId === memberId) return;
		const m = memberById(memberId);
		// Live, a failed write reports itself and the tickets refetch; only the mock
		// (which cannot fail) is told it succeeded.
		void actions.assign(t, memberId).then(() => {
			if (!isLiveApi()) toast(m ? `${t.key} assigned to ${m.name}` : `${t.key} unassigned`, { tone: 'success' });
		});
	};
	const drop = (memberId: string | undefined) => {
		const t = dragKey ? open.find((x) => x.key === dragKey) : undefined;
		setDragKey(undefined);
		setOverId(undefined);
		if (t) reassign(t, memberId);
	};
	const dropProps = (id: string, memberId: string | undefined) => ({
		onDragOver: (e: React.DragEvent) => { if (dragKey) { e.preventDefault(); if (overId !== id) setOverId(id); } },
		onDragLeave: () => { if (overId === id) setOverId(undefined); },
		onDrop: (e: React.DragEvent) => { e.preventDefault(); drop(memberId); },
	});
	const isExpanded = (r: Row) => expanded[r.member.id] ?? r.pct > 100;

	const reassignMenu = (t: Ticket) => (
		<Menu
			align="end"
			items={[
				...rows.filter((r) => r.member.id !== t.assigneeId).map((r) => ({ key: r.member.id, label: r.member.name, hint: `${r.pct}%`, icon: <Avatar name={r.member.name} tint={r.member.tint} src={r.member.avatarUrl} size="xs" />, onSelect: () => reassign(t, r.member.id) })),
				...(t.assigneeId ? [{ key: 'none', label: 'Unassign', icon: <UserMinus size={14} />, danger: true, onSelect: () => reassign(t, undefined) }] : []),
			]}
			trigger={({ toggle, buttonProps }) => (
				<button type="button" onClick={toggle} {...buttonProps} className="grid size-7 shrink-0 place-items-center rounded-md text-t3 hover:bg-white hover:text-t1" aria-label={`Reassign ${t.key}`}>
					<MoreHorizontal size={15} />
				</button>
			)}
		/>
	);

	const periodLabel = period === 'sprint' ? `${sprint!.name} · ${sprint!.daysLeft} days left` : `${fmtDay(periodStart, { day: 'numeric', month: 'short' })} – ${fmtDay(addDays(periodEnd, -1), { day: 'numeric', month: 'short' })}`;

	return (
		<>
			<div className="mb-4 flex flex-wrap items-center gap-3">
				<div className="flex overflow-hidden rounded-sm border border-border-strong bg-white" role="group" aria-label="Period">
					{([['week', 'This week'], ['fortnight', 'Next 2 weeks'], ...(sprint ? [['sprint', 'Sprint'] as const] : [])] as const).map(([k, l]) => (
						<button key={k} type="button" onClick={() => setSearch({ period: k })} aria-pressed={period === k} className={cn('h-8 px-3 text-[13px]', period === k ? 'bg-brand-100 font-semibold text-brand-900' : 'text-t2 hover:bg-muted')}>{l}</button>
					))}
				</div>
				<span className="text-[13px] text-t2">{periodLabel}</span>
				<div className="ms-auto flex items-center gap-2">
					<Select value={search.type ?? ''} onChange={(e) => setSearch({ type: (e.target.value || undefined) as WorkloadSearch['type'] })} className="h-8 w-auto text-[13px]" aria-label="Filter by type">
						<option value="">All types</option>
						{(['task', 'bug', 'story', 'subtask', 'support'] as const).map((t) => <option key={t} value={t}>{t[0]!.toUpperCase() + t.slice(1)}</option>)}
					</Select>
					<Link to="/$org/projects/$projectKey/settings/$section" params={{ org: org.slug, projectKey, section: 'general' }} className="hidden sm:block"><Button title="Capacity settings"><Settings2 size={15} aria-hidden /> {settings.general.focusHoursPerDay}h × {settings.general.workingDays}d</Button></Link>
					<Button variant="primary" onClick={() => setCreating(true)}><Plus size={15} aria-hidden /> Create issue</Button>
				</div>
			</div>

			<section className="grid grid-cols-2 gap-4 xl:grid-cols-5" aria-label="Workload summary">
				<StatTile label="Team capacity" value={fmtHours(totals.capacity)} sub={`${rows.length} active members`} />
				<StatTile label="Planned load" value={fmtHours(totals.load)} sub={`${open.length - unassigned.length} assigned issues`} />
				<StatTile label="Utilisation" value={`${totals.pct}%`} sub={utilisationTone(totals.pct).label} subTone={totals.pct > 100 ? 'bad' : totals.pct >= 80 ? 'muted' : 'good'} />
				<StatTile label="Over capacity" value={String(totals.over)} sub={totals.over ? 'members need rebalancing' : 'nobody overloaded'} subTone={totals.over ? 'bad' : 'good'} />
				<StatTile label="Unassigned" value={String(unassigned.length)} sub={`${fmtHours(totals.unassignedHours)} of work waiting`} subTone={unassigned.length ? 'muted' : 'good'} className="col-span-2 xl:col-span-1" />
			</section>

			<section className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
				<div className="min-w-0 space-y-3">
					{rows.map((r) => {
						const tone = utilisationTone(r.pct);
						const openRow = isExpanded(r);
						return (
							<Card key={r.member.id} className={cn('transition-colors', overId === r.member.id && 'ring-2 ring-brand-600')} {...dropProps(r.member.id, r.member.id)}>
								<button type="button" onClick={() => setExpanded({ ...expanded, [r.member.id]: !openRow })} aria-expanded={openRow} className="flex w-full flex-wrap items-center gap-3 p-4 text-left">
									{openRow ? <ChevronDown size={16} className="text-t3" /> : <ChevronRight size={16} className="text-t3" />}
									<Avatar name={r.member.name} tint={r.member.tint} src={r.member.avatarUrl} size="lg" />
									<div className="min-w-[160px] flex-1">
										<b className="block text-[13px]">{r.member.name}{r.member.id === project.leadId ? <span className="ms-1.5 text-xs font-normal text-t2">Lead</span> : null}</b>
										<span className="text-xs text-t2">{r.member.role} · {r.member.base}</span>
									</div>
									<div className="order-last flex w-full items-center gap-3 sm:order-none sm:w-[300px]">
										<div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" role="meter" aria-valuenow={r.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${r.member.name} utilisation`}>
											<div className="h-full rounded-full transition-[width]" style={{ width: `${Math.min(100, r.pct)}%`, background: tone.bar }} />
										</div>
										<span className={cn('tabular w-[112px] shrink-0 text-right text-xs', tone.text)}><b>{fmtHours(r.hours)}</b> / {fmtHours(r.capacity)} · {r.pct}%</span>
									</div>
									<div className="flex shrink-0 items-center gap-2">
										{r.overdue ? <Pill tone="critical">{r.overdue} overdue</Pill> : null}
										<Pill tone={r.pct > 100 ? 'critical' : r.pct >= 80 ? 'medium' : 'done'}>{r.issues.length} {r.issues.length === 1 ? 'issue' : 'issues'}</Pill>
									</div>
								</button>
								{openRow ? (
									<div className="border-t border-border px-4 pt-3 pb-2">
										{days.length <= 14 ? (
											<div className="mb-3 flex items-end gap-1" aria-label="Hours due per day">
												{r.byDay.map((h, i) => {
													const d = days[i]!;
													const isToday = sameDay(d, now);
													return (
														<div key={d} className="flex flex-1 flex-col items-center gap-1" title={`${fmtDay(d)} · ${fmtHours(h)} due`}>
															<div className="flex h-8 w-full items-end rounded-sm bg-muted/60">
																<div className={cn('w-full rounded-sm', h > settings.general.focusHoursPerDay ? 'bg-danger' : 'bg-brand-600')} style={{ height: `${Math.min(100, (h / (settings.general.focusHoursPerDay * 1.5)) * 100)}%` }} />
															</div>
															<span className={cn('text-[10px]', isToday ? 'font-semibold text-brand-900' : 'text-t3')}>{fmtDay(d, { weekday: 'narrow' })}{days.length > 7 ? new Date(d).getDate() : ''}</span>
														</div>
													);
												})}
											</div>
										) : null}
										{r.issues.length === 0 ? <p className="py-2 text-[13px] text-t3">Nothing assigned. Drag an issue here.</p> : null}
										{r.issues.map((t) => (
											<IssueRow key={t.key} t={t} now={now} onOpen={() => setSearch({ panel: t.key })} draggable dragging={dragKey === t.key} onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDragKey(t.key); }} onDragEnd={() => { setDragKey(undefined); setOverId(undefined); }} trailing={<><span className="tabular w-9 text-right text-xs text-t2">{fmtHours(loadHours(t))}</span>{reassignMenu(t)}</>} />
										))}
									</div>
								) : null}
							</Card>
						);
					})}

					<Card className={cn('border-dashed transition-colors', overId === 'unassigned' && 'ring-2 ring-brand-600')} {...dropProps('unassigned', undefined)}>
						<div className="p-4">
							<CardHeader title={`Unassigned · ${unassigned.length}`} sub={unassigned.length ? `${fmtHours(totals.unassignedHours)} of work with no owner. Drag onto a member or use the menu.` : 'Everything has an owner. Drop an issue here to unassign it.'} />
							<div className="mt-2">
								{unassigned.map((t) => (
									<IssueRow key={t.key} t={t} now={now} onOpen={() => setSearch({ panel: t.key })} draggable dragging={dragKey === t.key} onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDragKey(t.key); }} onDragEnd={() => { setDragKey(undefined); setOverId(undefined); }} trailing={<><span className="tabular w-9 text-right text-xs text-t2">{fmtHours(loadHours(t))}</span>{reassignMenu(t)}</>} />
								))}
							</div>
						</div>
					</Card>
				</div>

				<div className="min-w-0 space-y-4">
					<Card className="p-5">
						<CardHeader title="Rebalance suggestions" sub={suggestions.length ? 'Lowest-priority work from overloaded members to whoever has room.' : totals.over ? 'Nobody has room this period. Consider moving due dates.' : 'The team is within capacity.'} />
						{suggestions.length ? (
							<ul className="mt-3 space-y-2.5">
								{suggestions.map((s) => (
									<li key={s.issue.key} className="rounded-md border border-border p-3 text-[13px]">
										<div className="flex items-center gap-1.5"><Wand2 size={13} className="text-brand-600" /> Move <button type="button" onClick={() => setSearch({ panel: s.issue.key })} className="font-mono text-xs text-brand-600 hover:underline">{s.issue.key}</button> to <b>{s.to.member.name.split(' ')[0]}</b></div>
										<div className="mt-1 text-xs text-t2">{s.from.member.name.split(' ')[0]} {s.from.pct}% → {s.to.member.name.split(' ')[0]} {s.to.pct}% · {fmtHours(loadHours(s.issue))}</div>
										<Button size="sm" variant="soft" className="mt-2" onClick={() => reassign(s.issue, s.to.member.id)}>Apply</Button>
									</li>
								))}
							</ul>
						) : null}
					</Card>
					<Card className="p-5">
						<CardHeader title="At a glance" />
						<ul className="mt-3 space-y-2 text-[13px]">
							{rows.filter((r) => r.pct > 100).map((r) => <li key={r.member.id} className="flex items-start gap-2 text-danger-fg"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> {r.member.name.split(' ')[0]} is at {r.pct}% with {r.issues.length} issues{r.overdue ? `, ${r.overdue} overdue` : ''}.</li>)}
							{rows.filter((r) => r.pct < 50).slice(0, 4).map((r) => <li key={r.member.id} className="flex items-start gap-2 text-t2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-success" /> {r.member.name.split(' ')[0]} has {fmtHours(r.capacity - r.hours)} free.</li>)}
							{rows.filter((r) => r.pct < 50).length > 4 ? <li className="text-t3">+{rows.filter((r) => r.pct < 50).length - 4} more with room.</li> : null}
							{rows.every((r) => r.pct >= 50 && r.pct <= 100) ? <li className="text-t2">Load is evenly spread across the team.</li> : null}
						</ul>
						<p className="mt-4 text-xs text-t3">Capacity = working days × focus hours from project settings. Effort = estimate, or story points × 4h, minus time logged.</p>
					</Card>
				</div>
			</section>

			<CreateTicketDialog open={creating} onClose={() => setCreating(false)} defaultProjectKey={projectKey} onCreated={(key) => setSearch({ panel: key })} />
			{search.panel ? <TicketDetail ticketKey={search.panel} orgSlug={org.slug} onClose={() => setSearch({ panel: undefined })} /> : null}
		</>
	);
}
