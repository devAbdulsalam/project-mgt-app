// The live-API implementation of the auth store's actions.
//
// Kept separate from auth-store.ts so the mock path stays readable and the two
// can be compared side by side. The store picks between them with isLiveApi().
//
// The backend speaks snake_case (its DECISIONS.md D3); the app's domain types
// are camelCase. This file is the boundary where that is translated for auth.

import { api, ApiError, fieldMessage } from '@/api';
import type { Org, User, Role } from '@/mocks/data';
import { refreshSession } from '@/api/session';
import { useTokenStore } from '@/shared/lib/token-store';

interface SessionResponse {
	access_token: string;
	expires_at: string;
	user: { id: string; email: string; name: string; phone: string | null; email_verified: boolean; avatar_url?: string | null };
	org: LiveOrg | null;
}

interface LiveOrg {
	id: string;
	slug: string;
	name: string;
	prefix: string | null;
	plan: string;
	role: string;
	industry?: string;
	timezone?: string;
	timezone_label?: string;
	currency?: string;
	cities?: string[];
	trial_days_left?: number;
}

interface MeResponse {
	user: SessionResponse['user'];
	orgs: LiveOrg[];
	active_org: LiveOrg | null;
	permissions: string[];
}

/** Maps a backend role onto the display roles the UI already knows. */
const ROLE_LABELS: Record<string, Role> = {
	owner: 'Admin',
	admin: 'Admin',
	member: 'Support agent',
	viewer: 'Viewer',
};

function toOrg(org: LiveOrg): Org {
	return {
		// The app addresses orgs by slug in routes; id is only used as a key.
		id: org.id,
		slug: org.slug,
		name: org.name,
		industry: org.industry ?? '',
		timezone: org.timezone ?? 'Africa/Lagos',
		timezoneLabel: org.timezone_label ?? '',
		currency: org.currency ?? 'NGN',
		cities: org.cities ?? [],
		trialDaysLeft: org.trial_days_left ?? 0,
		setupStepsDone: 0,
		setupStepsTotal: 5,
		invitesAccepted: 0,
		invitesSent: 0,
	};
}

function toUser(user: SessionResponse['user'], role: string | undefined): User {
	return {
		id: user.id,
		name: user.name || user.email,
		email: user.email,
		role: ROLE_LABELS[role ?? 'member'] ?? 'Support agent',
		// The tint is the fallback the initials are drawn on; avatarUrl wins when
		// they have a photo. /auth/me carries it, so it is right again after a
		// refresh without the profile page having been opened.
		avatarTint: 'teal',
		avatarUrl: user.avatar_url ?? undefined,
		phone: user.phone ?? undefined,
	};
}

/** What the app needs to know about whoever is signed in. */
export interface Session {
	user: User;
	org: Org | null;
	orgs: Org[];
	permissions: string[];
}

/**
 * Reads the signed-in identity.
 *
 * Every path that opens or resumes a session ends here rather than trusting the
 * membership the login response happened to include: /auth/me is the only
 * response that carries the full org list and the server's permission set.
 */
export async function fetchMe(): Promise<Session> {
	const me = await api.get<MeResponse>('/auth/me');
	return {
		user: toUser(me.user, me.active_org?.role),
		org: me.active_org ? toOrg(me.active_org) : null,
		orgs: me.orgs.map(toOrg),
		permissions: me.permissions ?? [],
	};
}

/** Turns a problem+json response into the message the form should show. */
export function messageFor(err: unknown, fallback: string): { message: string; field?: 'email' | 'password' | 'code' } {
	if (!(err instanceof ApiError)) return { message: fallback };

	switch (err.code) {
		case 'invalid_credentials':
			return { message: 'That email or password is not right.', field: 'password' };
		case 'account_locked':
			return { message: 'Too many failed attempts. Try again in a few minutes.', field: 'password' };
		case 'account_disabled':
			return { message: 'That account has been deactivated. Ask an administrator to restore it.' };
		case 'too_many_attempts':
			return { message: 'Too many attempts on that code. Ask for a new one.', field: 'code' };
		case 'invalid_code':
			return { message: 'That code is not right.', field: 'code' };
		case 'code_expired':
			return { message: 'That code has expired. Ask for a new one.', field: 'code' };
		case 'rate_limited':
			return { message: 'Too many attempts. Try again shortly.' };
		case 'email_taken':
			return { message: 'An account with that email already exists.', field: 'email' };
		case 'validation_failed':
			// The server names the field it rejected; show that rather than a
			// generic message the form cannot attach to an input.
			return {
				message: fieldMessage(err, 'password') ?? fieldMessage(err, 'email') ?? fieldMessage(err, 'name') ?? (err.message || fallback),
				field: err.fieldErrors.password ? 'password' : err.fieldErrors.email ? 'email' : undefined,
			};
		default:
			return { message: err.message || fallback };
	}
}

/**
 * Signs in with a password.
 *
 * Most accounts are signed in at this point and the session comes back with the
 * response. An account whose owner has turned on a second factor gets
 * `requires_otp` instead, with no session and no refresh cookie — the server
 * sends a code and the caller goes on to the OTP screen. The server decides,
 * not the client: the code is only a second factor if the password alone buys
 * nothing, so the client is never in a position to skip it.
 */
export async function login(
	email: string,
	password: string,
): Promise<{ requiresOtp: true; phone: string } | { requiresOtp: false; session: Session }> {
	const res = await api.post<SessionResponse & { requires_otp?: boolean; phone?: string | null }>('/auth/login', {
		json: { email, password },
	});

	if (res.requires_otp) return { requiresOtp: true, phone: res.phone ?? '' };

	useTokenStore.getState().setTokens({
		accessToken: res.access_token,
		expiresAt: Date.parse(res.expires_at),
	});

	return { requiresOtp: false, session: await fetchMe() };
}

/** Step two: exchange the code for the session the app will actually use. */
export async function verifyOtp(email: string, code: string): Promise<Session> {
	const session = await api.post<SessionResponse>('/auth/otp/verify', { json: { email, code } });

	useTokenStore.getState().setTokens({
		accessToken: session.access_token,
		expiresAt: Date.parse(session.expires_at),
	});

	// The session response carries only the first membership; /auth/me has the
	// full list and the permissions, and now has a token to authenticate with.
	return fetchMe();
}

export async function resendOtp(email: string): Promise<void> {
	await api.post('/auth/otp/send', { json: { email } });
}

export async function logout(): Promise<void> {
	try {
		await api.post('/auth/logout');
	} finally {
		// Clear locally even if the call failed — the user asked to be signed out.
		useTokenStore.getState().clear();
	}
}

/**
 * Restores a session on page load using the httpOnly refresh cookie.
 *
 * The access token lives only in memory, so a refresh of the page always starts
 * without one.
 *
 *   session       signed in
 *   null          the server says there is no valid session
 *   'unreachable' could not be asked; the caller should not sign anyone out for that
 */
export async function restore(): Promise<Session | null | 'unreachable'> {
	const outcome = await refreshSession();
	if (outcome === 'expired') return null;
	if (outcome === 'unreachable') return 'unreachable';

	try {
		return await fetchMe();
	} catch (err) {
		if (err instanceof ApiError && err.status === 401) return null;
		return 'unreachable';
	}
}

// ---------------------------------------------------------------------------
// Sign up
// ---------------------------------------------------------------------------

/**
 * Creates the account and opens a session for it.
 *
 * The server signs the new user in immediately — 201 with an access token and a
 * refresh cookie — so the remaining signup steps are authenticated calls rather
 * than a second sign-in.
 *
 * The phone number the form collects is not part of the signup body, so it is
 * written to the profile afterwards. That write is allowed to fail quietly: the
 * account already exists at that point, and losing the number is a smaller
 * problem than sending someone back to a form they have already completed. They
 * can set it again from their profile.
 */
export async function signup(input: {
	email: string;
	name: string;
	password: string;
	phone?: string;
}): Promise<User> {
	const session = await api.post<SessionResponse>('/auth/signup', {
		json: { email: input.email, name: input.name, password: input.password },
	});

	useTokenStore.getState().setTokens({
		accessToken: session.access_token,
		expiresAt: Date.parse(session.expires_at),
	});

	if (input.phone) {
		try {
			await api.patch('/auth/profile', { json: { phone: input.phone } });
		} catch {
			// Deliberately swallowed — see above.
		}
	}

	return toUser(session.user, undefined);
}

/** Sends the six-digit code that confirms the address on the account. */
export async function sendSignupCode(email: string): Promise<void> {
	await api.post('/auth/otp/send', { json: { email } });
}

/**
 * Confirms the address and returns the memberships that now apply.
 *
 * Verifying issues a fresh session, so the tokens are replaced here: the access
 * token minted at signup is not the one the rest of the flow runs on.
 *
 * The memberships matter because an invited person signs up with an org already
 * waiting for them — signing in is what accepts a pending invitation — and the
 * flow should send them straight to it instead of asking them to set one up.
 */
export async function verifySignupCode(email: string, code: string): Promise<Session> {
	const session = await api.post<SessionResponse>('/auth/otp/verify', { json: { email, code } });

	useTokenStore.getState().setTokens({
		accessToken: session.access_token,
		expiresAt: Date.parse(session.expires_at),
	});

	return fetchMe();
}

/** The workspace roles the API accepts, keyed by the label the invite form shows. */
const INVITE_ROLES: Record<string, 'owner' | 'admin' | 'member' | 'viewer'> = {
	'Super Admin': 'owner',
	Admin: 'admin',
	'Operations Lead': 'admin',
	'Support agent': 'member',
	'Field engineer': 'member',
	Viewer: 'viewer',
};

export interface InviteResult {
	email: string;
	ok: boolean;
	message?: string;
}

/**
 * Invites each address, one request per person.
 *
 * Settled rather than all-or-nothing: one address the server refuses — already a
 * member, or above the inviter's own role — should not discard the invitations
 * that did go out, and the caller needs to be able to name the ones that failed.
 */
export async function inviteMembers(
	orgSlug: string,
	invites: { email: string; role: string }[],
): Promise<InviteResult[]> {
	const settled = await Promise.allSettled(
		invites.map((invite) =>
			api.post(`/orgs/${orgSlug}/members`, {
				json: { email: invite.email, role: INVITE_ROLES[invite.role] ?? 'member' },
			}),
		),
	);

	return settled.map((result, i) => ({
		email: invites[i]!.email,
		ok: result.status === 'fulfilled',
		message:
			result.status === 'rejected'
				? messageFor(result.reason, 'That invitation could not be sent.').message
				: undefined,
	}));
}

// ---------------------------------------------------------------------------
// Creating a workspace
// ---------------------------------------------------------------------------

export interface CreateWorkspaceInput {
	name: string;
	slug: string;
	industry?: string;
	teamSize?: string;
	headOffice?: string;
	modules?: string[];
	planId?: string;
}

interface CreatedWorkspace {
	id: string;
	slug: string;
	name: string;
	prefix: string | null;
	plan: string;
	role: string;
	review_status: string;
	created_at: string;
}

/**
 * Creates the workspace the signup wizard collected, with the caller as owner.
 *
 * It is usable straight away: an operator reviews it afterwards, and is emailed
 * by the server when it is created. So there is nothing to wait for here — the
 * caller goes to the dashboard.
 *
 * The prefix is derived rather than asked for. The wizard never collected one,
 * and the server only uses it as the default ticket key for new projects, so
 * guessing from the name is better than leaving every project to start at `P`.
 */
export async function createWorkspace(input: CreateWorkspaceInput): Promise<{ org: Org; reviewPending: boolean }> {
	const created = await api.post<CreatedWorkspace>('/orgs', {
		json: {
			name: input.name,
			slug: input.slug,
			prefix: prefixFrom(input.name),
			industry: input.industry,
			team_size: input.teamSize,
			head_office: input.headOffice,
			modules: input.modules,
			plan_id: input.planId,
		},
		idempotencyKey: crypto.randomUUID(),
	});

	return {
		org: toOrg({
			id: created.id,
			slug: created.slug,
			name: created.name,
			prefix: created.prefix,
			plan: created.plan,
			role: created.role,
			industry: input.industry,
			cities: input.headOffice ? [input.headOffice.replace(/\s*\(.*\)$/, '')] : [],
		}),
		reviewPending: created.review_status === 'pending',
	};
}

/** 'Kolanut Systems' -> 'KS'. Falls back to the first letters of one word. */
function prefixFrom(name: string): string | undefined {
	const letters = name
		.split(/\s+/)
		.map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
		.filter(Boolean);
	if (!letters.length) return undefined;

	const initials = letters.length > 1 ? letters.map((w) => w[0]!).join('') : letters[0]!.slice(0, 3);
	const prefix = initials.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);

	// The server's CHECK wants a leading letter; anything else it would reject
	// is better dropped than sent, since the prefix is only a convenience.
	return /^[A-Z][A-Z0-9]{0,9}$/.test(prefix) ? prefix : undefined;
}
