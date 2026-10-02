import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { demoAccounts, orgs, users, DEMO_OTP, type Org, type User } from '@/mocks/data';
import { sleep } from './format';
import { isLiveApi } from './live-api';
import * as live from '@/features/auth/live';

export class AuthError extends Error {
	field?: 'email' | 'password' | 'code';
	constructor(message: string, field?: 'email' | 'password' | 'code') {
		super(message);
		this.field = field;
	}
}

/** Data collected across the multi-step signup flow. */
export interface SignupDraft {
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
	phoneVerified: boolean;
	companyName: string;
	slug: string;
	industry: string;
	teamSize: string;
	headOffice: string;
	modules: string[];
	planId: string;
}

/**
 * How signup ended.
 *
 * `org` is null when the account is real but has no workspace yet: creating one
 * is an operator action, so a self-serve signup can reach this state and the UI
 * has to say so rather than invent a workspace to land in.
 */
export interface SignupOutcome {
	org: Org | null;
	invites: live.InviteResult[];
}

interface AuthState {
	status: 'anonymous' | 'authenticated';
	user: User | null;
	org: Org | null;
	availableOrgs: Org[];
	/**
	 * What this person may do in the active workspace, as the server computed it.
	 *
	 * Kept here rather than derived from a role, because the server derives it
	 * per request from the membership row — a screen that guessed from `role`
	 * would disagree the moment the two definitions drift.
	 */
	permissions: string[];
	/**
	 * Workspaces that have invited this person and are waiting for an answer.
	 *
	 * Kept on the session so the app can tell someone with no workspace yet from
	 * someone who has been invited to one — the first is sent to create a
	 * workspace, the second to answer.
	 */
	pendingInvitations: number;
	/** Pending step-up: sign-in accepted, waiting for OTP. */
	pendingLogin: { userId: string; orgId: string; phone: string; remember: boolean; email?: string } | null;
	signup: SignupDraft;

	login: (input: { email: string; password: string; remember: boolean }) => Promise<{ requiresOtp: boolean; phone: string }>;
	/**
	 * Completes an OTP sign-in. Resolves with the active workspace, or null when
	 * the account has none yet — an invitation to answer, or a workspace to
	 * create. The caller routes that.
	 */
	verifyOtp: (code: string) => Promise<Org | null>;
	resendOtp: () => Promise<void>;
	/**
	 * Replaces the session after a live restore on page load.
	 *
	 * `org` is nullable because an account can legitimately have no workspace —
	 * someone who signed up and has not created one yet. They are still signed
	 * in; the router is what decides where a person without a workspace goes.
	 */
	hydrate: (session: { user: User; org: Org | null; orgs: Org[]; permissions?: string[]; pendingInvitations?: number }) => void;
	switchOrg: (orgId: string) => void;
	updateUser: (patch: Partial<User>) => void;
	logout: () => void;

	updateSignup: (patch: Partial<SignupDraft>) => void;
	/**
	 * Creates the account behind the signup draft.
	 *
	 * The password is an argument rather than part of the draft: the draft is
	 * persisted to sessionStorage so the wizard survives a reload, and a
	 * password has no business being written there.
	 */
	registerAccount: (password: string) => Promise<void>;
	/** Sends a fresh confirmation code to the address on the signup draft. */
	resendSignupCode: () => Promise<void>;
	/**
	 * Creates the workspace the wizard collected and makes the caller its owner.
	 * Resolves with the workspace, which is usable immediately.
	 */
	createWorkspace: () => Promise<Org>;
	/** Confirms the address. Resolves with the workspace the account already belongs to, if any. */
	verifySignupOtp: (code: string) => Promise<Org | null>;
	completeSignup: (invites?: { email: string; role: string }[]) => Promise<SignupOutcome>;
	resetSignup: () => void;
}

const emptySignup: SignupDraft = {
	firstName: '',
	lastName: '',
	email: '',
	phone: '',
	phoneVerified: false,
	companyName: '',
	slug: '',
	industry: 'Managed IT & software support',
	teamSize: '11 – 50',
	headOffice: 'Lagos (Ikeja)',
	modules: ['helpdesk', 'visits', 'assets', 'contracts'],
	planId: 'growth',
};

const LATENCY = 550;

export const useAuthStore = create<AuthState>()(
	persist(
		(set, get) => ({
			status: 'anonymous',
			user: null,
			org: null,
			availableOrgs: [],
			permissions: [],
			pendingInvitations: 0,
			pendingLogin: null,
			signup: emptySignup,

			async login({ email, password, remember }) {
				if (isLiveApi()) {
					try {
						const result = await live.login(email.trim(), password);

						// A second factor is opt-in, so most sign-ins finish here and the
						// OTP screen is never shown.
						if (!result.requiresOtp) {
							const { user, org, orgs: available, permissions, pendingInvitations } = result.session;
							set({ status: 'authenticated', user, org, availableOrgs: available, permissions, pendingInvitations, pendingLogin: null });
							return { requiresOtp: false, phone: '' };
						}

						// The real identity is not known until the code is verified;
						// only the email is needed to carry to the next screen.
						set({ pendingLogin: { userId: '', orgId: '', phone: result.phone, remember, email: email.trim() } });
						return { requiresOtp: true, phone: result.phone };
					} catch (err) {
						const { message, field } = live.messageFor(err, 'We could not sign you in.');
						throw new AuthError(message, field);
					}
				}

				await sleep(LATENCY);
				const account = demoAccounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
				if (!account) throw new AuthError('We could not find an account with that email.', 'email');
				if (account.password !== password) throw new AuthError('Incorrect password. Try “password” for the demo.', 'password');
				set({ pendingLogin: { userId: account.userId, orgId: account.orgId, phone: account.phone, remember } });
				return { requiresOtp: true, phone: account.phone };
			},

			async verifyOtp(code) {
				if (isLiveApi()) {
					const pending = get().pendingLogin;
					if (!pending?.email) throw new AuthError('Your sign-in session expired. Please sign in again.');
					try {
						const { user, org, orgs: available, permissions, pendingInvitations } = await live.verifyOtp(pending.email, code.trim());
						set({ status: 'authenticated', user, org, availableOrgs: available, permissions, pendingInvitations, pendingLogin: null });
						// A workspace-less session is legitimate now: they may have an
						// invitation to answer, or need to create one. The router decides.
						return org;
					} catch (err) {
						if (err instanceof AuthError) throw err;
						const { message, field } = live.messageFor(err, 'We could not verify that code.');
						throw new AuthError(message, field);
					}
				}

				await sleep(LATENCY);
				const pending = get().pendingLogin;
				if (!pending) throw new AuthError('Your sign-in session expired. Please sign in again.');
				if (code !== DEMO_OTP) throw new AuthError(`That code is not right. For the demo, use ${DEMO_OTP}.`, 'code');
				const user = users.find((u) => u.id === pending.userId)!;
				const org = orgs.find((o) => o.id === pending.orgId)!;
				// Users in the demo who belong to more than one org get the switcher.
				const available = user.id === 'u_amr' ? orgs : [org];
				set({ status: 'authenticated', user, org, availableOrgs: available, pendingLogin: null });
				return org;
			},

			async resendOtp() {
				if (isLiveApi()) {
					const pending = get().pendingLogin;
					if (pending?.email) await live.resendOtp(pending.email);
					return;
				}
				await sleep(300);
			},

			hydrate({ user, org, orgs: available, permissions, pendingInvitations }) {
				set({
					status: 'authenticated',
					user,
					org,
					availableOrgs: available,
					permissions: permissions ?? [],
					pendingInvitations: pendingInvitations ?? 0,
					pendingLogin: null,
				});
			},

			switchOrg(orgId) {
				const org = get().availableOrgs.find((o) => o.id === orgId);
				if (org) set({ org });
			},

			updateUser(patch) {
				const user = get().user;
				if (user) set({ user: { ...user, ...patch } });
			},

			logout() {
				// Fire-and-forget: the session is revoked server-side, but the UI
				// should not wait on the network to sign someone out.
				if (isLiveApi()) void live.logout();
				set({ status: 'anonymous', user: null, org: null, availableOrgs: [], permissions: [], pendingInvitations: 0, pendingLogin: null });
			},

			updateSignup(patch) {
				set({ signup: { ...get().signup, ...patch } });
			},

			async registerAccount(password) {
				const d = get().signup;
				const name = `${d.firstName} ${d.lastName}`.trim();

				if (isLiveApi()) {
					try {
						await live.signup({ email: d.email, name, password, phone: d.phone || undefined });
					} catch (err) {
						const { message, field } = live.messageFor(err, 'We could not create your account.');
						throw new AuthError(message, field);
					}

					// The code that confirms the address goes out straight away, so the
					// next screen has one waiting. A failure here — the send shares a
					// rate limit with signup itself — must not surface as a failed
					// signup: the account exists, and saying otherwise sends people
					// back to a form that will now reject them as already registered.
					// The verify screen can ask for another code.
					try {
						await live.sendSignupCode(d.email);
					} catch {
						// Intentionally ignored; see above.
					}
					return;
				}

				await sleep(LATENCY);
			},

			async createWorkspace() {
				const d = get().signup;

				if (isLiveApi()) {
					try {
						const { org } = await live.createWorkspace({
							name: d.companyName,
							slug: d.slug,
							industry: d.industry,
							teamSize: d.teamSize,
							headOffice: d.headOffice,
							modules: d.modules,
							planId: d.planId,
						});
						// Owner of a brand-new workspace: the permission set is whatever
						// the server says it is, so /auth/me is the authority rather than
						// anything derived from the role here.
						const session = await live.fetchMe();
						set({
							status: 'authenticated',
							user: session.user,
							org: session.org ?? org,
							availableOrgs: session.orgs.length ? session.orgs : [org],
							permissions: session.permissions,
						});
						return session.org ?? org;
					} catch (err) {
						const { message, field } = live.messageFor(err, 'We could not create your workspace.');
						throw new AuthError(message, field);
					}
				}

				await sleep(LATENCY);
				const org: Org = {
					id: `org_${d.slug}`,
					slug: d.slug || 'workspace',
					name: d.companyName || 'My workspace',
					industry: d.industry,
					timezone: 'Africa/Lagos',
					timezoneLabel: 'West Africa Time',
					currency: 'NGN',
					cities: [d.headOffice.replace(/\s*\(.*\)$/, '')],
					trialDaysLeft: 14,
					setupStepsDone: 2,
					setupStepsTotal: 5,
					invitesAccepted: 0,
					invitesSent: 0,
				};
				const user: User = get().user ?? {
					id: `u_${d.email}`,
					name: `${d.firstName} ${d.lastName}`.trim() || 'New user',
					email: d.email,
					role: 'Admin',
					avatarTint: 'teal',
				};
				set({ status: 'authenticated', user, org, availableOrgs: [org] });
				return org;
			},

			async resendSignupCode() {
				if (isLiveApi()) {
					await live.sendSignupCode(get().signup.email);
					return;
				}
				await sleep(300);
			},

			async verifySignupOtp(code) {
				if (isLiveApi()) {
					const d = get().signup;
					try {
						const session = await live.verifySignupCode(d.email, code.trim());
						// An invited person already has a workspace: signing in is what
						// accepts the invitation, so the session is live from here.
						set({
							status: session.org ? 'authenticated' : 'anonymous',
							user: session.user,
							org: session.org,
							availableOrgs: session.orgs,
							permissions: session.permissions,
							signup: { ...d, phoneVerified: true },
						});
						return session.org;
					} catch (err) {
						const { message, field } = live.messageFor(err, 'We could not verify that code.');
						throw new AuthError(message, field);
					}
				}

				await sleep(LATENCY);
				if (code !== DEMO_OTP) throw new AuthError(`That code is not right. For the demo, use ${DEMO_OTP}.`, 'code');
				set({ signup: { ...get().signup, phoneVerified: true } });
				return null;
			},

			async completeSignup(invites = []) {
				if (isLiveApi()) {
					const org = get().org;
					// Without a workspace there is nobody to invite into. The account is
					// already created and verified; the caller decides what to show.
					if (!org) return { org: null, invites: [] };

					const wanted = invites.filter((i) => i.email.trim());
					const results = wanted.length ? await live.inviteMembers(org.slug, wanted) : [];
					set({ signup: emptySignup });
					return { org, invites: results };
				}

				await sleep(LATENCY + 300);
				const d = get().signup;
				const org: Org = {
					id: `org_${d.slug}`,
					slug: d.slug || 'workspace',
					name: d.companyName || 'My workspace',
					industry: d.industry,
					timezone: 'Africa/Lagos',
					timezoneLabel: 'West Africa Time',
					currency: 'NGN',
					cities: [d.headOffice.replace(/\s*\(.*\)$/, '')],
					trialDaysLeft: 14,
					setupStepsDone: 2,
					setupStepsTotal: 5,
					invitesAccepted: 0,
					invitesSent: 0,
				};
				const user: User = {
					id: `u_${d.email}`,
					name: `${d.firstName} ${d.lastName}`.trim() || 'New user',
					email: d.email,
					role: 'Admin',
					avatarTint: 'teal',
				};
				set({ status: 'authenticated', user, org, availableOrgs: [org], signup: emptySignup });
				return { org, invites: [] };
			},

			resetSignup() {
				set({ signup: emptySignup });
			},
		}),
		{
			name: 'ledgedesk.session',
			storage: createJSONStorage(() => localStorage),
			partialize: (s) => ({ status: s.status, user: s.user, org: s.org, availableOrgs: s.availableOrgs, permissions: s.permissions, pendingInvitations: s.pendingInvitations, signup: s.signup, pendingLogin: s.pendingLogin }),
		},
	),
);

export const selectIsAuthed = (s: AuthState) => s.status === 'authenticated' && !!s.org;
