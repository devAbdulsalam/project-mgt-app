import { Link, useParams } from '@tanstack/react-router';
import { Construction, ListTodo, Map, Timer } from 'lucide-react';
import { Button, Card, EmptyState } from '@/shared/ui';
import { useAuthStore } from '@/shared/lib/auth-store';

const meta: Record<string, { title: string; blurb: string; icon: typeof Construction }> = {
	backlog: { title: 'Backlog & sprint planning', blurb: 'Rank issues, drag them into sprints and watch capacity per engineer.', icon: ListTodo },
	sprints: { title: 'Sprints', blurb: 'Burndown with forecast, velocity over the last six sprints and the sprint issue table.', icon: Timer },
	roadmap: { title: 'Roadmap', blurb: 'Gantt of epics with milestones, dependency arrows and drag-to-reschedule.', icon: Map },
};

export function ProjectStubTab({ section }: { section: keyof typeof meta }) {
	const org = useAuthStore((s) => s.org)!;
	const { projectKey } = useParams({ strict: false }) as { projectKey: string };
	const m = meta[section]!;
	return (
		<Card>
			<EmptyState icon={<m.icon size={20} />} title={`${m.title} is next on the roadmap`} action={<Link to="/$org/projects/$projectKey/board" params={{ org: org.slug, projectKey }} search={{}}><Button variant="primary">Open the board</Button></Link>}>
				{m.blurb} The overview, list, board, calendar, workload and settings are live with mock data.
			</EmptyState>
		</Card>
	);
}
