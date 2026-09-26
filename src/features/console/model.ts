// Domain model for the operator console.
//
// The wire is snake_case (see api/dto.ts); components read camelCase from here.
// mapper.ts does the translation so no component ever sees an underscore.

import { z } from 'zod';
import type { MemberRole, Plan, PlatformRole } from './api/dto';

export type { MemberRole, Plan, PlatformRole };
export { PLANS, MEMBER_ROLES, PLATFORM_ROLES } from './lib/constants';

/** How long one TOTP verification keeps the operator elevated. Mirrors backend ELEVATION_MINUTES. */
export const ELEVATION_MINUTES = 30;

/**
 * What `/auth/me` reports about this operator, plus the two things the client
 * derives rather than reads.
 */
export interface Operator {
	userId: string;
	email: string;
	name: string;
	role: PlatformRole;
	totpEnrolled: boolean;
	/** Epoch ms. Null when not elevated — never a boolean, because a boolean would go stale silently. */
	elevatedUntil: number | null;
}

/** `admin` writes, `support` reads. Nothing above admin. */
export function canWrite(role: PlatformRole | null): role is 'admin' {
	return role === 'admin';
}

export function isElevated(op: Pick<Operator, 'elevatedUntil'>, now = Date.now()): boolean {
	return op.elevatedUntil !== null && op.elevatedUntil > now;
}

export interface AdminUser {
	id: string;
	email: string;
	name: string;
	phone: string | null;
	emailVerified: boolean;
	locked: boolean;
	lockedUntil: number | null;
	failedAttempts: number;
	lastLoginAt: number | null;
	disabled: boolean;
	disabledAt: number | null;
	disabledReason: string | null;
	platformRole: PlatformRole | null;
	orgCount: number;
	createdAt: number;
}

export interface UserMembership {
	orgId: string;
	slug: string;
	name: string;
	role: MemberRole;
	status: string;
	suspended: boolean;
}

export interface AdminUserDetail extends AdminUser {
	orgs: UserMembership[];
}

export interface OffsetPage<T> {
	items: T[];
	total: number;
	limit: number;
	offset: number;
}

export interface AdminOrg {
	id: string;
	slug: string;
	name: string;
	prefix: string | null;
	plan: Plan;
	suspended: boolean;
	suspendedAt: number | null;
	suspendedReason: string | null;
	memberCount: number;
	createdAt: number;
}

export interface OrgMember {
	userId: string;
	email: string;
	name: string;
	role: MemberRole;
	status: string;
	lastLoginAt: number | null;
	disabled: boolean;
}

export interface AdminOrgDetail extends AdminOrg {
	usage: Record<string, number>;
	members: OrgMember[];
}

export interface AuditEntry {
	id: string;
	actorId: string;
	actorEmail: string;
	action: string;
	targetKind: string | null;
	targetId: string | null;
	detail: unknown;
	ip: string | null;
	createdAt: number;
}

// ---------------------------------------------------------------------------
// Route search params
// ---------------------------------------------------------------------------
//
// The console lists offset-paginate, so the page lives in the URL: a reloaded
// deep link, the back button and a shared URL all land on the same rows.

const trimmed = z.string().trim().max(120);

/** Server caps `limit` at 100; asking for more is a 422, not a clamp. */
export const pageSize = z.coerce.number().int().min(1).max(100).default(25);
export const offset = z.coerce.number().int().min(0).default(0);

export const usersSearchSchema = z.object({
	q: trimmed.optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: pageSize,
});

export const orgsSearchSchema = z.object({
	q: trimmed.optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: pageSize,
});

export const operatorsSearchSchema = z.object({ page: z.coerce.number().int().min(1).default(1) });

export const auditSearchSchema = z.object({
	action: trimmed.optional(),
	targetId: trimmed.optional(),
	limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type UsersSearch = z.infer<typeof usersSearchSchema>;
export type OrgsSearch = z.infer<typeof orgsSearchSchema>;
export type OperatorsSearch = z.infer<typeof operatorsSearchSchema>;
export type AuditSearch = z.infer<typeof auditSearchSchema>;

/** Offset for a 1-based page number. */
export const offsetOf = (page: number, limit: number) => (page - 1) * limit;

/** Total pages, never below 1 so the control does not render "1 of 0". */
export const pageCount = (total: number, limit: number) => Math.max(1, Math.ceil(total / limit));

/**
 * An enrolment in progress.
 *
 * Deliberately not part of any query cache. This holds a live TOTP seed, and the
 * console's rule is that a secret lives in one component's memory and nowhere
 * else — not in the TanStack cache, not in sessionStorage, not in a URL. The
 * draft is created by the enrol page and dropped the moment it is confirmed,
 * abandoned, or the tab is closed.
 */
export interface EnrolmentDraft {
	secret: string;
	otpauthUri: string;
	createdAt: number;
}
