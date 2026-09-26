import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AlertTriangle, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { Button, Dialog, Input, Select, Switch, Textarea } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { toast } from '@/shared/lib/toast-store';
import { useAuthStore } from '@/shared/lib/auth-store';
import { memberById } from '@/mocks/db';
import type { Project } from '@/mocks/types';
import { Row, SaveBar, SectionCard } from './shared';
import { useProjectActions } from '../hooks/useProjectActions';
import { useProjectTicketCount, useSectionDraft } from './hooks';

const swatches = ['#2e6f86', '#1e3a47', '#6b3fa0', '#1e7a45', '#b45309', '#b91c1c', '#2b5aa0', '#a0642b'];

export function GeneralSection({ project }: { project: Project }) {
	const org = useAuthStore((s) => s.org)!;
	const actions = useProjectActions(org.slug);
	const { draft, setDraft, dirty, save, discard } = useSectionDraft(project, 'general');
	const base = { name: project.name, description: project.description, kind: project.kind, leadId: project.leadId, color: project.color };
	const baseKey = JSON.stringify(base);
	const [info, setInfo] = useState(base);
	const [infoBase, setInfoBase] = useState(baseKey);
	if (infoBase !== baseKey) {
		setInfoBase(baseKey);
		setInfo(base);
	}
	const infoDirty = JSON.stringify(info) !== baseKey;
	const members = project.memberIds.map((id) => memberById(id)).filter(Boolean);
	const patch = (p: Partial<typeof draft>) => setDraft({ ...draft, ...p });

	const onSave = async () => {
		// A failed update reports itself; do not follow it with a success toast.
		if (infoDirty && !(await actions.update(project, info))) return;
		if (dirty) save();
		else toast('Project updated', { tone: 'success' });
	};
	const onDiscard = () => { setInfo(base); discard(); };

	return (
		<div className="space-y-4">
			<SectionCard title="Project" sub="How this project appears across the app, the client portal and notifications.">
				<Row label="Project name"><Input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} /></Row>
				<Row label="Key" sub="Prefix for issue numbers">
					<div className="flex items-center gap-3"><Input value={project.key} readOnly className="w-[120px] font-mono" aria-label="Project key" /><span className="text-xs text-t2">Keys are permanent so links like {project.key}-12 keep working.</span></div>
				</Row>
				<Row label="Description"><Textarea rows={3} value={info.description} onChange={(e) => setInfo({ ...info, description: e.target.value })} /></Row>
				<Row label="Project type" sub="Software projects add backlog, sprints and roadmap tabs">
					<Select value={info.kind} onChange={(e) => setInfo({ ...info, kind: e.target.value as Project['kind'] })} className="sm:w-[260px]">
						<option value="service">Service desk</option>
						<option value="software">Software delivery</option>
					</Select>
				</Row>
				<Row label="Project lead" sub="Always a project admin">
					<Select value={info.leadId} onChange={(e) => setInfo({ ...info, leadId: e.target.value })} className="sm:w-[260px]">
						{members.map((m) => <option key={m!.id} value={m!.id}>{m!.name} · {m!.role}</option>)}
					</Select>
				</Row>
				<Row label="Colour" sub="Used for the project avatar and calendar bands">
					<div className="flex flex-wrap items-center gap-2">
						{swatches.map((c) => (
							<button key={c} type="button" onClick={() => setInfo({ ...info, color: c })} aria-label={`Colour ${c}`} aria-pressed={info.color === c} className={cn('size-7 rounded-full ring-2 ring-offset-2 transition-transform hover:scale-110', info.color === c ? 'ring-brand-900' : 'ring-transparent')} style={{ background: c }} />
						))}
						<span className="ms-2 grid size-9 place-items-center rounded-[8px] text-xs font-bold text-white" style={{ background: info.color }}>{project.key.slice(0, 2)}</span>
					</div>
				</Row>
			</SectionCard>

			<SectionCard title="Defaults & capacity" sub="Applied to new issues and used by the Workload and Calendar views.">
				<Row label="Default assignee" sub="When an issue is created without one">
					<Select value={draft.defaultAssignee} onChange={(e) => patch({ defaultAssignee: e.target.value as typeof draft.defaultAssignee })} className="sm:w-[260px]">
						<option value="unassigned">Leave unassigned</option>
						<option value="lead">Project lead</option>
						<option value="round-robin">Round-robin across members</option>
					</Select>
				</Row>
				<Row label="Visibility">
					<Select value={draft.visibility} onChange={(e) => patch({ visibility: e.target.value as typeof draft.visibility })} className="sm:w-[260px]">
						<option value="org">Everyone in the workspace</option>
						<option value="private">Project members only</option>
					</Select>
				</Row>
				<Row label="Working week" sub="Capacity in Workload = days × focus hours">
					<div className="flex flex-wrap items-center gap-3 text-[13px]">
						<Select value={draft.workingDays} onChange={(e) => patch({ workingDays: Number(e.target.value) })} className="w-[150px]" aria-label="Working days per week">
							<option value={5}>5 days (Mon–Fri)</option>
							<option value={6}>6 days (Mon–Sat)</option>
						</Select>
						<span>×</span>
						<Input type="number" min={1} max={12} value={draft.focusHoursPerDay} onChange={(e) => patch({ focusHoursPerDay: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })} className="w-[90px]" aria-label="Focus hours per day" />
						<span className="text-t2">focus hours per day = <b className="text-t1">{draft.workingDays * draft.focusHoursPerDay}h</b> per member per week</span>
					</div>
				</Row>
				<Row label="Week starts on">
					<Select value={draft.startDay} onChange={(e) => patch({ startDay: e.target.value as typeof draft.startDay })} className="sm:w-[200px]">
						<option value="monday">Monday</option>
						<option value="sunday">Sunday</option>
					</Select>
				</Row>
				<Row label="Client portal" sub="Clients see issues they reported and their status">
					<div className="flex items-center gap-3"><Switch on={draft.clientVisible} onChange={(v) => patch({ clientVisible: v })} label="Visible in client portal" /><span className="text-[13px]">{draft.clientVisible ? 'Visible to clients' : 'Internal only'}</span></div>
				</Row>
				<SaveBar dirty={dirty || infoDirty} onSave={onSave} onDiscard={onDiscard} />
			</SectionCard>
		</div>
	);
}

export function DangerSection({ project, orgSlug }: { project: Project; orgSlug: string }) {
	const actions = useProjectActions(orgSlug);
	const ticketCount = useProjectTicketCount(project);
	const navigate = useNavigate();
	const [confirm, setConfirm] = useState(false);
	const [typed, setTyped] = useState('');

	const toggleArchive = async () => {
		if (!(await actions.setArchived(project, !project.archived))) return;
		toast(project.archived ? `${project.name} restored` : `${project.name} archived`, { tone: 'success', description: project.archived ? 'It is back in the project directory.' : 'Hidden from directories; issues stay readable.' });
	};
	const remove = async () => {
		if (!(await actions.remove(project))) return;
		setConfirm(false);
		toast(`${project.name} deleted`, { tone: 'success', description: `${ticketCount} issues removed · logged to audit.` });
		navigate({ to: '/$org/projects', params: { org: orgSlug }, search: {} });
	};

	return (
		<SectionCard title="Danger zone" sub="These actions affect everyone on the project. They are logged to the audit trail." className="border-danger/40">
			<Row label={project.archived ? 'Restore project' : 'Archive project'} sub={project.archived ? 'Bring it back to the directory and boards' : 'Read-only; hidden from directories and the command palette'}>
				<Button onClick={() => void toggleArchive()}>{project.archived ? <><ArchiveRestore size={15} aria-hidden /> Restore</> : <><Archive size={15} aria-hidden /> Archive</>}</Button>
			</Row>
			<Row label="Delete project" sub={`Permanently removes ${project.name} and its ${ticketCount} issues, comments and attachments.`}>
				<Button variant="danger" onClick={() => { setTyped(''); setConfirm(true); }}><Trash2 size={15} aria-hidden /> Delete project</Button>
			</Row>

			<Dialog open={confirm} onClose={() => setConfirm(false)} title="Delete this project?" width="max-w-[480px]" footer={<><Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button><Button variant="danger" disabled={typed.trim().toUpperCase() !== project.key} onClick={() => void remove()}>Delete {project.key}</Button></>}>
				<div className="flex items-start gap-3 rounded-md bg-danger-bg p-3 text-[13px] text-danger-fg"><AlertTriangle size={16} className="mt-0.5 shrink-0" /> This cannot be undone. Client-facing links to {project.key} issues will stop working and SLA history will be lost.</div>
				<label className="mt-4 block text-[13px]">Type <b className="font-mono">{project.key}</b> to confirm<Input value={typed} onChange={(e) => setTyped(e.target.value)} className="mt-1.5 font-mono" autoFocus /></label>
			</Dialog>
		</SectionCard>
	);
}
