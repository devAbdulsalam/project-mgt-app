import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowRight, Shield } from 'lucide-react';
import { AuthShell, PanelHeadline, PanelTile } from '@/shared/layouts/AuthShell';
import { Button, OtpInput, Steps } from '@/shared/ui';
import { AuthError, useAuthStore } from '@/shared/lib/auth-store';
import { useLiveApi } from '@/shared/lib/live-api';
import { maskPhone } from '@/shared/lib/format';
import { AuthHeading, FormError } from '../components/AuthHeading';
import { useCountdown } from '../hooks/useCountdown';
import { SIGNUP_STEPS } from '../lib/steps';

export function SignupVerifyPage() {
	const navigate = useNavigate();
	const draft = useAuthStore((s) => s.signup);
	const verify = useAuthStore((s) => s.verifySignupOtp);
	const resendCode = useAuthStore((s) => s.resendSignupCode);
	const live = useLiveApi();
	const [code, setCode] = useState('');
	const [error, setError] = useState<string>();
	const [busy, setBusy] = useState(false);
	const resend = useCountdown(42);

	// Against the live API the code is emailed to the address on the account —
	// there is no SMS or WhatsApp delivery — so the screen says where to look.
	const sentTo = live ? draft.email : maskPhone(draft.phone);

	const requestNewCode = async () => {
		resend.reset();
		setError(undefined);
		try {
			await resendCode();
		} catch {
			setError('We could not send a new code. Try again in a moment.');
		}
	};

	useEffect(() => {
		if (!draft.email) navigate({ to: '/signup', replace: true });
	}, [draft.email, navigate]);

	const submit = async () => {
		if (code.length < 6 || busy) return;
		setBusy(true);
		setError(undefined);
		try {
			const org = await verify(code);
			// Someone who signed up from an invitation already has a workspace;
			// the setup steps are not theirs to do.
			if (org) navigate({ to: '/$org/dashboard', params: { org: org.slug }, replace: true, search: { tour: 'choice' } });
			else navigate({ to: '/signup/workspace' });
		} catch (e) {
			setError(e instanceof AuthError ? e.message : 'Something went wrong');
			setCode('');
		} finally {
			setBusy(false);
		}
	};

	return (
		<AuthShell
			footer={
				<button type="button" className="hover:text-white" onClick={() => navigate({ to: '/signup' })}>
					Not you? Use a different number
				</button>
			}
			panel={
				<>
					<Steps steps={SIGNUP_STEPS.slice(0, 3)} current={2} onDark className="mb-6" />
					<PanelHeadline title={live ? 'Check your email' : 'Check your phone'}>
						{live ? 'We sent a 6-digit code to ' : 'We sent a 6-digit code by SMS and WhatsApp to '}
						<b className="text-white">{sentTo}</b>. It expires in 10 minutes.
					</PanelHeadline>
					<PanelTile
						className="mt-7 max-w-[440px]"
						value={<span className="text-sm">Why we verify</span>}
						icon={<Shield size={14} />}
						iconClass="text-white"
						label="Engineers get SLA alerts by SMS and WhatsApp when data is poor. A verified number keeps those alerts reliable."
					/>
				</>
			}
		>
			<Steps steps={SIGNUP_STEPS} current={2} className="mb-8" />
			<AuthHeading title={live ? 'Verify your email' : 'Verify your number'}>
				Enter the code we sent to <b className="text-t1">{sentTo}</b>.
			</AuthHeading>
			<FormError message={error} />
			<form
				onSubmit={(e) => {
					e.preventDefault();
					submit();
				}}
				className="space-y-4"
			>
				<OtpInput value={code} onChange={setCode} invalid={!!error} disabled={busy} />
				<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-t2">
					{resend.remaining > 0 ? (
						<span>Resend in {resend.label}</span>
					) : (
						<button type="button" className="font-semibold text-brand-600 hover:underline" onClick={requestNewCode}>
							Resend code
						</button>
					)}
					{live ? null : (
						<>
							<button type="button" className="text-brand-600 hover:underline" onClick={() => resend.reset()}>
								Send via WhatsApp instead
							</button>
							<button type="button" className="text-brand-600 hover:underline" onClick={() => resend.reset()}>
								Call me
							</button>
						</>
					)}
				</div>
				<div className="flex items-center justify-between pt-2">
					<Button type="button" variant="ghost" onClick={() => navigate({ to: '/signup' })}>
						Back
					</Button>
					<Button type="submit" variant="primary" size="lg" loading={busy} disabled={code.length < 6}>
						Continue <ArrowRight size={15} aria-hidden />
					</Button>
				</div>
			</form>
			{live ? null : (
				<p className="mt-6 text-center text-xs text-t3">
					Demo code: <span className="kbd">482913</span>
				</p>
			)}
		</AuthShell>
	);
}
