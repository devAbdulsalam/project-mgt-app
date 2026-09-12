import { Link } from '@tanstack/react-router';
import { Columns3, Plus, Star } from 'lucide-react';
import { AppShell, MobileHeader } from '@/shared/layouts/AppShell';
import { Avatar, Button, Card, EmptyState } from '@/shared/ui';
import { useAuthStore } from '@/shared/lib/auth-store';
import { memberById, useDb } from '@/mocks/db';
import { statusCategory } from '@/mocks/seed';
import { cn } from '@/shared/lib/cn';

/** Boards directory: one board per active project, plus quick stats per column group. */
export function BoardsPage() {
	const org = useAuthStore((s) => s.org)!;
	const user = useAuthStore((s) => s.user)!;
	const projects = useDb((s) => s.projects);
	const tickets = useDb((s) => s.tickets);
	const toggleStar = useDb((s) => s.toggleStar);
	const active = projects.filter((p) => !p.archived).sort((a, b) => Number(b.starred) - Number(a.starred));
	const mine = tickets.filter((t) => t.assigneeId === user.id && statusCategory[t.status] !== 'done');

	return (
		<AppShell meta={{ title: 'Boards', subtitle: `${active.length} boards · ${mine.length} of your issues in flight` }} mobileHeader={<MobileHeader><h1 className="text-xl font-semibold">Boards</h1></MobileHeader>}>
			{active.length === 0 ? (
				<Card><EmptyState icon={<Columns3 size={20} />} title="No boards yet" action={<Link to="/$org/projects" params={{ org: org.slug }} search={{}}><Button variant="primary"><Plus size={14} /> Create a project</Button></Link>} /></Card>
			) : (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{active.map((p) => {
						const mineHere = tickets.filter((t) => t.projectKey === p.key && t.type !== 'epic');
						const groups = p.kind === 'software'
							? [['To do', mineHere.filter((t) => ['New', 'Open', 'Scheduled'].includes(t.status)).length], ['In progress', mineHere.filter((t) => ['In progress', 'Dispatched'].includes(t.status)).length], ['Review', mineHere.filter((t) => t.status === 'In review').length], ['Blocked', mineHere.filter((t) => ['Blocked', 'Waiting on client', 'Awaiting vendor'].includes(t.status)).length], ['Done', mineHere.filter((t) => statusCategory[t.status] === 'done').length]]
							: [['Open', mineHere.filter((t) => ['New', 'Open'].includes(t.status)).length], ['Scheduled', mineHere.filter((t) => t.status === 'Scheduled').length], ['In progress', mineHere.filter((t) => ['In progress', 'Dispatched'].includes(t.status)).length], ['Waiting', mineHere.filter((t) => ['Waiting on client', 'Awaiting vendor', 'Blocked', 'In review'].includes(t.status)).length], ['Resolved', mineHere.filter((t) => statusCategory[t.status] === 'done').length]];
						const total = Math.max(1, groups.reduce((s, [, n]) => s + (n as number), 0));
						const lead = memberById(p.leadId);
						const myCount = mineHere.filter((t) => t.assigneeId === user.id && statusCategory[t.status] !== 'done').length;
						return (
							<Card key={p.id} className="flex flex-col p-5">
								<div className="flex items-start gap-3">
									<span className="grid size-10 shrink-0 place-items-center rounded-[10px] text-sm font-bold text-white" style={{ background: p.color }}>{p.key.slice(0, 2)}</span>
									<div className="min-w-0 flex-1">
										<Link to="/$org/projects/$projectKey/board" params={{ org: org.slug, projectKey: p.key }} search={{}} className="flex items-center gap-1.5 text-[15px] font-semibold hover:underline">{p.name} board</Link>
										<div className="text-xs text-t2">{p.kind === 'software' ? `Scrum · ${p.sprint?.name ?? 'no sprint'}` : 'Kanban · service queue'}{p.sprint ? ` · ${p.sprint.daysLeft}d left` : ''}</div>
									</div>
									<button type="button" onClick={() => toggleStar(p.id)} className={cn(p.starred ? 'text-warning' : 'text-border-strong hover:text-warning')} aria-pressed={p.starred} aria-label="Star board"><Star size={15} fill={p.starred ? 'currentColor' : 'none'} /></button>
								</div>
								<div className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
									{groups.map(([label, n], i) => <span key={label as string} style={{ width: `${((n as number) / total) * 100}%`, background: ['#cbd2d9', '#2b5aa0', '#6b3fa0', '#d93f3f', '#22a05b'][i] }} />)}
								</div>
								<ul className="mt-2.5 grid grid-cols-5 gap-1 text-center text-[11px] text-t2">
									{groups.map(([label, n]) => <li key={label as string}><b className="tabular block text-sm text-t1">{n as number}</b>{label as string}</li>)}
								</ul>
								<div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-xs text-t2">
									{lead ? <><Avatar name={lead.name} tint={lead.tint} size="sm" /> {lead.name}</> : null}
									<span className="ms-auto">{myCount ? <b className="text-brand-900">{myCount} yours</b> : 'none yours'}</span>
									<Link to="/$org/projects/$projectKey/board" params={{ org: org.slug, projectKey: p.key }} search={{}}><Button size="sm" variant="soft">Open</Button></Link>
								</div>
							</Card>
						);
					})}
				</div>
			)}
		</AppShell>
	);
}
