// The workspace's people, from whichever source is active.
//
// Pickers (account manager, engineer) need the list in render, not by id.
// Live members sit in the directory store `memberById` reads; mock ones in the
// mock DB. Both hooks always run so the call count never changes.

import { useDb } from '@/mocks/db';
import type { TeamMember } from '@/mocks/types';
import { isLiveApi } from './live-api';
import { useMemberDirectory } from './member-directory';

export function useTeamMembers(): TeamMember[] {
	const mock = useDb((s) => s.members);
	const live = useMemberDirectory((s) => s.members);
	return isLiveApi() ? live : mock;
}
