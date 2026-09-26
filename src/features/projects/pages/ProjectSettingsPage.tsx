import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Card, Select } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useAuthStore } from '@/shared/lib/auth-store';
import { useProject } from '../hooks/useProject';
import { isSection, projectSettingsSections, type ProjectSettingsSection } from '../settings/model';
import { DangerSection, GeneralSection } from '../settings/GeneralSection';
import { WorkflowSection } from '../settings/WorkflowSection';
import { BoardsSection, FieldsSection, TicketTypesSection } from '../settings/ConfigSections';
import { AutomationSection, IntegrationsSection, MembersSection, NotificationsSection } from '../settings/PeopleSections';

const ROUTE = '/authed/$org/projects/$projectKey/settings/$section' as const;

export function ProjectSettingsPage() {
	const org = useAuthStore((s) => s.org)!;
	const { projectKey, section } = useParams({ from: ROUTE });
	const navigate = useNavigate();
	const project = useProject(org.slug, projectKey).project!;
	const current: ProjectSettingsSection = isSection(section) ? section : 'general';
	const goto = (s: ProjectSettingsSection) => navigate({ to: '/$org/projects/$projectKey/settings/$section', params: { org: org.slug, projectKey, section: s } });

	const body = {
		general: <GeneralSection project={project} />,
		workflow: <WorkflowSection project={project} />,
		fields: <FieldsSection project={project} />,
		boards: <BoardsSection project={project} />,
		types: <TicketTypesSection project={project} />,
		members: <MembersSection project={project} orgSlug={org.slug} />,
		automation: <AutomationSection project={project} />,
		notifications: <NotificationsSection project={project} />,
		integrations: <IntegrationsSection project={project} />,
		danger: <DangerSection project={project} orgSlug={org.slug} />,
	}[current];

	return (
		<div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
			<div className="lg:hidden">
				<Select value={current} onChange={(e) => goto(e.target.value as ProjectSettingsSection)} aria-label="Settings section">
					{projectSettingsSections.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
				</Select>
			</div>
			<Card className="hidden self-start p-2 lg:sticky lg:top-4 lg:block">
				<nav aria-label="Project settings sections">
					<ul className="space-y-0.5">
						{projectSettingsSections.map(([k, l]) => (
							<li key={k}>
								<Link
									to="/$org/projects/$projectKey/settings/$section"
									params={{ org: org.slug, projectKey, section: k }}
									className={cn('block rounded-md px-3 py-2 text-[13px] hover:bg-muted hover:text-t1', k === 'danger' ? 'text-danger' : 'text-t2')}
									activeProps={{ className: cn('bg-brand-100 font-semibold', k === 'danger' ? 'text-danger' : 'text-brand-900') }}
								>
									{l}
								</Link>
							</li>
						))}
					</ul>
				</nav>
			</Card>
			<div className="min-w-0">{body}</div>
		</div>
	);
}
