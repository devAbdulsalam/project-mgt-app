import { useState } from 'react';
import { KeyRound, MessageSquare, MoreHorizontal, Pencil, X, Plus } from 'lucide-react';
import { Avatar, Button, LabelChip, Menu, ProgressBar, Select } from '@/shared/ui';
import { useDb } from '@/mocks/db';
import { useAuthStore } from '@/shared/lib/auth-store';
import { isLiveApi } from '@/shared/lib/live-api';
import { toast } from '@/shared/lib/toast-store';
import { relativeTime, useNow } from '@/shared/lib/time';
import type { MemberRole, TeamMember } from '@/mocks/types';
import { accessRoleLabel, useMyAccess, useOpenCounts, useTeamActions, type AccessRole } from '../hooks/useTeam';

const roles: MemberRole[] = ['Admin', 'Operations Lead', 'Support agent', 'Field engineer', 'Developer', 'Product lead', 'Designer', 'Engineer', 'Viewer'];
const allTeams = ['Operations', 'Service desk', 'Field · Lagos', 'Field · Abuja', 'Field · Port Harcourt', 'Security · Kano', 'Network', 'PayBridge', 'Engineer app', 'Management'];

export function MemberPanel({ member, onClose, meId }: { member: TeamMember; onClose: () => void; meId: string }) {
	const update = useDb((s) => s.updateMember);
	const live = isLiveApi();
	const orgSlug = useAuthStore((s) => s.org)!.slug;
	const actions = useTeamActions(orgSlug);
	const access = useMyAccess(orgSlug);
	const setStatus = (_id: string, status: 'Active' | 'Deactivated') => actions.setStatus(member, status);
	const openCount = useOpenCounts(orgSlug)(member.id) ?? 0;
	const now = useNow(60_000);
	const [role, setRole] = useState<MemberRole>(member.role);
	const [accessRole, setAccessRole] = useState<AccessRole>(member.accessRole ?? 'member');
	const [teams, setTeams] = useState(member.teams);
	const [editing, setEditing] = useState(false);
	const [name, setName] = useState(member.name);
	const [base, setBase] = useState(member.base);
	const dirty = live ? accessRole !== member.accessRole : role !== member.role || teams.join() !== member.teams.join() || name !== member.name || base !== member.base;

	const save = async () => {
		if (live) {
			if (await actions.setRole(member, accessRole)) toast('Role updated', { tone: 'success' });
			return;
		}
		update(member.id, { role, teams, name, base, team: teams[0] ?? member.team });
		setEditing(false);
		toast('Member updated', { tone: 'success' });
	};

	return (
		<aside className="card flex h-max flex-col p-5" aria-label={`${member.name} details`}>
			<div className="flex items-start gap-3">
				<Avatar name={member.name} tint={member.tint} src={member.avatarUrl} size="lg" className="size-14 text-base" />
				<div className="min-w-0 flex-1">
					{editing ? <input value={name} onChange={(e) => setName(e.target.value)} className="input h-8 text-[15px] font-semibold" aria-label="Name" /> : <b className="block text-[17px] font-semibold">{member.name}</b>}
					<span className="text-xs text-t2">{live ? accessRoleLabel(member.accessRole) : `${member.role} · ${member.base}`} · {member.joinedAt ? `joined ${new Date(member.joinedAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}` : member.status === 'Invited' ? `invited ${relativeTime(member.invitedAt ?? now, now)}` : ''}</span>
				</div>
				<button type="button" onClick={onClose} className="text-t3 hover:text-t1" aria-label="Close"><X size={16} /></button>
			</div>
			<div className="mt-4 flex flex-wrap gap-2">
				{!live ? <Button size="md" onClick={() => setEditing((e) => !e)}><Pencil size={14} aria-hidden /> {editing ? 'Done' : 'Edit'}</Button> : null}
				{member.phone && !live ? <Button size="md" onClick={() => toast(`Opening WhatsApp chat with ${member.name.split(' ')[0]}`)}><MessageSquare size={14} aria-hidden /> WhatsApp</Button> : null}
				{access.can('member.update') && (!live || member.status !== 'Invited') ? <Button size="md" onClick={() => { void actions.resetPassword(member); }}><KeyRound size={14} aria-hidden /> Reset password</Button> : null}
				<Menu align="end" width="w-48" trigger={({ toggle, buttonProps }) => <Button size="md" iconOnly onClick={toggle} aria-label="More" {...buttonProps}><MoreHorizontal size={14} /></Button>} items={[
					{ key: 'copy', label: 'Copy email', onSelect: () => { navigator.clipboard?.writeText(member.email).catch(() => {}); toast('Email copied'); } },
					...(member.status === 'Invited' ? [{ key: 'resend', label: 'Resend invite', onSelect: () => { void actions.resendInvite(member); } }] : []),
				]} />
			</div>

			{live ? (
				<dl className="mt-4 divide-y divide-border text-[13px]">
					<div className="flex items-center gap-3 py-3"><dt className="w-24 shrink-0 text-t2">Role</dt><dd className="flex-1"><Select value={accessRole} onChange={(e) => setAccessRole(e.target.value as AccessRole)} className="h-9" aria-label="Role" disabled={member.id === meId || !access.can('member.update')}>{access.grantable.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}{access.grantable.some((r) => r.id === member.accessRole) ? null : <option value={member.accessRole}>{accessRoleLabel(member.accessRole)}</option>}</Select></dd></div>
					<div className="flex items-start gap-3 py-3"><dt className="w-24 shrink-0 text-t2">Email</dt><dd className="min-w-0 flex-1 break-words">{member.email}</dd></div>
					{member.phone ? <div className="flex items-start gap-3 py-3"><dt className="w-24 shrink-0 text-t2">Phone</dt><dd className="flex-1">{member.phone}</dd></div> : null}
					<div className="flex items-start gap-3 py-3"><dt className="w-24 shrink-0 text-t2">Status</dt><dd className="flex-1">{member.status}</dd></div>
					<div className="flex items-start gap-3 py-3"><dt className="w-24 shrink-0 text-t2">Last active</dt><dd className="flex-1">{member.lastActiveAt ? relativeTime(member.lastActiveAt, now) : '—'}</dd></div>
					<div className="flex items-start gap-3 py-3"><dt className="w-24 shrink-0 text-t2">Open</dt><dd className="flex-1">{openCount} tickets</dd></div>
				</dl>
			) : (
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
			)}

			<div className="mt-4 flex items-center justify-between">
				{member.id === meId ? <span className="text-xs text-t3">This is you</span> : !access.can('member.update') ? <span /> : member.status === 'Deactivated' ? <Button variant="ghost" className="text-success-fg" onClick={async () => { if (await setStatus(member.id, 'Active')) toast(`${member.name} reactivated`, { tone: 'success' }); }}>Reactivate</Button> : <Button variant="ghost" className="text-danger-fg" onClick={async () => { if (window.confirm(`Deactivate ${member.name}? They lose access immediately; open tickets stay assigned.`)) { if (await setStatus(member.id, 'Deactivated')) toast(`${member.name} deactivated`); } }}>Deactivate</Button>}
				<Button variant="primary" onClick={() => { void save(); }} disabled={!dirty}>Save</Button>
			</div>
		</aside>
	);
}
