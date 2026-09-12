import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from '@tanstack/react-router';
import { MailCheck } from 'lucide-react';
import { AuthShell, PanelHeadline } from '@/shared/layouts/AuthShell';
import { Button, Field, Input } from '@/shared/ui';
import { sleep } from '@/shared/lib/format';
import { AuthHeading } from '../components/AuthHeading';

const schema = z.object({ email: z.string().trim().min(1, 'Enter your work email').email('Enter a valid email address') });
type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
	const [sentTo, setSentTo] = useState<string>();
	const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '' } });
	const onSubmit = form.handleSubmit(async (v) => {
		await sleep(500);
		setSentTo(v.email);
	});

	return (
		<AuthShell panel={<PanelHeadline title="Locked out? It happens.">We'll email you a link to set a new password. Links expire after 30 minutes and can only be used once.</PanelHeadline>}>
			{sentTo ? (
				<div className="text-center">
					<span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-success-bg text-success-fg">
						<MailCheck size={22} aria-hidden />
					</span>
					<AuthHeading title="Check your inbox">
						If <b className="text-t1">{sentTo}</b> belongs to an account, a reset link is on its way.
					</AuthHeading>
					<Link to="/reset-password/$token" params={{ token: 'demo-token' }} className="text-[13px] text-brand-600 hover:underline">
						Open the demo reset link
					</Link>
					<div className="mt-6">
						<Link to="/login" search={{}} className="text-[13px] text-t2 hover:underline">
							Back to sign in
						</Link>
					</div>
				</div>
			) : (
				<>
					<AuthHeading title="Reset your password">Enter the work email you sign in with.</AuthHeading>
					<form onSubmit={onSubmit} noValidate className="space-y-3.5">
						<Field label="Work email" error={form.formState.errors.email?.message}>
							{(id, d) => <Input id={id} type="email" autoComplete="email" aria-describedby={d} invalid={!!form.formState.errors.email} {...form.register('email')} />}
						</Field>
						<Button type="submit" variant="primary" size="lg" block loading={form.formState.isSubmitting}>
							Send reset link
						</Button>
					</form>
					<p className="mt-5 text-center text-[13px] text-t2">
						Remembered it?{' '}
						<Link to="/login" search={{}} className="text-brand-600 hover:underline">
							Sign in
						</Link>
					</p>
				</>
			)}
		</AuthShell>
	);
}
