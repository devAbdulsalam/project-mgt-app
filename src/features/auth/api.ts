// Auth adapter — typed calls against the backend auth surface. The mock auth-store
// stays the default; this module is the contract the OIDC/OTP adapter implements
// when the live API is enabled (backend plan §11).

import { api } from '@/api';
import type { Org, User } from '@/mocks/data';

export interface MeResponse {
	user: User;
	orgs: Org[];
	activeOrg: Org;
	permissions: string[];
	featureFlags: Record<string, boolean>;
}

export interface OtpSendResponse {
	requiresOtp: true;
	phone: string;
}

export interface VerifyOtpResponse {
	org: Org;
}

export const authApi = {
	/** Fetch the current identity, memberships, permissions and feature flags. */
	me: () => api.get<MeResponse>('/auth/me'),

	/** Request an OTP for email sign-in. */
	requestOtp: (email: string) =>
		api.post<OtpSendResponse>('/auth/otp/send', {
			json: { email },
			idempotencyKey: crypto.randomUUID(),
		}),

	/** Verify the OTP and open a session (tokens land in the token store / cookie). */
	verifyOtp: (email: string, code: string) =>
		api.post<VerifyOtpResponse>('/auth/otp/verify', {
			json: { email, code },
			idempotencyKey: crypto.randomUUID(),
		}),

	/** Rotate the refresh token (httpOnly cookie) and mint a new access token. */
	refresh: () => api.post<{ expiresAt: string }>('/auth/refresh'),

	/** Email a one-time password-reset link when the address belongs to an account. */
	requestPasswordReset: (email: string) =>
		api.post<{ status: 'sent' }>('/auth/password/forgot', {
			json: { email },
			idempotencyKey: crypto.randomUUID(),
		}),

	/** Set a new password using the one-time link token. */
	resetPassword: (token: string, password: string) =>
		api.post<void>('/auth/password/reset', {
			json: { token, password },
			idempotencyKey: crypto.randomUUID(),
		}),

	/** End the session: revokes the refresh family server-side. */
	logout: () => api.post<void>('/auth/logout'),
} as const;
