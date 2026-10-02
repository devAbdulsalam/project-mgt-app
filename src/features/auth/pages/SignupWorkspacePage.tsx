import { useEffect, useState } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from '@tanstack/react-router';
import { ArrowRight, BookOpen, Building2, CalendarDays, CheckCircle2, ChevronLeft, Circle, Columns3, Cpu, Map, Ticket, GraduationCap } from 'lucide-react';
import { AuthShell, PanelHeadline, PanelTile } from '@/shared/layouts/AuthShell';
import { Button, Field, Input, Select, Steps } from '@/shared/ui';
import { AuthError, useAuthStore } from '@/shared/lib/auth-store';
import { initials, slugify } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { cities, industries, modules, teamSizes, type ModuleOption } from '@/mocks/data';
import { AuthHeading, FormError } from '../components/AuthHeading';
import { useLiveApi } from '@/shared/lib/live-api';
import { SIGNUP_STEPS } from '../lib/steps';

const schema = z.object({
	companyName: z.string().trim().min(2, 'Enter your company name'),
	slug: z
		.string()
		.trim()
		.min(3, 'At least 3 characters')
		.max(24, 'At most 24 characters')
		.regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and dashes only'),
	industry: z.string(),
	teamSize: z.string(),
	headOffice: z.string(),
	modules: z.array(z.string()).min(1, 'Enable at least one module'),
});
type FormValues = z.infer<typeof schema>;

const moduleIcons: Record<ModuleOption['icon'], typeof Ticket> = {
	ticket: Ticket,
	calendar: CalendarDays,
	cpu: Cpu,
	board: Columns3,
	building: Building2,
	book: BookOpen,
	graduation: GraduationCap,
};

export function SignupWorkspacePage() {
	const navigate = useNavigate();
	const draft = useAuthStore((s) => s.signup);
	const updateSignup = useAuthStore((s) => s.updateSignup);
	const createWorkspace = useAuthStore((s) => s.createWorkspace);
	const org = useAuthStore((s) => s.org);
	const live = useLiveApi();
	const [error, setError] = useState<string>();
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if (!draft.email) navigate({ to: '/signup', replace: true });
		else if (!draft.phoneVerified) navigate({ to: '/signup/verify', replace: true });
		// An invited account already has its workspace; there is nothing to set up.
		else if (live && org)
			navigate({
				to: '/$org/dashboard',
				params: { org: org.slug },
				replace: true,
				search: {},
			});
	}, [draft.email, draft.phoneVerified, live, navigate, org]);


	const form = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			companyName: draft.companyName,
			slug: draft.slug,
			industry: draft.industry,
			teamSize: draft.teamSize,
			headOffice: draft.headOffice,
			modules: draft.modules,
		},
	});
	const companyName = useWatch({ control: form.control, name: 'companyName' });
	const slug = useWatch({ control: form.control, name: 'slug' });

	const onSubmit = form.handleSubmit(async (v) => {
		if (busy) return;
		setBusy(true);
		setError(undefined);

		// Saved first so a failure leaves the form filled in rather than blank.
		updateSignup(v);

		try {
			await createWorkspace();
			navigate({ to: '/signup/team' });
		} catch (e) {
			if (e instanceof AuthError && e.field === 'email') {
				// The only field-level failure the server reports here is a taken
				// slug, which arrives without a field name of its own.
				form.setError('slug', { message: e.message });
			} else {
				setError(e instanceof Error ? e.message : 'Something went wrong');
			}
		} finally {
			setBusy(false);
		}
	});

	return (
		<AuthShell
			wide
			alignTop
			panel={
				<>
					<PanelHeadline title="Set up your workspace">Tell us about your company so we can pre-configure SLAs, ticket types and billing.</PanelHeadline>
					<div className="mt-7 grid max-w-[440px] grid-cols-2 gap-3">
						<PanelTile value="4" label="Default SLA policies" />
						<PanelTile value="9" label="Ticket types ready to go" />
					</div>
				</>
			}
		>
			<Steps steps={SIGNUP_STEPS} current={3} className="mb-8" />
			<AuthHeading title="Set up your workspace">Tell us about your company so we can pre-configure SLAs, ticket types and billing.</AuthHeading>
			<FormError message={error} />

			<form onSubmit={onSubmit} noValidate className="space-y-3.5">
					<div className="flex items-end gap-3.5">
						<div className="grid size-16 shrink-0 place-items-center rounded-[14px] bg-brand-900 text-xl font-bold text-white" aria-hidden>
							{initials(companyName || 'W S') || 'WS'}
						</div>
						<Field label="Company name" className="flex-1" error={form.formState.errors.companyName?.message}>
							{(id, d) => (
								<Input
									id={id}
									autoComplete="organization"
									aria-describedby={d}
									invalid={!!form.formState.errors.companyName}
									{...form.register('companyName', {
										onChange: (e) => {
											if (!form.formState.dirtyFields.slug) form.setValue('slug', slugify(e.target.value));
										},
									})}
								/>
							)}
						</Field>
					</div>

					<Field label="Workspace URL" error={form.formState.errors.slug?.message}>
						{(id, d) => (
							<Input
								id={id}
								aria-describedby={d}
								invalid={!!form.formState.errors.slug}
								leading={<span className="text-[13px] text-t2">ledgedesk.app/</span>}
								className="font-semibold"
								trailing={slug.length >= 3 && !form.formState.errors.slug ? <CheckCircle2 size={15} className="text-success" aria-label="Available" /> : null}
								{...form.register('slug')}
							/>
						)}
					</Field>

					<div className="grid gap-3.5 sm:grid-cols-2">
						<Field label="What you do">
							{(id) => (
								<Select id={id} {...form.register('industry')}>
									{industries.map((i) => (
										<option key={i}>{i}</option>
									))}
								</Select>
							)}
						</Field>
						<Field label="Team size">
							{(id) => (
								<Select id={id} {...form.register('teamSize')}>
									{teamSizes.map((i) => (
										<option key={i}>{i}</option>
									))}
								</Select>
							)}
						</Field>
						<Field label="Head office">
							{(id) => (
								<Select id={id} leading={<Map size={14} />} {...form.register('headOffice')}>
									{cities.map((i) => (
										<option key={i}>{i}</option>
									))}
								</Select>
							)}
						</Field>
						<Field label="Timezone & currency">{(id) => <Input id={id} readOnly value="West Africa Time (WAT) · ₦ NGN" className="bg-muted text-t2" />}</Field>
					</div>

					<Controller
						control={form.control}
						name="modules"
						render={({ field, fieldState }) => (
							<fieldset>
								<legend className="mb-1.5 text-xs font-semibold text-t2">
									Modules to enable <span className="font-normal text-t3">(you can change these later)</span>
								</legend>
								<div className="grid gap-2.5 sm:grid-cols-2">
									{modules.map((m) => {
										const on = field.value.includes(m.id);
										const Icon = moduleIcons[m.icon];
										return (
											<label
												key={m.id}
												className={cn(
													'flex cursor-pointer items-start gap-2.5 rounded-[10px] border p-3 text-[13px] transition-colors',
													on ? 'border-brand-600 bg-brand-100' : 'border-border-strong bg-white hover:bg-muted',
												)}
											>
												<input type="checkbox" className="sr-only" checked={on} onChange={(e) => field.onChange(e.target.checked ? [...field.value, m.id] : field.value.filter((x) => x !== m.id))} />
												<span className="grid size-7 shrink-0 place-items-center rounded-sm border border-border bg-white text-brand-900">
													<Icon size={14} aria-hidden />
												</span>
												<span className="min-w-0 flex-1">
													<b className="block">{m.name}</b>
													<small className="mt-0.5 block text-[11px] text-t2">{m.description}</small>
												</span>
												{on ? <CheckCircle2 size={16} className="shrink-0 text-brand-900" aria-hidden /> : <Circle size={16} className="shrink-0 text-border-strong" aria-hidden />}
											</label>
										);
									})}
								</div>
								{fieldState.error ? (
									<p role="alert" className="mt-1.5 text-xs text-danger">
										{fieldState.error.message}
									</p>
								) : null}
							</fieldset>
						)}
					/>

				<div className="flex items-center justify-between pt-3">
					<Button type="button" variant="ghost" onClick={() => navigate({ to: '/signup/verify' })}>
						<ChevronLeft size={14} aria-hidden /> Back
					</Button>
					<Button type="submit" variant="primary" size="lg" loading={busy}>
						Create workspace <ArrowRight size={15} aria-hidden />
					</Button>
				</div>
			</form>
		</AuthShell>
	);
}
