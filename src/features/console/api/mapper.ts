// DTO -> domain. Timestamps cross the wire as ISO strings and become epoch
// numbers here, because every consumer wants to do arithmetic on them
// (a countdown, "3 days ago") and `new Date(iso)` scattered through a component
// is how a timezone bug gets written.

import type {
	AdminOrgDetailDto,
	AdminOrgDto,
	AdminUserDetailDto,
	AdminUserDto,
	AuditEntryDto,
	OperatorDto,
} from './dto';
import type { AdminOrg, AdminOrgDetail, AdminUser, AdminUserDetail, AuditEntry, Operator, OrgMember, UserMembership } from '../model';

const ms = (iso: string | null): number | null => (iso ? Date.parse(iso) : null);

export function toOperator(dto: {
	user_id: string;
	email: string;
	name: string;
	platform_role: Operator['role'];
	totp_enrolled: boolean;
	elevation_expires_at: string | null;
}): Operator {
	return {
		userId: dto.user_id,
		email: dto.email,
		name: dto.name,
		role: dto.platform_role,
		totpEnrolled: dto.totp_enrolled,
		elevatedUntil: ms(dto.elevation_expires_at),
	};
}

export function toOperatorRow(dto: OperatorDto): Operator {
	return {
		userId: dto.id,
		email: dto.email,
		name: dto.name,
		role: dto.platform_role,
		totpEnrolled: dto.totp_enrolled,
		// The list endpoint has no elevation column, and inventing one would be a
		// lie. `null` reads as "not known", and nothing in the console shows an
		// operator's elevation except for the signed-in one.
		elevatedUntil: null,
	};
}

export function toUser(dto: AdminUserDto): AdminUser {
	return {
		id: dto.id,
		email: dto.email,
		name: dto.name,
		phone: dto.phone,
		emailVerified: dto.email_verified,
		locked: dto.locked,
		lockedUntil: ms(dto.locked_until),
		failedAttempts: dto.failed_attempts,
		lastLoginAt: ms(dto.last_login_at),
		disabled: dto.disabled,
		disabledAt: ms(dto.disabled_at),
		disabledReason: dto.disabled_reason,
		platformRole: dto.platform_role,
		orgCount: dto.org_count,
		createdAt: Date.parse(dto.created_at),
	};
}

export function toUserDetail(dto: AdminUserDetailDto): AdminUserDetail {
	const orgs: UserMembership[] = dto.orgs.map((o) => ({
		orgId: o.org_id,
		slug: o.slug,
		name: o.name,
		role: o.role,
		status: o.status,
		suspended: o.suspended,
	}));
	return { ...toUser(dto), orgs };
}

export function toOrg(dto: AdminOrgDto): AdminOrg {
	return {
		id: dto.id,
		slug: dto.slug,
		name: dto.name,
		prefix: dto.prefix,
		plan: dto.plan,
		suspended: dto.suspended,
		suspendedAt: ms(dto.suspended_at),
		suspendedReason: dto.suspended_reason,
		memberCount: dto.member_count,
		createdAt: Date.parse(dto.created_at),
	};
}

export function toOrgDetail(dto: AdminOrgDetailDto): AdminOrgDetail {
	const members: OrgMember[] = dto.members.map((m) => ({
		userId: m.user_id,
		email: m.email,
		name: m.name,
		role: m.role,
		status: m.status,
		lastLoginAt: ms(m.last_login_at),
		disabled: m.disabled,
	}));
	return { ...toOrg(dto), usage: dto.usage, members };
}

export function toAuditEntry(dto: AuditEntryDto): AuditEntry {
	return {
		id: dto.id,
		actorId: dto.actor_id,
		actorEmail: dto.actor_email,
		action: dto.action,
		targetKind: dto.target_kind,
		targetId: dto.target_id,
		detail: dto.detail,
		ip: dto.ip,
		createdAt: Date.parse(dto.created_at),
	};
}
