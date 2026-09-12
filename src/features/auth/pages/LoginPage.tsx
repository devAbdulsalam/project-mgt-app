import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { Shield, Zap } from 'lucide-react';
import { AuthShell, PanelHeadline, PanelTile } from '@/shared/layouts/AuthShell';
import { Button, Checkbox, Field, Input, OrDivider, SsoButton } from '@/shared/ui';
import { AuthError, useAuthStore } from '@/shared/lib/auth-store';
import { demoAccounts, orgs } from '@/mocks/data';
import { PasswordInput } from '../components/PasswordInput';
import { AuthHeading, FormError } from '../components/AuthHeading';

const schema = z.object({
	email: z.string().trim().min(1, 'Enter your work email').email('Enter a valid email address'),
	password: z.string().min(1, 'Enter your password'),
	remember: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
	const navigate = useNavigate();
	const { redirect } = useSearch({ from: '/login' });
	const login = useAuthStore((s) => s.login);
	const [formError, setFormError] = useState<string>();

	const form = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: { email: '', password: '', remember: true },
	});
	const email = useWatch({ control: form.control, name: 'email' });
	const detectedOrg = (() => {
		const acct = demoAccounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
		return acct ? orgs.find((o) => o.id === acct.orgId) : undefined;
	})();

	const onSubmit = form.handleSubmit(async (values) => {
		setFormError(undefined);
		try {
			await login(values);
			navigate({ to: '/login/verify', search: { redirect } });
		} catch (e) {
			if (e instanceof AuthError && e.field && e.field !== 'code') form.setError(e.field, { message: e.message });
			else setFormError(e instanceof Error ? e.message : 'Something went wrong');
		}
	});

	return (
		<AuthShell
			footer="© 2026 Ledge Desk · SOC 2 Type II · Data hosted in Lagos"
			panel={
				<>
					<PanelHeadline title="Support tickets and project work, in one calm place.">
						Track SLAs, run sprints, plan roadmaps and keep customers informed — from the same issue, on any screen.
					</PanelHeadline>
					<div className="mt-8 grid max-w-[460px] grid-cols-2 gap-3">
						<PanelTile value="94.2%" label="SLA compliance this month" icon={<Shield size={16} />} iconClass="text-[#8fd3b5]" />
						<PanelTile value="3.4d" label="Median cycle time" icon={<Zap size={16} />} iconClass="text-[#9fc7ff]" />
					</div>
				</>
			}
		>
			<AuthHeading title="Welcome back">
				Sign in to {detectedOrg ? <b className="text-t1">{detectedOrg.name}</b> : 'your workspace'} ·{' '}
				<Link to="/signup" className="text-brand-600 hover:underline">
					create one
				</Link>
			</AuthHeading>

			<SsoButton provider="google" onClick={() => setFormError('Google Workspace sign-in is not wired up in the demo. Use email and password.')}>
				Continue with Google Workspace
			</SsoButton>
			<SsoButton provider="sso" className="mt-2.5" onClick={() => setFormError('SSO is not wired up in the demo. Use email and password.')}>
				Continue with SSO (Okta)
			</SsoButton>
			<OrDivider>or with email</OrDivider>

			<FormError message={formError} />
			<form onSubmit={onSubmit} noValidate className="space-y-3.5">
				<Field label="Work email" error={form.formState.errors.email?.message}>
					{(id, describedBy) => (
						<Input id={id} type="email" autoComplete="email" placeholder="you@company.ng" aria-describedby={describedBy} invalid={!!form.formState.errors.email} {...form.register('email')} />
					)}
				</Field>
				<Field label="Password" error={form.formState.errors.password?.message}>
					{(id, describedBy) => <PasswordInput id={id} placeholder="••••••••••••" aria-describedby={describedBy} invalid={!!form.formState.errors.password} {...form.register('password')} />}
				</Field>
				<div className="flex items-center justify-between pt-0.5">
					<Checkbox label="Keep me signed in for 30 days" {...form.register('remember')} />
					<Link to="/forgot-password" className="text-[13px] text-brand-600 hover:underline">
						Forgot password?
					</Link>
				</div>
				<Button type="submit" variant="primary" size="lg" block loading={form.formState.isSubmitting} className="mt-1">
					Sign in
				</Button>
			</form>

			<p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] text-t2">
				<Shield size={12} aria-hidden /> Protected by 2-step verification ·{' '}
				<a href="#portal" className="text-brand-600 hover:underline">
					Customer? Use the portal
				</a>
			</p>

			<DemoHint />
		</AuthShell>
	);
}

function DemoHint() {
	return (
		<div className="mt-8 rounded-[10px] border border-dashed border-border-strong bg-white px-3.5 py-3 text-xs text-t2">
			<b className="text-t1">Demo accounts</b> · password is <span className="kbd">password</span>, OTP is <span className="kbd">482913</span>
			<ul className="mt-1.5 space-y-0.5">
				{demoAccounts.map((a) => (
					<li key={a.email} className="font-mono text-[11px]">
						{a.email}
					</li>
				))}
			</ul>
		</div>
	);
}
