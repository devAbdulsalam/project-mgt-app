import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { demoAccounts, orgs, users, DEMO_OTP, type Org, type User } from '@/mocks/data';
import { sleep } from './format';

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

interface AuthState {
	status: 'anonymous' | 'authenticated';
	user: User | null;
	org: Org | null;
	availableOrgs: Org[];
	/** Pending step-up: sign-in accepted, waiting for OTP. */
	pendingLogin: { userId: string; orgId: string; phone: string; remember: boolean } | null;
	signup: SignupDraft;

	login: (input: { email: string; password: string; remember: boolean }) => Promise<{ requiresOtp: boolean; phone: string }>;
	verifyOtp: (code: string) => Promise<Org>;
	resendOtp: () => Promise<void>;
	switchOrg: (orgId: string) => void;
	logout: () => void;

	updateSignup: (patch: Partial<SignupDraft>) => void;
	verifySignupOtp: (code: string) => Promise<void>;
	completeSignup: () => Promise<Org>;
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
			pendingLogin: null,
			signup: emptySignup,

			async login({ email, password, remember }) {
				await sleep(LATENCY);
				const account = demoAccounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
				if (!account) throw new AuthError('We could not find an account with that email.', 'email');
				if (account.password !== password) throw new AuthError('Incorrect password. Try “password” for the demo.', 'password');
				set({ pendingLogin: { userId: account.userId, orgId: account.orgId, phone: account.phone, remember } });
				return { requiresOtp: true, phone: account.phone };
			},

			async verifyOtp(code) {
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
				await sleep(300);
			},

			switchOrg(orgId) {
				const org = get().availableOrgs.find((o) => o.id === orgId);
				if (org) set({ org });
			},

			logout() {
				set({ status: 'anonymous', user: null, org: null, availableOrgs: [], pendingLogin: null });
			},

			updateSignup(patch) {
				set({ signup: { ...get().signup, ...patch } });
			},

			async verifySignupOtp(code) {
				await sleep(LATENCY);
				if (code !== DEMO_OTP) throw new AuthError(`That code is not right. For the demo, use ${DEMO_OTP}.`, 'code');
				set({ signup: { ...get().signup, phoneVerified: true } });
			},

			async completeSignup() {
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
				return org;
			},

			resetSignup() {
				set({ signup: emptySignup });
			},
		}),
		{
			name: 'ledgedesk.session',
			storage: createJSONStorage(() => sessionStorage),
			partialize: (s) => ({ status: s.status, user: s.user, org: s.org, availableOrgs: s.availableOrgs, signup: s.signup }),
		},
	),
);

export const selectIsAuthed = (s: AuthState) => s.status === 'authenticated' && !!s.org;
