import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, Field, Input, Select, Textarea } from '@/shared/ui';
import { toast } from '@/shared/lib/toast-store';
import { useMembers } from '@/api/resources';
import { useDb } from '@/mocks/db';
import { useProgramActions } from '../api';
import { kindLabels } from '../model';

const KOBO = 100;

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

	// Workspace members, from whichever source is active. The API refuses a
	// facilitator who is not one, so the picker and the server agree.
	const liveMembers = useMembers(orgSlug);
	const mockMembers = useDb((s) => s.members);
	const members = liveMembers.data
		? liveMembers.data.map((m) => ({ id: m.id, name: m.name }))
		: mockMembers.filter((m) => m.status === 'Active').map((m) => ({ id: m.id, name: m.name }));

	const schema = z.object({
		kind: z.enum(['training', 'event', 'workshop', 'meeting', 'other']),
		title: z.string().trim().min(3, 'Give it a title'),
		description: z.string().trim().max(2000).optional(),
		startsAt: z.string().optional(),
		endsAt: z.string().optional(),
		location: z.string().trim().max(200).optional(),
		capacity: z.string().optional(),
		facilitatorId: z.string().optional(),
		budgetNaira: z.string().optional(),
	});

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

	const submit = form.handleSubmit(async (v) => {
		const capacity = v.capacity?.trim() ? Number(v.capacity) : undefined;
		if (capacity !== undefined && (!Number.isInteger(capacity) || capacity < 1)) {
			return form.setError('capacity', { message: 'Enter a whole number of places' });
		}

		const budget = v.budgetNaira?.trim() ? Math.round(Number(v.budgetNaira) * KOBO) : undefined;
		if (budget !== undefined && !Number.isFinite(budget)) {
			return form.setError('budgetNaira', { message: 'Enter a number' });
		}

		const key = await actions.createActivity(programKey, {
			kind: v.kind,
			title: v.title,
			description: v.description,
			// `datetime-local` has no zone; the browser reads it as local time,
			// which is what somebody scheduling a room in Lagos means.
			startsAt: v.startsAt ? new Date(v.startsAt).getTime() : undefined,
			endsAt: v.endsAt ? new Date(v.endsAt).getTime() : undefined,
			location: v.location || undefined,
			capacity,
			facilitatorId: v.facilitatorId || undefined,
			budgetAmount: budget,
		});

		if (!key) return;

		toast(`${v.title} scheduled`, { tone: 'success', description: key });
		form.reset();
		onCreated(key);
		onClose();
	});

	return (
		<Dialog
			open={open}
			onClose={onClose}
			title="Schedule an activity"
			width="max-w-[640px]"
			footer={
				<>
					<Button onClick={onClose}>Cancel</Button>
					<Button variant="primary" onClick={submit} loading={form.formState.isSubmitting}>
						Schedule
					</Button>
				</>
			}
		>
			<div className="grid gap-4">
				<div className="grid gap-4 sm:grid-cols-2">
					<Field label="Kind" required>
						{(id) => (
							<Select id={id} {...form.register('kind')}>
								{Object.entries(kindLabels).map(([value, label]) => (
									<option key={value} value={value}>
										{label}
									</option>
								))}
							</Select>
						)}
					</Field>
					<Field label="Run by">
						{(id) => (
							<Select id={id} {...form.register('facilitatorId')}>
								<option value="">Nobody yet</option>
								{members.map((m) => (
									<option key={m.id} value={m.id}>
										{m.name}
									</option>
								))}
							</Select>
						)}
					</Field>
				</div>

				<Field label="Title" required error={form.formState.errors.title?.message}>
					{(id) => <Input id={id} placeholder="Spreadsheets for shop owners" autoFocus {...form.register('title')} />}
				</Field>

				<Field label="What happens" error={form.formState.errors.description?.message}>
					{(id) => <Textarea id={id} rows={2} placeholder="Formulas, stock sheets and simple charts." {...form.register('description')} />}
				</Field>

				<div className="grid gap-4 sm:grid-cols-2">
					<Field label="Starts">{(id) => <Input id={id} type="datetime-local" {...form.register('startsAt')} />}</Field>
					<Field label="Ends">{(id) => <Input id={id} type="datetime-local" {...form.register('endsAt')} />}</Field>
				</div>

				<Field label="Where" hint="a room, an address, or 'Virtual'">
					{(id) => <Input id={id} placeholder="Ikeja training room" {...form.register('location')} />}
				</Field>

				<div className="grid gap-4 sm:grid-cols-2">
					<Field label="Places" hint="optional" error={form.formState.errors.capacity?.message}>
						{(id) => <Input id={id} inputMode="numeric" placeholder="25" {...form.register('capacity')} />}
					</Field>
					<Field label="Budget (₦)" hint="optional" error={form.formState.errors.budgetNaira?.message}>
						{(id) => <Input id={id} inputMode="numeric" placeholder="450000" {...form.register('budgetNaira')} />}
					</Field>
				</div>
			</div>
		</Dialog>
	);
}
