import { useEffect, type ReactNode } from 'react';
import { useMembers } from '@/api/resources';
import { isLiveApi } from '@/shared/lib/live-api';
import { memberDtoToDomain, useMemberDirectory } from '@/shared/lib/member-directory';

/**
 * Loads the workspace's members before the pages that name them render.
 *
 * Assignees, leads and authors arrive from the API as ids; without the
 * directory every one of them would render as "unassigned". If the request
 * fails the app still renders — names degrade, nothing else does.
 */
export function MemberDirectoryGate({ orgSlug, children }: { orgSlug: string; children: ReactNode }) {
	const live = isLiveApi();
	const query = useMembers(orgSlug);
	const set = useMemberDirectory((s) => s.set);

	useEffect(() => {
		if (query.data) set(query.data.map(memberDtoToDomain));
	}, [query.data, set]);

	if (live && query.isPending) return null;
	return <>{children}</>;
}
