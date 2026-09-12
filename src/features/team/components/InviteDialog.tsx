import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X } from 'lucide-react';
import { Button, Dialog, Input, Select } from '@/shared/ui';
import { useDb } from '@/mocks/db';
import { inviteBases } from '@/mocks/data';
import { toast } from '@/shared/lib/toast-store';
import type { MemberRole } from '@/mocks/types';

const roles: MemberRole[] = ['Admin', 'Support agent', 'Field engineer', 'Developer', 'Viewer'];
const teamsByRole: Record<string, string> = { Admin: 'Operations', 'Support agent': 'Service desk', 'Field engineer': 'Field · Lagos', Developer: 'PayBridge', Viewer: 'Management' };

const schema = z.object({
	invites: z.array(z.object({ email: z.string().trim().email('Enter a valid email').or(z.literal('')), name: z.string().optional(), role: z.enum(['Admin', 'Support agent', 'Field engineer', 'Developer', 'Viewer']), base: z.string() })).min(1),
});
type V = z.infer<typeof schema>;

export function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
	const invite = useDb((s) => s.inviteMember);
	const members = useDb((s) => s.members);
	const form = useForm<V>({ resolver: zodResolver(schema), defaultValues: { invites: [{ email: '', name: '', role: 'Support agent', base: inviteBases[0]! }, { email: '', name: '', role: 'Field engineer', base: inviteBases[1]! }] } });
	const { fields, append, remove } = useFieldArray({ control: form.control, name: 'invites' });

	const submit = form.handleSubmit((v) => {
		const rows = v.invites.filter((i) => i.email);
		if (rows.length === 0) return form.setError('invites.0.email', { message: 'Add at least one email' });
		const dup = rows.find((r) => members.some((m) => m.email.toLowerCase() === r.email.toLowerCase()));
		if (dup) return form.setError(`invites.${v.invites.indexOf(dup)}.email`, { message: 'Already on the team' });
		rows.forEach((r) => invite({ email: r.email, name: r.name ?? '', role: r.role, base: r.base, team: teamsByRole[r.role] ?? 'Operations' }));
		toast(`${rows.length} invite${rows.length === 1 ? '' : 's'} sent`, { tone: 'success', description: 'Invitees get an email and a WhatsApp message with the link.' });
		form.reset();
		onClose();
	});

	return (
		<Dialog open={open} onClose={onClose} title="Invite people" width="max-w-[820px]" footer={<div className="flex items-center justify-between"><span className="text-xs text-t2">Everyone is free during the trial · roles can be changed later</span><div className="flex gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Send invites</Button></div></div>}>
			<form onSubmit={submit} className="space-y-3 px-5 py-5 sm:px-7">
				<div className="hidden grid-cols-[1fr_1fr_160px_160px_36px] gap-2.5 text-xs font-semibold text-t2 sm:grid"><span>Email</span><span>Name (optional)</span><span>Role</span><span>Base</span><span /></div>
				{fields.map((f, i) => {
					const err = form.formState.errors.invites?.[i]?.email?.message;
					return (
						<div key={f.id} className="grid grid-cols-[1fr_36px] gap-2.5 sm:grid-cols-[1fr_1fr_160px_160px_36px]">
							<div className="min-w-0"><Input type="email" placeholder="colleague@company.ng" className="h-9" invalid={!!err} aria-label={`Invite ${i + 1} email`} {...form.register(`invites.${i}.email`)} />{err ? <p role="alert" className="mt-1 text-xs text-danger">{err}</p> : null}</div>
							<button type="button" onClick={() => remove(i)} className="grid size-9 place-items-center rounded-sm text-t3 hover:bg-muted hover:text-t1 sm:order-last" aria-label={`Remove row ${i + 1}`}><X size={15} /></button>
							<Input placeholder="Full name" className="col-span-2 h-9 sm:col-span-1" aria-label={`Invite ${i + 1} name`} {...form.register(`invites.${i}.name`)} />
							<Select className="col-span-2 h-9 sm:col-span-1" aria-label={`Invite ${i + 1} role`} {...form.register(`invites.${i}.role`)}>{roles.map((r) => <option key={r}>{r}</option>)}</Select>
							<Select className="col-span-2 h-9 sm:col-span-1" aria-label={`Invite ${i + 1} base`} {...form.register(`invites.${i}.base`)}>{inviteBases.map((b) => <option key={b}>{b}</option>)}</Select>
						</div>
					);
				})}
				<button type="button" onClick={() => append({ email: '', name: '', role: 'Support agent', base: inviteBases[0]! })} className="flex items-center gap-1.5 text-xs text-brand-600 hover:underline"><Plus size={13} /> Add another</button>
			</form>
		</Dialog>
	);
}
