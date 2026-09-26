// Shared enumerations for the console, in one place so a plan or role is spelled
// the same on a filter, a badge and a <select>.

import type { MemberRole, Plan, PlatformRole } from '../api/dto';

export const PLATFORM_ROLES: PlatformRole[] = ['support', 'admin'];
export const MEMBER_ROLES: MemberRole[] = ['owner', 'admin', 'member', 'viewer'];
export const PLANS: Plan[] = ['trial', 'bronze', 'silver', 'gold'];

/** What each plan is called in the UI, and whether it bills. */
export const PLAN_LABEL: Record<Plan, string> = {
	trial: 'Trial',
	bronze: 'Bronze',
	silver: 'Silver',
	gold: 'Gold',
};

export const MEMBER_ROLE_LABEL: Record<MemberRole, string> = {
	owner: 'Owner',
	admin: 'Admin',
	member: 'Member',
	viewer: 'Viewer',
};

export const PLATFORM_ROLE_LABEL: Record<PlatformRole, string> = {
	support: 'Support',
	admin: 'Admin',
};
