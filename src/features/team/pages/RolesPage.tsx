import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Check, ChevronLeft, Plus } from 'lucide-react';
import { AppShell, MobileHeader } from '@/shared/layouts/AppShell';
import { Button, Card, Pill } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useAuthStore } from '@/shared/lib/auth-store';
import { useDb } from '@/mocks/db';
import { toast } from '@/shared/lib/toast-store';
import { isLiveApi } from '@/shared/lib/live-api';
import { RolesMatrix } from '../components/RolesMatrix';

type Level = 'yes' | 'limited' | 'no';
interface Perm { id: string; label: string; sub?: string; scope?: string[] }
const groups: { title: string; perms: Perm[] }[] = [
	{ title: 'Tickets', perms: [
		{ id: 'view', label: 'View tickets', sub: 'Scope: all / own team / assigned / own company', scope: ['All', 'All', 'Assigned', 'Project', 'Own company'] },
		{ id: 'create', label: 'Create & edit tickets' }, { id: 'reply', label: 'Reply to clients on WhatsApp / email' }, { id: 'notes', label: 'View internal notes' }, { id: 'prio', label: 'Change priority / SLA policy' }, { id: 'delete', label: 'Delete tickets' },
	] },
	{ title: 'Field visits & assets', perms: [{ id: 'dispatch', label: 'Schedule / dispatch visits' }, { id: 'checkin', label: 'Check in / complete visit reports' }, { id: 'parts', label: 'Use parts from stock (needs approval above ₦50,000)' }, { id: 'assets', label: 'Edit assets & licences' }] },
	{ title: 'Clients & billing', perms: [{ id: 'contracts', label: 'View contracts & retainer hours' }, { id: 'invoices', label: 'Create invoices & approve quotes' }] },
	{ title: 'Workspace', perms: [{ id: 'team', label: 'Manage team, roles & SSO' }, { id: 'export', label: 'Export data / NDPR subject requests' }] },
];
const initialRoles = ['Admin', 'Support agent', 'Field engineer', 'Developer', 'Client (portal)'];
const initial: Record<string, Level[]> = {
	view: ['yes', 'yes', 'limited', 'limited', 'limited'], create: ['yes', 'yes', 'yes', 'yes', 'limited'], reply: ['yes', 'yes', 'yes', 'no', 'no'], notes: ['yes', 'yes', 'yes', 'yes', 'no'], prio: ['yes', 'yes', 'no', 'no', 'no'], delete: ['yes', 'no', 'no', 'no', 'no'],
	dispatch: ['yes', 'yes', 'limited', 'no', 'limited'], checkin: ['yes', 'no', 'yes', 'no', 'no'], parts: ['yes', 'no', 'limited', 'no', 'no'], assets: ['yes', 'yes', 'yes', 'no', 'no'],
	contracts: ['yes', 'yes', 'limited', 'no', 'limited'], invoices: ['yes', 'no', 'no', 'no', 'no'], team: ['yes', 'no', 'no', 'no', 'no'], export: ['yes', 'no', 'no', 'no', 'no'],
};
const next: Record<Level, Level> = { no: 'yes', yes: 'limited', limited: 'no' };

export function RolesPage() {
	const org = useAuthStore((s) => s.org)!;
	const live = isLiveApi();
	const members = useDb((s) => s.members);
	const [roles, setRoles] = useState(initialRoles);
	const [matrix, setMatrix] = useState(initial);
	const [dirty, setDirty] = useState(false);
	const countFor = (r: string) => (r === 'Client (portal)' ? 'external' : `${members.filter((m) => m.status !== 'Deactivated' && (m.role === r || (r === 'Admin' && (m.role === 'Super Admin' || m.role === 'Operations Lead')) || (r === 'Developer' && ['Product lead', 'Designer', 'Engineer'].includes(m.role)))).length} people`);
	const toggle = (id: string, i: number) => { setMatrix((m) => ({ ...m, [id]: m[id]!.map((v, j) => (j === i ? next[v] : v)) })); setDirty(true); };
	const addRole = () => { const name = window.prompt('Custom role name'); if (!name) return; setRoles((r) => [...r, name]); setMatrix((m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, [...v, 'no' as Level]]))); setDirty(true); };
	return (
		<AppShell meta={{ title: 'Roles & permissions', subtitle: 'Workspace · Team & roles · Permissions' }} mobileHeader={<MobileHeader><Link to="/$org/users" params={{ org: org.slug }} search={{}} className="flex items-center gap-1 text-[13px] text-on-dark-muted"><ChevronLeft size={16} /> Team</Link><h1 className="mt-1 text-xl font-semibold">Roles &amp; permissions</h1></MobileHeader>}>
			<div className="hidden flex-wrap items-center gap-3 lg:flex">
				<Link to="/$org/users" params={{ org: org.slug }} search={{}}><Button variant="ghost"><ChevronLeft size={14} aria-hidden /> Team</Button></Link>
				{live ? <span className="ms-auto text-xs text-t2">Read-only · roles are fixed</span> : <>
					<span className="ms-auto text-xs text-t2">Changes apply immediately · logged to audit</span>
					<Button onClick={addRole}><Plus size={15} aria-hidden /> Custom role</Button>
					<Button variant="primary" disabled={!dirty} onClick={() => { setDirty(false); toast('Permissions saved', { tone: 'success', description: 'Logged to the audit trail.' }); }}>Save changes</Button>
				</>}
			</div>
			{live ? <RolesMatrix orgSlug={org.slug} /> : <>
			<Card className="mt-4 overflow-x-auto">
				<table className="w-full min-w-[820px] text-[13px]">
					<thead><tr className="bg-muted text-[11px] font-semibold tracking-wider text-t2 uppercase"><th className="px-5 py-3 text-left">Permission</th>{roles.map((r) => <th key={r} className="px-3 py-3 text-center">{r}<div className="text-[11px] font-normal normal-case tracking-normal">{countFor(r)}</div></th>)}</tr></thead>
					<tbody>
						{groups.map((g) => (
							<GroupRows key={g.title} title={g.title} perms={g.perms} roles={roles} matrix={matrix} onToggle={toggle} />
						))}
					</tbody>
				</table>
				<div className="flex flex-wrap items-center gap-5 border-t border-border px-5 py-3 text-xs text-t2"><span className="flex items-center gap-1.5"><span className="size-4 rounded-[5px] bg-brand-900" /> Allowed</span><span className="flex items-center gap-1.5"><span className="size-4 rounded-[5px] bg-brand-100" /> Limited (own / with approval)</span><span className="flex items-center gap-1.5"><span className="size-4 rounded-[5px] border border-border-strong" /> Not allowed</span><span className="ms-auto">Client role applies to portal users invited by each client account · click a cell to cycle</span></div>
			</Card>
			<div className="mt-3 flex justify-end gap-2 lg:hidden"><Button variant="primary" disabled={!dirty} onClick={() => { setDirty(false); toast('Permissions saved', { tone: 'success' }); }}>Save changes</Button></div>
			</>}
		</AppShell>
	);
}

function GroupRows({ title, perms, roles, matrix, onToggle }: { title: string; perms: Perm[]; roles: string[]; matrix: Record<string, Level[]>; onToggle: (id: string, i: number) => void }) {
	return (
		<>
			<tr><td colSpan={roles.length + 1} className="border-t border-border bg-[#fafbfc] px-5 py-2 text-[11px] font-semibold tracking-wider text-t2 uppercase">{title}</td></tr>
			{perms.map((p) => (
				<tr key={p.id} className="border-t border-border">
					<td className="px-5 py-3"><div>{p.label}</div>{p.sub ? <div className="text-xs text-t2">{p.sub}</div> : null}</td>
					{roles.map((r, i) => {
						const v = matrix[p.id]?.[i] ?? 'no';
						if (p.scope) return <td key={r} className="px-3 py-3 text-center"><Pill tone={v === 'yes' ? 'teal' : 'closed'}>{p.scope[i] ?? 'None'}</Pill></td>;
						return (
							<td key={r} className="px-3 py-3 text-center">
								<button type="button" onClick={() => onToggle(p.id, i)} className={cn('mx-auto grid size-[22px] place-items-center rounded-[6px] border transition-colors', v === 'yes' ? 'border-brand-900 bg-brand-900 text-white' : v === 'limited' ? 'border-brand-100 bg-brand-100 text-brand-900' : 'border-border-strong bg-white')} aria-label={`${p.label} for ${r}: ${v}`} aria-pressed={v !== 'no'}>{v !== 'no' ? <Check size={13} strokeWidth={3} /> : null}</button>
							</td>
						);
					})}
				</tr>
			))}
		</>
	);
}
