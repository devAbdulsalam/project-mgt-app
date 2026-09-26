// Signing in to the console.
//
// A separate sign-in from the product's, and not a variation on it. The product
// flow ends by demanding a workspace ("Your account is not in any workspace
// yet"), which is the wrong ending for an operator: platform standing lives in
// `users.platform_role` and has nothing to do with membership, and the people who
// most need the console are frequently in no workspace at all.
//
// Only /auth/login is used, and this is a deliberate divergence from the
// product's two-screen sign-in:
//
//   The product gates on a password and then an SMS code, because that is the
//   app's second factor. The console's second factor is TOTP, and it is enforced
//   by /super-admin/auth/elevate rather than here. Chaining the product's SMS
//   step as well would mean:
//
//     - an operator account with no phone on file cannot sign in to the console
//       at all. /auth/otp/send answers with `phone: null` and there is no way
//       forward, even though that operator may already have a working
//       authenticator. The console is the surface that *enrols* TOTP, so it
//       cannot also depend on the channel TOTP exists to replace.
//     - two rate-limit budgets are spent per sign-in (credentialByIp on login,
//       then otpRequestByEmail on otp/send), so an operator who mistypes a
//       password is closer to lockout than they should be.
//     - the factor that actually gates console actions would be the weaker one.
//
//   Signing in here proves identity. Everything the console does is then gated
//   on TOTP, and an operator with no second factor is routed straight to enrolment
//   rather than being able to read anything.
//
// The access token goes into the global token store, so one session serves both
// surfaces and the console can re-establish itself from the refresh cookie on
// reload.

import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ShieldCheck } from 'lucide-react';
import { api } from '@/api';
import { Button, Card, Field, Input } from '@/shared/ui';
import { PasswordInput } from '@/features/auth/components/PasswordInput';
import { useTokenStore } from '@/shared/lib/token-store';
import { messageFor } from '@/features/auth/live';
import { useConsoleStore } from '../store';

interface LoginResponse {
	access_token: string;
	expires_at: string;
}

export function ConsoleSignInPage() {
	const navigate = useNavigate();
	const establish = useConsoleStore((s) => s.establish);

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string>();
	const [field, setField] = useState<'email' | 'password'>();
	const [busy, setBusy] = useState(false);

	const submit = async () => {
		if (busy) return;
		setBusy(true);
		setError(undefined);
		setField(undefined);
		try {
			const session = await api.post<LoginResponse>('/auth/login', { json: { email: email.trim(), password } });

			// Before the store is consulted: `establish` short-circuits to the
			// refresh cookie when there is no token, and there is one here.
			useTokenStore.getState().setTokens({ accessToken: session.access_token, expiresAt: Date.parse(session.expires_at) });

			// A correct password proves the account exists, not that it may use this
			// surface. `establish` asks the server, and lands on the console, on
			// enrolment, or on the "not an operator" screen accordingly.
			await establish();
			navigate({ to: '/console' });
		} catch (err) {
			const result = messageFor(err, 'We could not sign you in.');
			setError(result.message);
			setField(result.field === 'password' ? 'password' : result.field === 'email' ? 'email' : undefined);
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="grid min-h-[100dvh] place-items-center bg-brand-900 px-5 py-10">
			<Card className="w-full max-w-[420px] p-7">
				<div className="flex items-center gap-2.5">
					<span className="grid size-9 place-items-center rounded-sm bg-brand-900 text-white">
						<ShieldCheck size={18} />
					</span>
					<div>
						<h1 className="text-base font-semibold text-t1">Ledge console</h1>
						<p className="text-xs text-t2">Platform operators only</p>
					</div>
				</div>

				<form
					className="mt-6 space-y-4"
					onSubmit={(e) => {
						e.preventDefault();
						void submit();
					}}
				>
					<Field label="Email" error={field === 'email' ? error : undefined}>
						{(id, describedBy) => (
							<Input
								id={id}
								type="email"
								autoComplete="username"
								autoFocus
								required
								value={email}
								aria-describedby={describedBy}
								invalid={field === 'email'}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="you@ledge.com"
							/>
						)}
					</Field>

					<Field label="Password" error={field === 'password' ? error : undefined}>
						{(id, describedBy) => (
							<PasswordInput
								id={id}
								autoComplete="current-password"
								required
								value={password}
								aria-describedby={describedBy}
								invalid={field === 'password'}
								onChange={(e) => setPassword(e.target.value)}
							/>
						)}
					</Field>

					{error && !field ? (
						<p role="alert" className="text-xs text-danger">
							{error}
						</p>
					) : null}

					<Button type="submit" variant="primary" size="lg" block loading={busy} disabled={!email.trim() || !password}>
						Sign in
					</Button>
				</form>

				<p className="mt-5 text-[11px] leading-relaxed text-t3">
					You will be asked for a code from your authenticator next. If you have not set one up yet, the console will take you
					through enrolment first — it cannot be skipped.
				</p>

				<p className="mt-4 border-t border-border pt-4 text-[11px] leading-relaxed text-t3">
					Not an operator?{' '}
					<Link to="/login" className="text-brand-900 underline">
						Sign in to Ledge
					</Link>{' '}
					instead. Every action in this console is recorded against your account.
				</p>
			</Card>
		</div>
	);
}
