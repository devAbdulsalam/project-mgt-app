import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { AuthShell, PanelHeadline, PanelTile } from '@/shared/layouts/AuthShell';
import { Avatar, Button, Checkbox, Field, Input, OrDivider, SsoButton, Steps } from '@/shared/ui';
import { AuthError, useAuthStore } from '@/shared/lib/auth-store';
import { slugify } from '@/shared/lib/format';
import { PasswordInput, PasswordStrengthMeter } from '../components/PasswordInput';
import { passwordField } from '../lib/password-policy';
import { SIGNUP_STEPS } from '../lib/steps';
import { AuthHeading, FormError } from '../components/AuthHeading';

const schema = z.object({
	firstName: z.string().trim().min(1, 'Enter your first name'),
	lastName: z.string().trim().min(1, 'Enter your last name'),
	email: z.string().trim().min(1, 'Enter your work email').email('Enter a valid email address'),
	phone: z
		.string()
		.trim()
		.regex(/^\d{3} ?\d{3} ?\d{4}$/, 'Enter a 10-digit mobile number, e.g. 803 555 0142'),
	password: passwordField,
	agree: z.literal(true, {
		message: 'You need to accept the terms to continue',
	}),
});
type FormValues = z.infer<typeof schema>;

export function SignupPage() {
	const navigate = useNavigate();
	const draft = useAuthStore((s) => s.signup);
	const updateSignup = useAuthStore((s) => s.updateSignup);
	const registerAccount = useAuthStore((s) => s.registerAccount);
	const [formError, setFormError] = useState<string>();
	const [busy, setBusy] = useState(false);

	const form = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			firstName: draft.firstName,
			lastName: draft.lastName,
			email: draft.email,
			phone: draft.phone.replace(/^\+234\s?/, ''),
			password: '',
			agree: false as unknown as true,
		},
	});
	const email = useWatch({ control: form.control, name: 'email' });
	const password = useWatch({ control: form.control, name: 'password' });
	const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

	const onSubmit = form.handleSubmit(async (v) => {
		if (busy) return;
		setBusy(true);
		setFormError(undefined);

		const domain = v.email.split('@')[1]?.split('.')[0] ?? '';
		// Written before the call so the next screen — and a reload — can read the
		// address, and so a failure leaves the form filled in rather than blank.
		updateSignup({
			firstName: v.firstName,
			lastName: v.lastName,
			email: v.email,
			phone: `+234 ${v.phone.replace(/\s+/g, ' ')}`,
			phoneVerified: false,
			companyName: draft.companyName || (domain ? domain[0]!.toUpperCase() + domain.slice(1) : ''),
			slug: draft.slug || slugify(domain),
		});

		try {
			await registerAccount(v.password);
			navigate({ to: '/signup/verify' });
		} catch (e) {
			if (e instanceof AuthError && e.field && e.field !== 'code') {
				form.setError(e.field, { message: e.message });
			} else {
				setFormError(e instanceof Error ? e.message : 'Something went wrong');
			}
		} finally {
			setBusy(false);
		}
	});

	return (
		<AuthShell
			badge="🇳🇬 Nigeria · Data hosted in Lagos"
			panel={
				<>
					<PanelHeadline title="Run your IT support desk like the big MSPs do.">
						Helpdesk, field engineers, client contracts and SLAs in one place. Built for Nigerian IT firms: WhatsApp intake, NDPR-ready, naira billing, works on 3G.
					</PanelHeadline>
					<div className="mt-7 grid max-w-[520px] grid-cols-3 gap-3">
						<PanelTile value="14 days" label="Free trial, no card" />
						<PanelTile value="₦0" label="Setup fee" />
						<PanelTile value="99.9%" label="Uptime SLA" />
					</div>
					<blockquote className="mt-5 max-w-[520px] rounded-[14px] border border-white/10 bg-white/[.06] p-5">
						<p className="text-sm leading-relaxed">“We moved 6 engineers and 40 client contracts over in a weekend. First-response time dropped from 3 hours to 25 minutes.”</p>
						<footer className="mt-3 flex items-center gap-2.5 text-[11px]">
							<Avatar name="Tunde Bakare" tint="tan" src="https://randomuser.me/api/portraits/men/44.jpg" />
							<span>
								<b className="block">Tunde Bakare</b>
								<span className="text-on-dark-muted">Head of Support, Lekki Fintech Ltd</span>
							</span>
						</footer>
					</blockquote>
				</>
			}
		>
			<Steps steps={SIGNUP_STEPS} current={1} className="mb-8" />
			<AuthHeading title="Create your account">
				Already have one?{' '}
				<Link to="/login" search={{}} className="text-brand-600 hover:underline">
					Sign in
				</Link>
			</AuthHeading>

			<SsoButton provider="google" onClick={() => setFormError('Google Workspace signup is not wired up in the demo. Use your work email.')}>
				Continue with Google Workspace
			</SsoButton>
			<SsoButton provider="microsoft" className="mt-2.5" onClick={() => setFormError('Microsoft 365 signup is not wired up in the demo. Use your work email.')}>
				Continue with Microsoft 365
			</SsoButton>
			<OrDivider>or with your work email</OrDivider>

			<FormError message={formError} />
			<form onSubmit={onSubmit} noValidate className="space-y-3.5">
				<div className="grid grid-cols-2 gap-3">
					<Field label="First name" error={form.formState.errors.firstName?.message}>
						{(id, d) => <Input id={id} autoComplete="given-name" aria-describedby={d} invalid={!!form.formState.errors.firstName} {...form.register('firstName')} />}
					</Field>
					<Field label="Last name" error={form.formState.errors.lastName?.message}>
						{(id, d) => <Input id={id} autoComplete="family-name" aria-describedby={d} invalid={!!form.formState.errors.lastName} {...form.register('lastName')} />}
					</Field>
				</div>
				<Field label="Work email" error={form.formState.errors.email?.message}>
					{(id, d) => (
						<Input
							id={id}
							type="email"
							autoComplete="email"
							placeholder="you@company.ng"
							aria-describedby={d}
							invalid={!!form.formState.errors.email}
							trailing={emailLooksValid ? <CheckCircle2 size={15} className="text-success" aria-label="Looks good" /> : null}
							{...form.register('email')}
						/>
					)}
				</Field>
				<Field label="Mobile number" hint="(for OTP & WhatsApp alerts)" error={form.formState.errors.phone?.message}>
					{(id, d) => (
						<Input
							id={id}
							type="tel"
							inputMode="tel"
							autoComplete="tel-national"
							placeholder="803 555 0142"
							aria-describedby={d}
							invalid={!!form.formState.errors.phone}
							leading={<span className="-ms-3 flex h-[40px] items-center gap-1.5 border-e border-border-strong px-3 text-[13px] text-t2">🇳🇬 +234</span>}
							{...form.register('phone')}
						/>
					)}
				</Field>
				<Field label="Password" error={form.formState.errors.password?.message}>
					{(id, d) => (
						<>
							<PasswordInput id={id} autoComplete="new-password" aria-describedby={d} invalid={!!form.formState.errors.password} {...form.register('password')} />
							<PasswordStrengthMeter password={password} />
						</>
					)}
				</Field>
				<div>
					<Checkbox
						label={
							<>
								I agree to the{' '}
								<a href="#terms" className="text-brand-600 hover:underline">
									Terms
								</a>{' '}
								and{' '}
								<a href="#privacy" className="text-brand-600 hover:underline">
									Privacy Policy
								</a>
								, and to processing under the Nigeria Data Protection Regulation.
							</>
						}
						{...form.register('agree')}
					/>
					{form.formState.errors.agree ? (
						<p role="alert" className="mt-1.5 text-xs text-danger">
							{form.formState.errors.agree.message}
						</p>
					) : null}
				</div>
				<Button type="submit" variant="primary" size="lg" block loading={busy} className="mt-1 h-11">
					Create account <ArrowRight size={15} aria-hidden />
				</Button>
			</form>
		</AuthShell>
	);
}
