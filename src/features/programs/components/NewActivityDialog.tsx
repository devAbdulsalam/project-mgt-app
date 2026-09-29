import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Info, MapPin, Users } from 'lucide-react';
import { Button, Dialog, Field, Input, Select, Textarea } from '@/shared/ui';
import { toast } from '@/shared/lib/toast-store';
import { useMembers } from '@/api/resources';
import { useDb } from '@/mocks/db';
import { useProgramActions } from '../api';
import { kindLabels } from '../model';

const KOBO = 100;

const kindIcons: Record<string, string> = {
	training: '🎓',
	event: '📅',
	workshop: '🛠',
	meeting: '🤝',
	other: '📌',
};

export function NewActivityDialog({
	open,
	onClose,
	onCreated,
	orgSlug,
	programKey,
}: {
	open: boolean;
	onClose: () => void;
	onCreated: (key: string) => void;
	orgSlug: string;
	programKey: string;
}) {
	const actions = useProgramActions(orgSlug);

	const liveMembers = useMembers(orgSlug);
	const mockMembers = useDb((s) => s.members);
	const members = liveMembers.data
		? liveMembers.data.map((m) => ({ id: m.id, name: m.name }))
		: mockMembers
				.filter((m) => m.status === 'Active')
				.map((m) => ({ id: m.id, name: m.name }));

	const schema = z
		.object({
			kind: z.enum(['training', 'event', 'workshop', 'meeting', 'other']),
			title: z.string().trim().min(3, 'Give it a title'),
			description: z.string().trim().max(2000).optional(),
			startsAt: z.string().optional(),
			endsAt: z.string().optional(),
			location: z.string().trim().max(200).optional(),
			capacity: z.string().optional(),
			facilitatorId: z.string().optional(),
			budgetNaira: z.string().optional(),
		})
		.refine(
			(v) =>
				!v.startsAt || !v.endsAt || new Date(v.endsAt) >= new Date(v.startsAt),
			{
				message: 'End time must be on or after the start time.',
				path: ['endsAt'],
			},
		);

	type Values = z.infer<typeof schema>;

	const form = useForm<Values>({
		resolver: zodResolver(schema),
		defaultValues: {
			kind: 'training',
			title: '',
			description: '',
			startsAt: '',
			endsAt: '',
			location: '',
			capacity: '',
			facilitatorId: '',
			budgetNaira: '',
		},
	});

	const { register, handleSubmit, formState, setError, reset } = form;

	const submit = handleSubmit(async (v) => {
		const capacity = v.capacity?.trim() ? Number(v.capacity) : undefined;
		if (
			capacity !== undefined &&
			(!Number.isInteger(capacity) || capacity < 1)
		) {
			return setError('capacity', {
				message: 'Enter a whole number of places',
			});
		}

		const budget = v.budgetNaira?.trim()
			? Math.round(Number(v.budgetNaira) * KOBO)
			: undefined;
		if (budget !== undefined && !Number.isFinite(budget)) {
			return setError('budgetNaira', { message: 'Enter a valid number' });
		}

		const key = await actions.createActivity(programKey, {
			kind: v.kind,
			title: v.title,
			description: v.description,
			startsAt: v.startsAt ? new Date(v.startsAt).getTime() : undefined,
			endsAt: v.endsAt ? new Date(v.endsAt).getTime() : undefined,
			location: v.location || undefined,
			capacity,
			facilitatorId: v.facilitatorId || undefined,
			budgetAmount: budget,
		});

		if (!key) return;

		toast(`${v.title} scheduled`, { tone: 'success', description: key });
		reset();
		onCreated(key);
		onClose();
	});

	return (
		<Dialog
			open={open}
			onClose={onClose}
			title="Schedule an activity"
			width="max-w-[600px]"
			footer={
				<div className="flex items-center justify-end gap-2">
					<Button variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					<Button
						variant="primary"
						onClick={submit}
						loading={formState.isSubmitting}
					>
						Schedule
					</Button>
				</div>
			}
		>
			<div className="divide-y divide-border">
				{/* ── Activity details ───────────────────────────────── */}
				<section className="grid gap-4 px-6 py-5">
					<div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-t3 uppercase">
						<Info size={12} aria-hidden />
						Activity details
					</div>

					{/* Kind picker — visual radio group */}
					<Field label="Type" required>
						{() => (
							<div className="grid grid-cols-5 gap-2">
								{(Object.entries(kindLabels) as [string, string][]).map(
									([value, label]) => (
										<label
											key={value}
											className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-border-strong px-2 py-3 text-center text-[11px] font-medium transition-colors has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 hover:bg-muted"
										>
											<input
												type="radio"
												value={value}
												className="sr-only"
												{...register('kind')}
											/>
											<span className="text-base leading-none">
												{kindIcons[value]}
											</span>
											{label}
										</label>
									),
								)}
							</div>
						)}
					</Field>

					<Field label="Title" required error={formState.errors.title?.message}>
						{(id) => (
							<Input
								id={id}
								placeholder="Spreadsheets for shop owners"
								autoFocus
								{...register('title')}
							/>
						)}
					</Field>

					<Field
						label="Description"
						error={formState.errors.description?.message}
					>
						{(id) => (
							<Textarea
								id={id}
								rows={2}
								placeholder="Formulas, stock sheets and simple charts."
								{...register('description')}
							/>
						)}
					</Field>
				</section>

				{/* ── When & where ───────────────────────────────────── */}
				<section className="grid gap-4 px-6 py-5">
					<div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-t3 uppercase">
						<Calendar size={12} aria-hidden />
						When &amp; where
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<Field label="Starts at">
							{(id) => (
								<Input
									id={id}
									type="datetime-local"
									{...register('startsAt')}
								/>
							)}
						</Field>
						<Field label="Ends at" error={formState.errors.endsAt?.message}>
							{(id) => (
								<Input
									id={id}
									type="datetime-local"
									invalid={!!formState.errors.endsAt}
									{...register('endsAt')}
								/>
							)}
						</Field>
					</div>

					<Field label="Location" hint="a room, address, or 'Virtual'">
						{(id) => (
							<Input
								id={id}
								placeholder="Ikeja training room"
								leading={<MapPin size={14} aria-hidden />}
								{...register('location')}
							/>
						)}
					</Field>
				</section>

				{/* ── People & budget ────────────────────────────────── */}
				<section className="grid gap-4 px-6 py-5">
					<div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-t3 uppercase">
						<Users size={12} aria-hidden />
						People &amp; budget
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<Field label="Run by">
							{(id) => (
								<Select id={id} {...register('facilitatorId')}>
									<option value="">Unassigned</option>
									{members.map((m) => (
										<option key={m.id} value={m.id}>
											{m.name}
										</option>
									))}
								</Select>
							)}
						</Field>

						<Field
							label="Max places"
							hint="optional"
							error={formState.errors.capacity?.message}
						>
							{(id) => (
								<Input
									id={id}
									inputMode="numeric"
									placeholder="25"
									leading={<Users size={14} aria-hidden />}
									{...register('capacity')}
								/>
							)}
						</Field>
					</div>

					<Field
						label="Budget (₦)"
						hint="optional"
						error={formState.errors.budgetNaira?.message}
					>
						{(id) => (
							<Input
								id={id}
								inputMode="numeric"
								placeholder="450,000"
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
