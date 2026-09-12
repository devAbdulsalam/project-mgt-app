import { useNavigate, useSearch } from '@tanstack/react-router';
import { useAuthStore } from '@/shared/lib/auth-store';
import { CreateTicketDialog } from '../components/CreateTicketDialog';

export function CreateTicketRoute() {
	const org = useAuthStore((s) => s.org)!;
	const navigate = useNavigate();
	const search = useSearch({ from: '/authed/$org/tickets' });
	return (
		<CreateTicketDialog
			open
			onClose={() => navigate({ to: '/$org/tickets', params: { org: org.slug }, search })}
			onCreated={(key) => navigate({ to: '/$org/tickets/$key', params: { org: org.slug, key }, search })}
		/>
	);
}
