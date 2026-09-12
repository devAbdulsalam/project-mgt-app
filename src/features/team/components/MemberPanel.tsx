import { useState } from 'react';
import { KeyRound, MessageSquare, MoreHorizontal, Pencil, X, Plus } from 'lucide-react';
import { Avatar, Button, LabelChip, Menu, ProgressBar, Select } from '@/shared/ui';
import { useDb } from '@/mocks/db';
import { statusCategory } from '@/mocks/seed';
import { toast } from '@/shared/lib/toast-store';
import { relativeTime, useNow } from '@/shared/lib/time';
import type { MemberRole, TeamMember } from '@/mocks/types';

const roles: MemberRole[] = ['Admin', 'Operations Lead', 'Support agent', 'Field engineer', 'Developer', 'Product lead', 'Designer', 'Engineer', 'Viewer'];
const allTeams = ['Operations', 'Service desk', 'Field · Lagos', 'Field · Abuja', 'Field · Port Harcourt', 'Security · Kano', 'Network', 'PayBridge', 'Engineer app', 'Management'];

export function MemberPanel({ member, onClose, meId }: { member: TeamMember; onClose: () => void; meId: string }) {
	const update = useDb((s) => s.updateMember);
	const setStatus = useDb((s) => s.setMemberStatus);
	const resend = useDb((s) => s.resendInvite);
	const openCount = useDb((s) => s.tickets.filter((t) => t.assigneeId === member.id && statusCategory[t.status] !== 'done').length);
	const now = useNow(60_000);
	const [role, setRole] = useState<MemberRole>(member.role);
	const [teams, setTeams] = useState(member.teams);
	const [editing, setEditing] = useState(false);
	const [name, setName] = useState(member.name);
	const [base, setBase] = useState(member.base);
	const dirty = role !== member.role || teams.join() !== member.teams.join() || name !== member.name || base !== member.base;

	const save = () => {
		update(member.id, { role, teams, name, base, team: teams[0] ?? member.team });
		setEditing(false);
		toast('Member updated', { tone: 'success' });
	};

	return (
		<aside className="card flex h-max flex-col p-5" aria-label={`${member.name} details`}>
			<div className="flex items-start gap-3">
				<Avatar name={member.name} tint={member.tint} size="lg" className="size-14 text-base" />
				<div className="min-w-0 flex-1">
					{editing ? <input value={name} onChange={(e) => setName(e.target.value)} className="input h-8 text-[15px] font-semibold" aria-label="Name" /> : <b className="block text-[17px] font-semibold">{member.name}</b>}
					<span className="text-xs text-t2">{member.role} · {member.base} · {member.joinedAt ? `joined ${new Date(member.joinedAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}` : member.status === 'Invited' ? `invited ${relativeTime(member.invitedAt ?? now, now)}` : ''}</span>
				</div>
				<button type="button" onClick={onClose} className="text-t3 hover:text-t1" aria-label="Close"><X size={16} /></button>
			</div>
			<div className="mt-4 flex flex-wrap gap-2">
				<Button size="md" onClick={() => setEditing((e) => !e)}><Pencil size={14} aria-hidden /> {editing ? 'Done' : 'Edit'}</Button>
				{member.phone ? <Button size="md" onClick={() => toast(`Opening WhatsApp chat with ${member.name.split(' ')[0]}`)}><MessageSquare size={14} aria-hidden /> WhatsApp</Button> : null}
				<Button size="md" onClick={() => toast('Password reset link sent', { tone: 'success', description: `Emailed to ${member.email}` })}><KeyRound size={14} aria-hidden /> Reset password</Button>
				<Menu align="end" width="w-48" trigger={({ toggle, buttonProps }) => <Button size="md" iconOnly onClick={toggle} aria-label="More" {...buttonProps}><MoreHorizontal size={14} /></Button>} items={[
					{ key: 'copy', label: 'Copy email', onSelect: () => { navigator.clipboard?.writeText(member.email).catch(() => {}); toast('Email copied'); } },
					...(member.status === 'Invited' ? [{ key: 'resend', label: 'Resend invite', onSelect: () => { resend(member.id); toast('Invite resent', { tone: 'success' }); } }] : []),
				]} />
			</div>

			<dl className="mt-4 divide-y divide-border text-[13px]">
				<div className="flex items-center gap-3 py-3"><dt className="w-24 shrink-0 text-t2">Role</dt><dd className="flex-1"><Select value={role} onChange={(e) => setRole(e.target.value as MemberRole)} className="h-9" aria-label="Role" disabled={member.id === meId}>{roles.map((r) => <option key={r}>{r}</option>)}</Select></dd></div>
				<div className="flex items-start gap-3 py-3"><dt className="w-24 shrink-0 pt-1 text-t2">Teams</dt><dd className="flex flex-1 flex-wrap items-center gap-1.5">{teams.map((t) => <LabelChip key={t} onRemove={() => setTeams(teams.filter((x) => x !== t))}>{t}</LabelChip>)}<Menu width="w-52" trigger={({ toggle, buttonProps }) => <button type="button" onClick={toggle} className="flex h-5 items-center gap-0.5 rounded-[6px] px-1.5 text-[11px] text-brand-600 hover:bg-muted" {...buttonProps}><Plus size={11} /> Add</button>} items={allTeams.filter((t) => !teams.includes(t)).map((t) => ({ key: t, label: t, onSelect: () => setTeams([...teams, t]) }))} /></dd></div>
				<div className="flex items-start gap-3 py-3"><dt className="w-24 shrink-0 pt-1 text-t2">Skills</dt><dd className="flex flex-1 flex-wrap gap-1.5">{member.skills.length ? member.skills.map((s) => <LabelChip key={s} tone={4}>{s}</LabelChip>) : <span className="text-t3">—</span>}</dd></div>
				<div className="flex items-center gap-3 py-3"><dt className="w-24 shrink-0 text-t2">Base</dt><dd className="flex-1">{editing ? <input value={base} onChange={(e) => setBase(e.target.value)} className="input h-8" aria-label="Base" /> : member.base}</dd></div>
				{member.clients ? <div className="flex items-start gap-3 py-3"><dt className="w-24 shrink-0 text-t2">Clients</dt><dd className="flex-1">{member.clients}</dd></div> : null}
				{member.capacity ? <div className="flex items-start gap-3 py-3"><dt className="w-24 shrink-0 text-t2">Capacity</dt><dd className="flex-1">{member.capacity.perDay} visits / day · {member.capacity.days}<ProgressBar value={(member.capacity.bookedToday / member.capacity.perDay) * 100} className="mt-1.5" label="Booked today" /><span className="text-xs text-t2">{member.capacity.bookedToday} booked today · {openCount} open tickets</span></dd></div> : <div className="flex items-start gap-3 py-3"><dt className="w-24 shrink-0 text-t2">Open</dt><dd className="flex-1">{openCount} tickets</dd></div>}
				{member.signIn ? <div className="flex items-start gap-3 py-3"><dt className="w-24 shrink-0 text-t2">Sign-in</dt><dd className="flex-1">{member.signIn}</dd></div> : null}
				{member.monthStats ? <div className="flex items-start gap-3 py-3"><dt className="w-24 shrink-0 text-t2">This month</dt><dd className="flex-1">{member.monthStats}</dd></div> : null}
			</dl>

			<div className="mt-4 flex items-center justify-between">
				{member.id === meId ? <span className="text-xs text-t3">This is you</span> : member.status === 'Deactivated' ? <Button variant="ghost" className="text-success-fg" onClick={() => { setStatus(member.id, 'Active'); toast(`${member.name} reactivated`, { tone: 'success' }); }}>Reactivate</Button> : <Button variant="ghost" className="text-danger-fg" onClick={() => { if (window.confirm(`Deactivate ${member.name}? They lose access immediately; open tickets stay assigned.`)) { setStatus(member.id, 'Deactivated'); toast(`${member.name} deactivated`); } }}>Deactivate</Button>}
				<Button variant="primary" onClick={save} disabled={!dirty}>Save</Button>
			</div>
		</aside>
	);
}
