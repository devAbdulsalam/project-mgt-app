import { useEffect, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from '@tanstack/react-router';
import { ArrowRight, Download, Link2, Plus, X } from 'lucide-react';
import { Button, Input, Pill, Select, Steps, Wordmark } from '@/shared/ui';
import { useAuthStore } from '@/shared/lib/auth-store';
import { cn } from '@/shared/lib/cn';
import { inviteBases, inviteRoles, plans } from '@/mocks/data';
import { AuthHeading, FormError } from '../components/AuthHeading';
import { SIGNUP_STEPS } from '../lib/steps';

const inviteSchema = z.object({
	email: z.string().trim().email('Enter a valid email').or(z.literal('')),
	role: z.string(),
	base: z.string(),
});
const schema = z.object({
	invites: z.array(inviteSchema),
	planId: z.string(),
});
type FormValues = z.infer<typeof schema>;

export function SignupTeamPage() {
	const navigate = useNavigate();
	const draft = useAuthStore((s) => s.signup);
	const updateSignup = useAuthStore((s) => s.updateSignup);
	const completeSignup = useAuthStore((s) => s.completeSignup);
	const [error, setError] = useState<string>();
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if (!draft.email) navigate({ to: '/signup', replace: true });
		else if (!draft.phoneVerified) navigate({ to: '/signup/verify', replace: true });
	}, [draft.email, draft.phoneVerified, navigate]);

	const form = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			invites: [
				{ email: '', role: 'Admin', base: inviteBases[0]! },
				{ email: '', role: 'Field engineer', base: inviteBases[1]! },
				{ email: '', role: 'Support agent', base: 'Remote' },
			],
			planId: draft.planId,
		},
	});
	const { fields, append, remove } = useFieldArray({ control: form.control, name: 'invites' });
	const planId = useWatch({ control: form.control, name: 'planId' });
	const invites = useWatch({ control: form.control, name: 'invites' });
	const inviteCount = invites.filter((i) => i.email.trim()).length;
	const plan = plans.find((p) => p.id === planId)!;

	const finish = async (skip: boolean) => {
		setBusy(true);
		setError(undefined);
		try {
			updateSignup({ planId: form.getValues('planId') });
			const org = await completeSignup();
			navigate({ to: '/$org/dashboard', params: { org: org.slug }, replace: true, search: { welcome: skip ? undefined : inviteCount, tour: 'choice' } });
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Something went wrong');
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="flex min-h-full flex-col items-center px-4 py-8 sm:py-12">
			<Wordmark light={false} className="mb-8" />
			<div className="card w-full max-w-[760px] p-5 sm:p-9">
				<Steps steps={SIGNUP_STEPS} current={4} className="mb-8" />
				<AuthHeading title="Invite your team">Engineers get the mobile app for field visits; agents work the helpdesk. Everyone is free during the trial.</AuthHeading>
				<FormError message={error} />

				<form onSubmit={form.handleSubmit(() => finish(false))} noValidate>
					<div className="hidden grid-cols-[1fr_170px_170px_36px] gap-2.5 sm:grid" aria-hidden>
						<span className="text-xs font-semibold text-t2">Email</span>
						<span className="text-xs font-semibold text-t2">Role</span>
						<span className="text-xs font-semibold text-t2">Base</span>
					</div>
					<div className="mt-1.5 space-y-2.5">
						{fields.map((f, i) => {
							const err = form.formState.errors.invites?.[i]?.email?.message;
							return (
								<div key={f.id} className="grid grid-cols-[1fr_36px] gap-2.5 sm:grid-cols-[1fr_170px_170px_36px]">
									<div className="min-w-0">
										<Input type="email" placeholder="colleague@company.ng" aria-label={`Invite ${i + 1} email`} invalid={!!err} className="h-9" {...form.register(`invites.${i}.email`)} />
										{err ? (
											<p role="alert" className="mt-1 text-xs text-danger">
												{err}
											</p>
										) : null}
									</div>
									<button
										type="button"
										onClick={() => remove(i)}
										className="grid size-9 place-items-center rounded-sm text-t3 hover:bg-muted hover:text-t1 sm:order-last"
										aria-label={`Remove invite ${i + 1}`}
									>
										<X size={15} />
									</button>
									<Select aria-label={`Invite ${i + 1} role`} className="col-span-2 h-9 sm:col-span-1" {...form.register(`invites.${i}.role`)}>
										{inviteRoles.map((r) => (
											<option key={r}>{r}</option>
										))}
									</Select>
									<Select aria-label={`Invite ${i + 1} base`} className="col-span-2 h-9 sm:col-span-1" {...form.register(`invites.${i}.base`)}>
										{inviteBases.map((r) => (
											<option key={r}>{r}</option>
										))}
									</Select>
								</div>
							);
						})}
					</div>
					<div className="mt-3 mb-6 flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-brand-600">
						<button type="button" className="flex items-center gap-1.5 hover:underline" onClick={() => append({ email: '', role: 'Support agent', base: inviteBases[0]! })}>
							<Plus size={13} aria-hidden /> Add another
						</button>
						<button type="button" className="flex items-center gap-1.5 hover:underline" onClick={() => setError('CSV import is not available in the demo.')}>
							<Download size={13} aria-hidden /> Import CSV
						</button>
						<button
							type="button"
							className="flex items-center gap-1.5 hover:underline"
							onClick={() => navigator.clipboard?.writeText(`https://ledgedesk.app/invite/${draft.slug || 'workspace'}`).catch(() => {})}
						>
							<Link2 size={13} aria-hidden /> Copy invite link
						</button>
					</div>

					<fieldset>
						<legend className="mb-1.5 text-xs font-semibold text-t2">
							Choose a plan <span className="font-normal text-t3">· billed in naira, 14-day trial on any plan</span>
						</legend>
						<div className="grid gap-3 sm:grid-cols-3">
							{plans.map((p) => {
								const on = planId === p.id;
								return (
									<label key={p.id} className={cn('cursor-pointer rounded-md border p-3.5 transition-colors', on ? 'border-brand-600 bg-brand-100' : 'border-border-strong bg-white hover:bg-muted')}>
										<input type="radio" className="sr-only" value={p.id} {...form.register('planId')} />
										<div className="flex items-center justify-between">
											<b className="text-base">{p.name}</b>
											{p.popular ? (
												<Pill tone="teal" className="h-[18px]">
													Popular
												</Pill>
											) : null}
										</div>
										<div className="mt-1.5 mb-0.5 text-xl font-semibold">
											{p.price}
											{p.per ? <span className="text-[11px] font-normal text-t2"> {p.per}</span> : null}
										</div>
										<div className="text-[11px] text-t2">{p.blurb}</div>
									</label>
								);
							})}
						</div>
					</fieldset>

					<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
						<Button type="button" variant="ghost" onClick={() => finish(true)} disabled={busy}>
							Skip for now
						</Button>
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
							<span className="text-xs whitespace-nowrap text-t2 sm:text-right">
								{inviteCount} invite{inviteCount === 1 ? '' : 's'} · {plan.name} trial
							</span>
							<Button type="submit" variant="primary" size="lg" loading={busy} className="w-full sm:w-auto">
								Send invites &amp; open dashboard <ArrowRight size={15} aria-hidden />
							</Button>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
