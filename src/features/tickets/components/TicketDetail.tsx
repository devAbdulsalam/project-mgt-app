import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Check, Eye, EyeOff, MoreHorizontal, Share2, UserPlus, Timer, Trash2, Link2, X, Maximize2 } from 'lucide-react';
import { Avatar, Button, LineTabs, Menu, PriorityPill, TypeDot } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useNow } from '@/shared/lib/time';
import { epicById, memberById, useDb } from '@/mocks/db';
import { transitions } from '@/mocks/seed';
import { toast } from '@/shared/lib/toast-store';
import type { Ticket } from '@/mocks/types';
import { useActor } from '../hooks/useActor';
import { SlaCountdown } from './TicketBits';
import { ActivityList, AttachmentList, CommentComposer, CommentList, DescriptionBlock, LabelsEditor, LinkedIssues, PropertyList, StatusMenu, SubtaskList } from './TicketDetailParts';

type Tab = 'comments' | 'activity' | 'attachments';

function useTicketActions(ticket: Ticket, onClose: () => void) {
	const actor = useActor();
	const transition = useDb((s) => s.transition);
	const assign = useDb((s) => s.assign);
	const toggleWatch = useDb((s) => s.toggleWatch);
	const logTime = useDb((s) => s.logTime);
	const del = useDb((s) => s.deleteTicket);
	const canResolve = transitions[ticket.status].includes('Resolved');
	const watching = ticket.watcherIds.includes(actor.id);
	const mine = ticket.assigneeId === actor.id;
	return {
		actor,
		canResolve,
		watching,
		mine,
		resolve: () => {
			if (transition(ticket.key, 'Resolved', actor)) toast(`${ticket.key} resolved`, { tone: 'success' });
		},
		assignMe: () => {
			assign(ticket.key, mine ? undefined : actor.id, actor);
			toast(mine ? 'Unassigned' : `${ticket.key} assigned to you`, { tone: 'success' });
		},
		watch: () => toggleWatch(ticket.key, actor.id),
		log: (m: number) => {
			logTime(ticket.key, m, actor);
			toast(`Logged ${m} min on ${ticket.key}`, { tone: 'success' });
		},
		copyLink: () => {
			navigator.clipboard?.writeText(window.location.href).catch(() => {});
			toast('Link copied');
		},
		remove: () => {
			if (window.confirm(`Delete ${ticket.key}? This cannot be undone.`)) {
				del(ticket.key);
				toast(`${ticket.key} deleted`);
				onClose();
			}
		},
	};
}

function TitleEditor({ ticket, className }: { ticket: Ticket; className?: string }) {
	const actor = useActor();
	const update = useDb((s) => s.updateTicket);
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(ticket.title);
	if (editing) {
		return (
			<input
				autoFocus
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				onBlur={() => {
					if (draft.trim() && draft !== ticket.title) update(ticket.key, { title: draft.trim() }, actor, 'changed the title');
					setEditing(false);
				}}
				onKeyDown={(e) => {
					if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
					if (e.key === 'Escape') {
						setDraft(ticket.title);
						setEditing(false);
					}
				}}
				className={cn('w-full rounded-sm border border-brand-600 bg-white px-2 py-1 text-t1 outline-none', className)}
				aria-label="Ticket title"
			/>
		);
	}
	return (
		<button
			type="button"
			onClick={() => {
				setDraft(ticket.title);
				setEditing(true);
			}}
			className={cn('-mx-2 rounded-sm px-2 py-1 text-left hover:bg-black/5', className)}
			title="Click to edit"
		>
			{ticket.title}
		</button>
	);
}

function MoreMenu({ ticket, onClose, orgSlug }: { ticket: Ticket; onClose: () => void; orgSlug: string }) {
	const a = useTicketActions(ticket, onClose);
	return (
		<Menu
			align="end"
			width="w-52"
			trigger={({ toggle, buttonProps }) => (
				<button type="button" onClick={toggle} className="grid size-8 place-items-center rounded-sm text-t2 hover:bg-muted hover:text-t1" aria-label="More actions" {...buttonProps}>
					<MoreHorizontal size={18} />
				</button>
			)}
			items={[
				{ key: 'copy', label: 'Copy link', icon: <Link2 size={14} />, onSelect: a.copyLink },
				{
					key: 'full',
					label: (
						<Link to="/$org/tickets/$key" params={{ org: orgSlug, key: ticket.key }} search={{}}>
							Open full page
						</Link>
					),
					icon: <Maximize2 size={14} />,
				},
				{ key: 'delete', label: 'Delete ticket', icon: <Trash2 size={14} />, danger: true, onSelect: a.remove },
			]}
		/>
	);
}

function Breadcrumb({ ticket, light }: { ticket: Ticket; light?: boolean }) {
	const epic = epicById(ticket.epicId);
	const project = useDb((s) => s.projects.find((p) => p.key === ticket.projectKey));
	return (
		<div className={cn('flex flex-wrap items-center gap-2 text-[13px]', light ? 'text-on-dark-muted' : 'text-t2')}>
			{epic ? (
				<>
					<span className="inline-flex items-center gap-1.5">
						<TypeDot type="epic" /> {light ? epic.name : `Epic: ${epic.name}`}
					</span>
					<ChevronRight size={13} aria-hidden />
				</>
			) : project ? (
				<>
					<span>{project.name}</span>
					<ChevronRight size={13} aria-hidden />
				</>
			) : null}
			<span className="inline-flex items-center gap-1.5">
				<TypeDot type={ticket.type} /> <span className="font-mono">{ticket.key}</span>
			</span>
		</div>
	);
}

/** Desktop slide-over panel (≥ lg). */
export function TicketPanel({ ticket, onClose, orgSlug }: { ticket: Ticket; onClose: () => void; orgSlug: string }) {
	const now = useNow(15_000);
	const a = useTicketActions(ticket, onClose);
	const [tab, setTab] = useState<Tab>('comments');
	const viewers = ticket.watcherIds.slice(0, 2).map(memberById).filter(Boolean);

	return (
		<div className="fixed inset-0 z-40 hidden lg:block" role="dialog" aria-modal="true" aria-label={`${ticket.key} ${ticket.title}`}>
			<div className="absolute inset-0 bg-[rgba(27,42,50,.25)]" onClick={onClose} aria-hidden />
			<aside className="absolute inset-y-0 right-0 flex w-[min(940px,calc(100vw-260px))] flex-col bg-white shadow-pop">
				<header className="shrink-0 border-b border-border px-7 pt-5 pb-4">
					<div className="flex items-center gap-3">
						<Breadcrumb ticket={ticket} />
						<div className="ms-auto flex items-center gap-1">
							<button type="button" onClick={a.watch} className={cn('flex h-8 items-center gap-1.5 rounded-sm px-2 text-xs hover:bg-muted', a.watching ? 'text-brand-900' : 'text-t2')} aria-pressed={a.watching}>
								{a.watching ? <Eye size={16} /> : <EyeOff size={16} />} {a.watching ? 'Watching' : 'Watch'} · {ticket.watcherIds.length}
							</button>
							<button type="button" onClick={a.copyLink} className="grid size-8 place-items-center rounded-sm text-t2 hover:bg-muted hover:text-t1" aria-label="Share">
								<Share2 size={16} />
							</button>
							<MoreMenu ticket={ticket} onClose={onClose} orgSlug={orgSlug} />
							<button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-sm text-t2 hover:bg-muted hover:text-t1" aria-label="Close panel">
								<X size={18} />
							</button>
						</div>
					</div>
					<h2 className="mt-2 text-[22px] leading-tight font-semibold">
						<TitleEditor ticket={ticket} />
					</h2>
					<div className="mt-3 flex flex-wrap items-center gap-2.5" data-tour="ticket-status">
						<StatusMenu ticket={ticket} />
						{a.canResolve ? (
							<Button variant="soft" size="md" onClick={a.resolve}>
								<Check size={14} aria-hidden /> Resolve
							</Button>
						) : null}
						<Button variant="ghost" size="md" onClick={a.assignMe}>
							<UserPlus size={14} aria-hidden /> {a.mine ? 'Unassign me' : 'Assign to me'}
						</Button>
						<Menu
							width="w-40"
							trigger={({ toggle, buttonProps }) => (
								<Button variant="ghost" size="md" onClick={toggle} {...buttonProps}>
									<Timer size={14} aria-hidden /> Log time
								</Button>
							)}
							items={[15, 30, 60, 120].map((m) => ({ key: String(m), label: `+ ${m >= 60 ? `${m / 60}h` : `${m}m`}`, onSelect: () => a.log(m) }))}
						/>
						{viewers.length ? (
							<span className="ms-auto flex items-center gap-1 text-xs text-t3">
								<span className="flex -space-x-1.5">
									{viewers.map((v) => (
										<Avatar key={v!.id} name={v!.name} tint={v!.tint} size="sm" className="ring-2 ring-white" />
									))}
								</span>
								viewing now
							</span>
						) : null}
					</div>
				</header>

				<div className="flex min-h-0 flex-1">
					<div className="min-w-0 flex-1 overflow-y-auto px-7 py-5">
						<div className="space-y-7">
							<DescriptionBlock ticket={ticket} />
							<LabelsEditor ticket={ticket} />
							<div data-tour="ticket-subtasks"><SubtaskList ticket={ticket} /></div>
							<LinkedIssues ticket={ticket} orgSlug={orgSlug} />
							<section>
								<LineTabs<Tab>
									value={tab}
									onChange={setTab}
									items={[
										{ key: 'comments', label: 'Comments', count: ticket.comments.length },
										{ key: 'activity', label: 'Activity' },
										{ key: 'attachments', label: 'Attachments', count: ticket.attachments.length },
									]}
								/>
								<div className="pt-4">
									{tab === 'comments' ? (
										<div className="space-y-4">
											<CommentList ticket={ticket} now={now} />
											<div data-tour="ticket-composer"><CommentComposer ticket={ticket} /></div>
										</div>
									) : tab === 'activity' ? (
										<ActivityList ticket={ticket} now={now} />
									) : (
										<AttachmentList ticket={ticket} />
									)}
								</div>
							</section>
						</div>
					</div>
					<div className="w-[300px] shrink-0 overflow-y-auto border-l border-border px-5 py-4" data-tour="ticket-props">
						<PropertyList ticket={ticket} now={now} orgSlug={orgSlug} />
					</div>
				</div>
			</aside>
		</div>
	);
}

/** Mobile full-page detail (< lg). */
export function TicketMobilePage({ ticket, onClose, orgSlug }: { ticket: Ticket; onClose: () => void; orgSlug: string }) {
	const now = useNow(15_000);
	const a = useTicketActions(ticket, onClose);
	const [tab, setTab] = useState<'details' | 'comments' | 'activity' | 'files'>('details');
	return (
		<div className="fixed inset-0 z-40 flex flex-col bg-canvas lg:hidden" role="dialog" aria-modal="true" aria-label={`${ticket.key} ${ticket.title}`}>
			<header className="bg-brand-900 px-4 pt-[calc(12px+env(safe-area-inset-top))] pb-4 text-white">
				<div className="flex items-center gap-2">
					<button type="button" onClick={onClose} className="-ms-1 flex items-center gap-1 text-[15px]" aria-label="Back to tickets">
						<ChevronLeft size={22} /> Tickets
					</button>
					<div className="ms-auto flex items-center gap-1">
						<button type="button" onClick={a.watch} className="grid size-9 place-items-center rounded-full hover:bg-white/10" aria-pressed={a.watching} aria-label="Watch">
							{a.watching ? <Eye size={20} /> : <EyeOff size={20} />}
						</button>
						<button type="button" onClick={a.copyLink} className="grid size-9 place-items-center rounded-full hover:bg-white/10" aria-label="Share">
							<Share2 size={20} />
						</button>
						<MoreMenu ticket={ticket} onClose={onClose} orgSlug={orgSlug} />
					</div>
				</div>
				<div className="mt-3">
					<Breadcrumb ticket={ticket} light />
				</div>
				<h1 className="mt-1.5 text-[22px] leading-tight font-semibold">
					<TitleEditor ticket={ticket} className="text-white" />
				</h1>
				<div className="mt-3 flex flex-wrap items-center gap-2" data-tour="ticket-status">
					<StatusMenu ticket={ticket} dark />
					<PriorityPill priority={ticket.priority} long className="h-8 px-3 text-[13px]" />
					{ticket.sla ? (
						<span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/10 px-3 text-[13px]">
							<Timer size={14} /> <SlaCountdown ticket={ticket} now={now} className="text-white" />
						</span>
					) : null}
				</div>
			</header>

			<div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 pb-40">
				<div className="rounded-md bg-white px-4 py-1 shadow-card" data-tour="m-props">
					<PropertyList ticket={ticket} now={now} orgSlug={orgSlug} limit={5} />
				</div>
				<div className="rounded-md bg-white p-4 shadow-card">
					<LineTabs
						value={tab}
						onChange={setTab}
						items={[
							{ key: 'details', label: 'Details' },
							{ key: 'comments', label: 'Comments', count: ticket.comments.length },
							{ key: 'activity', label: 'Activity' },
							{ key: 'files', label: 'Files', count: ticket.attachments.length },
						]}
					/>
					<div className="space-y-6 pt-4">
						{tab === 'details' ? (
							<>
								<DescriptionBlock ticket={ticket} />
								<LabelsEditor ticket={ticket} />
								<div data-tour="ticket-subtasks"><SubtaskList ticket={ticket} /></div>
								<LinkedIssues ticket={ticket} orgSlug={orgSlug} />
							</>
						) : tab === 'comments' ? (
							<CommentList ticket={ticket} now={now} />
						) : tab === 'activity' ? (
							<ActivityList ticket={ticket} now={now} />
						) : (
							<AttachmentList ticket={ticket} />
						)}
					</div>
				</div>
			</div>

			<div className="fixed inset-x-0 bottom-0 space-y-2.5 border-t border-border bg-canvas p-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
				<div className="flex gap-2.5">
					{a.canResolve ? (
						<Button variant="primary" size="lg" className="flex-1 h-12 text-[15px]" onClick={a.resolve}>
							Resolve <Check size={16} aria-hidden />
						</Button>
					) : null}
					<Button size="lg" className="flex-1 h-12 text-[15px]" onClick={a.assignMe}>
						{a.mine ? 'Unassign me' : 'Assign to me'}
					</Button>
					<Menu
						align="end"
						width="w-36"
						trigger={({ toggle, buttonProps }) => (
							<Button size="lg" iconOnly className="h-12 w-12" onClick={toggle} aria-label="Log time" {...buttonProps}>
								<Timer size={18} />
							</Button>
						)}
						items={[15, 30, 60].map((m) => ({ key: String(m), label: `+ ${m} min`, onSelect: () => a.log(m) }))}
					/>
				</div>
				<div data-tour="ticket-composer"><CommentComposer ticket={ticket} /></div>
			</div>
		</div>
	);
}

export function TicketDetail({ ticketKey, onClose, orgSlug }: { ticketKey: string; onClose: () => void; orgSlug: string }) {
	const ticket = useDb((s) => s.tickets.find((t) => t.key === ticketKey));
	if (!ticket) {
		return (
			<div className="fixed inset-0 z-40 grid place-items-center bg-[rgba(27,42,50,.25)]" onClick={onClose}>
				<div className="card p-6 text-center" onClick={(e) => e.stopPropagation()}>
					<b>Ticket {ticketKey} not found</b>
					<p className="mt-1 text-[13px] text-t2">It may have been deleted.</p>
					<Button className="mt-4" onClick={onClose}>
						Back to tickets
					</Button>
				</div>
			</div>
		);
	}
	return (
		<>
			<TicketPanel ticket={ticket} onClose={onClose} orgSlug={orgSlug} />
			<TicketMobilePage ticket={ticket} onClose={onClose} orgSlug={orgSlug} />
		</>
	);
}
