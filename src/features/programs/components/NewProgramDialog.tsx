import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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

	const schema = z.object({
		name: z.string().trim().min(2, 'Give the programme a name'),
		key: z
			.string()
			.trim()
			.toUpperCase()
			.regex(/^[A-Z][A-Z0-9]{1,9}$/, '2–10 letters or digits, starting with a letter')
			// Checked here for a fast message; the server has a unique index that
			// is the actual guarantee, and `createProgram` surfaces that too.
			.refine((k) => !programs.some((p) => p.key === k), 'That key is already used'),
		description: z.string().trim().max(500).optional(),
		budgetNaira: z.string().optional(),
		startsOn: z.string().optional(),
		endsOn: z.string().optional(),
	});

	type Values = z.infer<typeof schema>;

	const form = useForm<Values>({
		resolver: zodResolver(schema),
		defaultValues: { name: '', key: '', description: '', budgetNaira: '', startsOn: '', endsOn: '' },
	});

	const submit = form.handleSubmit(async (v) => {
		const budget = v.budgetNaira?.trim() ? Math.round(Number(v.budgetNaira) * KOBO) : undefined;

		if (budget !== undefined && !Number.isFinite(budget)) {
			return form.setError('budgetNaira', { message: 'Enter a number' });
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

		if (!key) return form.setError('key', { message: 'Could not create that programme' });

		toast(`${v.name} created`, { tone: 'success', description: `Key ${key}` });
		form.reset();
		onCreated(key);
		onClose();
	});

	return (
		<Dialog
			open={open}
			onClose={onClose}
			title="New programme"
			footer={
				<>
					<Button onClick={onClose}>Cancel</Button>
					<Button variant="primary" onClick={submit} loading={form.formState.isSubmitting}>
						Create programme
					</Button>
				</>
			}
		>
			<div className="grid gap-4">
				<Field label="Name" required error={form.formState.errors.name?.message}>
					{(id) => <Input id={id} placeholder="Digital literacy 2027" autoFocus {...form.register('name')} />}
				</Field>

				<Field label="Key" required hint="numbers its activities, e.g. LIT-1" error={form.formState.errors.key?.message}>
					{(id) => <Input id={id} placeholder="LIT" className="font-mono uppercase" maxLength={10} {...form.register('key')} />}
				</Field>

				<Field label="What is it for" error={form.formState.errors.description?.message}>
					{(id) => <Textarea id={id} rows={2} placeholder="Basic IT skills for staff at SME clients" {...form.register('description')} />}
				</Field>

				<Field label="Budget (₦)" hint="optional" error={form.formState.errors.budgetNaira?.message}>
					{(id) => <Input id={id} inputMode="numeric" placeholder="2000000" {...form.register('budgetNaira')} />}
				</Field>

				<div className="grid gap-4 sm:grid-cols-2">
					<Field label="Starts">
						{(id) => <Input id={id} type="date" {...form.register('startsOn')} />}
					</Field>
					<Field label="Ends">
						{(id) => <Input id={id} type="date" {...form.register('endsOn')} />}
					</Field>
				</div>
			</div>
		</Dialog>
	);
}
