import { useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, Card, Checkbox, Dialog, Input, LabelChip, Pill, Select, Switch, Textarea, TypeDot, typeMeta } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { toast } from '@/shared/lib/toast-store';
import type { BoardConfig, CustomField, FieldType, Priority, Project, Status, TicketType } from '@/mocks/types';
import { SaveBar, SectionCard } from './shared';
import { useSectionDraft } from './hooks';
import { uid } from './model';

const fieldTypeLabel: Record<FieldType, string> = { text: 'Text', number: 'Number', select: 'Dropdown', date: 'Date', user: 'User picker', checkbox: 'Checkbox' };
const allTypes: TicketType[] = ['task', 'bug', 'story', 'epic', 'subtask', 'support'];
const emptyField: CustomField = { id: '', name: '', type: 'text', required: false, appliesTo: ['task'], options: [] };

// ---------------- Fields ----------------

export function FieldsSection({ project }: { project: Project }) {
	const { draft, setDraft, dirty, save, discard } = useSectionDraft(project, 'fields');
	const [editing, setEditing] = useState<CustomField>();

	const move = (i: number, dir: -1 | 1) => {
		const next = [...draft];
		const j = i + dir;
		if (j < 0 || j >= next.length) return;
		[next[i], next[j]] = [next[j]!, next[i]!];
		setDraft(next);
	};
	const upsert = (f: CustomField) => {
		setDraft(draft.some((x) => x.id === f.id) ? draft.map((x) => (x.id === f.id ? f : x)) : [...draft, f]);
		setEditing(undefined);
	};

	return (
		<SectionCard title="Custom fields" sub="Extra fields shown on the create dialog and ticket detail, per issue type." action={<Button variant="primary" onClick={() => setEditing({ ...emptyField, id: uid('f') })}><Plus size={15} aria-hidden /> Add field</Button>}>
			{draft.length === 0 ? <p className="py-6 text-center text-[13px] text-t3">No custom fields yet.</p> : null}
			<ul className="divide-y divide-border">
				{draft.map((f, i) => (
					<li key={f.id} className="flex flex-wrap items-center gap-3 py-3 text-[13px]">
						<div className="min-w-[180px] flex-1">
							<b>{f.name || 'Untitled field'}</b>{f.description ? <span className="ms-2 text-xs text-t2">{f.description}</span> : null}
							<div className="mt-1 flex flex-wrap items-center gap-1.5"><Pill tone="teal">{fieldTypeLabel[f.type]}</Pill>{f.type === 'select' ? <span className="text-xs text-t2">{(f.options ?? []).join(' · ')}</span> : null}</div>
						</div>
						<div className="flex flex-wrap gap-1">{f.appliesTo.map((t) => <LabelChip key={t}>{typeMeta[t].label}</LabelChip>)}</div>
						<label className="flex items-center gap-2 text-xs text-t2"><Switch size="sm" on={f.required} onChange={(v) => setDraft(draft.map((x) => (x.id === f.id ? { ...x, required: v } : x)))} label={`${f.name} required`} />Required</label>
						<div className="flex items-center gap-0.5">
							<Button variant="ghost" size="sm" iconOnly onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><ArrowUp size={14} /></Button>
							<Button variant="ghost" size="sm" iconOnly onClick={() => move(i, 1)} disabled={i === draft.length - 1} aria-label="Move down"><ArrowDown size={14} /></Button>
							<Button variant="ghost" size="sm" iconOnly onClick={() => setEditing(f)} aria-label={`Edit ${f.name}`}><Pencil size={14} /></Button>
							<Button variant="ghost" size="sm" iconOnly onClick={() => setDraft(draft.filter((x) => x.id !== f.id))} aria-label={`Delete ${f.name}`}><Trash2 size={14} /></Button>
						</div>
					</li>
				))}
			</ul>
			<SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
			{editing ? <FieldDialog field={editing} onClose={() => setEditing(undefined)} onSave={upsert} /> : null}
		</SectionCard>
	);
}

function FieldDialog({ field, onClose, onSave }: { field: CustomField; onClose: () => void; onSave: (f: CustomField) => void }) {
	const [f, setF] = useState(field);
	const [options, setOptions] = useState((field.options ?? []).join(', '));
	const valid = f.name.trim().length > 0 && f.appliesTo.length > 0 && (f.type !== 'select' || options.trim().length > 0);
	return (
		<Dialog open onClose={onClose} title={field.name ? `Edit “${field.name}”` : 'New field'} width="max-w-[520px]" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!valid} onClick={() => onSave({ ...f, name: f.name.trim(), options: f.type === 'select' ? options.split(',').map((s) => s.trim()).filter(Boolean) : undefined })}>Save field</Button></>}>
			<div className="grid gap-4 sm:grid-cols-2">
				<label className="text-[13px] sm:col-span-2">Name<Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="mt-1" autoFocus /></label>
				<label className="text-[13px]">Type<Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as FieldType })} className="mt-1">{(Object.keys(fieldTypeLabel) as FieldType[]).map((t) => <option key={t} value={t}>{fieldTypeLabel[t]}</option>)}</Select></label>
				<label className="text-[13px]">Description<Input value={f.description ?? ''} onChange={(e) => setF({ ...f, description: e.target.value || undefined })} className="mt-1" placeholder="Shown as a hint" /></label>
				{f.type === 'select' ? <label className="text-[13px] sm:col-span-2">Options <span className="text-t2">(comma separated)</span><Input value={options} onChange={(e) => setOptions(e.target.value)} className="mt-1" placeholder="Production, Staging, Local" /></label> : null}
				<div className="sm:col-span-2">
					<div className="text-[13px]">Applies to</div>
					<div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">{allTypes.map((t) => <Checkbox key={t} label={typeMeta[t].label} checked={f.appliesTo.includes(t)} onChange={(e) => setF({ ...f, appliesTo: e.target.checked ? [...f.appliesTo, t] : f.appliesTo.filter((x) => x !== t) })} />)}</div>
				</div>
				<Checkbox label="Required when creating an issue" checked={f.required} onChange={(e) => setF({ ...f, required: e.target.checked })} />
			</div>
		</Dialog>
	);
}

// ---------------- Boards ----------------

export function BoardsSection({ project }: { project: Project }) {
	const { settings, draft, setDraft, dirty, save, discard } = useSectionDraft(project, 'boards');
	const [adding, setAdding] = useState(false);
	const [nb, setNb] = useState<{ name: string; type: BoardConfig['type']; swimlane: BoardConfig['swimlane'] }>({ name: '', type: 'kanban', swimlane: 'none' });
	const statuses = settings.workflow.statuses;

	const patchBoard = (id: string, p: Partial<BoardConfig>) => setDraft(draft.map((b) => (b.id === id ? { ...b, ...p } : b)));
	const patchCol = (b: BoardConfig, colId: string, p: Partial<BoardConfig['columns'][number]>) => patchBoard(b.id, { columns: b.columns.map((c) => (c.id === colId ? { ...c, ...p } : c)) });
	const addBoard = () => {
		const byCat = (cat: 'todo' | 'inprogress' | 'done') => statuses.filter((s) => s.category === cat).map((s) => s.status);
		setDraft([...draft, { id: uid('b'), name: nb.name.trim() || 'New board', type: nb.type, swimlane: nb.swimlane, isDefault: draft.length === 0, columns: [{ id: uid('c'), name: 'To do', statuses: byCat('todo') }, { id: uid('c'), name: 'In progress', statuses: byCat('inprogress') }, { id: uid('c'), name: 'Done', statuses: byCat('done') }] }]);
		setAdding(false);
		setNb({ name: '', type: 'kanban', swimlane: 'none' });
	};

	return (
		<SectionCard title="Boards" sub="Map workflow statuses onto columns. The default board opens from the project tabs." action={<Button variant="primary" onClick={() => setAdding(true)}><Plus size={15} aria-hidden /> Add board</Button>}>
			<div className="space-y-4">
				{draft.map((b) => {
					const usedHere = new Set(b.columns.flatMap((c) => c.statuses));
					return (
						<Card key={b.id} className="p-4">
							<div className="flex flex-wrap items-center gap-2">
								<Input value={b.name} onChange={(e) => patchBoard(b.id, { name: e.target.value })} className="w-[220px] font-semibold" aria-label="Board name" />
								<Pill tone={b.type === 'scrum' ? 'review' : 'teal'}>{b.type === 'scrum' ? 'Scrum' : 'Kanban'}</Pill>
								{b.isDefault ? <Pill tone="done">Default</Pill> : <Button size="sm" variant="ghost" onClick={() => setDraft(draft.map((x) => ({ ...x, isDefault: x.id === b.id })))}>Make default</Button>}
								<div className="ms-auto flex items-center gap-2 text-xs text-t2">
									Swimlanes
									<Select value={b.swimlane} onChange={(e) => patchBoard(b.id, { swimlane: e.target.value as BoardConfig['swimlane'] })} className="h-8 w-[130px] text-xs" aria-label="Swimlanes"><option value="none">None</option><option value="assignee">Assignee</option><option value="epic">Epic</option><option value="priority">Priority</option></Select>
									<Button variant="ghost" size="sm" iconOnly disabled={draft.length === 1} onClick={() => setDraft(draft.filter((x) => x.id !== b.id).map((x, i) => ({ ...x, isDefault: b.isDefault ? i === 0 : x.isDefault })))} aria-label={`Delete ${b.name}`}><Trash2 size={14} /></Button>
								</div>
							</div>
							<div className="mt-3 flex gap-3 overflow-x-auto pb-1">
								{b.columns.map((c) => {
									const free = statuses.filter((s) => !usedHere.has(s.status));
									return (
										<div key={c.id} className="w-[210px] shrink-0 rounded-md bg-muted p-2.5">
											<div className="flex items-center gap-1">
												<Input value={c.name} onChange={(e) => patchCol(b, c.id, { name: e.target.value })} className="h-8 bg-white text-xs font-semibold" aria-label="Column name" />
												<Button variant="ghost" size="sm" iconOnly disabled={b.columns.length <= 2} onClick={() => patchBoard(b.id, { columns: b.columns.filter((x) => x.id !== c.id) })} aria-label={`Remove column ${c.name}`}><Trash2 size={13} /></Button>
											</div>
											<div className="mt-2 flex min-h-[28px] flex-wrap gap-1">
												{c.statuses.map((s) => <LabelChip key={s} onRemove={() => patchCol(b, c.id, { statuses: c.statuses.filter((x) => x !== s) })}>{s}</LabelChip>)}
											</div>
											<Select value="" onChange={(e) => { if (e.target.value) patchCol(b, c.id, { statuses: [...c.statuses, e.target.value as Status] }); }} className="mt-1.5 h-8 bg-white text-xs" aria-label={`Add status to ${c.name}`} disabled={!free.length}>
												<option value="">{free.length ? '+ Add status' : 'All statuses mapped'}</option>
												{free.map((s) => <option key={s.status} value={s.status}>{s.status}</option>)}
											</Select>
											<label className="mt-2 flex items-center gap-2 text-xs text-t2">WIP limit<Input type="number" min={0} value={c.wip ?? ''} placeholder="—" onChange={(e) => patchCol(b, c.id, { wip: e.target.value ? Number(e.target.value) : undefined })} className="h-7 w-[64px] bg-white text-xs" /></label>
										</div>
									);
								})}
								<button type="button" onClick={() => patchBoard(b.id, { columns: [...b.columns, { id: uid('c'), name: 'New column', statuses: [] }] })} className="grid w-[120px] shrink-0 place-items-center rounded-md border border-dashed border-border-strong text-xs text-t2 hover:bg-muted"><span className="flex items-center gap-1"><Plus size={13} /> Column</span></button>
							</div>
							{statuses.filter((s) => !usedHere.has(s.status)).length ? <p className="mt-2 text-xs text-warning-fg">Unmapped statuses won't appear on this board: {statuses.filter((s) => !usedHere.has(s.status)).map((s) => s.status).join(', ')}</p> : null}
						</Card>
					);
				})}
			</div>
			<SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
			<Dialog open={adding} onClose={() => setAdding(false)} title="New board" width="max-w-[440px]" footer={<><Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button><Button variant="primary" onClick={addBoard}>Create board</Button></>}>
				<label className="block text-[13px]">Name<Input value={nb.name} onChange={(e) => setNb({ ...nb, name: e.target.value })} className="mt-1" placeholder="e.g. Bug triage" autoFocus /></label>
				<div className="mt-3 grid grid-cols-2 gap-3">
					<label className="text-[13px]">Type<Select value={nb.type} onChange={(e) => setNb({ ...nb, type: e.target.value as BoardConfig['type'] })} className="mt-1"><option value="kanban">Kanban</option><option value="scrum">Scrum (sprint scoped)</option></Select></label>
					<label className="text-[13px]">Swimlanes<Select value={nb.swimlane} onChange={(e) => setNb({ ...nb, swimlane: e.target.value as BoardConfig['swimlane'] })} className="mt-1"><option value="none">None</option><option value="assignee">Assignee</option><option value="epic">Epic</option><option value="priority">Priority</option></Select></label>
				</div>
				<p className="mt-3 text-xs text-t2">Columns start from the workflow categories; adjust them after creating.</p>
			</Dialog>
		</SectionCard>
	);
}

// ---------------- Ticket types ----------------

export function TicketTypesSection({ project }: { project: Project }) {
	const { draft, setDraft, dirty, save, discard } = useSectionDraft(project, 'ticketTypes');
	const [open, setOpen] = useState<TicketType>();
	const enabledCount = draft.filter((t) => t.enabled).length;
	return (
		<SectionCard title="Ticket types" sub={`${enabledCount} of ${draft.length} types available on the create dialog. Templates prefill the description.`}>
			<ul className="divide-y divide-border">
				{draft.map((row) => (
					<li key={row.type} className="py-3">
						<div className="flex flex-wrap items-center gap-3 text-[13px]">
							<TypeDot type={row.type} />
							<b className="w-[130px]">{typeMeta[row.type].label}</b>
							<Switch on={row.enabled} onChange={(v) => { if (!v && enabledCount === 1) return toast('Keep at least one type enabled', { tone: 'danger' }); setDraft(draft.map((x) => (x.type === row.type ? { ...x, enabled: v } : x))); }} label={`${typeMeta[row.type].label} enabled`} />
							<span className={cn('text-xs', row.enabled ? 'text-t2' : 'text-t3')}>{row.enabled ? 'Enabled' : 'Hidden'}</span>
							<label className="ms-auto flex items-center gap-2 text-xs text-t2">Default priority
								<Select value={row.defaultPriority} onChange={(e) => setDraft(draft.map((x) => (x.type === row.type ? { ...x, defaultPriority: e.target.value as Priority } : x)))} className="h-8 w-[90px] text-xs" disabled={!row.enabled}>{(['P1', 'P2', 'P3', 'P4'] as const).map((p) => <option key={p}>{p}</option>)}</Select>
							</label>
							<Button variant="ghost" size="sm" onClick={() => setOpen(open === row.type ? undefined : row.type)} aria-expanded={open === row.type}>{row.template ? 'Edit template' : 'Add template'}</Button>
						</div>
						{open === row.type ? <Textarea rows={4} value={row.template} placeholder="Text that prefills the description for this type" onChange={(e) => setDraft(draft.map((x) => (x.type === row.type ? { ...x, template: e.target.value } : x)))} className="mt-2 font-mono text-xs" /> : null}
					</li>
				))}
			</ul>
			<SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
		</SectionCard>
	);
}
