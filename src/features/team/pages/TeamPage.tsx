import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { ArrowUpDown, ChevronDown, Download, MoreVertical, Plus, Search, Shield, UserPlus } from 'lucide-react';
import { AppShell, MobileHeader } from '@/shared/layouts/AppShell';
import { Avatar, Button, Card, Dialog, EmptyState, FilterChip, Menu, Pill, type PillTone } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useAuthStore } from '@/shared/lib/auth-store';
import { relativeTime, useNow } from '@/shared/lib/time';
import { useDb } from '@/mocks/db';
import { statusCategory } from '@/mocks/seed';
import { toast } from '@/shared/lib/toast-store';
import type { TeamMember } from '@/mocks/types';
import { InviteDialog } from '../components/InviteDialog';
import { MemberPanel } from '../components/MemberPanel';

import type { TeamSearch as S } from '../model';

const roleTone: Record<string, PillTone> = { Admin: 'teal', 'Super Admin': 'teal', 'Operations Lead': 'teal', 'Support agent': 'progress', 'Field engineer': 'closed', Developer: 'review', 'Product lead': 'review', Designer: 'review', Engineer: 'review', Viewer: 'closed' };

export function TeamPage() {
	const org = useAuthStore((s) => s.org)!;
	const user = useAuthStore((s) => s.user)!;
	const navigate = useNavigate();
	const search = useSearch({ from: '/authed/$org/users' });
	const allMembers = useDb((s) => s.members);
	const members = useMemo(() => allMembers.filter((m) => m.id !== 'u_amr' || org.slug === 'alrashidi'), [allMembers, org.slug]);
	const tickets = useDb((s) => s.tickets);
	const setStatus = useDb((s) => s.setMemberStatus);
	const resend = useDb((s) => s.resendInvite);
	const now = useNow(60_000);
	const [inviting, setInviting] = useState(false);
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const setSearch = (patch: Partial<S>) => navigate({ to: '/$org/users', params: { org: org.slug }, search: { ...search, ...patch }, replace: true });
	const openCount = (m: TeamMember) => tickets.filter((t) => t.assigneeId === m.id && statusCategory[t.status] !== 'done').length;

	const roles = Array.from(new Set(members.map((m) => m.role)));
	const teams = Array.from(new Set(members.map((m) => m.team)));
	const bases = Array.from(new Set(members.map((m) => m.base.split(' · ')[0]!)));

	const list = useMemo(
		() =>
			members
				.filter((m) => (search.status === 'all' ? true : search.status === 'active' ? m.status !== 'Deactivated' : search.status === 'invited' ? m.status === 'Invited' : m.status === 'Deactivated'))
				.filter((m) => !search.role || m.role === search.role)
				.filter((m) => !search.team || m.team === search.team)
				.filter((m) => !search.base || m.base.startsWith(search.base))
				.filter((m) => !search.q || `${m.name} ${m.email} ${m.phone ?? ''}`.toLowerCase().includes(search.q.toLowerCase()))
				.sort((a, b) => (search.sort === 'name' ? a.name.localeCompare(b.name) : search.sort === 'open' ? openCount(b) - openCount(a) : (b.lastActiveAt ?? 0) - (a.lastActiveAt ?? 0))),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[members, search, tickets],
	);
	const current = members.find((m) => m.id === search.member);
	const counts = { agents: members.filter((m) => m.role === 'Support agent' && m.status !== 'Deactivated').length, engineers: members.filter((m) => m.role === 'Field engineer' && m.status !== 'Deactivated').length, admins: members.filter((m) => (m.role === 'Admin' || m.role === 'Super Admin') && m.status !== 'Deactivated').length };

	const exportCsv = () => {
		const rows = [['Name', 'Email', 'Role', 'Team', 'Base', 'Status'], ...list.map((m) => [m.name, m.email, m.role, m.team, m.base, m.status])];
		const blob = new Blob([rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')], { type: 'text/csv' });
		const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'team.csv'; a.click();
		toast(`Exported ${list.length} people`, { tone: 'success' });
	};

	const StatusPillFor = ({ m }: { m: TeamMember }) => (m.status === 'Active' ? <Pill tone="done">Active</Pill> : m.status === 'Invited' ? <Pill tone="open">Invited · {relativeTime(m.invitedAt ?? now, now).replace(' ago', '')}</Pill> : <Pill tone="closed">Deactivated</Pill>);

	const rowMenu = (m: TeamMember) => (
		<Menu align="end" width="w-48" trigger={({ toggle, buttonProps }) => <button type="button" onClick={toggle} className="grid size-7 place-items-center rounded-sm text-t3 hover:bg-muted hover:text-t1" aria-label={`Actions for ${m.name}`} {...buttonProps}><MoreVertical size={16} /></button>} items={[
			{ key: 'view', label: 'View', onSelect: () => setSearch({ member: m.id }) },
			{ key: 'reset', label: 'Reset password', onSelect: () => toast('Password reset link sent', { tone: 'success', description: `Emailed to ${m.email}` }) },
			...(m.status === 'Invited' ? [{ key: 'resend', label: 'Resend invite', onSelect: () => { resend(m.id); toast('Invite resent', { tone: 'success' }); } }] : []),
			...(m.id !== user.id ? [m.status === 'Deactivated' ? { key: 'react', label: 'Reactivate', onSelect: () => setStatus(m.id, 'Active') } : { key: 'deact', label: 'Deactivate', danger: true, onSelect: () => { if (window.confirm(`Deactivate ${m.name}?`)) setStatus(m.id, 'Deactivated'); } }] : []),
		]} />
	);

	return (
		<AppShell
			meta={{ title: 'Team', subtitle: `${members.length} people · ${counts.agents} agents · ${counts.engineers} field engineers · ${counts.admins} admins` }}
			mobileHeader={<MobileHeader><div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Team</h1><button type="button" onClick={() => setInviting(true)} className="flex h-8 items-center gap-1 rounded-full bg-white px-3 text-[13px] font-semibold text-brand-900"><Plus size={14} /> Invite</button></div><label className="input mt-3 h-10 border-transparent bg-white/10 text-white"><Search size={15} className="text-on-dark-muted" aria-hidden /><input value={search.q ?? ''} onChange={(e) => setSearch({ q: e.target.value || undefined })} placeholder="Search people" className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-on-dark-muted" aria-label="Search people" /></label></MobileHeader>}
		>
			<div className="hidden flex-wrap items-start justify-between gap-4 lg:flex">
				<div><h2 className="text-[22px] font-semibold">Team</h2><p className="text-[13px] text-t2">Manage employees, roles, bases and account status. Field engineers use the mobile app; agents work the helpdesk.</p></div>
				<div className="flex items-center gap-2.5">
					<Button onClick={exportCsv}><Download size={15} aria-hidden /> Export</Button>
					<Link to="/$org/users/roles" params={{ org: org.slug }}><Button><Shield size={15} aria-hidden /> Roles &amp; permissions</Button></Link>
					<Button variant="primary" onClick={() => setInviting(true)}><UserPlus size={15} aria-hidden /> Invite people</Button>
				</div>
			</div>

			<div className="mt-0 hidden flex-wrap items-center gap-2 lg:mt-4 lg:flex">
				<label className="input h-[30px] w-[320px] text-xs"><Search size={13} className="text-t2" aria-hidden /><input value={search.q ?? ''} onChange={(e) => setSearch({ q: e.target.value || undefined })} placeholder="Search by name, email or phone…" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-t3" aria-label="Search people" /></label>
				<Menu width="w-48" trigger={({ toggle, buttonProps }) => <FilterChip label="Role" value={search.role ?? 'All'} active={!!search.role} onClick={toggle} onClear={() => setSearch({ role: undefined })} buttonProps={buttonProps} />} items={roles.map((r) => ({ key: r, label: r, selected: search.role === r, onSelect: () => setSearch({ role: search.role === r ? undefined : r }) }))} />
				<Menu width="w-52" trigger={({ toggle, buttonProps }) => <FilterChip label="Team" value={search.team ?? 'All'} active={!!search.team} onClick={toggle} onClear={() => setSearch({ team: undefined })} buttonProps={buttonProps} />} items={teams.map((t) => ({ key: t, label: t, selected: search.team === t, onSelect: () => setSearch({ team: search.team === t ? undefined : t }) }))} />
				<Menu width="w-44" trigger={({ toggle, buttonProps }) => <FilterChip label="Base" value={search.base ?? 'All'} active={!!search.base} onClick={toggle} onClear={() => setSearch({ base: undefined })} buttonProps={buttonProps} />} items={bases.map((b) => ({ key: b, label: b, selected: search.base === b, onSelect: () => setSearch({ base: search.base === b ? undefined : b }) }))} />
				<Menu width="w-48" trigger={({ toggle, buttonProps }) => <FilterChip label="Status" value={{ active: 'Active + Invited', all: 'All', invited: 'Invited', deactivated: 'Deactivated' }[search.status]} active onClick={toggle} onClear={search.status !== 'all' ? () => setSearch({ status: 'all' }) : undefined} buttonProps={buttonProps} />} items={(['active', 'invited', 'deactivated', 'all'] as const).map((s) => ({ key: s, label: { active: 'Active + Invited', invited: 'Invited', deactivated: 'Deactivated', all: 'All' }[s], selected: search.status === s, onSelect: () => setSearch({ status: s }) }))} />
				<Menu align="end" width="w-44" className="ms-auto" trigger={({ toggle, buttonProps }) => <Button size="sm" onClick={toggle} {...buttonProps}><ArrowUpDown size={12} aria-hidden /> Sort: {{ active: 'Last active', name: 'Name', open: 'Open tickets' }[search.sort]} <ChevronDown size={12} aria-hidden /></Button>} items={(['active', 'name', 'open'] as const).map((s) => ({ key: s, label: { active: 'Last active', name: 'Name', open: 'Open tickets' }[s], selected: search.sort === s, onSelect: () => setSearch({ sort: s }) }))} />
			</div>

			{selected.size ? <div className="mt-3 hidden items-center gap-3 rounded-[10px] bg-brand-900 px-3.5 py-2 text-[13px] text-white lg:flex"><b>{selected.size} selected</b><Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => { toast(`Reminder sent to ${selected.size} people`, { tone: 'success' }); setSelected(new Set()); }}>Send reminder</Button><Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => { selected.forEach((id) => id !== user.id && setStatus(id, 'Deactivated')); setSelected(new Set()); }}>Deactivate</Button><button type="button" className="ms-auto text-xs text-on-dark-muted" onClick={() => setSelected(new Set())}>Clear</button></div> : null}

			<div className={cn('mt-4 grid gap-4 [&>*]:min-w-0', current && 'lg:grid-cols-[minmax(0,1fr)_400px]')}>
				<Card className="hidden overflow-x-auto lg:block" data-tour="team-table">
					{list.length === 0 ? <EmptyState title="No people match" /> : (
						<table className="w-full text-[13px]">
							<thead><tr className="bg-muted text-left text-[11px] font-semibold tracking-wider text-t2 uppercase"><th className="w-10 px-3.5 py-3"><input type="checkbox" className="size-4 accent-brand-900" checked={list.every((m) => selected.has(m.id))} onChange={() => setSelected(list.every((m) => selected.has(m.id)) ? new Set() : new Set(list.map((m) => m.id)))} aria-label="Select all" /></th><th className="px-3.5 py-3">Name</th><th className="px-3.5 py-3">Role</th><th className="px-3.5 py-3">Team · Base</th><th className="px-3.5 py-3">Open</th><th className="px-3.5 py-3">Status</th><th className="px-3.5 py-3">Last active</th><th className="w-10" /></tr></thead>
							<tbody>
								{list.map((m) => (
									<tr key={m.id} className={cn('cursor-pointer border-t border-border hover:bg-[#fafbfc]', search.member === m.id && 'bg-brand-100/40')} onClick={() => setSearch({ member: m.id })}>
										<td className="px-3.5 py-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="size-4 accent-brand-900" checked={selected.has(m.id)} onChange={() => setSelected((s) => { const n = new Set(s); if (n.has(m.id)) n.delete(m.id); else n.add(m.id); return n; })} aria-label={`Select ${m.name}`} /></td>
										<td className="min-w-[260px] px-3.5 py-3"><div className="flex items-center gap-3"><Avatar name={m.name} tint={m.tint} /><div className="min-w-0"><b className={cn(m.status === 'Deactivated' && 'text-t2')}>{m.name}</b>{m.id === user.id ? <span className="ms-1 text-xs text-t3">(you)</span> : null}<div className="truncate text-xs text-t2">{m.email}{m.phone ? ` · ${m.phone}` : ''}</div></div></div></td>
										<td className="px-3.5 py-3"><Pill tone={roleTone[m.role] ?? 'closed'}>{m.role}</Pill></td>
										<td className="px-3.5 py-3 whitespace-nowrap"><div>{m.team}</div><div className="text-xs text-t2">{m.base}</div></td>
										<td className="tabular px-3.5 py-3">{m.status === 'Invited' ? '—' : openCount(m)}</td>
										<td className="px-3.5 py-3"><StatusPillFor m={m} /></td>
										<td className="px-3.5 py-3 whitespace-nowrap text-t2">{m.status === 'Invited' ? <button type="button" onClick={(e) => { e.stopPropagation(); resend(m.id); toast('Invite resent', { tone: 'success' }); }} className="text-brand-600 hover:underline">Resend</button> : m.presence === 'On site' ? `On site · ${new Date(m.lastActiveAt ?? now).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : m.lastActiveAt && now - m.lastActiveAt < 60_000 ? 'Now' : m.lastActiveAt ? relativeTime(m.lastActiveAt, now) : '—'}</td>
										<td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>{rowMenu(m)}</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</Card>

				<div className="space-y-3 lg:hidden" data-tour="m-team">
					{list.map((m) => (
						<button key={m.id} type="button" onClick={() => setSearch({ member: m.id })} className="flex w-full items-center gap-3 rounded-md bg-white p-3.5 text-left shadow-card"><Avatar name={m.name} tint={m.tint} size="lg" /><div className="min-w-0 flex-1"><b className="block truncate text-[15px]">{m.name}</b><span className="block truncate text-xs text-t2">{m.role} · {m.base}</span></div><StatusPillFor m={m} /></button>
					))}
				</div>

				{current ? <div className="hidden lg:block"><MemberPanel member={current} meId={user.id} onClose={() => setSearch({ member: undefined })} /></div> : null}
			</div>

			<Dialog open={!!current && typeof window !== 'undefined' && window.innerWidth < 1024} onClose={() => setSearch({ member: undefined })} title={current?.name} width="max-w-[520px]">{current ? <div className="p-4"><MemberPanel member={current} meId={user.id} onClose={() => setSearch({ member: undefined })} /></div> : null}</Dialog>
			<InviteDialog open={inviting} onClose={() => setInviting(false)} />
		</AppShell>
	);
}
