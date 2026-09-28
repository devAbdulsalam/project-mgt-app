import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, DollarSign, Info } from 'lucide-react';
import { Button, Dialog, Field, Input, Textarea } from '@/shared/ui';
import { toast } from '@/shared/lib/toast-store';
import { useProgramActions, useProgramList } from '../api';

/**
 * Budgets are entered in naira and stored in kobo.
 *
 * The form is the only place that conversion happens — everything below it,
 * including the API, works in minor units, so there is one line to get wrong
 * rather than one per screen.
 */
const KOBO = 100;

// Defined outside the component so the schema reference is stable across renders.
function buildSchema(programs: { key: string }[]) {
	return z
		.object({
			name: z.string().trim().min(2, 'Give the programme a name'),
			key: z
				.string()
				.trim()
				.toUpperCase()
				.regex(/^[A-Z][A-Z0-9]{1,9}$/, '2–10 letters or digits, starting with a letter')
				.refine((k) => !programs.some((p) => p.key === k), 'That key is already used'),
			description: z.string().trim().max(500).optional(),
			budgetNaira: z.string().optional(),
			startsOn: z.string().optional(),
			endsOn: z.string().optional(),
			clientId: z.string().optional(),
		})
		.refine(
			(v) => !v.startsOn || !v.endsOn || v.endsOn >= v.startsOn,
			{ message: 'End date must be on or after the start date.', path: ['endsOn'] },
		);
}

export function NewProgramDialog({
	open,
	onClose,
	onCreated,
	orgSlug,
}: {
	open: boolean;
	onClose: () => void;
	onCreated: (key: string) => void;
	orgSlug: string;
}) {
	const { programs } = useProgramList(orgSlug, true);
	const actions = useProgramActions(orgSlug);

	const schema = buildSchema(programs);
	type Values = z.infer<typeof schema>;

	const form = useForm<Values>({
		resolver: zodResolver(schema),
		defaultValues: { name: '', key: '', description: '', budgetNaira: '', startsOn: '', endsOn: '' },
	});

	const { control, register, handleSubmit, formState, setError, reset, setValue } = form;
	const nameValue = useWatch({ control, name: 'name' });

	// Auto-suggest a key from the name: first letter of each word, up to 6 chars.
	const suggestedKey = nameValue
		? nameValue
				.trim()
				.split(/\s+/)
				.map((w) => w[0] ?? '')
				.join('')
				.toUpperCase()
				.slice(0, 6)
		: '';

	const submit = handleSubmit(async (v) => {
		const budget = v.budgetNaira?.trim() ? Math.round(Number(v.budgetNaira) * KOBO) : undefined;

		if (budget !== undefined && !Number.isFinite(budget)) {
			return setError('budgetNaira', { message: 'Enter a valid number' });
		}

		const key = await actions.createProgram({
			key: v.key,
			name: v.name,
			description: v.description,
			currency: 'NGN',
			budgetAmount: budget,
			startsOn: v.startsOn || undefined,
			endsOn: v.endsOn || undefined,
		});

		if (!key) return setError('key', { message: 'Could not create that programme' });

		toast(`${v.name} created`, { tone: 'success', description: `Key ${key}` });
		reset();
		onCreated(key);
		onClose();
	});

	return (
		<Dialog
			open={open}
			onClose={onClose}
			title="New programme"
			width="max-w-[560px]"
			footer={
				<div className="flex items-center justify-end gap-2">
					<Button variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					<Button variant="primary" onClick={submit} loading={formState.isSubmitting}>
						Create programme
					</Button>
				</div>
			}
		>
			<div className="divide-y divide-border">
				{/* ── Basic info ─────────────────────────────────────── */}
				<section className="grid gap-4 px-6 py-5">
					<div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-t3 uppercase">
						<Info size={12} aria-hidden />
						Basic info
					</div>

					<Field label="Name" required error={formState.errors.name?.message}>
						{(id) => (
							<Input
								id={id}
								placeholder="Digital literacy 2027"
								autoFocus
								{...register('name')}
							/>
						)}
					</Field>

					<Field
						label="Key"
						required
						hint="identifies activities, e.g. LIT-1"
						error={formState.errors.key?.message}
					>
						{(id) => (
							<div className="flex items-center gap-2">
								<Input
									id={id}
									placeholder="LIT"
									className="font-mono uppercase w-36"
									maxLength={10}
									{...register('key')}
								/>
								{suggestedKey && (
									<button
										type="button"
										className="rounded bg-muted px-2.5 py-1 font-mono text-xs text-t2 hover:bg-border-strong hover:text-t1 transition-colors"
										onClick={() => setValue('key', suggestedKey, { shouldValidate: true })}
									>
										Use <span className="font-semibold text-t1">{suggestedKey}</span>
									</button>
								)}
							</div>
						)}
					</Field>

					<Field label="Description" error={formState.errors.description?.message}>
						{(id) => (
							<Textarea
								id={id}
								rows={2}
								placeholder="Basic IT skills for staff at SME clients"
								{...register('description')}
							/>
						)}
					</Field>
				</section>

				{/* ── Schedule ───────────────────────────────────────── */}
				<section className="grid gap-4 px-6 py-5">
					<div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-t3 uppercase">
						<Calendar size={12} aria-hidden />
						Schedule
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<Field label="Starts on">
							{(id) => <Input id={id} type="date" {...register('startsOn')} />}
						</Field>
						<Field
							label="Ends on"
							error={formState.errors.endsOn?.message}
						>
							{(id) => (
								<Input
									id={id}
									type="date"
									invalid={!!formState.errors.endsOn}
									{...register('endsOn')}
								/>
							)}
						</Field>
					</div>
				</section>

				{/* ── Budget ─────────────────────────────────────────── */}
				<section className="grid gap-4 px-6 py-5">
					<div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-t3 uppercase">
						<DollarSign size={12} aria-hidden />
						Budget
					</div>

					<Field
						label="Budget (₦)"
						hint="optional — you can set it later"
						error={formState.errors.budgetNaira?.message}
					>
						{(id) => (
							<Input
								id={id}
								inputMode="numeric"
								placeholder="2,000,000"
								leading={<span className="text-sm font-medium">₦</span>}
								{...register('budgetNaira')}
							/>
						)}
					</Field>
				</section>
			</div>
		</Dialog>
	);
}
