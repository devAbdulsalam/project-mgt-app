import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useAuthStore } from '@/shared/lib/auth-store';
import { TicketDetail } from '../components/TicketDetail';

export function TicketDetailRoute() {
	const org = useAuthStore((s) => s.org)!;
	const { key } = useParams({ from: '/authed/$org/tickets/$key' });
	const search = useSearch({ from: '/authed/$org/tickets' });
	const navigate = useNavigate();
	return <TicketDetail ticketKey={key} orgSlug={org.slug} onClose={() => navigate({ to: '/$org/tickets', params: { org: org.slug }, search })} />;
}
