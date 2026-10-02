import { useEffect, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Lock, Wifi } from 'lucide-react';
import {
	AuthShell,
	PanelHeadline,
	PanelTile,
} from '@/shared/layouts/AuthShell';
import { Button, OtpInput } from '@/shared/ui';
import { AuthError, useAuthStore } from '@/shared/lib/auth-store';
import { maskPhone } from '@/shared/lib/format';
import { users } from '@/mocks/data';
import { AuthHeading, FormError } from '../components/AuthHeading';
import { useCountdown } from '../hooks/useCountdown';
import { useTourStore } from '@/features/tour/store';

export function LoginOtpPage() {
	const navigate = useNavigate();
	const { redirect } = useSearch({ from: '/login/verify' });
	const pending = useAuthStore((s) => s.pendingLogin);
	const verifyOtp = useAuthStore((s) => s.verifyOtp);
	const resendOtp = useAuthStore((s) => s.resendOtp);
	const [code, setCode] = useState('');
	const [error, setError] = useState<string>();
	const [busy, setBusy] = useState(false);
	const expires = useCountdown(10 * 60);
	const resend = useCountdown(42);

	useEffect(() => {
		if (!pending)
			navigate({ to: '/login', search: { redirect }, replace: true });
	}, [pending, navigate, redirect]);

	if (!pending) return null;
	const pendingUser = users.find((u) => u.id === pending.userId);

	const submit = async () => {
		if (code.length < 6 || busy) return;
		setBusy(true);
		setError(undefined);
		try {
			const org = await verifyOtp(code);
			useTourStore.getState().flagLogin();

			// No workspace yet: the authed guard sends them on to answer an
			// invitation or create one, so there is nowhere to pass params for.
			if (!org) {
				navigate({ to: '/invitations', replace: true });
				return;
			}

			navigate({
				to: redirect ?? '/$org/dashboard',
				params: { org: org.slug },
				replace: true,
			});
		} catch (e) {
			setError(e instanceof AuthError ? e.message : 'Something went wrong');
			setCode('');
		} finally {
			setBusy(false);
		}
	};

	return (
		<AuthShell
			panel={
				<>
					<PanelHeadline title="One more step.">
						We sent a 6-digit code by SMS and WhatsApp to{' '}
						<b className="text-white">{maskPhone(pending.phone)}</b>. It expires
						in {expires.label}.
					</PanelHeadline>
					<PanelTile
						className="mt-7 max-w-[440px] text-xs"
						value={<span className="text-sm">Why we verify</span>}
						icon={<Lock size={14} />}
						iconClass="text-white"
						label="Engineers get SLA alerts by SMS and WhatsApp when data is poor. A verified number keeps those alerts reliable."
					/>
				</>
			}
		>
			<AuthHeading title="Enter the code we sent">
				SMS and WhatsApp to{' '}
				<b className="text-t1">{maskPhone(pending.phone)}</b> · expires in{' '}
				{expires.label}
			</AuthHeading>

			<FormError message={error} />
			<form
				onSubmit={(e) => {
					e.preventDefault();
					submit();
				}}
				className="space-y-4"
			>
				<OtpInput
					value={code}
					onChange={setCode}
					invalid={!!error}
					disabled={busy}
				/>
				<div className="flex items-center justify-between text-[13px]">
					<span className="text-t2">Didn't get it?</span>
					{resend.remaining > 0 ? (
						<span className="text-t3">Resend in {resend.label}</span>
					) : (
						<button
							type="button"
							className="font-semibold text-brand-600 hover:underline"
							onClick={async () => {
								await resendOtp();
								resend.reset();
							}}
						>
							Resend via WhatsApp
						</button>
					)}
				</div>

				<div className="flex items-start gap-2.5 rounded-md bg-[#eef5f7] p-3.5 text-[13px]">
					<Wifi size={18} className="shrink-0 text-brand-600" aria-hidden />
					<div>
						<b>Poor network?</b>
						<p className="mt-0.5 text-xs text-t2">
							The app works offline. Visits, photos and notes sync when you're
							back on data.
						</p>
					</div>
				</div>

				<Button
					type="submit"
					variant="primary"
					size="lg"
					block
					loading={busy}
					disabled={code.length < 6}
				>
					Verify &amp; sign in
				</Button>
			</form>

			<p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-t2">
				<Lock size={12} aria-hidden /> Signing in as {pendingUser?.name} ·{' '}
				{pendingUser?.role} ·{' '}
				<button
					type="button"
					className="text-brand-600 hover:underline"
					onClick={() => navigate({ to: '/login', search: { redirect } })}
				>
					Not you?
				</button>
			</p>
		</AuthShell>
	);
}
