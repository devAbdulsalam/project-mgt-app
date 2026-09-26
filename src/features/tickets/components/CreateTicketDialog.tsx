import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, ChevronDown, Paperclip, Shield, X } from 'lucide-react';
import { Button, Checkbox, Dialog, Field, Input, Kbd, LabelChip, Menu, ProgressBar, Select, Textarea } from '@/shared/ui';
import { typeMeta } from '@/shared/ui/meta';
import { priorityLabel } from '@/shared/ui/meta';
import { cn } from '@/shared/lib/cn';
import { fromDateInputValue } from '@/shared/lib/time';
import { clients, epics, team, useDb, type CreateTicketInput } from '@/mocks/db';
import { allPriorities } from '@/mocks/seed';
import { toast } from '@/shared/lib/toast-store';
import { formatBytes } from '../api/mapper';
import type { Impact, TicketType } from '@/mocks/types';
import { useActor } from '../hooks/useActor';
import { useAttachmentUploads } from '../hooks/useAttachmentUploads';

const impacts: Impact[] = ['S1 · Branch down', 'S2 · Degraded', 'S3 · Single user', 'S4 · Cosmetic'];
const types: TicketType[] = ['task', 'bug', 'story', 'epic', 'support'];

const templates: { id: string; name: string; values: Partial<FormValues> }[] = [
	{ id: 'none', name: 'No template', values: {} },
	{ id: 'vpn', name: 'VPN / connectivity', values: { type: 'support', priority: 'P2', impact: 'S2 · Degraded', labels: 'vpn', title: 'VPN drops for remote staff', description: 'Who is affected:\nSince when:\nNetwork / ISP:\n\nImpact: ' } },
	{ id: 'power', name: 'Power / UPS', values: { type: 'support', priority: 'P2', impact: 'S2 · Degraded', labels: 'power, ups', title: 'UPS not holding load during outage' } },
	{ id: 'onboard', name: 'New hire onboarding', values: { type: 'task', priority: 'P3', labels: 'onboarding', title: 'Onboard new hires', description: 'Number of users:\nStart date:\nDevices:\nLicences: ' } },
	{ id: 'bug', name: 'Software bug', values: { type: 'bug', priority: 'P3', description: 'Steps to reproduce:\n1.\n2.\n\nExpected:\nActual:' } },
];

const schema = z.object({
	type: z.enum(['task', 'bug', 'story', 'epic', 'subtask', 'support']),
	projectKey: z.string().min(1, 'Choose a project'),
	clientId: z.string().optional(),
	title: z.string().trim().min(4, 'Give the ticket a short summary').max(200),
	description: z.string().optional(),
	asset: z.string().optional(),
	impact: z.string().optional(),
	priority: z.enum(['P1', 'P2', 'P3', 'P4']),
	assigneeId: z.string().optional(),
	reporterName: z.string().optional(),
	labels: z.string().optional(),
	dueDate: z.string().optional(),
	sprint: z.string().optional(),
	epicId: z.string().optional(),
	storyPoints: z.string().optional(),
	createAnother: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

const DRAFT_KEY = 'ledgedesk.ticketDraft';

export function CreateTicketDialog({ open, onClose, onCreated, defaultProjectKey, defaults }: { open: boolean; onClose: () => void; onCreated?: (key: string) => void; defaultProjectKey?: string; defaults?: Partial<Pick<FormValues, 'clientId' | 'asset' | 'title' | 'priority' | 'type'>> }) {
	const actor = useActor();
	const allProjects = useDb((s) => s.projects);
	const projects = useMemo(() => allProjects.filter((p) => !p.archived), [allProjects]);
	const allTickets = useDb((s) => s.tickets);
	const createTicket = useDb((s) => s.createTicket);
	const [template, setTemplate] = useState('none');

	// Files upload as they are chosen, so the wait overlaps with typing the rest
	// of the form. On live data they are stored server-side and claimed by the
	// create call; on mock data they stay in the browser.
	const uploads = useAttachmentUploads('ticket_attachment');
	const [dragging, setDragging] = useState(false);

	const savedDraft = useMemo(() => {
		try {
			const raw = localStorage.getItem(DRAFT_KEY);
			return raw ? (JSON.parse(raw) as Partial<FormValues>) : undefined;
		} catch {
			/* storage unavailable */
			return undefined;
		}
	}, []);

	const form = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			type: defaultProjectKey && defaultProjectKey !== 'KS' ? 'task' : 'support',
			projectKey: defaultProjectKey ?? 'KS',
			priority: 'P3',
			title: '',
			description: '',
			labels: '',
			createAnother: false,
			...(savedDraft ?? {}),
			...(defaultProjectKey ? { projectKey: defaultProjectKey } : {}),
			...(defaults ?? {}),
		},
	});
	// Re-apply caller defaults whenever the dialog is opened for a new context (e.g. a different asset).
	const [prevDefaults, setPrevDefaults] = useState(defaults);
	if (prevDefaults !== defaults) {
		setPrevDefaults(defaults);
		if (defaults) Object.entries(defaults).forEach(([k, v]) => form.setValue(k as keyof FormValues, v as never));
	}
	const { register, control, handleSubmit, setValue, reset, formState } = form;
	const type = useWatch({ control, name: 'type' });
	const projectKey = useWatch({ control, name: 'projectKey' });
	const clientId = useWatch({ control, name: 'clientId' });
	const title = useWatch({ control, name: 'title' });
	const priority = useWatch({ control, name: 'priority' });
	const labels = useWatch({ control, name: 'labels' });
	const project = projects.find((p) => p.key === projectKey);
	const isService = project?.kind !== 'software';
	const client = clients.find((c) => c.id === clientId);

	// Duplicate detection on the summary
	const duplicate = useMemo(() => {
		const words = (title ?? '').toLowerCase().split(/\s+/).filter((w) => w.length > 3);
		if (words.length < 2) return undefined;
		return allTickets.find((t) => t.status !== 'Closed' && t.status !== 'Resolved' && words.filter((w) => t.title.toLowerCase().includes(w)).length >= Math.min(3, words.length));
	}, [title, allTickets]);

	// Suggested assignee: on-call for the client's region
	const suggested = useMemo(() => {
		if (!client) return undefined;
		const region = client.sites[0]?.split(' ')[0];
		return team.find((m) => m.role === 'Field engineer' && region && m.base.startsWith(region)) ?? team.find((m) => m.role === 'Support agent');
	}, [client]);

	// Draft autosave
	const values = useWatch({ control });
	useEffect(() => {
		if (!open || !formState.isDirty) return;
		try {
			localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
		} catch {
			/* storage unavailable */
		}
	}, [open, values, formState.isDirty]);

	const applyTemplate = (id: string) => {
		setTemplate(id);
		const t = templates.find((x) => x.id === id);
		if (!t) return;
		Object.entries(t.values).forEach(([k, v]) => setValue(k as keyof FormValues, v as never, { shouldDirty: true }));
	};

	const clearDraft = () => {
		try {
			localStorage.removeItem(DRAFT_KEY);
		} catch {
			/* storage unavailable */
		}
	};

	const submit = handleSubmit((v) => {
		// Submitting now would create the ticket without the file that is still
		// going out, and there would be nothing to tell the person so.
		if (uploads.uploading) {
			toast('Wait for the attachments to finish uploading.', { tone: 'danger' });
			return;
		}

		const input: CreateTicketInput = {
			projectKey: v.projectKey,
			title: v.title,
			type: v.type,
			priority: v.priority,
			channel: isService ? 'internal' : 'internal',
			clientId: isService ? v.clientId : undefined,
			site: client?.sites[0],
			assigneeId: v.assigneeId || undefined,
			reporterName: v.reporterName || undefined,
			reporterIsClient: !!v.reporterName && !!client,
			labels: (v.labels ?? '').split(',').map((s) => s.trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean),
			description: v.description,
			dueAt: fromDateInputValue(v.dueDate ?? ''),
			sprint: v.sprint || undefined,
			epicId: v.epicId || undefined,
			asset: v.asset || undefined,
			impact: (v.impact as Impact) || undefined,
			storyPoints: v.storyPoints ? Number(v.storyPoints) : undefined,
			category: v.asset ? `${typeMeta[v.type].label} · ${v.asset.split(' · ')[0]}` : typeMeta[v.type].label,
			attachments: uploads.attachments,
			// Ids of files already stored by the API. The create call claims them;
			// the mock store ignores them and keeps `attachments` above.
			attachmentIds: uploads.attachmentIds,
		};
		const created = createTicket(input, actor);
		clearDraft();
		toast(`${created.key} created`, { tone: 'success', description: created.title });
		if (v.createAnother) {
			reset({ ...v, title: '', description: '', createAnother: true });
			uploads.reset();
		} else {
			onCreated?.(created.key);
			onClose();
		}
	});

	const projectEpics = epics.filter((e) => e.projectKey === projectKey && e.status !== 'Done');

	return (
		<Dialog
			open={open}
			onClose={onClose}
			title="Create ticket"
			header={
				<>
					<Menu
						width="w-56"
						trigger={({ toggle, buttonProps }) => (
							<Button size="md" onClick={toggle} {...buttonProps}>
								Template: {templates.find((t) => t.id === template)?.name} <ChevronDown size={13} aria-hidden />
							</Button>
						)}
						items={templates.map((t) => ({ key: t.id, label: t.name, selected: t.id === template, onSelect: () => applyTemplate(t.id) }))}
					/>
					<span className="ms-auto hidden text-xs text-t3 sm:inline">{formState.isDirty ? 'Draft saved · just now' : savedDraft ? 'Draft restored' : ''}</span>
				</>
			}
			footer={
				<div className="flex flex-wrap items-center gap-3">
					<Checkbox label="Create another" {...register('createAnother')} />
					<div className="ms-auto flex items-center gap-2">
						<Button variant="ghost" onClick={onClose}>
							Cancel
						</Button>
						<Button
							onClick={() => {
								toast('Draft saved', { description: 'It will be restored next time you open Create ticket.' });
								onClose();
							}}
						>
							Save draft
						</Button>
						<Button variant="primary" onClick={submit} loading={formState.isSubmitting || uploads.uploading}>
							{uploads.uploading ? 'Uploading files…' : <>Create ticket <Kbd>⌘↵</Kbd></>}
						</Button>
					</div>
				</div>
			}
		>
			<form
				onSubmit={submit}
				onKeyDown={(e) => {
					if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
				}}
				className="grid lg:grid-cols-[1fr_340px]"
			>
				<div className="space-y-4 px-5 py-5 sm:px-7">
					<fieldset>
						<legend className="mb-1.5 text-xs font-semibold text-t2">
							Type <em className="not-italic text-danger">*</em>
						</legend>
						<div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
							{types.map((t) => {
								const m = typeMeta[t];
								const on = type === t;
								return (
									<label key={t} className={cn('flex cursor-pointer items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-[13px] font-medium', on ? 'border-brand-600 bg-brand-100' : 'border-border-strong bg-white hover:bg-muted')}>
										<input type="radio" value={t} className="sr-only" {...register('type')} />
										<span className={cn('size-4 rounded-[4px]', m.color)} aria-hidden />
										{m.label.replace(' request', '')}
									</label>
								);
							})}
						</div>
					</fieldset>

					<div className="grid gap-3.5 sm:grid-cols-2">
						<Field label="Project" required error={formState.errors.projectKey?.message}>
							{(id) => (
								<Select id={id} {...register('projectKey')}>
									{projects.map((p) => (
										<option key={p.key} value={p.key}>
											{p.name} ({p.key})
										</option>
									))}
								</Select>
							)}
						</Field>
						{isService ? (
							<Field label="Client" required>
								{(id) => (
									<Select id={id} {...register('clientId')}>
										<option value="">Choose a client</option>
										{clients.map((c) => (
											<option key={c.id} value={c.id}>
												{c.name}
											</option>
										))}
									</Select>
								)}
							</Field>
						) : (
							<Field label="Parent / Epic">
								{(id) => (
									<Select id={id} {...register('epicId')}>
										<option value="">None</option>
										{projectEpics.map((e) => (
											<option key={e.id} value={e.id}>
												{e.name}
											</option>
										))}
									</Select>
								)}
							</Field>
						)}
					</div>

					<Field label="Summary" required error={formState.errors.title?.message}>
						{(id, d) => (
							<>
								<Input id={id} aria-describedby={d} invalid={!!formState.errors.title || !!duplicate} placeholder="What's wrong, in one line" trailing={<span className="text-xs text-t3">{(title ?? '').length} / 200</span>} {...register('title')} />
								{duplicate ? (
									<p className="mt-1.5 flex items-center gap-1.5 text-xs text-high-fg" role="status">
										<AlertTriangle size={13} /> A similar open ticket exists: <b>{duplicate.key} {duplicate.title}</b>
									</p>
								) : null}
							</>
						)}
					</Field>

					<Field label="Description">{(id) => <Textarea id={id} rows={6} placeholder="What happened, what was tried, who is affected… Markdown **bold** supported." {...register('description')} />}</Field>

					<div className="grid gap-3.5 sm:grid-cols-2">
						{isService ? (
							<Field label="Asset">{(id) => <Input id={id} placeholder="e.g. FortiGate 60F · AH-NET-0007" {...register('asset')} />}</Field>
						) : (
							<Field label="Sprint">
								{(id) => (
									<Select id={id} {...register('sprint')}>
										<option value="">None</option>
										{project?.sprint ? <option>{project.sprint.name}</option> : null}
										<option>Sprint 25</option>
										<option>Backlog</option>
									</Select>
								)}
							</Field>
						)}
						{isService ? (
							<Field label="Impact">
								{(id) => (
									<Select id={id} {...register('impact')}>
										<option value="">Choose impact</option>
										{impacts.map((i) => (
											<option key={i}>{i}</option>
										))}
									</Select>
								)}
							</Field>
						) : (
							<Field label="Story points">{(id) => <Input id={id} type="number" min={0} placeholder="e.g. 3" {...register('storyPoints')} />}</Field>
						)}
					</div>

					<Field label="Attachments">
						{(id) => (
							<div>
								<div
									className={cn(
										'rounded-[10px] border border-dashed px-4 py-5 text-center text-[13px] text-t2 transition-colors',
										dragging ? 'border-brand-600 bg-info-bg' : 'border-border-strong',
									)}
									onDragOver={(e) => {
										e.preventDefault();
										setDragging(true);
									}}
									onDragLeave={() => setDragging(false)}
									onDrop={(e) => {
										e.preventDefault();
										setDragging(false);
										uploads.add(e.dataTransfer.files);
									}}
								>
									<Paperclip size={18} className="mx-auto mb-1.5 text-t3" aria-hidden />
									Drop files or{' '}
									<label className="cursor-pointer text-brand-600 hover:underline">
										browse
										<input
											id={id}
											type="file"
											multiple
											className="sr-only"
											accept={uploads.policy.extensions.map((e) => `.${e}`).join(',')}
											onChange={(e) => {
												uploads.add(e.target.files ?? []);
												// Cleared so choosing the same file twice still fires.
												e.target.value = '';
											}}
										/>
									</label>{' '}
									{/* Read from the API's upload policy, not hard-coded here. */}
									· up to {formatBytes(uploads.policy.maxBytes)} · {uploads.policy.maxFiles} files
									{uploads.policy.scanned ? ' · scanned on upload' : ''}
								</div>

								{uploads.items.length ? (
									<ul className="mt-2.5 space-y-1.5">
										{uploads.items.map((f) => (
											<li
												key={f.localId}
												className={cn(
													'flex items-center gap-2.5 rounded-[8px] border px-2.5 py-2 text-[12px]',
													f.status === 'error' ? 'border-danger-fg/30 bg-danger-bg' : 'border-border',
												)}
											>
												<span className="min-w-0 flex-1">
													<span className="flex items-center gap-1.5">
														<span className="truncate font-medium">{f.name}</span>
														{f.status === 'ready' ? <span className="text-success-fg" aria-label="Uploaded">✓</span> : null}
													</span>
													<span className={cn('text-[11px]', f.status === 'error' ? 'text-danger-fg' : 'text-t3')}>
														{f.status === 'error' ? f.error : f.status === 'uploading' ? `Uploading… ${Math.round(f.progress * 100)}%` : f.size}
													</span>
													{f.status === 'uploading' ? <ProgressBar value={f.progress * 100} className="mt-1" label={`Uploading ${f.name}`} /> : null}
												</span>
												<button
													type="button"
													className="shrink-0 rounded-sm p-1 text-t3 hover:bg-muted hover:text-t1"
													onClick={() => uploads.remove(f.localId)}
													aria-label={`Remove ${f.name}`}
												>
													<X size={12} />
												</button>
											</li>
										))}
									</ul>
								) : null}
							</div>
						)}
					</Field>
				</div>

				<div className="space-y-4 border-t border-border bg-[#fafbfc] px-5 py-5 sm:px-6 lg:border-t-0 lg:border-l">
					<Field label="Priority">
						{(id) => (
							<Select id={id} {...register('priority')}>
								{allPriorities.map((p) => (
									<option key={p} value={p}>
										{p} · {priorityLabel[p]}
									</option>
								))}
							</Select>
						)}
					</Field>
					<Field label="Assignee">
						{(id) => (
							<>
								<Select id={id} {...register('assigneeId')}>
									<option value="">Unassigned</option>
									{team
										.filter((m) => m.id !== 'u_amr')
										.map((m) => (
											<option key={m.id} value={m.id}>
												{m.name}
											</option>
										))}
								</Select>
								{suggested ? (
									<button type="button" className="mt-1.5 text-xs text-brand-600 hover:underline" onClick={() => setValue('assigneeId', suggested.id, { shouldDirty: true })}>
										Suggested: {suggested.name} · on-call for {client?.sites[0]?.split(' ')[0]}
									</button>
								) : null}
							</>
						)}
					</Field>
					<Field label="Reporter" hint={isService ? '(client contact)' : undefined}>{(id) => <Input id={id} placeholder={client ? client.contact.name : actor.name} {...register('reporterName')} />}</Field>
					<Field label="Labels" hint="comma separated">
						{(id) => (
							<>
								<Input id={id} placeholder="vpn, abuja" {...register('labels')} />
								{labels?.trim() ? (
									<div className="mt-1.5 flex flex-wrap gap-1">
										{labels
											.split(',')
											.map((l) => l.trim())
											.filter(Boolean)
											.map((l) => (
												<LabelChip key={l}>{l.toLowerCase().replace(/\s+/g, '-')}</LabelChip>
											))}
									</div>
								) : null}
							</>
						)}
					</Field>
					<Field label="Due date" hint={isService ? '(defaults to SLA)' : undefined}>{(id) => <Input id={id} type="date" {...register('dueDate')} />}</Field>
					{isService && client ? (
						<div className="text-xs text-t2">
							<div className="mb-1 font-semibold">SLA policy</div>
							<span className="inline-flex items-center gap-1.5 text-t1">
								<Shield size={13} className="text-success" aria-hidden />
								{client.tier.split(' ')[0]} · response {{ P1: '15m', P2: '1h', P3: '4h', P4: '8h' }[priority]} · resolve {{ P1: '4h', P2: '8h', P3: '2d', P4: '5d' }[priority]}
							</span>
						</div>
					) : null}
					<Controller
						control={control}
						name="createAnother"
						render={() => <span className="sr-only" />}
					/>
				</div>
			</form>
		</Dialog>
	);
}
