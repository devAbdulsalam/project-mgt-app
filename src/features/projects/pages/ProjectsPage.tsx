import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { Archive, ArchiveRestore, LayoutGrid, List, MoreVertical, Plus, Search, Settings, Star, Users } from 'lucide-react';
import { AppShell, MobileHeader } from '@/shared/layouts/AppShell';
import { Avatar, Button, Card, EmptyState, Menu, Pill } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useAuthStore } from '@/shared/lib/auth-store';
import { relativeTime, useNow } from '@/shared/lib/time';
import { memberById, useDb } from '@/mocks/db';
import { toast } from '@/shared/lib/toast-store';
import type { Project } from '@/mocks/types';
import { NewProjectDialog } from '../components/NewProjectDialog';
import { useProjectStats } from '../hooks';
import type { ProjectsSearch } from '../model';

function ProjectCard({ p, orgSlug, now }: { p: Project; orgSlug: string; now: number }) {
	const toggleStar = useDb((s) => s.toggleStar);
	const archive = useDb((s) => s.archiveProject);
	const stats = useProjectStats(p);
	const lead = memberById(p.leadId);
	const progress = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
	return (
		<Card className={cn('flex flex-col p-5', p.archived && 'opacity-60')}>
			<div className="flex items-start gap-3">
				<Link to="/$org/projects/$projectKey/overview" params={{ org: orgSlug, projectKey: p.key }} className="grid size-11 shrink-0 place-items-center rounded-[10px] text-sm font-bold text-white" style={{ background: p.color }}>
					{p.key.slice(0, 2)}
				</Link>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-1.5">
						<Link to="/$org/projects/$projectKey/overview" params={{ org: orgSlug, projectKey: p.key }} className="truncate text-[15px] font-semibold hover:underline">
							{p.name}
						</Link>
						<button type="button" onClick={() => toggleStar(p.id)} className={cn('shrink-0', p.starred ? 'text-warning' : 'text-border-strong hover:text-warning')} aria-label={p.starred ? 'Unstar' : 'Star'} aria-pressed={p.starred}>
							<Star size={15} fill={p.starred ? 'currentColor' : 'none'} />
						</button>
					</div>
					<div className="text-xs text-t2">
						{p.key} · {p.kind === 'software' ? 'Software project' : 'Service project'}
						{p.archived ? ' · Archived' : ''}
					</div>
				</div>
				<Menu
					align="end"
					width="w-48"
					trigger={({ toggle, buttonProps }) => (
						<button type="button" onClick={toggle} className="grid size-7 place-items-center rounded-sm text-t3 hover:bg-muted hover:text-t1" aria-label={`Actions for ${p.name}`} {...buttonProps}>
							<MoreVertical size={16} />
						</button>
					)}
					items={[
						{ key: 'star', label: p.starred ? 'Remove from favourites' : 'Add to favourites', icon: <Star size={14} />, onSelect: () => toggleStar(p.id) },
						{ key: 'settings', label: <Link to="/$org/projects/$projectKey/settings" params={{ org: orgSlug, projectKey: p.key }}>Project settings</Link>, icon: <Settings size={14} /> },
						{ key: 'archive', label: p.archived ? 'Restore project' : 'Archive project', icon: p.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />, danger: !p.archived, onSelect: () => { archive(p.id, !p.archived); toast(p.archived ? `${p.name} restored` : `${p.name} archived`); } },
					]}
				/>
			</div>
			<p className="mt-3 line-clamp-2 text-[13px] text-t2">{p.description}</p>
			<div className="mt-4 flex items-center gap-4 text-xs text-t2">
				<span><b className="tabular text-t1">{stats.open}</b> open</span>
				{p.sprint ? <span><b className="text-t1">{p.sprint.name}</b> · {p.sprint.daysLeft}d left</span> : null}
				<span className="ms-auto">{relativeTime(stats.lastActivity, now)}</span>
			</div>
			<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progress} aria-label="Completion">
				<div className="h-full rounded-full bg-brand-700" style={{ width: `${progress}%` }} />
			</div>
			<div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-xs text-t2">
				{lead ? (
					<>
						<Avatar name={lead.name} tint={lead.tint} size="sm" /> Lead · {lead.name}
					</>
				) : null}
				<span className="ms-auto flex items-center gap-1">
					<Users size={13} aria-hidden /> {p.memberIds.length}
				</span>
			</div>
		</Card>
	);
}

export function ProjectsPage() {
	const org = useAuthStore((s) => s.org)!;
	const navigate = useNavigate();
	const search = useSearch({ from: '/authed/$org/projects' });
	const projects = useDb((s) => s.projects);
	const toggleStar = useDb((s) => s.toggleStar);
	const now = useNow(60_000);
	const [creating, setCreating] = useState(false);
	const setSearch = (patch: Partial<ProjectsSearch>) => navigate({ to: '/$org/projects', params: { org: org.slug }, search: { ...search, ...patch }, replace: true });

	const list = useMemo(
		() =>
			projects
				.filter((p) => (search.archived ? true : !p.archived))
				.filter((p) => !search.q || `${p.name} ${p.key} ${p.description}`.toLowerCase().includes(search.q.toLowerCase()))
				.sort((a, b) => Number(b.starred) - Number(a.starred) || a.name.localeCompare(b.name)),
		[projects, search.archived, search.q],
	);

	return (
		<AppShell
			meta={{ title: 'Projects', subtitle: `${projects.filter((p) => !p.archived).length} active · ${projects.filter((p) => p.starred).length} starred` }}
			mobileHeader={
				<MobileHeader>
					<div className="flex items-center justify-between">
						<h1 className="text-xl font-semibold">Projects</h1>
						<button type="button" onClick={() => setCreating(true)} className="flex h-8 items-center gap-1 rounded-full bg-white px-3 text-[13px] font-semibold text-brand-900"><Plus size={14} /> New</button>
					</div>
				</MobileHeader>
			}
		>
			<div className="flex flex-wrap items-center gap-2.5">
				<label className="input h-9 w-full sm:w-72">
					<Search size={14} className="text-t2" aria-hidden />
					<input value={search.q ?? ''} onChange={(e) => setSearch({ q: e.target.value || undefined })} placeholder="Search projects" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-t3" aria-label="Search projects" />
				</label>
				<label className="flex items-center gap-2 text-[13px] text-t2"><input type="checkbox" className="accent-brand-900" checked={!!search.archived} onChange={(e) => setSearch({ archived: e.target.checked || undefined })} /> Show archived</label>
				<div className="ms-auto flex items-center gap-2">
					<div className="hidden items-center rounded-sm border border-border-strong bg-white sm:flex" role="group" aria-label="View">
						<button type="button" onClick={() => setSearch({ view: 'cards' })} className={cn('grid h-8 w-9 place-items-center rounded-l-sm', search.view === 'cards' ? 'bg-brand-100 text-brand-900' : 'text-t2')} aria-pressed={search.view === 'cards'} aria-label="Cards"><LayoutGrid size={15} /></button>
						<button type="button" onClick={() => setSearch({ view: 'table' })} className={cn('grid h-8 w-9 place-items-center rounded-r-sm', search.view === 'table' ? 'bg-brand-100 text-brand-900' : 'text-t2')} aria-pressed={search.view === 'table'} aria-label="Table"><List size={15} /></button>
					</div>
					<Button variant="primary" className="hidden lg:inline-flex" onClick={() => setCreating(true)}><Plus size={15} aria-hidden /> New project</Button>
				</div>
			</div>

			{list.length === 0 ? (
				<Card className="mt-4"><EmptyState title="No projects match" action={<Button variant="primary" onClick={() => setCreating(true)}>Create a project</Button>} /></Card>
			) : search.view === 'table' ? (
				<Card className="mt-4 overflow-x-auto">
					<table className="w-full text-[13px]">
						<thead><tr className="bg-muted text-left text-[11px] font-semibold tracking-wider text-t2 uppercase"><th className="px-4 py-3">Project</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Lead</th><th className="px-4 py-3">Open</th><th className="px-4 py-3">Members</th><th className="px-4 py-3">Sprint</th><th className="w-10" /></tr></thead>
						<tbody>
							{list.map((p) => (
								<ProjectRow key={p.id} p={p} orgSlug={org.slug} onStar={() => toggleStar(p.id)} />
							))}
						</tbody>
					</table>
				</Card>
			) : (
				<div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{list.map((p) => (
						<ProjectCard key={p.id} p={p} orgSlug={org.slug} now={now} />
					))}
				</div>
			)}
			<NewProjectDialog open={creating} onClose={() => setCreating(false)} onCreated={(key) => navigate({ to: '/$org/projects/$projectKey/overview', params: { org: org.slug, projectKey: key } })} />
		</AppShell>
	);
}

function ProjectRow({ p, orgSlug, onStar }: { p: Project; orgSlug: string; onStar: () => void }) {
	const stats = useProjectStats(p);
	const lead = memberById(p.leadId);
	return (
		<tr className="border-t border-border hover:bg-[#fafbfc]">
			<td className="px-4 py-3">
				<Link to="/$org/projects/$projectKey/overview" params={{ org: orgSlug, projectKey: p.key }} className="flex items-center gap-2.5 font-semibold hover:underline">
					<span className="grid size-7 place-items-center rounded-sm text-[10px] font-bold text-white" style={{ background: p.color }}>{p.key.slice(0, 2)}</span>
					{p.name}
					{p.archived ? <Pill tone="closed">Archived</Pill> : null}
				</Link>
			</td>
			<td className="px-4 py-3 text-t2">{p.kind === 'software' ? 'Software' : 'Service'}</td>
			<td className="px-4 py-3">{lead ? <span className="flex items-center gap-2"><Avatar name={lead.name} tint={lead.tint} size="sm" />{lead.name}</span> : '—'}</td>
			<td className="tabular px-4 py-3">{stats.open}</td>
			<td className="px-4 py-3 text-t2">{p.memberIds.length}</td>
			<td className="px-4 py-3 text-t2">{p.sprint ? `${p.sprint.name} · ${p.sprint.daysLeft}d left` : '—'}</td>
			<td className="px-2 py-3"><button type="button" onClick={onStar} className={cn(p.starred ? 'text-warning' : 'text-border-strong hover:text-warning')} aria-label="Star" aria-pressed={p.starred}><Star size={15} fill={p.starred ? 'currentColor' : 'none'} /></button></td>
		</tr>
	);
}
