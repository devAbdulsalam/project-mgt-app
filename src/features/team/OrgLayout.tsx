import { Outlet, useParams } from '@tanstack/react-router';
import { MemberDirectoryGate } from './MemberDirectoryGate';

/** Everything under `/$org`: loads the workspace's people before any page renders. */
export function OrgLayout() {
	const { org } = useParams({ from: '/authed/$org' });
	return (
		<MemberDirectoryGate orgSlug={org}>
			<Outlet />
		</MemberDirectoryGate>
	);
}
