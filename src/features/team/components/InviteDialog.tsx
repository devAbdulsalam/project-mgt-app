import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X } from 'lucide-react';
import { Button, Dialog, Input, Select } from '@/shared/ui';
import { useDb } from '@/mocks/db';
import { useAuthStore } from '@/shared/lib/auth-store';
import { isLiveApi } from '@/shared/lib/live-api';
import { inviteBases } from '@/mocks/data';
import { cn } from '@/shared/lib/cn';
import { toast } from '@/shared/lib/toast-store';
import type { MemberRole } from '@/mocks/types';
import { useMyAccess, useTeamActions, useTeamMembers, type AccessRole } from '../hooks/useTeam';

const roles: MemberRole[] = ['Admin', 'Support agent', 'Field engineer', 'Developer', 'Viewer'];
const teamsByRole: Record<string, string> = { Admin: 'Operations', 'Support agent': 'Service desk', 'Field engineer': 'Field · Lagos', Developer: 'PayBridge', Viewer: 'Management' };

const schema = z.object({
	invites: z.array(z.object({ email: z.string().trim().email('Enter a valid email').or(z.literal('')), name: z.string().optional(), role: z.string(), base: z.string() })).min(1),
});
type V = z.infer<typeof schema>;

export function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
	const live = isLiveApi();
	const orgSlug = useAuthStore((s) => s.org)!.slug;
	const invite = useDb((s) => s.inviteMember);
	const members = useTeamMembers();
	const actions = useTeamActions(orgSlug);
	const access = useMyAccess(orgSlug);
	const liveRole = (r: string): AccessRole => (access.grantable.some((g) => g.id === r) ? (r as AccessRole) : 'member');
	const form = useForm<V>({ resolver: zodResolver(schema), defaultValues: { invites: [{ email: '', name: '', role: live ? 'Member' : 'Support agent', base: inviteBases[0]! }, { email: '', name: '', role: live ? 'Viewer' : 'Field engineer', base: inviteBases[1]! }] } });
	const { fields, append, remove } = useFieldArray({ control: form.control, name: 'invites' });

	const submit = form.handleSubmit(async (v) => {
		const rows = v.invites.filter((i) => i.email);
		if (rows.length === 0) return form.setError('invites.0.email', { message: 'Add at least one email' });
		const dup = rows.find((r) => members.some((m) => m.email.toLowerCase() === r.email.toLowerCase()));
		if (dup) return form.setError(`invites.${v.invites.indexOf(dup)}.email`, { message: 'Already on the team' });
		if (live) {
			const refused = await actions.inviteLive(rows.map((r) => ({ email: r.email, name: r.name, role: liveRole(r.role.toLowerCase()) })));
			refused.forEach((f) => form.setError(`invites.${v.invites.findIndex((i) => i.email === f.email)}.email`, { message: f.message }));
			const sent = rows.length - refused.length;
			if (sent) toast(`${sent} invite${sent === 1 ? '' : 's'} sent`, { tone: 'success', description: 'Invitees get an email with a link to join.' });
			if (refused.length === 0) { form.reset(); onClose(); }
			return;
		}
		rows.forEach((r) => invite({ email: r.email, name: r.name ?? '', role: r.role as MemberRole, base: r.base, team: teamsByRole[r.role] ?? 'Operations' }));
		toast(`${rows.length} invite${rows.length === 1 ? '' : 's'} sent`, { tone: 'success', description: 'Invitees get an email and a WhatsApp message with the link.' });
		form.reset();
		onClose();
	});

	return (
		<Dialog open={open} onClose={onClose} title="Invite people" width="max-w-[820px]" footer={<div className="flex items-center justify-between"><span className="text-xs text-t2">{live ? 'Roles can be changed later' : 'Everyone is free during the trial · roles can be changed later'}</span><div className="flex gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Send invites</Button></div></div>}>
			<form onSubmit={submit} className="space-y-3 px-5 py-5 sm:px-7">
				<div className={cn('hidden gap-2.5 text-xs font-semibold text-t2 sm:grid', live ? 'grid-cols-[1fr_1fr_160px_36px]' : 'grid-cols-[1fr_1fr_160px_160px_36px]')}><span>Email</span><span>Name (optional)</span><span>Role</span>{live ? null : <span>Base</span>}<span /></div>
				{fields.map((f, i) => {
					const err = form.formState.errors.invites?.[i]?.email?.message;
					return (
						<div key={f.id} className={cn('grid grid-cols-[1fr_36px] gap-2.5', live ? 'sm:grid-cols-[1fr_1fr_160px_36px]' : 'sm:grid-cols-[1fr_1fr_160px_160px_36px]')}>
							<div className="min-w-0"><Input type="email" placeholder="colleague@company.ng" className="h-9" invalid={!!err} aria-label={`Invite ${i + 1} email`} {...form.register(`invites.${i}.email`)} />{err ? <p role="alert" className="mt-1 text-xs text-danger">{err}</p> : null}</div>
							<button type="button" onClick={() => remove(i)} className="grid size-9 place-items-center rounded-sm text-t3 hover:bg-muted hover:text-t1 sm:order-last" aria-label={`Remove row ${i + 1}`}><X size={15} /></button>
							<Input placeholder="Full name" className="col-span-2 h-9 sm:col-span-1" aria-label={`Invite ${i + 1} name`} {...form.register(`invites.${i}.name`)} />
							<Select className="col-span-2 h-9 sm:col-span-1" aria-label={`Invite ${i + 1} role`} {...form.register(`invites.${i}.role`)}>{live ? access.grantable.map((r) => <option key={r.id}>{r.label}</option>) : roles.map((r) => <option key={r}>{r}</option>)}</Select>
							{live ? null : <Select className="col-span-2 h-9 sm:col-span-1" aria-label={`Invite ${i + 1} base`} {...form.register(`invites.${i}.base`)}>{inviteBases.map((b) => <option key={b}>{b}</option>)}</Select>}
						</div>
					);
				})}
				<button type="button" onClick={() => append({ email: '', name: '', role: 'Support agent', base: inviteBases[0]! })} className="flex items-center gap-1.5 text-xs text-brand-600 hover:underline"><Plus size={13} /> Add another</button>
			</form>
		</Dialog>
	);
}
