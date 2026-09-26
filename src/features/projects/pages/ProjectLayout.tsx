import { Link, Outlet, useParams } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { AppShell, MobileHeader } from '@/shared/layouts/AppShell';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useAuthStore } from '@/shared/lib/auth-store';
import { memberById } from '@/mocks/db';
import { useProject } from '../hooks/useProject';

const tabs = [
	['overview', 'Overview'],
	['list', 'List'],
	['board', 'Board'],
	['backlog', 'Backlog'],
	['sprints', 'Sprints'],
	['roadmap', 'Roadmap'],
	['calendar', 'Calendar'],
	['workload', 'Workload'],
] as const;

export function ProjectLayout() {
	const org = useAuthStore((s) => s.org)!;
	const { projectKey } = useParams({ from: '/authed/$org/projects/$projectKey' });
	const { project, loading } = useProject(org.slug, projectKey);
	const params = useParams({ strict: false }) as { key?: string };

	if (loading) {
		return (
			<AppShell meta={{ title: 'Project' }}>
				<div className="mx-auto mt-6 max-w-md p-8 text-center text-[13px] text-t2" role="status">Loading project…</div>
			</AppShell>
		);
	}

	if (!project) {
		return (
			<AppShell meta={{ title: 'Project not found' }}>
				<div className="card mx-auto mt-6 max-w-md p-8 text-center">
					<b>No project with key {projectKey}</b>
					<div className="mt-4"><Link to="/$org/projects" params={{ org: org.slug }} search={{}}><Button variant="primary">Back to projects</Button></Link></div>
				</div>
			</AppShell>
		);
	}
	const lead = memberById(project.leadId);
	const visibleTabs = project.kind === 'software' ? tabs : tabs.filter(([k]) => !['backlog', 'sprints', 'roadmap'].includes(k));
	void params;

	return (
		<AppShell
			meta={{ title: project.name, subtitle: `${project.key} · ${project.kind === 'software' ? 'Software' : 'Service'} project · Lead: ${lead?.name ?? '—'}` }}
			mobileHeader={
				<MobileHeader>
					<Link to="/$org/projects" params={{ org: org.slug }} search={{}} className="-ms-1 flex items-center gap-1 text-[13px] text-on-dark-muted"><ChevronLeft size={16} /> Projects</Link>
					<h1 className="mt-1 text-xl font-semibold">{project.name}</h1>
					<nav className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4" aria-label="Project sections">
						{[...visibleTabs, ['settings', 'Settings'] as const].map(([k, l]) => (
							<Link key={k} to={`/$org/projects/$projectKey/${k}` as '/$org/projects/$projectKey/overview'} params={{ org: org.slug, projectKey: project.key }} className="h-[34px] shrink-0 rounded-full bg-brand-800 px-3.5 text-[13px] leading-[34px] text-white data-[status=active]:bg-white data-[status=active]:font-semibold data-[status=active]:text-brand-900">
								{l}
							</Link>
						))}
					</nav>
				</MobileHeader>
			}
		>
			<nav className="-mt-2 mb-5 hidden items-center gap-1 border-b border-border lg:flex" aria-label="Project sections">
				{visibleTabs.map(([k, l]) => (
					<Link
						key={k}
						to={`/$org/projects/$projectKey/${k}` as '/$org/projects/$projectKey/overview'}
						params={{ org: org.slug, projectKey: project.key }}
						className={cn('-mb-px border-b-2 border-transparent px-3 pb-3 pt-1 text-sm text-t2 hover:text-t1')}
						activeProps={{ className: 'border-brand-900 font-semibold text-t1' }}
					>
						{l}
					</Link>
				))}
				<Link to="/$org/projects/$projectKey/settings" params={{ org: org.slug, projectKey: project.key }} className="-mb-px ms-auto border-b-2 border-transparent px-3 pb-3 pt-1 text-sm text-t2 hover:text-t1" activeProps={{ className: 'border-brand-900 font-semibold text-t1' }}>
					Settings
				</Link>
			</nav>
			<Outlet />
		</AppShell>
	);
}
