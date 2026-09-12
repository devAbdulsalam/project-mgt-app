import { useCallback, useState } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useAuthStore } from '@/shared/lib/auth-store';
import { TicketList } from '@/features/tickets/pages/TicketsPage';
import { TicketDetail } from '@/features/tickets/components/TicketDetail';
import { CreateTicketDialog } from '@/features/tickets/components/CreateTicketDialog';
import type { TicketSearch } from '@/features/tickets/model/filters';

export function ProjectListPage() {
	const org = useAuthStore((s) => s.org)!;
	const { projectKey } = useParams({ from: '/authed/$org/projects/$projectKey/list' });
	const search = useSearch({ from: '/authed/$org/projects/$projectKey/list' });
	const navigate = useNavigate();
	const [creating, setCreating] = useState(false);
	const onSearchChange = useCallback(
		(patch: Partial<TicketSearch> & { panel?: string }) => navigate({ to: '/$org/projects/$projectKey/list', params: { org: org.slug, projectKey }, search: { ...search, ...patch }, replace: true }),
		[navigate, org.slug, projectKey, search],
	);
	return (
		<>
			<TicketList search={search} onSearchChange={onSearchChange} onOpen={(key) => onSearchChange({ panel: key })} projectKey={projectKey} orgSlug={org.slug} toolbar={<Button variant="primary" onClick={() => setCreating(true)}><Plus size={15} aria-hidden /> Create issue</Button>} />
			{search.panel ? <TicketDetail ticketKey={search.panel} orgSlug={org.slug} onClose={() => onSearchChange({ panel: undefined })} /> : null}
			<CreateTicketDialog open={creating} onClose={() => setCreating(false)} defaultProjectKey={projectKey} onCreated={(key) => onSearchChange({ panel: key })} />
		</>
	);
}
