// Wire shapes for /api/v1/super-admin. The API is snake_case throughout
// (backend test/conventions.test.ts enforces it), so these mirror the JSON
// exactly and model.ts re-spells everything in camelCase for the components.
//
// The server contract is the source of truth for these. `detail` on an audit
// entry is deliberately `unknown`: it is a free-form jsonb column whose shape
// depends on the action, and typing it loosely here is more honest than
// inventing a union the server does not enforce.

/** Operator standing. `null` on an ordinary account. */
export type PlatformRole = 'support' | 'admin';

/** Workspace membership role. */
export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';

/** Subscription plan. */
export type Plan = 'trial' | 'bronze' | 'silver' | 'gold';

export interface MeDto {
	user_id: string;
	email: string;
	name: string;
	platform_role: PlatformRole;
	totp_enrolled: boolean;
	elevated: boolean;
	elevation_expires_at: string | null;
}

/**
 * The staged enrolment secret.
 *
 * The only response anywhere that carries a TOTP seed. `mapper.ts` deliberately
 * has no way to put this into a long-lived cache: see `toEnrolmentDraft`.
 */
export interface BeginTotpEnrolDto {
	secret: string;
	otpauth_uri: string;
}

export interface ConfirmTotpEnrolDto {
	backup_codes: string[];
	elevation_expires_at: string;
}

export interface ElevateDto {
	method: 'totp' | 'backup_code';
	expires_at: string;
	backup_codes_remaining: number;
}

export interface BackupCodesDto {
	backup_codes: string[];
}

export interface OperatorDto {
	id: string;
	email: string;
	name: string;
	platform_role: PlatformRole;
	totp_enrolled: boolean;
	disabled: boolean;
}

export interface SetOperatorRoleDto {
	id: string;
	email: string;
	name: string;
	platform_role: PlatformRole | null;
}

export interface AdminUserDto {
	id: string;
	email: string;
	name: string;
	phone: string | null;
	email_verified: boolean;
	locked: boolean;
	locked_until: string | null;
	failed_attempts: number;
	last_login_at: string | null;
	disabled: boolean;
	disabled_at: string | null;
	disabled_reason: string | null;
	platform_role: PlatformRole | null;
	org_count: number;
	created_at: string;
}

export interface AdminUserDetailDto extends AdminUserDto {
	orgs: Array<{
		org_id: string;
		slug: string;
		name: string;
		role: MemberRole;
		status: string;
		suspended: boolean;
	}>;
}

/** Offset-paginated list envelope, as the operator surface uses (not cursors). */
export interface OffsetPageDto<T> {
	data: T[];
	total: number;
	limit: number;
	offset: number;
}

/** The orgs listing carries the review-queue size so the console can badge it. */
export interface OrgsPageDto extends OffsetPageDto<AdminOrgDto> {
	pending_review: number;
}

export interface PasswordResetSentDto {
	sent_to: string;
}

export interface SignOutDto {
	signed_out: boolean;
}

export interface ChangeEmailDto {
	id: string;
	email: string;
	name: string;
	email_verified: boolean;
}

export interface AdminOrgDto {
	id: string;
	slug: string;
	name: string;
	prefix: string | null;
	plan: Plan;
	suspended: boolean;
	suspended_at: string | null;
	suspended_reason: string | null;
	/** 'pending' until an operator has looked at a self-serve workspace. */
	review_status: 'pending' | 'approved' | 'rejected';
	reviewed_at: string | null;
	review_note: string | null;
	member_count: number;
	created_at: string;
}

export interface AdminOrgDetailDto extends AdminOrgDto {
	/**
	 * Counts only — tickets, assets, invoices and so on.
	 *
	 * The operator surface never returns tenant content, by design: an operator
	 * can see that a workspace holds 412 tickets and cannot read one. Any type
	 * here that suggests otherwise is a bug in this file, not the server.
	 */
	usage: Record<string, number>;
	members: Array<{
		user_id: string;
		email: string;
		name: string;
		role: MemberRole;
		status: string;
		last_login_at: string | null;
		disabled: boolean;
	}>;
}

export interface CreateOrgDto {
	id: string;
	slug: string;
	name: string;
	prefix: string | null;
	plan: Plan;
	profile: Record<string, unknown>;
	created_at: string;
	owner: { id: string; email: string; name: string };
}

export interface MembershipDto {
	org_id: string;
	slug: string;
	user_id: string;
	role: MemberRole;
	status: string;
}

export interface AuditEntryDto {
	id: string;
	actor_id: string;
	actor_email: string;
	action: string;
	target_kind: string | null;
	target_id: string | null;
	detail: unknown;
	ip: string | null;
	created_at: string;
}
