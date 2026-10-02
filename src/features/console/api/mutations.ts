// Mutation factories for the operator console.
//
// Two conventions that matter here:
//
// 1. Every mutation invalidates by prefix (`userKeys.all`, `orgKeys.all`), not by
//    the exact key it read. An operator who suspends a workspace must not be
//    left looking at a stale row on the list they came from *or* on any other
//    screen, and enumerating those by hand is how one gets missed.
//
// 2. Nothing here retries and nothing here toasts. Both are the caller's job:
//    these factories are also used from dialogs that need to stay open on
//    failure, and a toast fired by a shared factory is a toast nobody asked for.

import { mutationOptions, type QueryClient } from '@tanstack/react-query';
import { superAdminApi } from './client';
import { auditKeys, operatorKeys, operatorListKeys, orgKeys, userKeys } from './keys';
import { toOrg, toUser, toUserDetail } from './mapper';
import type { MemberRole, Plan, PlatformRole } from './dto';
import type { AdminOrg, AdminUser, AdminUserDetail } from '../model';

// -- The operator's own second factor ----------------------------------------

/**
 * Starts enrolment.
 *
 * Returns the seed. Callers must hand it straight to the enrol page's local
 * state and must not put it in the query cache — see EnrolmentDraft.
 */
export function beginTotpEnrolMutation() {
	return mutationOptions({
		mutationKey: ['super-admin', 'totp', 'begin'],
		mutationFn: () => superAdminApi.beginTotpEnrol(),
	});
}

/**
 * Confirms enrolment.
 *
 * Invalidates the operator query because confirming also elevates, so the
 * header's countdown and the console's unlocked state both come from that one
 * fresh `/auth/me`.
 */
export function confirmTotpEnrolMutation(queryClient: QueryClient) {
	return mutationOptions({
		mutationKey: ['super-admin', 'totp', 'confirm'],
		mutationFn: (code: string) => superAdminApi.confirmTotpEnrol(code),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: operatorKeys.me() }),
	});
}

export function elevateMutation(queryClient: QueryClient) {
	return mutationOptions({
		mutationKey: ['super-admin', 'elevate'],
		mutationFn: (code: string) => superAdminApi.elevate(code),
		// Elevation unlocks every screen, so everything the console can show is
		// now potentially loadable. Dropping the lot is cheaper than reasoning
		// about which queries were parked while the gate was closed.
		onSuccess: () => queryClient.invalidateQueries(),
	});
}

export function stepDownMutation(queryClient: QueryClient) {
	return mutationOptions({
		mutationKey: ['super-admin', 'step-down'],
		mutationFn: () => superAdminApi.stepDown(),
		onSuccess: () => queryClient.invalidateQueries(),
	});
}

export function regenerateBackupCodesMutation() {
	return mutationOptions({
		mutationKey: ['super-admin', 'totp', 'backup-codes'],
		mutationFn: () => superAdminApi.regenerateBackupCodes(),
	});
}

// -- Operators ----------------------------------------------------------------

export function setOperatorRoleMutation(queryClient: QueryClient) {
	return mutationOptions({
		mutationKey: ['super-admin', 'operators', 'set-role'],
		mutationFn: ({ userId, platformRole }: { userId: string; platformRole: PlatformRole | null }) => superAdminApi.setOperatorRole(userId, platformRole),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: operatorListKeys.all });
			// Revoking standing also clears that operator's second factor, so the
			// account screen they may be looking at is now wrong too.
			void queryClient.invalidateQueries({ queryKey: userKeys.all });
		},
	});
}

// -- Accounts -----------------------------------------------------------------

export function setUserDisabledMutation(queryClient: QueryClient) {
	return mutationOptions({
		mutationKey: ['super-admin', 'users', 'disabled'],
		// Mapped, not passed through: components read camelCase. Returning the raw
		// DTO here would be the one place in the console where a write hands back
		// a different shape from the equivalent read.
		mutationFn: async ({ userId, reason }: { userId: string; reason: string | null }): Promise<AdminUser> => toUser(await superAdminApi.setUserDisabled(userId, reason)),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
	});
}

export function unlockUserMutation(queryClient: QueryClient) {
	return mutationOptions({
		mutationKey: ['super-admin', 'users', 'unlock'],
		mutationFn: async (userId: string): Promise<AdminUserDetail> => toUserDetail(await superAdminApi.unlockUser(userId)),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
	});
}

export function signOutUserMutation(queryClient: QueryClient) {
	return mutationOptions({
		mutationKey: ['super-admin', 'users', 'sign-out'],
		mutationFn: (userId: string) => superAdminApi.signOutUser(userId),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
	});
}

export function sendPasswordResetMutation(queryClient: QueryClient) {
	return mutationOptions({
		mutationKey: ['super-admin', 'users', 'password-reset'],
		mutationFn: (userId: string) => superAdminApi.sendPasswordReset(userId),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
	});
}

export function changeEmailMutation(queryClient: QueryClient) {
	return mutationOptions({
		mutationKey: ['super-admin', 'users', 'email'],
		mutationFn: ({ userId, newEmail }: { userId: string; newEmail: string }) => superAdminApi.changeEmail(userId, newEmail),
		// The new address starts unverified and a verification mail goes out, so
		// both the account row and its org memberships are now different.
		onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
	});
}

// -- Workspaces ---------------------------------------------------------------

export function createOrgMutation(queryClient: QueryClient) {
	return mutationOptions({
		mutationKey: ['super-admin', 'orgs', 'create'],
		mutationFn: (input: { slug: string; name: string; prefix: string | null; plan: Plan; ownerEmail: string }) =>
			superAdminApi.createOrg({ ...input, owner_email: input.ownerEmail }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: orgKeys.all }),
	});
}

export function setOrgSuspendedMutation(queryClient: QueryClient) {
	return mutationOptions({
		mutationKey: ['super-admin', 'orgs', 'suspended'],
		mutationFn: async ({ slug, reason }: { slug: string; reason: string | null }): Promise<AdminOrg> => toOrg(await superAdminApi.setOrgSuspended(slug, reason)),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: orgKeys.all }),
	});
}

/**
 * Approves or rejects a self-serve workspace.
 *
 * Approving changes nothing about access — the workspace has been usable since
 * it was created — so this is the decision plus a note to its owner. Rejecting
 * suspends it, which is why the server insists on a reason.
 */
export function reviewOrgMutation(queryClient: QueryClient) {
	return mutationOptions({
		mutationKey: ['super-admin', 'orgs', 'review'],
		mutationFn: async ({ slug, status, note }: { slug: string; status: 'approved' | 'rejected'; note: string | null }): Promise<AdminOrg> =>
			toOrg(await superAdminApi.reviewOrg(slug, status, note)),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: orgKeys.all }),
	});
}

export function setOrgPlanMutation(queryClient: QueryClient) {
	return mutationOptions({
		mutationKey: ['super-admin', 'orgs', 'plan'],
		mutationFn: async ({ slug, plan }: { slug: string; plan: Plan }): Promise<AdminOrg> => toOrg(await superAdminApi.setOrgPlan(slug, plan)),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: orgKeys.all }),
	});
}

export function setMemberRoleMutation(queryClient: QueryClient) {
	return mutationOptions({
		mutationKey: ['super-admin', 'orgs', 'member-role'],
		mutationFn: ({ slug, userId, role }: { slug: string; userId: string; role: MemberRole }) => superAdminApi.setMemberRole(slug, userId, role),
		// A membership change is visible from the account side too — the workspace
		// list on a user's profile is built from the same rows.
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: orgKeys.all });
			void queryClient.invalidateQueries({ queryKey: userKeys.all });
		},
	});
}

export function removeMemberMutation(queryClient: QueryClient) {
	return mutationOptions({
		mutationKey: ['super-admin', 'orgs', 'member-remove'],
		mutationFn: ({ slug, userId }: { slug: string; userId: string }) => superAdminApi.removeMember(slug, userId),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: orgKeys.all });
			void queryClient.invalidateQueries({ queryKey: userKeys.all });
		},
	});
}

// -- Re-reads after a write ---------------------------------------------------

/** Pulls the operator's standing again — used after any call that can change it. */
export function refetchOperator(queryClient: QueryClient) {
	return queryClient.invalidateQueries({ queryKey: operatorKeys.me() });
}

/** Re-reads the trail. A trail is append-only, so the whole prefix is cheap to drop. */
export function refetchAudit(queryClient: QueryClient) {
	return queryClient.invalidateQueries({ queryKey: auditKeys.all });
}
