import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, Field, Input, Select, Textarea } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useDb } from '@/mocks/db';
import { toast } from '@/shared/lib/toast-store';
import { useActor } from '@/features/tickets/hooks/useActor';
import { useAuthStore } from '@/shared/lib/auth-store';
import { useMembers } from '@/api/resources';
import { useProjectList } from '../hooks/useProjectList';
import { useProjectActions } from '../hooks/useProjectActions';

export function NewProjectDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (key: string) => void }) {
	const actor = useActor();
	const org = useAuthStore((s) => s.org)!;
	const { projects } = useProjectList(org.slug);
	const actions = useProjectActions(org.slug);

	// Workspace members, from whichever source is active. The API refuses anyone
	// who is not one, so the picker and the server agree.
	const liveMembers = useMembers(org.slug);
	const mockMembers = useDb((s) => s.members);
	const members = (
		liveMembers.data
			? liveMembers.data.map((m) => ({ id: m.id, name: m.name, role: m.role, status: 'Active' as const }))
			: mockMembers.filter((m) => m.status === 'Active' && m.id !== 'u_amr')
	);

	const schema = z.object({
		name: z.string().trim().min(2, 'Give the project a name'),
		key: z
			.string()
			.trim()
			.toUpperCase()
			.regex(/^[A-Z][A-Z0-9]{1,4}$/, '2–5 uppercase letters or digits')
			.refine((k) => !projects.some((p) => p.key === k), 'That key is already used'),
		kind: z.enum(['service', 'software']),
		leadId: z.string().min(1, 'Choose a lead'),
		description: z.string().trim().max(160).optional(),
	});
	type V = z.infer<typeof schema>;
	const form = useForm<V>({ resolver: zodResolver(schema), defaultValues: { name: '', key: '', kind: 'software', leadId: actor.id, description: '' } });
	const kind = useWatch({ control: form.control, name: 'kind' });

	const submit = form.handleSubmit(async (v) => {
		const created = await actions.create({
			key: v.key,
			name: v.name,
			kind: v.kind,
			leadId: v.leadId,
			description: v.description ?? '',
			// The lead is always a member; the server adds the creator too.
			memberIds: [v.leadId],
		});

		if (!created) return form.setError('key', { message: 'Could not create that project' });

		toast(`Project ${v.name} created`, { tone: 'success', description: `Key ${v.key}` });
		form.reset();
		onCreated(v.key);
		onClose();
	});

	return (
		<Dialog
			open={open}
			onClose={onClose}
			title="New project"
			width="max-w-[560px]"
			footer={
				<div className="flex justify-end gap-2">
					<Button variant="ghost" onClick={onClose}>Cancel</Button>
					<Button variant="primary" onClick={submit}>Create project</Button>
				</div>
			}
		>
			<form onSubmit={submit} className="space-y-4 px-5 py-5 sm:px-7">
				<Field label="Name" required error={form.formState.errors.name?.message}>
					{(id) => (
						<Input
							id={id}
							placeholder="e.g. Client portal"
							{...form.register('name', {
								onChange: (e) => {
									if (!form.formState.dirtyFields.key) form.setValue('key', e.target.value.replace(/[^a-z0-9 ]/gi, '').split(/\s+/).filter(Boolean).map((w: string) => w[0]).join('').toUpperCase().slice(0, 4));
								},
							})}
						/>
					)}
				</Field>
				<div className="grid gap-4 sm:grid-cols-2">
					<Field label="Key" required hint="prefix for issue keys" error={form.formState.errors.key?.message}>
						{(id) => <Input id={id} placeholder="CP" className="font-mono uppercase" maxLength={5} {...form.register('key')} />}
					</Field>
					<Field label="Lead" required error={form.formState.errors.leadId?.message}>
						{(id) => (
							<Select id={id} {...form.register('leadId')}>
								{members.map((m) => (
									<option key={m.id} value={m.id}>{m.name}</option>
								))}
							</Select>
						)}
					</Field>
				</div>
				<fieldset>
					<legend className="mb-1.5 text-xs font-semibold text-t2">Type</legend>
					<div className="grid grid-cols-2 gap-2.5">
						{([['software', 'Software', 'Boards, sprints, backlog, roadmap'], ['service', 'Service desk', 'Queue, SLAs, clients, dispatch']] as const).map(([v, l, d]) => (
							<label key={v} className={cn('cursor-pointer rounded-[10px] border p-3 text-[13px]', kind === v ? 'border-brand-600 bg-brand-100' : 'border-border-strong hover:bg-muted')}>
								<input type="radio" value={v} className="sr-only" {...form.register('kind')} />
								<b className="block">{l}</b>
								<span className="text-xs text-t2">{d}</span>
							</label>
						))}
					</div>
				</fieldset>
				<Field label="Description">{(id) => <Textarea id={id} rows={2} placeholder="One line about what this project delivers" {...form.register('description')} />}</Field>
			</form>
		</Dialog>
	);
}
