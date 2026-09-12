import { useMemo, useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import { AlertTriangle, Clock, Plus, Share2, Star, Target, Ticket as TicketIcon, Users, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Avatar, Button, Card, CardHeader, Pill, ProgressBar, StatusPill, TypeDot } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useAuthStore } from '@/shared/lib/auth-store';
import { dueLabel, relativeTime, useNow } from '@/shared/lib/time';
import { epics, memberById, useDb } from '@/mocks/db';
import { statusCategory } from '@/mocks/seed';
import { toast } from '@/shared/lib/toast-store';
import { CreateTicketDialog } from '@/features/tickets/components/CreateTicketDialog';
import { TicketDetail } from '@/features/tickets/components/TicketDetail';

function Kpi({ label, value, icon, tint, trend, good, bar }: { label: string; value: string; icon: React.ReactNode; tint: string; trend?: string; good?: boolean; bar?: number }) {
	const TrendIcon = good ? ArrowDownRight : ArrowUpRight;
	return (
		<Card className="p-5">
			<div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-t2 uppercase">
				{label}
				<span className={cn('grid size-8 place-items-center rounded-full', tint)}>{icon}</span>
			</div>
			<div className="tabular mt-4 text-[32px] leading-none font-semibold">{value}</div>
			{bar != null ? <ProgressBar value={bar} className="mt-4" /> : trend ? <div className={cn('mt-3 flex items-center gap-1 text-xs', good ? 'text-success' : 'text-high-fg')}><TrendIcon size={12} /> {trend}</div> : null}
		</Card>
	);
}

export function ProjectOverviewPage() {
	const org = useAuthStore((s) => s.org)!;
	const { projectKey } = useParams({ from: '/authed/$org/projects/$projectKey/overview' });
	const project = useDb((s) => s.projects.find((p) => p.key === projectKey))!;
	const allTickets = useDb((s) => s.tickets);
	const membersList = useDb((s) => s.members);
	const tickets = useMemo(() => allTickets.filter((t) => t.projectKey === projectKey), [allTickets, projectKey]);
	const toggleStar = useDb((s) => s.toggleStar);
	const now = useNow(60_000);
	const [creating, setCreating] = useState(false);
	const [panel, setPanel] = useState<string>();

	const open = tickets.filter((t) => statusCategory[t.status] !== 'done');
	const overdue = open.filter((t) => t.dueAt && t.dueAt < now);
	const dueThisWeek = useMemo(() => open.filter((t) => t.dueAt && t.dueAt < now + 7 * 86_400_000).sort((a, b) => a.dueAt! - b.dueAt!), [open, now]);
	const projectEpics = epics.filter((e) => e.projectKey === projectKey);
	const members = project.memberIds.map(memberById).filter(Boolean).slice(0, 3);
	const dist = project.statusDistribution ?? [];
	const distTotal = dist.reduce((s, d) => s + d.count, 0) || 1;
	const openCount = project.stats.open + Math.max(0, open.length - (project.key === 'KS' ? 15 : project.key === 'PB' ? 8 : project.key === 'MOB' ? 3 : project.key === 'NET' ? 2 : 0));
	const activity = useMemo(() => {
		const live = tickets.flatMap((t) => t.activity.map((a) => ({ id: `${t.key}-${a.id}`, actorName: a.actorName, text: `${a.text} on`, ticketKey: t.key, at: a.at }))).filter((a) => a.at > now - 6 * 3600_000);
		return [...live, ...project.activity].sort((a, b) => b.at - a.at).slice(0, 6);
	}, [tickets, project.activity, now]);

	const burndown = project.sprint ? project.sprint.burndown.map((v, i) => ({ day: i, remaining: v, ideal: Math.round(project.sprint!.points * (1 - i / project.sprint!.totalDays)) })) : [];

	return (
		<>
			<div className="flex flex-wrap items-start gap-4">
				<span className="grid size-14 place-items-center rounded-[12px] text-lg font-bold text-white" style={{ background: project.color }}>{project.key.slice(0, 2)}</span>
				<div className="min-w-0 flex-1">
					<h2 className="flex items-center gap-2 text-[22px] font-semibold">
						{project.name}
						<button type="button" onClick={() => toggleStar(project.id)} className={cn(project.starred ? 'text-warning' : 'text-border-strong hover:text-warning')} aria-pressed={project.starred} aria-label="Star project"><Star size={18} fill={project.starred ? 'currentColor' : 'none'} /></button>
					</h2>
					<p className="text-[13px] text-t2">{project.description} · {openCount} issues{project.sprint ? ` · ${project.sprint.name} active` : ''}</p>
				</div>
				<div className="flex items-center gap-2.5">
					<Link to="/$org/users" params={{ org: org.slug }} search={{}}><Button><Users size={15} aria-hidden /> {project.memberIds.length} members</Button></Link>
					<Button onClick={() => { navigator.clipboard?.writeText(window.location.href).catch(() => {}); toast('Link copied'); }}><Share2 size={15} aria-hidden /> Share</Button>
					<Button variant="primary" onClick={() => setCreating(true)}><Plus size={15} aria-hidden /> Create issue</Button>
				</div>
			</div>

			<section className="mt-5 grid grid-cols-2 gap-4 xl:grid-cols-4" aria-label="Project metrics">
				<Kpi label="Open issues" value={String(openCount)} icon={<TicketIcon size={15} />} tint="bg-brand-100 text-brand-900" trend={project.stats.openDelta} good={project.stats.openDelta.startsWith('-')} />
				{project.sprint ? <Kpi label="Sprint progress" value={`${Math.round(((project.sprint.points - project.sprint.remaining) / project.sprint.points) * 100)}%`} icon={<Target size={15} />} tint="bg-success-bg text-success-fg" bar={((project.sprint.points - project.sprint.remaining) / project.sprint.points) * 100} /> : <Kpi label="Resolved this week" value={String(tickets.filter((t) => t.resolvedAt && t.resolvedAt > now - 7 * 86_400_000).length)} icon={<Target size={15} />} tint="bg-success-bg text-success-fg" trend="on track" good />}
				<Kpi label="Cycle time" value={`${project.stats.cycleDays}d`} icon={<Clock size={15} />} tint="bg-info-bg text-info-fg" trend={project.stats.cycleDelta} good={project.stats.cycleDelta.startsWith('-')} />
				<Kpi label="Overdue" value={String(project.stats.overdue + overdue.length - (project.key === 'MOB' ? 1 : 0))} icon={<AlertTriangle size={15} />} tint="bg-danger-bg text-danger-fg" trend={project.stats.overdueDelta} good={false} />
			</section>

			<section className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr_1fr]">
				<div className="space-y-4">
					<Card className="p-5">
						<CardHeader title="Epics" sub="Rollup progress by child issues" action={project.kind === 'software' ? <Link to="/$org/projects/$projectKey/roadmap" params={{ org: org.slug, projectKey }} className="text-[13px] text-brand-600 hover:underline">View roadmap</Link> : null} />
						{projectEpics.length === 0 ? <p className="mt-3 text-[13px] text-t3">No epics in this project.</p> : null}
						<ul className="mt-2 divide-y divide-border">
							{projectEpics.map((e) => (
								<li key={e.id} className="flex items-center gap-3 py-3 text-[13px]">
									<TypeDot type="epic" />
									<div className="min-w-0 flex-1">
										<div className="flex items-center justify-between gap-2"><b className={cn(e.status === 'Done' && 'text-t2')}>{e.name}</b><span className="tabular text-xs text-t2">{e.done} / {e.total}</span></div>
										<ProgressBar value={(e.done / e.total) * 100} color={e.status === 'Done' ? '#22a05b' : '#6b3fa0'} className="mt-1.5" label={e.name} />
									</div>
									<Pill tone={e.status === 'Done' ? 'done' : e.status === 'In progress' ? 'progress' : 'closed'}>{e.status}</Pill>
									<span className="w-[68px] text-right text-xs text-t2">{e.dueLabel}</span>
								</li>
							))}
						</ul>
					</Card>
					<Card className="p-5">
						<CardHeader title="Due this week" sub={`${dueThisWeek.length} issues · ${overdue.length} overdue`} action={<Link to="/$org/projects/$projectKey/calendar" params={{ org: org.slug, projectKey }} className="text-[13px] text-brand-600 hover:underline">Calendar</Link>} />
						<ul className="mt-2 divide-y divide-border">
							{dueThisWeek.length === 0 ? <li className="py-3 text-[13px] text-t3">Nothing due this week.</li> : null}
							{dueThisWeek.map((t) => {
								const d = dueLabel(t.dueAt!, now);
								const m = memberById(t.assigneeId);
								return (
									<li key={t.key}>
										<button type="button" onClick={() => setPanel(t.key)} className="flex w-full items-center gap-3 py-2.5 text-left text-[13px] hover:underline">
											<TypeDot type={t.type} />
											<span className="font-mono text-xs text-t2">{t.key}</span>
											<span className="min-w-0 flex-1 truncate">{t.title}{t.status === 'Blocked' ? <StatusPill status="Blocked" className="ms-2" /> : null}</span>
											{m ? <Avatar name={m.name} tint={m.tint} size="sm" /> : <span className="grid size-6 place-items-center rounded-full bg-muted text-[10px] text-t3">?</span>}
											<span className={cn('w-[72px] text-right text-xs', d.tone === 'muted' ? 'text-t2' : 'font-semibold text-high-fg')}>{d.label}</span>
										</button>
									</li>
								);
							})}
						</ul>
					</Card>
				</div>

				<div className="space-y-4">
					<Card className="p-5">
						<CardHeader title="Status distribution" sub={`${openCount} open issues`} />
						<div className="mt-3 flex items-center gap-5">
							<svg width="130" height="130" viewBox="0 0 42 42" role="img" aria-label="Status distribution donut">
								<circle cx="21" cy="21" r="15.9" fill="none" stroke="#e8eaed" strokeWidth="6" />
								{dist.reduce<{ els: React.ReactNode[]; off: number }>((acc, d) => { const pct = (d.count / distTotal) * 100; acc.els.push(<circle key={d.label} cx="21" cy="21" r="15.9" fill="none" stroke={d.color} strokeWidth="6" strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={acc.off} />); acc.off -= pct; return acc; }, { els: [], off: 25 }).els}
							</svg>
							<ul className="flex-1 space-y-1.5 text-[13px]">
								{dist.map((d) => (
									<li key={d.label} className="flex items-center gap-2"><span className="size-[7px] rounded-full" style={{ background: d.color }} />{d.label}<b className="tabular ms-auto">{d.count}</b></li>
								))}
							</ul>
						</div>
					</Card>
					{project.sprint ? (
						<Card className="p-5">
							<CardHeader title={`Active sprint · ${project.sprint.name}`} sub={`${project.sprint.daysLeft} days left · ${project.sprint.points} pts`} action={<Link to="/$org/projects/$projectKey/sprints" params={{ org: org.slug, projectKey }} className="text-[13px] text-brand-600 hover:underline">Report</Link>} />
							<div className="mt-3 h-[150px]" role="img" aria-label="Sprint burndown chart">
								<ResponsiveContainer width="100%" height="100%">
									<LineChart data={burndown} margin={{ top: 8, right: 20, left: -24, bottom: 0 }}>
										<XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#8a97a0' }} tickFormatter={(d: number) => (d === 0 ? '3 Sep' : d === burndown.length - 1 ? 'Today' : '')} interval={0} />
										<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#8a97a0' }} />
										<Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e8ec' }} />
										<ReferenceLine x={burndown.length - 1} stroke="#2e6f86" strokeDasharray="3 3" />
										<Line type="monotone" dataKey="ideal" stroke="#cbd2d9" strokeDasharray="4 4" dot={false} isAnimationActive={false} name="Ideal" />
										<Line type="monotone" dataKey="remaining" stroke="#2f5f70" strokeWidth={2} dot={false} isAnimationActive={false} name="Remaining" />
									</LineChart>
								</ResponsiveContainer>
							</div>
							<div className="mt-1 flex gap-4 text-xs text-t2"><span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-brand-700" />Remaining {project.sprint.remaining} pts</span><span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t border-dashed border-border-strong" />Ideal</span></div>
						</Card>
					) : null}
				</div>

				<div className="space-y-4">
					<Card className="p-5">
						<CardHeader title="Recent activity" />
						<ul className="mt-3 space-y-3.5 text-[13px]">
							{activity.map((a) => {
								const m = membersList.find((x) => x.name === a.actorName);
								return (
									<li key={a.id} className="flex gap-2.5">
										{a.actorName === 'Automation' ? <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-900"><Target size={12} /></span> : <Avatar name={a.actorName} tint={m?.tint ?? 'grey'} size="sm" />}
										<div className="min-w-0">
											<b>{a.actorName}</b> {a.text}{' '}
											{a.ticketKey ? <button type="button" onClick={() => setPanel(a.ticketKey)} className="font-mono text-xs text-brand-600 hover:underline">{a.ticketKey}</button> : null}
											<div className="text-xs text-t3">{relativeTime(a.at, now)}</div>
										</div>
									</li>
								);
							})}
						</ul>
					</Card>
					<Card className="p-5">
						<CardHeader title="Team" action={<Link to="/$org/users" params={{ org: org.slug }} search={{}} className="text-[13px] text-brand-600 hover:underline">Manage</Link>} />
						<ul className="mt-3 space-y-3 text-[13px]">
							{members.map((m) => (
								<li key={m!.id} className="flex items-center gap-2.5">
									<Avatar name={m!.name} tint={m!.tint} />
									<div className="min-w-0 flex-1"><b className="block truncate">{m!.name}</b><span className="text-xs text-t2">{m!.id === project.leadId ? 'Lead' : m!.role} · {tickets.filter((t) => t.assigneeId === m!.id && statusCategory[t.status] !== 'done').length} open</span></div>
									<Pill tone={m!.presence === 'Away' || m!.presence === 'Break' ? 'closed' : 'done'}>{m!.presence === 'Away' || m!.presence === 'Break' ? 'Away' : 'Active'}</Pill>
								</li>
							))}
						</ul>
						{project.memberIds.length > 3 ? <p className="mt-3 text-xs text-t2">+{project.memberIds.length - 3} more members</p> : null}
					</Card>
				</div>
			</section>

			<CreateTicketDialog open={creating} onClose={() => setCreating(false)} defaultProjectKey={projectKey} onCreated={(key) => setPanel(key)} />
			{panel ? <TicketDetail ticketKey={panel} orgSlug={org.slug} onClose={() => setPanel(undefined)} /> : null}
		</>
	);
}
