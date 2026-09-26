import { useMemo } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { Columns3, LayoutGrid, List, Plus, Search, Star } from 'lucide-react';
import { AppShell, MobileHeader } from '@/shared/layouts/AppShell';
import { Avatar, Button, Card, EmptyState, SortControl } from '@/shared/ui';
import { useAuthStore } from '@/shared/lib/auth-store';
import { memberById } from '@/mocks/db';
import { cn } from '@/shared/lib/cn';
import { useBoardsDirectory, type BoardCard } from './hooks/useBoardsDirectory';
import type { BoardsSearch } from './model';

const GROUP_COLORS = ['#cbd2d9', '#2b5aa0', '#6b3fa0', '#d93f3f', '#22a05b'];

/** Issues still to do: every status group except the last, which is always "done". */
const openCount = (c: BoardCard) => c.groups.slice(0, -1).reduce((sum, [, n]) => sum + n, 0);

/**
 * Orders boards. With no sort chosen, favourites come first and the rest by
 * name; choosing a sort is an explicit request, so favourites stop jumping the
 * queue. Ties always fall back to name.
 */
function boardComparator(sort: BoardsSearch['sort'], dir: BoardsSearch['dir']) {
	const byName = (a: BoardCard, b: BoardCard) => a.name.localeCompare(b.name);
	if (!sort) return (a: BoardCard, b: BoardCard) => Number(b.starred) - Number(a.starred) || byName(a, b);

	const sign = dir === 'asc' ? 1 : -1;
	const key: Record<NonNullable<typeof sort>, (a: BoardCard, b: BoardCard) => number> = {
		name: byName,
		type: (a, b) => a.kind.localeCompare(b.kind),
		open: (a, b) => openCount(a) - openCount(b),
		mine: (a, b) => a.myCount - b.myCount,
	};
	return (a: BoardCard, b: BoardCard) => sign * key[sort](a, b) || byName(a, b);
}

const subtitleOf = (p: BoardCard) =>
	`${p.kind === 'software' ? `Scrum · ${p.sprintName ?? 'no sprint'}` : 'Kanban · service queue'}${p.sprintDaysLeft !== undefined ? ` · ${p.sprintDaysLeft}d left` : ''}`;

/** Boards directory: one board per active project, plus quick stats per column group. */
export function BoardsPage() {
	const org = useAuthStore((s) => s.org)!;
	const user = useAuthStore((s) => s.user)!;
	const navigate = useNavigate();
	const search = useSearch({ from: '/authed/$org/boards' });
	const { cards, inFlight, loading, toggleStar } = useBoardsDirectory(org.slug, user.id);
	const setSearch = (patch: Partial<BoardsSearch>) => navigate({ to: '/$org/boards', params: { org: org.slug }, search: { ...search, ...patch }, replace: true });

	const active = useMemo(() => {
		const q = search.q?.trim().toLowerCase();
		return cards
			.filter((p) => !q || `${p.name} ${p.key} ${p.sprintName ?? ''}`.toLowerCase().includes(q))
			.sort(boardComparator(search.sort, search.dir));
	}, [cards, search.q, search.sort, search.dir]);

	return (
		<AppShell meta={{ title: 'Boards', subtitle: `${cards.length} boards · ${inFlight} of your issues in flight` }} mobileHeader={<MobileHeader><h1 className="text-xl font-semibold">Boards</h1></MobileHeader>}>
			<div className="mb-4 flex flex-wrap items-center gap-2.5">
				<label className="input h-9 w-full sm:w-72">
					<Search size={14} className="text-t2" aria-hidden />
					<input value={search.q ?? ''} onChange={(e) => setSearch({ q: e.target.value || undefined })} placeholder="Search boards" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-t3" aria-label="Search boards" />
				</label>
				<SortControl
					value={search.sort ?? 'name'}
					dir={search.dir}
					options={[{ value: 'name', label: 'Board name' }, { value: 'type', label: 'Type' }, { value: 'open', label: 'Open issues' }, { value: 'mine', label: 'Your issues' }]}
					onChange={({ sort, dir }) => setSearch({ ...(sort ? { sort } : {}), ...(dir ? { dir } : {}) })}
				/>
				<div className="ms-auto hidden items-center rounded-sm border border-border-strong bg-white sm:flex" role="group" aria-label="View">
					<button type="button" onClick={() => setSearch({ view: 'cards' })} className={cn('grid h-8 w-9 place-items-center rounded-l-sm', search.view === 'cards' ? 'bg-brand-100 text-brand-900' : 'text-t2')} aria-pressed={search.view === 'cards'} aria-label="Cards"><LayoutGrid size={15} /></button>
					<button type="button" onClick={() => setSearch({ view: 'list' })} className={cn('grid h-8 w-9 place-items-center rounded-r-sm', search.view === 'list' ? 'bg-brand-100 text-brand-900' : 'text-t2')} aria-pressed={search.view === 'list'} aria-label="List"><List size={15} /></button>
				</div>
			</div>

			{active.length === 0 && loading ? (
				<p className="py-16 text-center text-[13px] text-t3">Loading boards…</p>
			) : active.length === 0 && search.q ? (
				<Card><EmptyState icon={<Columns3 size={20} />} title="No boards match" action={<Button onClick={() => setSearch({ q: undefined })}>Clear search</Button>} /></Card>
			) : active.length === 0 ? (
				<Card><EmptyState icon={<Columns3 size={20} />} title="No boards yet" action={<Link to="/$org/projects" params={{ org: org.slug }} search={{}}><Button variant="primary"><Plus size={14} /> Create a project</Button></Link>} /></Card>
			) : search.view === 'list' ? (
				<Card className="overflow-x-auto">
					<table className="w-full text-[13px]">
						<thead><tr className="bg-muted text-left text-[11px] font-semibold tracking-wider text-t2 uppercase"><th className="w-10" /><th className="px-4 py-3">Board</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3">Open</th><th className="px-4 py-3">Yours</th><th className="px-4 py-3">Lead</th></tr></thead>
						<tbody>
							{active.map((p) => {
								const total = Math.max(1, p.groups.reduce((sum, [, n]) => sum + n, 0));
								const done = p.groups.at(-1)?.[1] ?? 0;
								const lead = memberById(p.leadId);
								return (
									<tr key={p.id} className="border-t border-border hover:bg-[#fafbfc]">
										<td className="px-2 py-3 text-center"><button type="button" onClick={() => toggleStar(p)} className={cn(p.starred ? 'text-warning' : 'text-border-strong hover:text-warning')} aria-pressed={p.starred} aria-label={p.starred ? `Unstar ${p.name} board` : `Star ${p.name} board`}><Star size={15} fill={p.starred ? 'currentColor' : 'none'} /></button></td>
										<td className="px-4 py-3">
											<Link to="/$org/projects/$projectKey/board" params={{ org: org.slug, projectKey: p.key }} search={{}} className="flex items-center gap-2.5 font-semibold hover:underline">
												<span className="grid size-7 place-items-center rounded-sm text-[10px] font-bold text-white" style={{ background: p.color }}>{p.key.slice(0, 2)}</span>
												<span className="min-w-0"><span className="block truncate">{p.name} board</span><span className="block text-xs font-normal text-t2">{subtitleOf(p)}</span></span>
											</Link>
										</td>
										<td className="px-4 py-3 text-t2">{p.kind === 'software' ? 'Scrum' : 'Kanban'}</td>
										<td className="px-4 py-3">
											<div className="flex w-40 items-center gap-2">
												<div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
													{p.groups.map(([label, n], i) => <span key={label} style={{ width: `${(n / total) * 100}%`, background: GROUP_COLORS[i] }} />)}
												</div>
												<span className="tabular text-xs text-t2">{Math.round((done / total) * 100)}%</span>
											</div>
										</td>
										<td className="tabular px-4 py-3">{openCount(p)}</td>
										<td className="tabular px-4 py-3">{p.myCount ? <b className="text-brand-900">{p.myCount}</b> : <span className="text-t3">—</span>}</td>
										<td className="px-4 py-3">{lead ? <span className="flex items-center gap-2"><Avatar name={lead.name} tint={lead.tint} src={lead.avatarUrl} size="sm" />{lead.name}</span> : '—'}</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</Card>
			) : (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{active.map((p) => {
						const groups = p.groups;
						const total = Math.max(1, groups.reduce((sum, [, n]) => sum + n, 0));
						const lead = memberById(p.leadId);
						return (
							<Card key={p.id} className="flex flex-col p-5">
								<div className="flex items-start gap-3">
									<span className="grid size-10 shrink-0 place-items-center rounded-[10px] text-sm font-bold text-white" style={{ background: p.color }}>{p.key.slice(0, 2)}</span>
									<div className="min-w-0 flex-1">
										<Link to="/$org/projects/$projectKey/board" params={{ org: org.slug, projectKey: p.key }} search={{}} className="flex items-center gap-1.5 text-[15px] font-semibold hover:underline">{p.name} board</Link>
										<div className="text-xs text-t2">{subtitleOf(p)}</div>
									</div>
									<button type="button" onClick={() => toggleStar(p)} className={cn(p.starred ? 'text-warning' : 'text-border-strong hover:text-warning')} aria-pressed={p.starred} aria-label="Star board"><Star size={15} fill={p.starred ? 'currentColor' : 'none'} /></button>
								</div>
								<div className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
									{groups.map(([label, n], i) => <span key={label} style={{ width: `${(n / total) * 100}%`, background: GROUP_COLORS[i] }} />)}
								</div>
								<ul className="mt-2.5 grid grid-cols-5 gap-1 text-center text-[11px] text-t2">
									{groups.map(([label, n]) => <li key={label}><b className="tabular block text-sm text-t1">{n}</b>{label}</li>)}
								</ul>
								<div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-xs text-t2">
									{lead ? <><Avatar name={lead.name} tint={lead.tint} src={lead.avatarUrl} size="sm" /> {lead.name}</> : null}
									<span className="ms-auto">{p.myCount ? <b className="text-brand-900">{p.myCount} yours</b> : 'none yours'}</span>
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
