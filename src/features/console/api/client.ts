// Typed calls against the operator surface at /api/v1/super-admin.
//
// Three things worth knowing before adding an endpoint here:
//
// 1. No `idempotencyKey`. The product surface uses one, but the server has no
//    HTTP-level Idempotency-Key middleware — the `idempotency_key` in
//    src/mail is a column for de-duplicating outbound mail, not a request
//    header. Sending the header here would look like protection and be nothing
//    of the kind. Every call below is also non-retrying by default: ApiClient
//    only replays a request after a 429, and nothing else.
//
// 2. The 401-refresh exemption in ApiClient keys off a path starting with
//    `/auth/`. These paths start with `/super-admin/`, so a 401 here *does*
//    trigger a token refresh — which is correct, and is what keeps a
//    fifteen-minute access token from logging an operator out mid-task.
//
// 3. Writes here are not free. Each one writes an audit row that the server
//    awaits, and a 4xx from these endpoints is usually the server refusing on
//    purpose (last_owner, cannot_change_self, slug_taken). Surface the message;
//    do not retry.

import { api } from '@/api';
import type {
	AdminOrgDetailDto,
	AdminOrgDto,
	AdminUserDetailDto,
	AdminUserDto,
	AuditEntryDto,
	BackupCodesDto,
	BeginTotpEnrolDto,
	ChangeEmailDto,
	ConfirmTotpEnrolDto,
	CreateOrgDto,
	ElevateDto,
	MeDto,
	MembershipDto,
	OffsetPageDto,
	OperatorDto,
	OrgsPageDto,
	PasswordResetSentDto,
	SetOperatorRoleDto,
	SignOutDto,
} from './dto';
import type { MemberRole, Plan, PlatformRole } from './dto';
import type { ReviewStatus } from '../model';

const ROOT = '/super-admin';

/** Every read takes a signal so TanStack Query can cancel a request it no longer needs. */
const pageParams = (signal: AbortSignal | undefined) => ({ signal });

const listParams = (search: string | undefined, limit: number, offset: number, signal?: AbortSignal) => ({
	query: { search: search || undefined, limit, offset },
	signal,
});

export const superAdminApi = {
	// -- The operator's own second factor and elevation ---------------------
	//
	// Standing only, no elevation required. The console's first call, and the
	// only way to learn whether to show "enrol", "verify" or "go ahead" without
	// provoking a 403 to find out.

	me: (signal?: AbortSignal) => api.get<MeDto>(`${ROOT}/auth/me`, pageParams(signal)),

	/** Stages a new secret. The secret does nothing until a code from it is presented back. */
	beginTotpEnrol: () => api.post<BeginTotpEnrolDto>(`${ROOT}/auth/totp/enrol`),

	/** Confirms enrolment and returns the recovery codes — shown exactly once. */
	confirmTotpEnrol: (code: string) => api.post<ConfirmTotpEnrolDto>(`${ROOT}/auth/totp/confirm`, { json: { code } }),

	/** Exchanges a TOTP code or a recovery code for a live elevation. */
	elevate: (code: string) => api.post<ElevateDto>(`${ROOT}/auth/elevate`, { json: { code } }),

	/** Drops elevation without ending the session. */
	stepDown: () => api.post<void>(`${ROOT}/auth/step-down`),

	/** Mints a fresh recovery set and voids the old one. Requires a live elevation. */
	regenerateBackupCodes: () => api.post<BackupCodesDto>(`${ROOT}/auth/totp/backup-codes`),

	// -- Operators (admin) ---------------------------------------------------

	operators: (signal?: AbortSignal) => api.get<{ data: OperatorDto[] }>(`${ROOT}/operators`, pageParams(signal)),

	setOperatorRole: (userId: string, platformRole: PlatformRole | null) =>
		api.put<SetOperatorRoleDto>(`${ROOT}/users/${userId}/platform-role`, { json: { platform_role: platformRole } }),

	// -- Accounts (support reads, admin writes) ------------------------------

	users: (search: string | undefined, limit: number, offset: number, signal?: AbortSignal) =>
		api.get<OffsetPageDto<AdminUserDto>>(`${ROOT}/users`, listParams(search, limit, offset, signal)),

	user: (userId: string, signal?: AbortSignal) => api.get<AdminUserDetailDto>(`${ROOT}/users/${userId}`, pageParams(signal)),

	/** Sends the account a reset link. The operator never sees or sets the value. */
	sendPasswordReset: (userId: string) => api.post<PasswordResetSentDto>(`${ROOT}/users/${userId}/password-reset`),

	/** `null` restores the account. A non-null reason is required to disable — the server enforces it. */
	setUserDisabled: (userId: string, reason: string | null) => api.put<AdminUserDto>(`${ROOT}/users/${userId}/disabled`, { json: { reason } }),

	unlockUser: (userId: string) => api.post<AdminUserDetailDto>(`${ROOT}/users/${userId}/unlock`),

	signOutUser: (userId: string) => api.post<SignOutDto>(`${ROOT}/users/${userId}/sign-out`),

	changeEmail: (userId: string, newEmail: string) => api.patch<ChangeEmailDto>(`${ROOT}/users/${userId}/email`, { json: { new_email: newEmail } }),

	// -- Workspaces ----------------------------------------------------------

	orgs: (search: string | undefined, review: ReviewStatus | undefined, limit: number, offset: number, signal?: AbortSignal) =>
		api.get<OrgsPageDto>(`${ROOT}/orgs`, {
			...listParams(search, limit, offset, signal),
			query: { search: search || undefined, review, limit, offset },
		}),

	/**
	 * Records a decision on a self-serve workspace.
	 *
	 * Rejecting suspends it, so `note` is what its owner is told and the server
	 * refuses a rejection without one.
	 */
	reviewOrg: (slug: string, status: 'approved' | 'rejected', note: string | null) =>
		api.post<AdminOrgDto>(`${ROOT}/orgs/${encodeURIComponent(slug)}/review`, { json: { status, note } }),

	/** Creates a workspace and makes an existing account its owner, atomically. */
	createOrg: (input: { slug: string; name: string; prefix: string | null; plan: Plan; owner_email: string }) =>
		api.post<CreateOrgDto>(`${ROOT}/orgs`, { json: { ...input, profile: {} } }),

	org: (slug: string, signal?: AbortSignal) => api.get<AdminOrgDetailDto>(`${ROOT}/orgs/${encodeURIComponent(slug)}`, pageParams(signal)),

	/** `null` restores the workspace. */
	setOrgSuspended: (slug: string, reason: string | null) =>
		api.put<AdminOrgDto>(`${ROOT}/orgs/${encodeURIComponent(slug)}/suspended`, { json: { reason } }),

	setOrgPlan: (slug: string, plan: Plan) => api.put<AdminOrgDto>(`${ROOT}/orgs/${encodeURIComponent(slug)}/plan`, { json: { plan } }),

	/** Creates the membership if there is none, which is how an orphan owner gets repaired. */
	setMemberRole: (slug: string, userId: string, role: MemberRole) =>
		api.put<MembershipDto>(`${ROOT}/orgs/${encodeURIComponent(slug)}/members/${userId}`, { json: { role } }),

	removeMember: (slug: string, userId: string) => api.del<void>(`${ROOT}/orgs/${encodeURIComponent(slug)}/members/${userId}`),

	// -- The trail -----------------------------------------------------------

	/** Readable by `support` on purpose: a log only one person can read is a log nobody checks. */
	audit: (params: { action?: string; targetId?: string; before?: string; limit: number }, signal?: AbortSignal) =>
		api.get<{ data: AuditEntryDto[] }>(`${ROOT}/audit`, {
			query: { action: params.action || undefined, target_id: params.targetId || undefined, before: params.before, limit: params.limit },
			signal,
		}),
} as const;
