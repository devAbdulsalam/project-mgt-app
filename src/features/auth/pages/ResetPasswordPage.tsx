import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { AuthShell, PanelHeadline } from '@/shared/layouts/AuthShell';
import { Button, Field } from '@/shared/ui';
import { ApiError } from '@/api';
import { authApi } from '../api';
import {
	PasswordInput,
	PasswordStrengthMeter,
} from '../components/PasswordInput';
import { PASSWORD_HINT, passwordField } from '../lib/password-policy';
import { AuthHeading, FormError } from '../components/AuthHeading';

const schema = z
	.object({
		password: passwordField,
		confirm: z.string(),
	})
	.refine((v) => v.password === v.confirm, {
		path: ['confirm'],
		message: 'Passwords do not match',
	});
type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
	const { token } = useSearch({ from: '/reset-password' });
	const navigate = useNavigate();
	const form = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: { password: '', confirm: '' },
	});
	const password = useWatch({ control: form.control, name: 'password' });
	const tokenMissing = !token || token.length < 16 || token.length > 256;

	const onSubmit = form.handleSubmit(async ({ password }) => {
		form.clearErrors('root');
		try {
			await authApi.resetPassword(token!, password);
			navigate({ to: '/login', search: {}, replace: true });
		} catch (error) {
			form.setError('root', {
				message:
					error instanceof ApiError
						? error.message
						: 'Could not reset your password. Check your connection and try again.',
			});
		}
	});

	return (
		<AuthShell
			panel={
				<PanelHeadline title="Choose a new password.">
					{PASSWORD_HINT} You'll be signed out of other devices.
				</PanelHeadline>
			}
		>
			<AuthHeading title="Set a new password">
				{tokenMissing
					? 'This reset link is missing or invalid. Request a new link to continue.'
					: 'Your reset link is valid for 30 minutes.'}
			</AuthHeading>
			{tokenMissing ? (
				<Link
					to="/forgot-password"
					className="text-[13px] text-brand-600 hover:underline"
				>
					Request a new reset link
				</Link>
			) : (
				<form onSubmit={onSubmit} noValidate className="space-y-3.5">
					<FormError message={form.formState.errors.root?.message} />
					<Field
						label="New password"
						error={form.formState.errors.password?.message}
					>
						{(id, d) => (
							<>
								<PasswordInput
									id={id}
									autoComplete="new-password"
									aria-describedby={d}
									invalid={!!form.formState.errors.password}
									{...form.register('password')}
								/>
								<PasswordStrengthMeter password={password} />
							</>
						)}
					</Field>
					<Field
						label="Confirm password"
						error={form.formState.errors.confirm?.message}
					>
						{(id, d) => (
							<PasswordInput
								id={id}
								autoComplete="new-password"
								aria-describedby={d}
								invalid={!!form.formState.errors.confirm}
								{...form.register('confirm')}
							/>
						)}
					</Field>
					<Button
						type="submit"
						variant="primary"
						size="lg"
						block
						loading={form.formState.isSubmitting}
					>
						Update password
					</Button>
				</form>
			)}
			<p className="mt-5 text-center text-[13px] text-t2">
				<Link
					to="/login"
					search={{}}
					className="text-brand-600 hover:underline"
				>
					Back to sign in
				</Link>
			</p>
		</AuthShell>
	);
}
