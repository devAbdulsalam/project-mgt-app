import { useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Check, Circle, CheckCircle2, Plus, X, Paperclip, Image as ImageIcon, FileText, File, Send, Lock, MessageSquare, Mail, ChevronDown, Timer } from 'lucide-react';
import { Avatar, Button, LabelChip, Menu, ProgressBar, SectionLabel, StatusPill, Textarea, TypeDot, PriorityPill, Input } from '@/shared/ui';
import { priorityLabel } from '@/shared/ui/meta';
import { typeMeta } from '@/shared/ui/meta';
import { cn } from '@/shared/lib/cn';
import { formatDateTime, formatMinutes, fromDateInputValue, relativeTime, toDateInputValue } from '@/shared/lib/time';
import { clientById, epicById, memberById, team, useDb } from '@/mocks/db';
import { allPriorities, transitions as workflow } from '@/mocks/seed';
import { toast } from '@/shared/lib/toast-store';
import type { Ticket, TicketLink } from '@/mocks/types';
import { useActor } from '../hooks/useActor';
import { useTicketActions } from '../hooks/useTicketActions';
import { useAttachmentUploads } from '../hooks/useAttachmentUploads';
import { attachToTicket } from '../api/uploads';
import { isLiveApi } from '@/shared/lib/live-api';
import { useQueryClient } from '@tanstack/react-query';
import { ticketKeys } from '../api/queryKeys';
import { useAuthStore } from '@/shared/lib/auth-store';
import { SlaCountdown } from './TicketBits';

// ---------- Description ----------

/** Minimal markdown: paragraphs, **bold**, `code`. */
export function RichText({ text, className }: { text: string; className?: string }) {
	const paragraphs = text.split(/\n{2,}/);
	return (
		<div className={cn('space-y-3 text-sm leading-relaxed text-t1', className)}>
			{paragraphs.map((p, i) => (
				<p key={i}>
					{p.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, j) => {
						if (part.startsWith('**')) return <b key={j}>{part.slice(2, -2)}</b>;
						if (part.startsWith('`')) return (
							<code key={j} className="rounded bg-muted px-1 font-mono text-[12px]">
								{part.slice(1, -1)}
							</code>
						);
						return part.split('\n').map((line, k, arr) => (
							<span key={`${j}-${k}`}>
								{line}
								{k < arr.length - 1 ? <br /> : null}
							</span>
						));
					})}
				</p>
			))}
		</div>
	);
}

export function DescriptionBlock({ ticket }: { ticket: Ticket }) {
	const actions = useTicketActions();
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(ticket.description);
	return (
		<section>
			<SectionLabel
				action={
					!editing ? (
						<button
							type="button"
							className="text-xs text-brand-600 hover:underline"
							onClick={() => {
								setDraft(ticket.description);
								setEditing(true);
							}}
						>
							Edit
						</button>
					) : null
				}
			>
				Description
			</SectionLabel>
			{editing ? (
				<div className="mt-2 space-y-2">
					<Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={6} aria-label="Description" autoFocus />
					<div className="flex justify-end gap-2">
						<Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
							Cancel
						</Button>
						<Button
							size="sm"
							variant="primary"
							onClick={() => {
								void actions.updateTicket(ticket, { description: draft });
								setEditing(false);
							}}
						>
							Save
						</Button>
					</div>
				</div>
			) : ticket.description ? (
				<RichText text={ticket.description} className="mt-2" />
			) : (
				<p className="mt-2 text-sm text-t3">No description yet.</p>
			)}
		</section>
	);
}

// ---------- Labels ----------

export function LabelsEditor({ ticket, compact }: { ticket: Ticket; compact?: boolean }) {
	const actions = useTicketActions();
	const [adding, setAdding] = useState(false);
	const [value, setValue] = useState('');
	return (
		<div className="flex flex-wrap items-center gap-1.5">
			{ticket.labels.map((l) => (
				<LabelChip key={l} onRemove={() => void actions.setLabels(ticket, ticket.labels.filter((x) => x !== l))}>
					{l}
				</LabelChip>
			))}
			{adding ? (
				<form
					onSubmit={(e) => {
						e.preventDefault();
						void actions.setLabels(ticket, [...ticket.labels, value]);
						setValue('');
						setAdding(false);
					}}
				>
					<input
						autoFocus
						value={value}
						onChange={(e) => setValue(e.target.value)}
						onBlur={() => setAdding(false)}
						onKeyDown={(e) => e.key === 'Escape' && setAdding(false)}
						placeholder="label"
						className="h-5 w-24 rounded-[6px] border border-brand-600 px-1.5 text-[11px] outline-none"
						aria-label="New label"
					/>
				</form>
			) : (
				<button type="button" onClick={() => setAdding(true)} className={cn('inline-flex h-5 items-center gap-0.5 rounded-[6px] px-1.5 text-[11px] text-t2 hover:bg-muted', compact && 'px-1')}>
					<Plus size={11} /> Add
				</button>
			)}
		</div>
	);
}

// ---------- Sub-tasks ----------

export function SubtaskList({ ticket }: { ticket: Ticket }) {
	const actor = useActor();
	const toggle = useDb((s) => s.toggleSubtask);
	const add = useDb((s) => s.addSubtask);
	const [adding, setAdding] = useState(false);
	const [title, setTitle] = useState('');
	const done = ticket.subtasks.filter((s) => s.done).length;
	return (
		<section>
			<SectionLabel
				action={
					<button type="button" className="flex items-center gap-1 text-xs text-brand-600 hover:underline" onClick={() => setAdding(true)}>
						<Plus size={12} /> Add
					</button>
				}
			>
				Sub-tasks · {ticket.subtasks.length ? `${done} of ${ticket.subtasks.length} done` : 'none yet'}
			</SectionLabel>
			{ticket.subtasks.length ? <ProgressBar value={(done / ticket.subtasks.length) * 100} className="mt-2" label="Sub-task progress" /> : null}
			<ul className="mt-2 space-y-1.5">
				{ticket.subtasks.map((s) => {
					const m = memberById(s.assigneeId);
					return (
						<li key={s.key} className="flex items-center gap-2.5 rounded-sm border border-border px-3 py-2 text-[13px]">
							<button type="button" onClick={() => toggle(ticket.key, s.key, actor)} className={cn('shrink-0', s.done ? 'text-success' : 'text-border-strong hover:text-brand-600')} aria-label={s.done ? `Reopen ${s.key}` : `Complete ${s.key}`} aria-pressed={s.done}>
								{s.done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
							</button>
							<span className="font-mono text-xs text-t2">{s.key}</span>
							<span className={cn('min-w-0 flex-1 truncate', s.done && 'text-t3 line-through')}>{s.title}</span>
							{!s.done && s.status && s.status !== 'Open' ? <StatusPill status={s.status} /> : null}
							{m ? <Avatar name={m.name} tint={m.tint} src={m.avatarUrl} size="sm" /> : <span className="grid size-6 place-items-center rounded-full bg-muted text-[10px] text-t3">?</span>}
						</li>
					);
				})}
			</ul>
			{adding ? (
				<form
					className="mt-2 flex gap-2"
					onSubmit={(e) => {
						e.preventDefault();
						if (!title.trim()) return;
						add(ticket.key, title, actor);
						setTitle('');
						setAdding(false);
					}}
				>
					<Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" className="h-9" aria-label="Sub-task title" onKeyDown={(e) => e.key === 'Escape' && setAdding(false)} />
					<Button type="submit" variant="primary" size="md">
						Add
					</Button>
				</form>
			) : null}
		</section>
	);
}

// ---------- Linked issues ----------

const linkTypes: TicketLink['type'][] = ['is blocked by', 'blocks', 'relates to', 'duplicates'];

export function LinkedIssues({ ticket, orgSlug }: { ticket: Ticket; orgSlug: string }) {
	const actor = useActor();
	const all = useDb((s) => s.tickets);
	const addLink = useDb((s) => s.addLink);
	const removeLink = useDb((s) => s.removeLink);
	const [adding, setAdding] = useState(false);
	const [type, setType] = useState<TicketLink['type']>('relates to');
	const [key, setKey] = useState('');
	const [err, setErr] = useState<string>();
	return (
		<section>
			<SectionLabel
				action={
					<button type="button" className="flex items-center gap-1 text-xs text-brand-600 hover:underline" onClick={() => setAdding(true)}>
						<Plus size={12} /> Link
					</button>
				}
			>
				Linked issues
			</SectionLabel>
			<ul className="mt-2 space-y-1.5">
				{ticket.links.length === 0 && !adding ? <li className="text-[13px] text-t3">No linked issues.</li> : null}
				{ticket.links.map((l) => {
					const target = all.find((t) => t.key === l.key);
					return (
						<li key={`${l.type}-${l.key}`} className="flex items-center gap-2.5 rounded-sm border border-border px-3 py-2 text-[13px]">
							<span className="w-[92px] shrink-0 text-xs text-t2">{l.type}</span>
							{target ? <TypeDot type={target.type} /> : null}
							<Link to="/$org/tickets/$key" params={{ org: orgSlug, key: l.key }} search={{}} className="font-mono text-xs text-t2 hover:underline">
								{l.key}
							</Link>
							<span className="min-w-0 flex-1 truncate">{target?.title ?? 'Unknown ticket'}</span>
							{target ? <StatusPill status={target.status} /> : null}
							<button type="button" onClick={() => removeLink(ticket.key, l, actor)} className="text-t3 hover:text-t1" aria-label={`Remove link to ${l.key}`}>
								<X size={13} />
							</button>
						</li>
					);
				})}
			</ul>
			{adding ? (
				<form
					className="mt-2 flex flex-wrap gap-2"
					onSubmit={(e) => {
						e.preventDefault();
						const k = key.trim().toUpperCase();
						if (!all.some((t) => t.key === k)) return setErr(`No ticket ${k}`);
						if (k === ticket.key) return setErr('Cannot link a ticket to itself');
						addLink(ticket.key, { type, key: k }, actor);
						setKey('');
						setErr(undefined);
						setAdding(false);
					}}
				>
					<select value={type} onChange={(e) => setType(e.target.value as TicketLink['type'])} className="input h-9 w-auto" aria-label="Link type">
						{linkTypes.map((t) => (
							<option key={t}>{t}</option>
						))}
					</select>
					<Input autoFocus value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g. KS-2040" className="h-9 w-40" aria-label="Ticket key" invalid={!!err} />
					<Button type="submit" variant="primary">
						Add
					</Button>
					<Button type="button" variant="ghost" onClick={() => setAdding(false)}>
						Cancel
					</Button>
					{err ? (
						<p role="alert" className="w-full text-xs text-danger">
							{err}
						</p>
					) : null}
				</form>
			) : null}
		</section>
	);
}

// ---------- Comments ----------

export function CommentList({ ticket, now, filter }: { ticket: Ticket; now: number; filter?: 'all' | 'internal' | 'client' }) {
	const list = ticket.comments.filter((c) => (filter === 'internal' ? c.internal : filter === 'client' ? !c.internal : true));
	if (list.length === 0) return <p className="py-6 text-center text-[13px] text-t3">No comments yet.</p>;
	return (
		<ul className="space-y-4">
			{list.map((c) => {
				const m = memberById(c.authorId);
				return (
					<li key={c.id} className={cn('flex gap-3', !c.fromClient && !c.internal && c.channel ? 'flex-row-reverse text-right' : '')}>
						<Avatar name={c.authorName} tint={m?.tint ?? (c.fromClient ? 'tan' : 'teal')} />
						<div className="min-w-0 max-w-[85%]">
							<div className={cn('mb-1 flex flex-wrap items-center gap-2 text-xs', !c.fromClient && !c.internal && c.channel ? 'justify-end' : '')}>
								<b className="text-t1">{c.authorName}</b>
								<span className="text-t3">· {relativeTime(c.at, now)}</span>
								{c.internal ? (
									<span className="inline-flex items-center gap-1 rounded-full bg-warning-bg px-2 py-px text-[11px] font-semibold text-warning-fg">
										<Lock size={10} /> Internal note
									</span>
								) : c.channel ? (
									<span className="text-t3">via {c.channel === 'whatsapp' ? 'WhatsApp' : c.channel}</span>
								) : null}
							</div>
							<div
								className={cn(
									'inline-block rounded-[10px] px-3.5 py-2.5 text-left text-[13px] leading-relaxed',
									c.internal ? 'border border-dashed border-warning bg-warning-bg/60 text-t1' : c.fromClient ? 'bg-muted text-t1' : c.channel ? 'bg-brand-900 text-white' : 'bg-muted text-t1',
								)}
							>
								{c.body.split(/(@[A-Z][a-z]+)/g).map((part, i) => (part.startsWith('@') ? <b key={i} className={c.channel && !c.fromClient && !c.internal ? 'text-brand-100' : 'text-brand-600'}>{part}</b> : part))}
							</div>
						</div>
					</li>
				);
			})}
		</ul>
	);
}

export function CommentComposer({ ticket, defaultMode }: { ticket: Ticket; defaultMode?: 'client' | 'internal' }) {
	const actions = useTicketActions();
	const client = clientById(ticket.clientId);
	const [mode, setMode] = useState<'client' | 'internal'>(defaultMode ?? (client ? 'client' : 'internal'));
	const [body, setBody] = useState('');
	const channel = ticket.channel === 'internal' ? undefined : ticket.channel;
	const submit = () => {
		if (!body.trim()) return;
		void actions.addComment(ticket, body, mode === 'internal');
		setBody('');
		toast(mode === 'internal' ? 'Internal note added' : `Reply sent${channel ? ` via ${channel === 'whatsapp' ? 'WhatsApp' : channel}` : ''}`, { tone: 'success' });
	};
	return (
		<div className="rounded-[10px] border border-border bg-white">
			<div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5 text-xs">
				{client ? (
					<button type="button" onClick={() => setMode('client')} className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1', mode === 'client' ? 'bg-success-bg font-semibold text-success-fg' : 'text-t2 hover:bg-muted')} aria-pressed={mode === 'client'}>
						{channel === 'whatsapp' ? <MessageSquare size={12} /> : <Mail size={12} />}
						Reply {channel === 'whatsapp' ? 'on WhatsApp' : channel === 'email' ? 'by email' : 'to client'}
					</button>
				) : null}
				<button type="button" onClick={() => setMode('internal')} className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1', mode === 'internal' ? 'bg-warning-bg font-semibold text-warning-fg' : 'text-t2 hover:bg-muted')} aria-pressed={mode === 'internal'}>
					<Lock size={12} /> {client ? 'Internal note' : 'Comment'}
				</button>
				<span className="ms-auto hidden text-t3 sm:inline">@mention a teammate · ⌘↵ to send</span>
			</div>
			<textarea
				value={body}
				onChange={(e) => setBody(e.target.value)}
				onKeyDown={(e) => {
					if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
				}}
				rows={3}
				placeholder={mode === 'client' ? `Type a reply… client sees this${channel === 'whatsapp' ? ' in WhatsApp' : ''}` : 'Add an internal note… not visible to the client'}
				className="block w-full resize-none bg-transparent px-3.5 py-2.5 text-[13px] outline-none placeholder:text-t3"
				aria-label="Comment"
			/>
			<div className="flex items-center gap-2 px-2 pb-2">
				<button type="button" className="grid size-8 place-items-center rounded-sm text-t2 hover:bg-muted" aria-label="Attach file" onClick={() => toast('Attachments are not available in the demo')}>
					<Paperclip size={15} />
				</button>
				<Button variant="primary" size="sm" className="ms-auto" onClick={submit} disabled={!body.trim()}>
					{mode === 'internal' ? 'Add note' : 'Send'} <Send size={13} aria-hidden />
				</Button>
			</div>
		</div>
	);
}

// ---------- Activity / attachments ----------

export function ActivityList({ ticket, now }: { ticket: Ticket; now: number }) {
	const items = [...ticket.activity].sort((a, b) => b.at - a.at);
	return (
		<ol className="space-y-3">
			{items.map((a) => (
				<li key={a.id} className="flex gap-3 text-[13px]">
					<span className={cn('mt-1.5 size-2 shrink-0 rounded-full', a.system ? 'bg-brand-600' : 'bg-border-strong')} aria-hidden />
					<div>
						<b>{a.actorName}</b> {a.text}
						<div className="text-xs text-t3" title={formatDateTime(a.at)}>
							{relativeTime(a.at, now)}
						</div>
					</div>
				</li>
			))}
		</ol>
	);
}

/**
 * Adds files to a ticket that already exists.
 *
 * Two steps, not one: the bytes are uploaded first and land unattached, then the
 * ids are claimed by the ticket. That is what lets an upload survive a failed
 * attach, and it is the same path the create dialog uses — there the claim
 * happens as part of creating the ticket.
 */
function AttachmentUploader({ ticket }: { ticket: Ticket }) {
	const org = useAuthStore((s) => s.org?.slug) ?? '';
	const uploads = useAttachmentUploads('ticket_attachment');
	const queryClient = useQueryClient();
	const [attaching, setAttaching] = useState(false);

	// Only the files that actually stored can be claimed.
	const ready = uploads.attachmentIds;

	const attach = async () => {
		if (!ready.length) return;
		setAttaching(true);
		try {
			await attachToTicket(org, ticket.key, ready);
			uploads.reset();
			await queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticket.key) });
			toast(`${ready.length} file${ready.length === 1 ? '' : 's'} attached`, { tone: 'success' });
		} catch (err) {
			toast(err instanceof Error ? err.message : 'Could not attach those files.', { tone: 'danger' });
		} finally {
			setAttaching(false);
		}
	};

	return (
		<div className="mt-3 rounded-[10px] border border-dashed border-border p-3">
			<label className="flex cursor-pointer items-center gap-2 text-[13px] text-t2">
				<Paperclip size={14} aria-hidden />
				<span>Add files</span>
				<input
					type="file"
					multiple
					className="sr-only"
					accept={uploads.policy.extensions.map((e) => `.${e}`).join(',')}
					onChange={(e) => {
						if (e.target.files) uploads.add(e.target.files);
						// Reset, so picking the same file twice still fires a change.
						e.target.value = '';
					}}
				/>
			</label>

			{uploads.items.length > 0 && (
				<ul className="mt-2 space-y-1.5">
					{uploads.items.map((item) => (
						<li key={item.localId} className="flex items-center gap-2 text-[13px]">
							<span className="min-w-0 flex-1 truncate">{item.name}</span>
							<span className="text-xs text-t3">
								{item.status === 'uploading'
									? `${Math.round(item.progress * 100)}%`
									: item.status === 'error'
										? (item.error ?? 'Failed')
										: item.size}
							</span>
							<button
								type="button"
								onClick={() => uploads.remove(item.localId)}
								aria-label={`Remove ${item.name}`}
								className="text-t3 hover:text-t1"
							>
								<X size={13} />
							</button>
						</li>
					))}
				</ul>
			)}

			{ready.length > 0 && (
				<Button
					className="mt-2"
					onClick={attach}
					loading={attaching || uploads.uploading}
					disabled={uploads.uploading}
				>
					{uploads.uploading ? 'Uploading…' : `Attach ${ready.length} file${ready.length === 1 ? '' : 's'}`}
				</Button>
			)}
		</div>
	);
}

export function AttachmentList({ ticket }: { ticket: Ticket }) {
	// Uploading is only wired to the API; against the mock store the list stays
	// read-only rather than pretending a file was stored.
	const canUpload = isLiveApi();

	if (ticket.attachments.length === 0) {
		return (
			<>
				<p className="py-6 text-center text-[13px] text-t3">No attachments.</p>
				{canUpload && <AttachmentUploader ticket={ticket} />}
			</>
		);
	}

	const icon = { image: ImageIcon, log: FileText, pdf: FileText, other: File };
	return (
		<>
			<ul className="grid gap-2 sm:grid-cols-2">
			{ticket.attachments.map((f) => {
				const Icon = icon[f.kind];
				// A file the scanner flagged is listed but not offered: the link is
				// what makes it dangerous, and the row is what makes it accountable.
				const infected = f.scanStatus === 'infected';
				const body = (
					<>
						<span className="grid size-8 place-items-center rounded-sm bg-muted text-t2">
							<Icon size={15} />
						</span>
						<span className="min-w-0 flex-1">
							<span className="block truncate">{f.name}</span>
							<span className="text-xs text-t3">{infected ? 'Blocked by the virus scanner' : f.size}</span>
						</span>
					</>
				);

				const shell = 'flex items-center gap-2.5 rounded-sm border px-3 py-2 text-[13px]';

				return (
					<li key={f.id}>
						{f.url && !infected ? (
							// Opened in a new tab rather than fetched: the link is signed and
							// short-lived, and the API decides inline vs download.
							<a
								href={f.url}
								target="_blank"
								rel="noreferrer"
								className={cn(shell, 'border-border hover:border-border-strong hover:bg-muted/50')}
								title={`Open ${f.name}`}
							>
								{body}
							</a>
						) : (
							<span className={cn(shell, infected ? 'border-danger-fg/30 bg-danger-bg' : 'border-border')}>{body}</span>
						)}
					</li>
				);
			})}
			</ul>
			{canUpload && <AttachmentUploader ticket={ticket} />}
		</>
	);
}

// ---------- Property list (sidebar) ----------

function Prop({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex items-start gap-3 py-2 text-[13px]">
			<dt className="w-[92px] shrink-0 pt-0.5 text-t2">{label}</dt>
			<dd className="min-w-0 flex-1">{children}</dd>
		</div>
	);
}

export function AssigneeMenu({ ticket, children }: { ticket: Ticket; children: (props: { toggle: () => void; buttonProps: Record<string, unknown> }) => ReactNode }) {
	const actor = useActor();
	const actions = useTicketActions();
	return (
		<Menu
			width="w-60"
			trigger={({ toggle, buttonProps }) => children({ toggle, buttonProps })}
			items={[
				{ key: 'me', label: 'Assign to me', selected: ticket.assigneeId === actor.id, onSelect: () => void actions.assign(ticket, actor.id) },
				{ key: 'none', label: 'Unassigned', selected: !ticket.assigneeId, onSelect: () => void actions.assign(ticket, undefined) },
				...team.filter((m) => m.id !== actor.id && m.id !== 'u_amr').map((m) => ({ key: m.id, label: m.name, hint: m.role, selected: ticket.assigneeId === m.id, onSelect: () => void actions.assign(ticket, m.id) })),
			]}
		/>
	);
}

export function PriorityMenu({ ticket }: { ticket: Ticket }) {
	const actions = useTicketActions();
	return (
		<Menu
			width="w-44"
			trigger={({ toggle, buttonProps }) => (
				<button type="button" onClick={toggle} className="inline-flex items-center gap-1 rounded-full hover:opacity-80" aria-label="Change priority" {...buttonProps}>
					<PriorityPill priority={ticket.priority} long /> <ChevronDown size={12} className="text-t3" />
				</button>
			)}
			items={allPriorities.map((p) => ({ key: p, label: `${p} · ${priorityLabel[p]}`, selected: ticket.priority === p, onSelect: () => void actions.setPriority(ticket, p) }))}
		/>
	);
}

export function PropertyList({ ticket, now, orgSlug, limit }: { ticket: Ticket; now: number; orgSlug: string; limit?: number }) {
	const actions = useTicketActions();
	const [showAll, setShowAll] = useState(!limit);
	const assignee = memberById(ticket.assigneeId);
	const client = clientById(ticket.clientId);
	const epic = epicById(ticket.epicId);
	const project = useDb((s) => s.projects.find((p) => p.key === ticket.projectKey));

	const rows: ReactNode[] = [
		<Prop key="assignee" label="Assignee">
			<AssigneeMenu ticket={ticket}>
				{({ toggle, buttonProps }) => (
					<button type="button" onClick={toggle} className="inline-flex items-center gap-2 rounded-sm hover:underline" {...buttonProps}>
						{assignee ? (
							<>
								<Avatar name={assignee.name} tint={assignee.tint} src={assignee.avatarUrl} size="sm" /> {assignee.name}
							</>
						) : (
							<span className="text-t2">Unassigned</span>
						)}
						<ChevronDown size={12} className="text-t3" />
					</button>
				)}
			</AssigneeMenu>
		</Prop>,
		<Prop key="reporter" label="Reporter">
			<span className="inline-flex items-center gap-2">
				<Avatar name={ticket.reporter.name} tint={ticket.reporter.isClient ? 'tan' : (memberById(ticket.reporter.id)?.tint ?? 'teal')} size="sm" /> {ticket.reporter.name}
				{ticket.reporter.isClient ? <span className="text-t3">(Client)</span> : null}
			</span>
		</Prop>,
		<Prop key="priority" label="Priority">
			<PriorityMenu ticket={ticket} />
		</Prop>,
		<Prop key="type" label="Type">
			<span className="inline-flex items-center gap-2">
				<TypeDot type={ticket.type} /> {typeMeta[ticket.type].label}
			</span>
		</Prop>,
		client ? (
			<Prop key="client" label="Client">
				<Link to="/$org/customers" params={{ org: orgSlug }} className="text-brand-600 hover:underline">
					{client.name}
				</Link>
				<span className="ms-1.5 rounded-full bg-success-bg px-1.5 text-[10px] font-semibold text-success-fg">{client.tier.split(' ')[0]}</span>
			</Prop>
		) : (
			<Prop key="project" label="Project">
				<Link to="/$org/projects/$projectKey/overview" params={{ org: orgSlug, projectKey: ticket.projectKey }} className="text-brand-600 hover:underline">
					{project?.name ?? ticket.projectKey}
				</Link>
			</Prop>
		),
		ticket.asset ? (
			<Prop key="asset" label="Asset">
				<Link to="/$org/assets" params={{ org: orgSlug }} className="text-brand-600 hover:underline">
					{ticket.asset}
				</Link>
			</Prop>
		) : null,
		ticket.sla ? (
			<Prop key="sla" label="SLA">
				<span className="inline-flex items-center gap-1.5">
					<Timer size={13} className="text-t2" aria-hidden />
					<SlaCountdown ticket={ticket} now={now} /> <span className="text-xs text-t3">{ticket.sla.policy} · {ticket.sla.resolveTargetLabel} target</span>
				</span>
			</Prop>
		) : null,
		<Prop key="due" label="Due">
			<input
				type="date"
				value={toDateInputValue(ticket.dueAt)}
				onChange={(e) => void actions.patchFields(ticket, { due_at: e.target.value ? new Date(fromDateInputValue(e.target.value)!).toISOString() : null })}
				className="h-7 rounded-sm border border-transparent bg-transparent px-1 text-[13px] hover:border-border-strong"
				aria-label="Due date"
			/>
		</Prop>,
		ticket.sprint || project?.kind === 'software' ? (
			<Prop key="sprint" label="Sprint">
				{ticket.sprint ?? <span className="text-t3">None</span>}
			</Prop>
		) : null,
		project?.kind === 'software' ? (
			<Prop key="points" label="Story points">
				<input
					type="number"
					min={0}
					value={ticket.storyPoints ?? ''}
					onChange={(e) => void actions.patchFields(ticket, { story_points: e.target.value ? Number(e.target.value) : null })}
					className="h-7 w-16 rounded-sm border border-transparent bg-transparent px-1 text-[13px] hover:border-border-strong"
					aria-label="Story points"
				/>
			</Prop>
		) : null,
		<Prop key="time" label="Time logged">
			<span className="tabular">{formatMinutes(ticket.timeLoggedMin)}</span>
			{ticket.timeEstimateMin ? <span className="text-t3"> / {formatMinutes(ticket.timeEstimateMin)}</span> : null}
			<Menu
				className="ms-2"
				width="w-40"
				trigger={({ toggle, buttonProps }) => (
					<button type="button" onClick={toggle} className="text-xs text-brand-600 hover:underline" {...buttonProps}>
						Log
					</button>
				)}
				items={[15, 30, 60, 120].map((m) => ({ key: String(m), label: `+ ${formatMinutes(m)}`, onSelect: () => void actions.logTime(ticket, m) }))}
			/>
		</Prop>,
		<Prop key="labels" label="Labels">
			<LabelsEditor ticket={ticket} compact />
		</Prop>,
		ticket.impact ? (
			<Prop key="impact" label="Impact">
				{ticket.impact}
			</Prop>
		) : null,
		ticket.site ? (
			<Prop key="site" label="Site">
				{ticket.site}
			</Prop>
		) : null,
		epic ? (
			<Prop key="epic" label="Epic">
				<span className="inline-flex items-center gap-2">
					<TypeDot type="epic" /> {epic.name}
				</span>
			</Prop>
		) : null,
	].filter(Boolean);

	const visible = showAll ? rows : rows.slice(0, limit);
	return (
		<dl className="divide-y divide-border">
			{visible}
			{!showAll ? (
				<button type="button" className="pt-2 text-[13px] text-brand-600 hover:underline" onClick={() => setShowAll(true)}>
					Show {rows.length - (limit ?? 0)} more fields
				</button>
			) : null}
			{showAll ? (
				<div className="pt-3 text-xs text-t3">
					Created {formatDateTime(ticket.createdAt)}
					<br />
					Updated {relativeTime(ticket.updatedAt, now)}
				</div>
			) : null}
		</dl>
	);
}

export function StatusMenu({ ticket, dark }: { ticket: Ticket; dark?: boolean }) {
	const actions = useTicketActions();
	return (
		<Menu
			width="w-52"
			header="Move to"
			trigger={({ toggle, buttonProps }) => (
				<button type="button" onClick={toggle} className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold', dark ? 'bg-info-bg text-info-fg' : 'bg-info-bg text-info-fg hover:bg-[#cfe0f7]')} aria-label={`Status: ${ticket.status}. Change status`} {...buttonProps}>
					<span className="size-1.5 rounded-full bg-current" aria-hidden /> {ticket.status} <ChevronDown size={13} />
				</button>
			)}
			items={workflow[ticket.status].map((s) => ({
				key: s,
				label: s,
				icon: s === 'Resolved' || s === 'Closed' ? <Check size={14} /> : undefined,
				onSelect: () => {
					void actions.transition(ticket, s).then((ok) => {
						if (ok) toast(`${ticket.key} moved to ${s}`, { tone: 'success' });
					});
				},
			}))}
		/>
	);
}

