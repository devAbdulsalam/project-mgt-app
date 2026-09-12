import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { AuthShell, PanelHeadline } from '@/shared/layouts/AuthShell';
import { Button, Field } from '@/shared/ui';
import { sleep } from '@/shared/lib/format';
import { PasswordInput, PasswordStrengthMeter } from '../components/PasswordInput';
import { passwordStrength } from '../lib/password';
import { AuthHeading } from '../components/AuthHeading';

const schema = z
	.object({
		password: z.string().min(8, 'Use at least 8 characters').refine((p) => passwordStrength(p).score >= 2, 'Add a mix of letters and numbers'),
		confirm: z.string(),
	})
	.refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });
type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
	const { token } = useParams({ from: '/reset-password/$token' });
	const navigate = useNavigate();
	const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { password: '', confirm: '' } });
	const password = useWatch({ control: form.control, name: 'password' });

	const onSubmit = form.handleSubmit(async () => {
		await sleep(600);
		navigate({ to: '/login', search: {} });
	});

	return (
		<AuthShell panel={<PanelHeadline title="Choose a new password.">Use at least 8 characters with a mix of letters, numbers and symbols. You'll be signed out of other devices.</PanelHeadline>}>
			<AuthHeading title="Set a new password">
				Reset link <span className="kbd">{token.slice(0, 12)}</span> is valid for 30 minutes.
			</AuthHeading>
			<form onSubmit={onSubmit} noValidate className="space-y-3.5">
				<Field label="New password" error={form.formState.errors.password?.message}>
					{(id, d) => (
						<>
							<PasswordInput id={id} autoComplete="new-password" aria-describedby={d} invalid={!!form.formState.errors.password} {...form.register('password')} />
							<PasswordStrengthMeter password={password} />
						</>
					)}
				</Field>
				<Field label="Confirm password" error={form.formState.errors.confirm?.message}>
					{(id, d) => <PasswordInput id={id} autoComplete="new-password" aria-describedby={d} invalid={!!form.formState.errors.confirm} {...form.register('confirm')} />}
				</Field>
				<Button type="submit" variant="primary" size="lg" block loading={form.formState.isSubmitting}>
					Update password &amp; sign in
				</Button>
			</form>
			<p className="mt-5 text-center text-[13px] text-t2">
				<Link to="/login" search={{}} className="text-brand-600 hover:underline">
					Back to sign in
				</Link>
			</p>
		</AuthShell>
	);
}
