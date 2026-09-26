import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus, Trash2, UserPlus, Zap } from 'lucide-react';
import { Avatar, Button, Dialog, Input, Pill, Select, Switch } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { toast } from '@/shared/lib/toast-store';
import { memberById } from '@/mocks/db';
import { statusCategory } from '@/mocks/seed';
import { useProjectTickets } from '@/features/tickets/hooks/useProjectTickets';
import { useProjectActions } from '../hooks/useProjectActions';
import type { AutomationRule, Project, ProjectRole, TeamMember } from '@/mocks/types';
import { SaveBar, SectionCard } from './shared';
import { useProjectSettings, useSaveProjectSettings, useSectionDraft, useWorkspaceMembers } from './hooks';
import { uid } from './model';

// ---------------- Members & roles ----------------

const roleHelp: Record<ProjectRole, string> = { Admin: 'Edits workflow, fields and settings', Member: 'Creates, edits and moves issues', Viewer: 'Read-only' };

export function MembersSection({ project, orgSlug }: { project: Project; orgSlug: string }) {
	const settings = useProjectSettings(project);
	const saveSettings = useSaveProjectSettings(project);
	const actions = useProjectActions(orgSlug);
	const allMembers = useWorkspaceMembers();
	const { tickets } = useProjectTickets(orgSlug, project.key);
	const [adding, setAdding] = useState(false);
	const [q, setQ] = useState('');
	const members = project.memberIds.map((id) => memberById(id)).filter((m): m is TeamMember => !!m);
	const roleOf = (id: string): ProjectRole => (id === project.leadId ? 'Admin' : settings.roles[id] ?? 'Member');
	const openCount = (id: string) => tickets.filter((t) => t.projectKey === project.key && t.assigneeId === id && statusCategory[t.status] !== 'done').length;

	const setRole = (m: TeamMember, role: ProjectRole) => {
		saveSettings({ roles: { ...settings.roles, [m.id]: role } });
		toast(`${m.name} is now ${role === 'Admin' ? 'an admin' : `a ${role.toLowerCase()}`}`, { tone: 'success' });
	};
	const remove = async (m: TeamMember) => {
		if (!(await actions.update(project, { memberIds: project.memberIds.filter((id) => id !== m.id) }))) return;
		toast(`${m.name} removed from ${project.key}`, { tone: 'success', description: openCount(m.id) ? `${openCount(m.id)} open issues stay assigned; reassign from Workload.` : undefined });
	};
	const add = async (m: TeamMember) => {
		if (!(await actions.update(project, { memberIds: [...project.memberIds, m.id] }))) return;
		toast(`${m.name} added as a member`, { tone: 'success' });
	};
	const candidates = allMembers.filter((m) => !project.memberIds.includes(m.id) && m.status !== 'Deactivated' && (!q || `${m.name} ${m.role} ${m.team}`.toLowerCase().includes(q.toLowerCase())));

	return (
		<SectionCard title="Members & roles" sub={`${members.length} people · roles here override workspace roles for this project only.`} action={<Button variant="primary" onClick={() => setAdding(true)}><UserPlus size={15} aria-hidden /> Add member</Button>}>
			<div className="overflow-x-auto">
				<table className="w-full text-[13px]">
					<thead><tr className="text-left text-[11px] font-semibold tracking-wider text-t2 uppercase"><th className="py-2 pe-3">Member</th><th className="px-3 py-2">Team</th><th className="px-3 py-2">Project role</th><th className="px-3 py-2 text-right">Open issues</th><th className="w-10" /></tr></thead>
					<tbody>
						{members.map((m) => (
							<tr key={m.id} className="border-t border-border">
								<td className="py-2.5 pe-3"><div className="flex items-center gap-2.5"><Avatar name={m.name} tint={m.tint} src={m.avatarUrl} /><div className="min-w-0"><b className="block truncate">{m.name}{m.id === project.leadId ? <Pill tone="teal" className="ms-2">Lead</Pill> : null}</b><span className="text-xs text-t2">{m.email}</span></div></div></td>
								<td className="px-3 py-2.5 text-t2">{m.team}</td>
								<td className="px-3 py-2.5">
									<Select value={roleOf(m.id)} onChange={(e) => setRole(m, e.target.value as ProjectRole)} disabled={m.id === project.leadId} className="h-8 w-[120px] text-xs" aria-label={`Role for ${m.name}`}>{(['Admin', 'Member', 'Viewer'] as ProjectRole[]).map((r) => <option key={r}>{r}</option>)}</Select>
									<div className="mt-0.5 text-[11px] text-t3">{roleHelp[roleOf(m.id)]}</div>
								</td>
								<td className="tabular px-3 py-2.5 text-right">{openCount(m.id)}</td>
								<td className="py-2.5"><Button variant="ghost" size="sm" iconOnly disabled={m.id === project.leadId} onClick={() => void remove(m)} aria-label={`Remove ${m.name}`}><Trash2 size={14} /></Button></td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<p className="mt-3 text-xs text-t2">Change the lead under <Link to="/$org/projects/$projectKey/settings/$section" params={{ org: orgSlug, projectKey: project.key, section: 'general' }} className="text-brand-600 hover:underline">General</Link>. Workspace admins always have access.</p>

			<Dialog open={adding} onClose={() => setAdding(false)} title="Add members" width="max-w-[520px]" footer={<Button variant="primary" onClick={() => setAdding(false)}>Done</Button>}>
				<Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people by name, role or team" autoFocus />
				<ul className="mt-3 max-h-[360px] divide-y divide-border overflow-y-auto">
					{candidates.map((m) => (
						<li key={m.id} className="flex items-center gap-2.5 py-2.5 text-[13px]"><Avatar name={m.name} tint={m.tint} src={m.avatarUrl} /><div className="min-w-0 flex-1"><b className="block truncate">{m.name}</b><span className="text-xs text-t2">{m.role} · {m.team}{m.status === 'Invited' ? ' · invite pending' : ''}</span></div><Button size="sm" onClick={() => void add(m)}><Plus size={13} aria-hidden /> Add</Button></li>
					))}
					{candidates.length === 0 ? <li className="py-6 text-center text-[13px] text-t3">Everyone matching is already on the project.</li> : null}
				</ul>
			</Dialog>
		</SectionCard>
	);
}

// ---------------- Notifications ----------------

export function NotificationsSection({ project }: { project: Project }) {
	const { draft, setDraft, dirty, save, discard } = useSectionDraft(project, 'notifications');
	const channels = [['inApp', 'In-app'], ['email', 'Email'], ['whatsapp', 'WhatsApp']] as const;
	return (
		<SectionCard title="Notification scheme" sub="Defaults for everyone on this project. People can mute individual events in their own preferences.">
			<div className="overflow-x-auto">
				<table className="w-full text-[13px]">
					<thead><tr className="text-left text-[11px] font-semibold tracking-wider text-t2 uppercase"><th className="py-2 pe-3">Event</th>{channels.map(([k, l]) => <th key={k} className="px-3 py-2 text-center">{l}</th>)}</tr></thead>
					<tbody>
						{draft.map((row) => (
							<tr key={row.event} className="border-t border-border">
								<td className="py-2.5 pe-3">{row.label}<div className="font-mono text-[11px] text-t3">{row.event}</div></td>
								{channels.map(([k, l]) => <td key={k} className="px-3 py-2.5 text-center"><input type="checkbox" className="size-4 accent-brand-900" checked={row[k]} onChange={(e) => setDraft(draft.map((x) => (x.event === row.event ? { ...x, [k]: e.target.checked } : x)))} aria-label={`${row.label} via ${l}`} /></td>)}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
		</SectionCard>
	);
}

// ---------------- Automation ----------------

const triggers = ['Issue created', 'Status changed', 'Comment added', 'Due date in 24h', 'SLA at 75%', 'Daily at 09:00'];
const actions = ['Assign to project lead', 'Assign to the site engineer', 'Transition to Closed', 'Notify lead via WhatsApp', 'Post to Slack channel', 'Add label', 'Comment and mention assignee', 'Set priority to P1'];

export function AutomationSection({ project }: { project: Project }) {
	const { draft, commit } = useSectionDraft(project, 'automation');
	const [adding, setAdding] = useState(false);
	const [nr, setNr] = useState<Omit<AutomationRule, 'id' | 'runs' | 'enabled'>>({ name: '', trigger: triggers[0]!, condition: '', action: actions[0]! });
	const toggle = (r: AutomationRule) => commit(draft.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x)), `${r.name} ${r.enabled ? 'paused' : 'enabled'}`);
	const remove = (r: AutomationRule) => commit(draft.filter((x) => x.id !== r.id), `${r.name} deleted`);
	const add = () => {
		if (!nr.name.trim()) return toast('Give the rule a name', { tone: 'danger' });
		commit([...draft, { ...nr, name: nr.name.trim(), condition: nr.condition.trim() || 'always', id: uid('r'), runs: 0, enabled: true }], 'Rule created');
		setAdding(false);
		setNr({ name: '', trigger: triggers[0]!, condition: '', action: actions[0]! });
	};
	return (
		<SectionCard title="Automation rules" sub="Trigger → condition → action, evaluated asynchronously so nothing slows the ticket." action={<Button variant="primary" onClick={() => setAdding(true)}><Plus size={15} aria-hidden /> New rule</Button>}>
			<ul className="divide-y divide-border">
				{draft.map((r) => (
					<li key={r.id} className="flex flex-wrap items-center gap-3 py-3 text-[13px]">
						<span className={cn('grid size-8 shrink-0 place-items-center rounded-full', r.enabled ? 'bg-brand-100 text-brand-900' : 'bg-muted text-t3')}><Zap size={14} /></span>
						<div className="min-w-[220px] flex-1">
							<b className={cn(!r.enabled && 'text-t2')}>{r.name}</b>
							<div className="mt-1 flex flex-wrap items-center gap-1 text-xs"><Pill tone="teal">{r.trigger}</Pill><span className="text-t3">→</span><Pill tone="closed">{r.condition}</Pill><span className="text-t3">→</span><Pill tone="done">{r.action}</Pill></div>
						</div>
						<span className="tabular text-xs text-t2">{r.runs} runs · 30d</span>
						<Switch on={r.enabled} onChange={() => toggle(r)} label={`${r.name} enabled`} />
						<Button variant="ghost" size="sm" iconOnly onClick={() => remove(r)} aria-label={`Delete ${r.name}`}><Trash2 size={14} /></Button>
					</li>
				))}
				{draft.length === 0 ? <li className="py-6 text-center text-[13px] text-t3">No rules yet.</li> : null}
			</ul>
			<Dialog open={adding} onClose={() => setAdding(false)} title="New automation rule" width="max-w-[520px]" footer={<><Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button><Button variant="primary" onClick={add}>Create rule</Button></>}>
				<label className="block text-[13px]">Name<Input value={nr.name} onChange={(e) => setNr({ ...nr, name: e.target.value })} className="mt-1" placeholder="e.g. Escalate P1 at 75% SLA" autoFocus /></label>
				<div className="mt-3 grid gap-3 sm:grid-cols-2">
					<label className="text-[13px]">When<Select value={nr.trigger} onChange={(e) => setNr({ ...nr, trigger: e.target.value })} className="mt-1">{triggers.map((t) => <option key={t}>{t}</option>)}</Select></label>
					<label className="text-[13px]">Then<Select value={nr.action} onChange={(e) => setNr({ ...nr, action: e.target.value })} className="mt-1">{actions.map((a) => <option key={a}>{a}</option>)}</Select></label>
					<label className="text-[13px] sm:col-span-2">If <span className="text-t2">(optional)</span><Input value={nr.condition} onChange={(e) => setNr({ ...nr, condition: e.target.value })} className="mt-1 font-mono" placeholder='priority = P1 and label = "network"' /></label>
				</div>
			</Dialog>
		</SectionCard>
	);
}

// ---------------- Integrations ----------------

export function IntegrationsSection({ project }: { project: Project }) {
	const { draft, commit } = useSectionDraft(project, 'integrations');
	const toggle = (id: string) => {
		const it = draft.find((x) => x.id === id)!;
		commit(draft.map((x) => (x.id === id ? { ...x, connected: !x.connected, detail: x.connected ? undefined : x.detail ?? 'Connected just now' } : x)), it.connected ? `${it.name} disconnected` : `${it.name} connected`);
	};
	return (
		<SectionCard title="Integrations" sub="Connections scoped to this project. Workspace-wide channels live under Settings → Integrations.">
			<div className="grid gap-3 sm:grid-cols-2">
				{draft.map((it) => (
					<div key={it.id} className="flex flex-col rounded-md border border-border p-4 text-[13px]">
						<div className="flex items-center justify-between gap-2"><b>{it.name}</b><Pill tone={it.connected ? 'done' : 'closed'}>{it.connected ? 'Connected' : 'Not connected'}</Pill></div>
						<p className="mt-1 text-t2">{it.description}</p>
						{it.connected && it.detail ? <p className="mt-2 text-xs text-t3">{it.detail}</p> : null}
						<div className="mt-auto pt-3"><Button size="sm" variant={it.connected ? 'secondary' : 'primary'} onClick={() => toggle(it.id)}>{it.connected ? 'Disconnect' : 'Connect'}</Button></div>
					</div>
				))}
			</div>
		</SectionCard>
	);
}
