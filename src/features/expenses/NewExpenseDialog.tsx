import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarDays, FileText, Tag, Wallet } from 'lucide-react';
import { Button, Checkbox, Dialog, Field, Input, Select, Textarea } from '@/shared/ui';
import { toast } from '@/shared/lib/toast-store';
import type { ExpenseCategory } from '@/mocks/types';
import { useActivities, useProgramList } from '@/features/programs/api';
import { categoryLabels, EXPENSE_CATEGORIES, formatMoney } from '@/features/programs/model';
import { useExpenseActions } from './api';

/** Entered in naira, stored in kobo. One place to get the conversion right. */
const KOBO = 100;

const categoryIcons: Record<string, string> = {
	venue: '🏢',
	materials: '📦',
	catering: '🍽',
	transport: '🚌',
	facilitator_fee: '👤',
	marketing: '📢',
	equipment: '🖥',
	other: '📎',
};

export function NewExpenseDialog({
	open,
	onClose,
	orgSlug,
}: {
	open: boolean;
	onClose: () => void;
	orgSlug: string;
}) {
	const actions = useExpenseActions(orgSlug);
	const { programs } = useProgramList(orgSlug, false);

	const schema = z.object({
		owner: z.string().min(1, 'Choose what this was for'),
		category: z.enum(EXPENSE_CATEGORIES),
		description: z.string().trim().min(2, 'Say what it was'),
		amountNaira: z.string().min(1, 'How much?'),
		incurredOn: z.string().min(1, 'When was this incurred?'),
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

	const { control, register, handleSubmit, formState, setError, reset } = form;

	// Live preview of the formatted amount
	const rawAmount = useWatch({ control, name: 'amountNaira' });
	const numericAmount = Number(rawAmount?.replace(/,/g, ''));
	const formattedPreview =
		rawAmount?.trim() && Number.isFinite(numericAmount) && numericAmount > 0
			? formatMoney(Math.round(numericAmount * KOBO))
			: null;

	const { activities } = useActivities(orgSlug);

	const onSubmit = handleSubmit(async (v) => {
		const amount = Math.round(Number(v.amountNaira.replace(/,/g, '')) * KOBO);
		if (!Number.isFinite(amount) || amount <= 0) {
			return setError('amountNaira', { message: 'Enter a valid amount' });
		}

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
		reset();
		onClose();
	});

	return (
		<Dialog
			open={open}
			onClose={onClose}
			title="Log an expense"
			width="max-w-[560px]"
			footer={
				<div className="flex flex-wrap items-center justify-between gap-3">
					<Checkbox
						label={
							<span>
								Submit for approval{' '}
								<span className="text-t3">— or save as a draft you can edit</span>
							</span>
						}
						{...register('submit')}
					/>
					<div className="flex items-center gap-2">
						<Button variant="ghost" onClick={onClose}>
							Cancel
						</Button>
						<Button variant="primary" onClick={onSubmit} loading={formState.isSubmitting}>
							{form.getValues('submit') ? 'Submit expense' : 'Save draft'}
						</Button>
					</div>
				</div>
			}
		>
			<div className="divide-y divide-border">
				{/* ── What it's for ──────────────────────────────────── */}
				<section className="grid gap-4 px-6 py-5">
					<div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-t3 uppercase">
						<Tag size={12} aria-hidden />
						What it&apos;s for
					</div>

					<Field label="Programme or activity" required error={formState.errors.owner?.message}>
						{(id) => (
							<Select id={id} {...register('owner')}>
								<option value="">Choose a programme or activity…</option>
								{programs.map((p) => (
									<optgroup key={p.id} label={p.name}>
										<option value={`p:${p.key}`}>
											{p.name} — entire programme
										</option>
										{activities
											.filter((a) => a.programKey === p.key)
											.map((a) => (
												<option key={a.id} value={`a:${a.key}`}>
													↳ {a.key} · {a.title}
												</option>
											))}
									</optgroup>
								))}
							</Select>
						)}
					</Field>

					{/* Category — visual chip-style grid */}
					<Field label="Category" required>
						{() => (
							<div className="grid grid-cols-4 gap-2">
								{EXPENSE_CATEGORIES.map((c) => (
									<label
										key={c}
										className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-border-strong px-2 py-2.5 text-center text-[11px] font-medium transition-colors has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 hover:bg-muted"
									>
										<input
											type="radio"
											value={c}
											className="sr-only"
											{...register('category')}
										/>
										<span className="text-base leading-none">{categoryIcons[c]}</span>
										{categoryLabels[c]}
									</label>
								))}
							</div>
						)}
					</Field>
				</section>

				{/* ── Amount & date ──────────────────────────────────── */}
				<section className="grid gap-4 px-6 py-5">
					<div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-t3 uppercase">
						<Wallet size={12} aria-hidden />
						Amount &amp; date
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<Field
							label="Amount (₦)"
							required
							error={formState.errors.amountNaira?.message}
						>
							{(id) => (
								<div className="space-y-1">
									<Input
										id={id}
										inputMode="numeric"
										placeholder="380,000"
										invalid={!!formState.errors.amountNaira}
										leading={<span className="text-sm font-medium">₦</span>}
										{...register('amountNaira')}
									/>
									{formattedPreview && (
										<p className="text-xs text-t3 tabular">{formattedPreview}</p>
									)}
								</div>
							)}
						</Field>

						<Field
							label="Date on receipt"
							required
							error={formState.errors.incurredOn?.message}
						>
							{(id) => (
								<Input
									id={id}
									type="date"
									invalid={!!formState.errors.incurredOn}
									leading={<CalendarDays size={14} aria-hidden />}
									{...register('incurredOn')}
								/>
							)}
						</Field>
					</div>
				</section>

				{/* ── Description & notes ────────────────────────────── */}
				<section className="grid gap-4 px-6 py-5">
					<div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-t3 uppercase">
						<FileText size={12} aria-hidden />
						Details
					</div>

					<Field
						label="What was bought"
						required
						error={formState.errors.description?.message}
					>
						{(id) => (
							<Input
								id={id}
								placeholder="Room hire and projector, full day"
								invalid={!!formState.errors.description}
								{...register('description')}
							/>
						)}
					</Field>

					<Field label="Notes" hint="optional">
						{(id) => (
							<Textarea
								id={id}
								rows={2}
								placeholder="Any context that will help approvers…"
								{...register('notes')}
							/>
						)}
					</Field>
				</section>
			</div>
		</Dialog>
	);
}
