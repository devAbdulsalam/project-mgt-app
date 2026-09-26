// Team reads and writes, from whichever source is active.
//
// Live, the workspace's people come from the API (already loaded into the
// member directory by `MemberDirectoryGate`) and every change is a request;
// in mock mode the same calls go to the in-browser store, as they always did.
// Pages receive one shape and never ask which.

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { useDashboard } from '@/api/resources';
import { useDb } from '@/mocks/db';
import { statusCategory } from '@/mocks/seed';
import { isLiveApi } from '@/shared/lib/live-api';
import { useMemberDirectory } from '@/shared/lib/member-directory';
import { toast } from '@/shared/lib/toast-store';
import type { TeamMember } from '@/mocks/types';

export type AccessRole = NonNullable<TeamMember['accessRole']>;

export const accessRoles: readonly { id: AccessRole; label: string }[] = [
	{ id: 'owner', label: 'Owner' },
	{ id: 'admin', label: 'Admin' },
	{ id: 'member', label: 'Member' },
	{ id: 'viewer', label: 'Viewer' },
];

export const accessRoleLabel = (role: string | undefined) => accessRoles.find((r) => r.id === role)?.label ?? role ?? '';

const RANK: Record<AccessRole, number> = { viewer: 0, member: 1, admin: 2, owner: 3 };

/** The people in the workspace, in the app's `TeamMember` shape. */
export function useTeamMembers(): TeamMember[] {
	const mock = useDb((s) => s.members);
	const directory = useMemberDirectory((s) => s.members);
	return isLiveApi() ? directory : mock;
}

interface MeResponse {
	permissions: string[];
	active_org: { role: string } | null;
}

/** What the signed-in person may do here, so the UI can hide what would only be refused. */
export function useMyAccess(orgSlug: string) {
	const live = isLiveApi();
	const query = useQuery({
		queryKey: ['auth', 'me', orgSlug],
		queryFn: ({ signal }) => api.get<MeResponse>('/auth/me', { query: { org: orgSlug }, signal }),
		enabled: live && Boolean(orgSlug),
		staleTime: 60_000,
	});
	const role = (query.data?.active_org?.role ?? 'viewer') as AccessRole;
	return {
		/** Mock mode has no permissions to enforce. */
		can: (permission: string) => (live ? Boolean(query.data?.permissions.includes(permission)) : true),
		role: live ? role : ('owner' as AccessRole),
		/** Roles this person may hand out: never above their own. */
		grantable: accessRoles.filter((r) => !live || RANK[r.id] <= RANK[role]),
	};
}

/** Open tickets per person: the dashboard's workload live, the store's tickets in mock mode. */
export function useOpenCounts(orgSlug: string): (memberId: string) => number | undefined {
	const live = isLiveApi();
	const tickets = useDb((s) => s.tickets);
	const dashboard = useDashboard(orgSlug);
	return useCallback(
		(id) => {
			if (live) return dashboard.data ? (dashboard.data.workload.find((w) => w.user_id === id)?.open_count ?? 0) : undefined;
			return tickets.filter((t) => t.assigneeId === id && statusCategory[t.status] !== 'done').length;
		},
		[live, dashboard.data, tickets],
	);
}

export interface InviteRow {
	email: string;
	name?: string;
	role: AccessRole;
}

export interface TeamActions {
	/** Live only. Resolves to the rows the server refused, with why. */
	inviteLive: (rows: InviteRow[]) => Promise<{ email: string; message: string }[]>;
	setStatus: (member: TeamMember, status: 'Active' | 'Deactivated') => Promise<boolean>;
	setRole: (member: TeamMember, role: AccessRole) => Promise<boolean>;
	resendInvite: (member: TeamMember) => Promise<void>;
	resetPassword: (member: TeamMember) => Promise<void>;
}

const messageOf = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

export function useTeamActions(orgSlug: string): TeamActions {
	const live = isLiveApi();
	const queryClient = useQueryClient();
	const setMockStatus = useDb((s) => s.setMemberStatus);
	const mockResend = useDb((s) => s.resendInvite);

	const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: ['org', orgSlug] }), [queryClient, orgSlug]);

	return {
		async inviteLive(rows) {
			const refused: { email: string; message: string }[] = [];
			for (const row of rows) {
				try {
					await api.post(`/orgs/${orgSlug}/members`, { json: { email: row.email, name: row.name || undefined, role: row.role } });
				} catch (err) {
					const fieldMessage = err instanceof ApiError ? Object.values(err.fieldErrors)[0]?.[0] : undefined;
					refused.push({ email: row.email, message: fieldMessage ?? messageOf(err, 'Could not send that invitation.') });
				}
			}
			await refresh();
			return refused;
		},

		async setStatus(member, status) {
			if (!live) {
				setMockStatus(member.id, status);
				return true;
			}
			try {
				await api.patch(`/orgs/${orgSlug}/members/${member.id}`, { json: { status: status === 'Active' ? 'active' : 'deactivated' } });
				await refresh();
				return true;
			} catch (err) {
				toast(messageOf(err, `Could not update ${member.name}.`), { tone: 'danger' });
				return false;
			}
		},

		async setRole(member, role) {
			try {
				await api.patch(`/orgs/${orgSlug}/members/${member.id}`, { json: { role } });
				await refresh();
				return true;
			} catch (err) {
				toast(messageOf(err, `Could not change ${member.name}'s role.`), { tone: 'danger' });
				return false;
			}
		},

		async resendInvite(member) {
			if (!live) {
				mockResend(member.id);
				toast('Invite resent', { tone: 'success' });
				return;
			}
			try {
				await api.post(`/orgs/${orgSlug}/members/${member.id}/resend-invite`);
				toast('Invite resent', { tone: 'success', description: `Emailed to ${member.email}` });
			} catch (err) {
				toast(messageOf(err, 'Could not resend the invite.'), { tone: 'danger' });
			}
		},

		async resetPassword(member) {
			if (live) {
				try {
					await api.post(`/orgs/${orgSlug}/members/${member.id}/password-reset`);
				} catch (err) {
					toast(messageOf(err, 'Could not send the reset link.'), { tone: 'danger' });
					return;
				}
			}
			toast('Password reset link sent', { tone: 'success', description: `Emailed to ${member.email}` });
		},
	};
}

export interface RolesDto {
	roles: { id: AccessRole; label: string; description: string; member_count: number; permissions: string[] }[];
	permissions: { id: string; group: string; label: string }[];
}

/** The fixed roles and what each may do. Live only: the mock matrix is its own toy. */
export const useRoles = (orgSlug: string) =>
	useQuery({
		queryKey: ['org', orgSlug, '/roles'],
		queryFn: ({ signal }) => api.get<RolesDto>(`/orgs/${orgSlug}/roles`, { signal }),
		enabled: isLiveApi() && Boolean(orgSlug),
		staleTime: 60_000,
	});
