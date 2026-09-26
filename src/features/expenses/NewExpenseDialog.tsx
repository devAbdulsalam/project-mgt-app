import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, Field, Input, Select, Textarea } from '@/shared/ui';
import { toast } from '@/shared/lib/toast-store';
import type { ExpenseCategory } from '@/mocks/types';
import { useActivities, useProgramList } from '@/features/programs/api';
import { categoryLabels, EXPENSE_CATEGORIES } from '@/features/programs/model';
import { useExpenseActions } from './api';

/** Entered in naira, stored in kobo. One place to get the conversion right. */
const KOBO = 100;

export function NewExpenseDialog({ open, onClose, orgSlug }: { open: boolean; onClose: () => void; orgSlug: string }) {
	const actions = useExpenseActions(orgSlug);
	const { programs } = useProgramList(orgSlug, false);

	const schema = z.object({
		// One owner, never both — the same rule the API enforces. Expressed as a
		// single field here because "programme or activity" is one choice to a
		// person, even though it is two columns underneath.
		owner: z.string().min(1, 'Choose what this was for'),
		category: z.enum(EXPENSE_CATEGORIES),
		description: z.string().trim().min(2, 'Say what it was'),
		amountNaira: z.string().min(1, 'How much?'),
		incurredOn: z.string().min(1, 'When?'),
		notes: z.string().trim().max(1000).optional(),
		submit: z.boolean(),
	});

	type Values = z.infer<typeof schema>;

	const form = useForm<Values>({
		resolver: zodResolver(schema),
		defaultValues: {
			owner: '',
			category: 'other',
			description: '',
			amountNaira: '',
			incurredOn: new Date().toISOString().slice(0, 10),
			notes: '',
			submit: true,
		},
	});

	// Activities of every programme, so one picker covers both levels.
	const { activities } = useActivities(orgSlug);

	const onSubmit = form.handleSubmit(async (v) => {
		const amount = Math.round(Number(v.amountNaira) * KOBO);
		if (!Number.isFinite(amount) || amount < 0) {
			return form.setError('amountNaira', { message: 'Enter an amount' });
		}

		// 'p:LIT' or 'a:LIT-1' — the prefix says which column it lands in.
		const [kind, key] = v.owner.split(':');

		const ok = await actions.create({
			programKey: kind === 'p' ? key : undefined,
			activityKey: kind === 'a' ? key : undefined,
			category: v.category as ExpenseCategory,
			description: v.description,
			amount,
			incurredOn: v.incurredOn,
			notes: v.notes || undefined,
			submit: v.submit,
		});

		if (!ok) return;

		toast(v.submit ? 'Expense submitted for approval' : 'Draft saved', { tone: 'success' });
		form.reset();
		onClose();
	});

	return (
		<Dialog
			open={open}
			onClose={onClose}
			title="Log an expense"
			width="max-w-[560px]"
			footer={
				<>
					<Button onClick={onClose}>Cancel</Button>
					<Button variant="primary" onClick={onSubmit} loading={form.formState.isSubmitting}>
						Save
					</Button>
				</>
			}
		>
			<div className="grid gap-4">
				<Field label="What was it for" required error={form.formState.errors.owner?.message}>
					{(id) => (
						<Select id={id} {...form.register('owner')}>
							<option value="">Choose a programme or activity</option>
							{programs.map((p) => (
								<optgroup key={p.id} label={p.name}>
									<option value={`p:${p.key}`}>{p.name} — the programme itself</option>
									{activities
										.filter((a) => a.programKey === p.key)
										.map((a) => (
											<option key={a.id} value={`a:${a.key}`}>
												{a.key} — {a.title}
											</option>
										))}
								</optgroup>
							))}
						</Select>
					)}
				</Field>

				<div className="grid gap-4 sm:grid-cols-2">
					<Field label="Category" required>
						{(id) => (
							<Select id={id} {...form.register('category')}>
								{EXPENSE_CATEGORIES.map((c) => (
									<option key={c} value={c}>
										{categoryLabels[c]}
									</option>
								))}
							</Select>
						)}
					</Field>
					<Field label="Amount (₦)" required error={form.formState.errors.amountNaira?.message}>
						{(id) => <Input id={id} inputMode="numeric" placeholder="380000" {...form.register('amountNaira')} />}
					</Field>
				</div>

				<Field label="What was bought" required error={form.formState.errors.description?.message}>
					{(id) => <Input id={id} placeholder="Room hire and projector, full day" {...form.register('description')} />}
				</Field>

				<Field label="Date on the receipt" required error={form.formState.errors.incurredOn?.message}>
					{(id) => <Input id={id} type="date" {...form.register('incurredOn')} />}
				</Field>

				<Field label="Notes" hint="optional">
					{(id) => <Textarea id={id} rows={2} {...form.register('notes')} />}
				</Field>

				<label className="flex items-center gap-2 text-[13px]">
					<input type="checkbox" {...form.register('submit')} />
					Send for approval now
					<span className="text-t3">— otherwise it is saved as a draft you can edit</span>
				</label>
			</div>
		</Dialog>
	);
}
