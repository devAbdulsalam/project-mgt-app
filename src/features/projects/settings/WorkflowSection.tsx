import { useMemo, useState } from 'react';
import { ArrowRight, FlaskConical, Plus, Trash2 } from 'lucide-react';
import { Button, Card, Checkbox, Dialog, Input, Menu, Pill, Select, StatusPill } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { toast } from '@/shared/lib/toast-store';
import { allStatuses, statusCategory } from '@/mocks/seed';
import type { Project, Status, StatusCategory, WorkflowStatus, WorkflowTransition } from '@/mocks/types';
import { Row, SaveBar } from './shared';
import { useSectionDraft } from './hooks';
import { postFunctionCatalog, roleOptions, transitionId, transitionName, validatorCatalog } from './model';

type Sel = { kind: 'status'; id: Status } | { kind: 'transition'; id: string } | undefined;

const NODE_W = 176;
const NODE_H = 58;
const COL_GAP = 96;
const ROW_GAP = 34;
const PAD = 24;
const categoryLabel: Record<StatusCategory, string> = { todo: 'To do', inprogress: 'In progress', done: 'Done' };

function dotColor(s: WorkflowStatus) {
	if (s.category === 'todo') return '#2b5aa0';
	if (s.category === 'done') return '#22a05b';
	if (s.status === 'Blocked') return '#d93f3f';
	if (s.status === 'In review') return '#6b3fa0';
	if (s.status === 'Waiting on client' || s.status === 'Awaiting vendor') return '#b45309';
	return '#3b5baa';
}

function useDiagram(statuses: WorkflowStatus[], transitions: WorkflowTransition[]) {
	return useMemo(() => {
		const cols: StatusCategory[] = ['todo', 'inprogress', 'done'];
		const pos = new Map<Status, { x: number; y: number }>();
		cols.forEach((c, ci) => statuses.filter((s) => s.category === c).forEach((s, ri) => pos.set(s.status, { x: PAD + ci * (NODE_W + COL_GAP), y: PAD + ri * (NODE_H + ROW_GAP) })));
		const rows = Math.max(1, ...cols.map((c) => statuses.filter((s) => s.category === c).length));
		const baseY = PAD + rows * NODE_H + (rows - 1) * ROW_GAP;
		type Edge = { t: WorkflowTransition; d: string; lx: number; ly: number; dashed: boolean };
		const edges: Edge[] = [];
		let maxY = baseY;
		let back = 0;
		for (const t of transitions) {
			const a = pos.get(t.from);
			const b = pos.get(t.to);
			if (!a || !b) continue;
			if (b.x > a.x) {
				const ax = a.x + NODE_W, ay = a.y + NODE_H / 2, bx = b.x, by = b.y + NODE_H / 2, mx = (ax + bx) / 2;
				const k = 0.32, ease = 3 * k * k - 2 * k * k * k;
				edges.push({ t, d: `M${ax},${ay} C${mx},${ay} ${mx},${by} ${bx},${by}`, lx: ax + (bx - ax) * k, ly: ay + (by - ay) * ease - 7, dashed: false });
			} else if (b.x === a.x) {
				const ax = a.x + NODE_W, ay = a.y + NODE_H / 2, by = b.y + NODE_H / 2, cx = ax + 44;
				edges.push({ t, d: `M${ax},${ay} C${cx},${ay} ${cx},${by} ${ax},${by}`, lx: cx + 2, ly: (ay + by) / 2 + 4, dashed: false });
			} else {
				back += 1;
				const sx = a.x + NODE_W / 2, sy = a.y + NODE_H, ex = b.x + NODE_W / 2, ey = b.y + NODE_H, yy = baseY + 18 + back * 20;
				maxY = Math.max(maxY, yy + 10);
				edges.push({ t, d: `M${sx},${sy} L${sx},${yy} L${ex},${yy} L${ex},${ey}`, lx: (sx + ex) / 2, ly: yy - 6, dashed: true });
			}
		}
		return { pos, edges, width: PAD * 2 + 3 * NODE_W + 2 * COL_GAP, height: maxY + PAD };
	}, [statuses, transitions]);
}

export function WorkflowSection({ project }: { project: Project }) {
	const { draft, setDraft, dirty, discard, commit } = useSectionDraft(project, 'workflow');
	const [sel, setSel] = useState<Sel>();
	const [adding, setAdding] = useState(false);
	const [newT, setNewT] = useState<{ from: Status; to: Status; name: string }>({ from: 'Open', to: 'In progress', name: 'Start work' });
	const diagram = useDiagram(draft.statuses, draft.transitions);

	const used = new Set(draft.statuses.map((s) => s.status));
	const unused = allStatuses.filter((s) => !used.has(s));
	const patch = (p: Partial<typeof draft>) => setDraft({ ...draft, ...p });
	const selTransition = sel?.kind === 'transition' ? draft.transitions.find((t) => t.id === sel.id) : undefined;
	const selStatus = sel?.kind === 'status' ? draft.statuses.find((s) => s.status === sel.id) : undefined;

	const addStatus = (s: Status) => { patch({ statuses: [...draft.statuses, { status: s, category: statusCategory[s] }] }); setSel({ kind: 'status', id: s }); };
	const updateStatus = (s: Status, p: Partial<WorkflowStatus>) => patch({ statuses: draft.statuses.map((x) => (x.status === s ? { ...x, ...p } : x)) });
	const removeStatus = (s: Status) => {
		if (draft.statuses.length <= 2) return toast('A workflow needs at least two statuses', { tone: 'danger' });
		patch({ statuses: draft.statuses.filter((x) => x.status !== s), transitions: draft.transitions.filter((t) => t.from !== s && t.to !== s) });
		setSel(undefined);
	};
	const updateTransition = (id: string, p: Partial<WorkflowTransition>) => patch({ transitions: draft.transitions.map((t) => (t.id === id ? { ...t, ...p } : t)) });
	const removeTransition = (id: string) => { patch({ transitions: draft.transitions.filter((t) => t.id !== id) }); setSel(undefined); };
	const addTransition = () => {
		const id = transitionId(newT.from, newT.to);
		if (newT.from === newT.to) return toast('Pick two different statuses', { tone: 'danger' });
		if (draft.transitions.some((t) => t.id === id)) return toast('That transition already exists', { tone: 'danger' });
		patch({ transitions: [...draft.transitions, { id, from: newT.from, to: newT.to, name: newT.name || transitionName(newT.from, newT.to), roles: roleOptions[0]!, validators: [], postFunctions: [] }] });
		setAdding(false);
		setSel({ kind: 'transition', id });
	};
	const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
	const publish = () => {
		commit({ ...draft, publishedAt: Date.now() });
		toast('Workflow published', { tone: 'success', description: `${draft.statuses.length} statuses · ${draft.transitions.length} transitions now apply to new moves.` });
	};

	return (
		<div className="space-y-4">
			<Card className="flex flex-wrap items-center gap-2 p-3">
				<Input value={draft.name} onChange={(e) => patch({ name: e.target.value })} className="w-[200px] font-semibold" aria-label="Workflow name" />
				<Menu
					items={unused.map((s) => ({ key: s, label: s, hint: categoryLabel[statusCategory[s]], onSelect: () => addStatus(s) }))}
					trigger={({ toggle, buttonProps }) => <Button onClick={toggle} disabled={!unused.length} {...buttonProps}><Plus size={15} aria-hidden /> Status</Button>}
				/>
				<Button onClick={() => { setNewT({ from: draft.statuses[0]!.status, to: draft.statuses[1]!.status, name: transitionName(draft.statuses[0]!.status, draft.statuses[1]!.status) }); setAdding(true); }}><ArrowRight size={15} aria-hidden /> Transition</Button>
				<div className="ms-auto flex items-center gap-2">
					{dirty ? <span className="rounded-full bg-warning-bg px-2.5 py-0.5 text-xs font-medium text-warning-fg">● Unpublished changes</span> : <span className="text-xs text-t3">Published {draft.publishedAt ? new Date(draft.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</span>}
					<Button variant="ghost" onClick={() => { discard(); setSel(undefined); }} disabled={!dirty}>Discard</Button>
					<Button variant="primary" onClick={publish} disabled={!dirty}>Publish</Button>
				</div>
			</Card>

			<div className="grid grid-cols-[minmax(0,1fr)] gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
				<div className="min-w-0 space-y-4">
					<Card className="overflow-x-auto bg-[radial-gradient(circle,#dfe3e8_1px,transparent_1px)] bg-[length:18px_18px] p-2">
						<svg viewBox={`0 0 ${diagram.width} ${diagram.height}`} preserveAspectRatio="xMinYMin meet" role="img" aria-label={`${draft.name} workflow diagram`} style={{ width: '100%', height: 'auto', minWidth: 560, maxWidth: diagram.width * 1.15 }}>
							<defs>
								<marker id="wf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#8a97a0" /></marker>
								<marker id="wf-arrow-sel" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#2e6f86" /></marker>
							</defs>
							{diagram.edges.map(({ t, d, lx, ly, dashed }) => {
								const active = sel?.kind === 'transition' && sel.id === t.id;
								return (
									<g key={t.id} className="cursor-pointer" onClick={() => setSel({ kind: 'transition', id: t.id })} role="button" tabIndex={0} aria-label={`Transition ${t.name}: ${t.from} to ${t.to}`} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel({ kind: 'transition', id: t.id }); } }}>
										<path d={d} fill="none" stroke="transparent" strokeWidth={14} />
										<path d={d} fill="none" stroke={active ? '#2e6f86' : '#9aa5ad'} strokeWidth={active ? 2.5 : 1.5} strokeDasharray={dashed ? '5 4' : undefined} markerEnd={active ? 'url(#wf-arrow-sel)' : 'url(#wf-arrow)'} />
										<text x={lx} y={ly} textAnchor="middle" fontSize={11} fill={active ? '#2e6f86' : '#5f6e78'} fontWeight={active ? 600 : 400} style={{ paintOrder: 'stroke' }} stroke="#fff" strokeWidth={4}>{t.name}</text>
									</g>
								);
							})}
							{draft.statuses.map((s) => {
								const p = diagram.pos.get(s.status)!;
								const active = sel?.kind === 'status' && sel.id === s.status;
								const sub = s.wipLimit ? `WIP limit ${s.wipLimit}` : s.note ?? `Category: ${categoryLabel[s.category]}`;
								return (
									<g key={s.status} transform={`translate(${p.x},${p.y})`} className="cursor-pointer" onClick={() => setSel({ kind: 'status', id: s.status })} role="button" tabIndex={0} aria-label={`Status ${s.status}`} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel({ kind: 'status', id: s.status }); } }}>
										<rect width={NODE_W} height={NODE_H} rx={10} fill="#fff" stroke={active ? '#2e6f86' : '#cbd2d9'} strokeWidth={active ? 2 : 1} />
										<circle cx={18} cy={21} r={4} fill={dotColor(s)} />
										<text x={30} y={25} fontSize={13} fontWeight={600} fill="#1b2a32">{s.status}</text>
										<text x={16} y={45} fontSize={11} fill="#5f6e78">{sub}</text>
									</g>
								);
							})}
						</svg>
					</Card>

					<Card className="overflow-x-auto">
						<table className="w-full min-w-[720px] text-[13px]">
							<thead><tr className="bg-muted text-left text-[11px] font-semibold tracking-wider text-t2 uppercase"><th className="px-4 py-2.5">Status</th><th className="px-3 py-2.5">Category</th><th className="px-3 py-2.5">WIP limit</th><th className="px-3 py-2.5">Note</th><th className="px-3 py-2.5 text-right">Transitions</th><th className="w-10" /></tr></thead>
							<tbody>
								{draft.statuses.map((s) => (
									<tr key={s.status} className={cn('border-t border-border', sel?.kind === 'status' && sel.id === s.status && 'bg-brand-100/30')}>
										<td className="px-4 py-2 whitespace-nowrap"><button type="button" onClick={() => setSel({ kind: 'status', id: s.status })} className="flex items-center gap-2 font-medium hover:underline"><span className="size-2 rounded-full" style={{ background: dotColor(s) }} />{s.status}</button></td>
										<td className="px-3 py-2"><Select value={s.category} onChange={(e) => updateStatus(s.status, { category: e.target.value as StatusCategory })} className="h-8 w-[130px] text-xs"><option value="todo">To do</option><option value="inprogress">In progress</option><option value="done">Done</option></Select></td>
										<td className="px-3 py-2"><Input type="number" min={0} value={s.wipLimit ?? ''} placeholder="—" onChange={(e) => updateStatus(s.status, { wipLimit: e.target.value ? Number(e.target.value) : undefined })} className="h-8 w-[80px] text-xs" aria-label={`WIP limit for ${s.status}`} /></td>
										<td className="px-3 py-2"><Input value={s.note ?? ''} placeholder="Optional" onChange={(e) => updateStatus(s.status, { note: e.target.value || undefined })} className="h-8 text-xs" aria-label={`Note for ${s.status}`} /></td>
										<td className="tabular px-3 py-2 text-right text-t2">{draft.transitions.filter((t) => t.from === s.status).length} out · {draft.transitions.filter((t) => t.to === s.status).length} in</td>
										<td className="px-2 py-2"><Button variant="ghost" size="sm" iconOnly onClick={() => removeStatus(s.status)} aria-label={`Remove ${s.status}`}><Trash2 size={14} /></Button></td>
									</tr>
								))}
							</tbody>
						</table>
					</Card>
				</div>

				<Card className="self-start p-5 2xl:sticky 2xl:top-4">
					{selTransition ? (
						<>
							<div className="text-[11px] font-semibold tracking-wider text-t2 uppercase">Transition</div>
							<div className="mt-2 flex items-center gap-2"><StatusPill status={selTransition.from} /><ArrowRight size={14} className="text-t3" /><StatusPill status={selTransition.to} /></div>
							<Row label="Name" stacked><Input value={selTransition.name} onChange={(e) => updateTransition(selTransition.id, { name: e.target.value })} /></Row>
							<Row label="Who can perform" stacked><Select value={selTransition.roles} onChange={(e) => updateTransition(selTransition.id, { roles: e.target.value })}>{roleOptions.map((r) => <option key={r}>{r}</option>)}</Select></Row>
							<Row label="Validators" sub="Must pass before the move" stacked>
								<div className="space-y-1.5">{validatorCatalog.map((v) => <Checkbox key={v} label={v} checked={selTransition.validators.includes(v)} onChange={() => updateTransition(selTransition.id, { validators: toggleIn(selTransition.validators, v) })} />)}</div>
							</Row>
							<Row label="Post-functions" sub="Run after the move" stacked>
								<div className="space-y-1.5">{postFunctionCatalog.map((v) => <Checkbox key={v} label={v} checked={selTransition.postFunctions.includes(v)} onChange={() => updateTransition(selTransition.id, { postFunctions: toggleIn(selTransition.postFunctions, v) })} />)}</div>
							</Row>
							<div className="mt-4 flex items-center justify-between">
								<Button variant="ghost" className="text-danger" onClick={() => removeTransition(selTransition.id)}><Trash2 size={14} aria-hidden /> Delete</Button>
								<Button onClick={() => toast(`Test passed for “${selTransition.name}”`, { tone: 'success', description: `${selTransition.validators.length} validators evaluated · ${selTransition.postFunctions.length} post-functions would run.` })}><FlaskConical size={14} aria-hidden /> Test transition</Button>
							</div>
						</>
					) : selStatus ? (
						<>
							<div className="text-[11px] font-semibold tracking-wider text-t2 uppercase">Status</div>
							<div className="mt-2 flex items-center gap-2"><StatusPill status={selStatus.status} /><Pill tone="closed">{categoryLabel[selStatus.category]}</Pill></div>
							<Row label="Category" sub="Drives burndown, cycle time and the Done rollup" stacked><Select value={selStatus.category} onChange={(e) => updateStatus(selStatus.status, { category: e.target.value as StatusCategory })}><option value="todo">To do</option><option value="inprogress">In progress</option><option value="done">Done</option></Select></Row>
							<Row label="WIP limit" sub="Board column turns amber when exceeded" stacked><Input type="number" min={0} value={selStatus.wipLimit ?? ''} placeholder="No limit" onChange={(e) => updateStatus(selStatus.status, { wipLimit: e.target.value ? Number(e.target.value) : undefined })} /></Row>
							<Row label="Note" stacked><Input value={selStatus.note ?? ''} placeholder="e.g. Requires reason" onChange={(e) => updateStatus(selStatus.status, { note: e.target.value || undefined })} /></Row>
							<ul className="mt-3 space-y-1 text-[12px] text-t2">
								{draft.transitions.filter((t) => t.from === selStatus.status).map((t) => <li key={t.id}><button type="button" onClick={() => setSel({ kind: 'transition', id: t.id })} className="hover:underline">{t.name} → {t.to}</button></li>)}
							</ul>
							<Button variant="ghost" className="mt-4 text-danger" onClick={() => removeStatus(selStatus.status)}><Trash2 size={14} aria-hidden /> Remove from workflow</Button>
						</>
					) : (
						<div className="py-8 text-center text-[13px] text-t3">Select a status or a transition on the diagram to edit it.<div className="mt-3 text-xs">Dashed arrows go backwards (reopen, request changes).</div></div>
					)}
				</Card>
			</div>

			<SaveBar dirty={dirty} onSave={publish} onDiscard={() => { discard(); setSel(undefined); }} saveLabel="Publish workflow" className="2xl:hidden" />

			<Dialog open={adding} onClose={() => setAdding(false)} title="Add transition" width="max-w-[460px]" footer={<><Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button><Button variant="primary" onClick={addTransition}>Add transition</Button></>}>
				<div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
					<label className="text-[13px]">From<Select value={newT.from} onChange={(e) => { const from = e.target.value as Status; setNewT({ ...newT, from, name: transitionName(from, newT.to) }); }} className="mt-1">{draft.statuses.map((s) => <option key={s.status}>{s.status}</option>)}</Select></label>
					<ArrowRight size={16} className="mb-3 text-t3" />
					<label className="text-[13px]">To<Select value={newT.to} onChange={(e) => { const to = e.target.value as Status; setNewT({ ...newT, to, name: transitionName(newT.from, to) }); }} className="mt-1">{draft.statuses.map((s) => <option key={s.status}>{s.status}</option>)}</Select></label>
				</div>
				<label className="mt-4 block text-[13px]">Button label<Input value={newT.name} onChange={(e) => setNewT({ ...newT, name: e.target.value })} className="mt-1" /></label>
			</Dialog>
		</div>
	);
}
