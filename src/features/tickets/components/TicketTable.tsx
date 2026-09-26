import { Link } from '@tanstack/react-router';
import {
	MoreVertical,
	UserPlus,
	Check,
	Trash2,
	ExternalLink,
} from 'lucide-react';
import { ChannelBadge, Menu, PriorityPill, StatusPill } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { relativeTime } from '@/shared/lib/time';
import { clientById, useDb } from '@/mocks/db';
import { transitions } from '@/mocks/seed';
import { toast } from '@/shared/lib/toast-store';
import type { Ticket } from '@/mocks/types';
import { useActor } from '../hooks/useActor';
import { AssigneeCell, KeyText, SlaCountdown } from './TicketBits';

export function TicketTable({
	tickets,
	now,
	selected,
	onToggle,
	onToggleAll,
	onOpen,
	showProject,
	orgSlug,
}: {
	tickets: Ticket[];
	now: number;
	selected: Set<string>;
	onToggle: (key: string) => void;
	onToggleAll: () => void;
	onOpen: (key: string) => void;
	showProject?: boolean;
	orgSlug: string;
}) {
	const allSelected =
		tickets.length > 0 && tickets.every((t) => selected.has(t.key));
	return (
		<div className="overflow-x-auto">
			<table className="w-full border-collapse text-[13px]">
				<thead>
					<tr className="bg-muted text-left text-[11px] font-semibold tracking-wider text-t2 uppercase">
						<th className="w-10 px-3.5 py-3">
							<input
								type="checkbox"
								className="size-4 accent-brand-900"
								checked={allSelected}
								onChange={onToggleAll}
								aria-label="Select all on this page"
							/>
						</th>
						<th className="px-3.5 py-3">Key</th>
						<th className="px-3.5 py-3">Subject</th>
						<th className="px-3.5 py-3 whitespace-nowrap">
							{showProject ? 'Project' : 'Client · Site'}
						</th>
						<th className="px-3.5 py-3">Channel</th>
						<th className="px-3.5 py-3">Priority</th>
						<th className="px-3.5 py-3">Status</th>
						<th className="px-3.5 py-3">Engineer</th>
						<th className="px-3.5 py-3">SLA</th>
						<th className="px-3.5 py-3">Updated</th>
						<th className="w-10 px-2 py-3" />
					</tr>
				</thead>
				<tbody>
					{tickets.map((t) => (
						<Row
							key={t.key}
							t={t}
							now={now}
							selected={selected.has(t.key)}
							onToggle={() => onToggle(t.key)}
							onOpen={() => onOpen(t.key)}
							showProject={showProject}
							orgSlug={orgSlug}
						/>
					))}
				</tbody>
			</table>
		</div>
	);
}

function Row({
	t,
	now,
	selected,
	onToggle,
	onOpen,
	showProject,
	orgSlug,
}: {
	t: Ticket;
	now: number;
	selected: boolean;
	onToggle: () => void;
	onOpen: () => void;
	showProject?: boolean;
	orgSlug: string;
}) {
	const client = clientById(t.clientId);
	const project = useDb((s) => s.projects.find((p) => p.key === t.projectKey));
	return (
		<tr
			className={cn(
				'cursor-pointer border-t border-border hover:bg-[#fafbfc]',
				selected && 'bg-brand-100/40 hover:bg-brand-100/60',
			)}
			onClick={onOpen}
			onKeyDown={(e) => {
				if (e.key === 'Enter') onOpen();
			}}
			tabIndex={0}
			aria-selected={selected}
		>
			<td className="px-3.5 py-3" onClick={(e) => e.stopPropagation()}>
				<input
					type="checkbox"
					className="size-4 accent-brand-900"
					checked={selected}
					onChange={onToggle}
					aria-label={`Select ${t.key}`}
				/>
			</td>
			<td className="px-3.5 py-3 whitespace-nowrap">
				<KeyText>{t.key}</KeyText>
			</td>
			<td className="min-w-[240px] px-3.5 py-3">
				<div className="font-semibold text-t1">{t.title}</div>
				{t.category ? (
					<div className="text-xs text-t2">{t.category}</div>
				) : null}
			</td>
			<td className="px-3.5 py-3">
				{showProject ? (
					<div className="text-t1">{project?.name ?? t.projectKey}</div>
				) : client ? (
					<>
						<div className="text-t1 whitespace-nowrap">{client.name}</div>
						<div className="text-xs text-t2">{t.site}</div>
					</>
				) : (
					<div className="text-t2">{project?.name ?? '—'}</div>
				)}
			</td>
			<td className="px-3.5 py-3 whitespace-nowrap">
				<ChannelBadge channel={t.channel} />
			</td>
			<td className="px-3.5 py-3">
				<PriorityPill priority={t.priority} />
			</td>
			<td className="px-3.5 py-3 whitespace-nowrap">
				<StatusPill status={t.status} />
			</td>
			<td className="px-3.5 py-3 whitespace-nowrap">
				<AssigneeCell assigneeId={t.assigneeId} short />
			</td>
			<td className="px-3.5 py-3 whitespace-nowrap">
				<SlaCountdown ticket={t} now={now} />
			</td>
			<td className="px-3.5 py-3 whitespace-nowrap text-t2">
				{relativeTime(t.updatedAt, now)}
			</td>
			<td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
				<RowMenu t={t} orgSlug={orgSlug} />
			</td>
		</tr>
	);
}

export function RowMenu({ t, orgSlug }: { t: Ticket; orgSlug: string }) {
	const actor = useActor();
	const assign = useDb((s) => s.assign);
	const transition = useDb((s) => s.transition);
	const del = useDb((s) => s.deleteTicket);
	const canResolve = transitions[t.status].includes('Resolved');
	return (
		<Menu
			align="end"
			trigger={({ toggle, buttonProps }) => (
				<button
					type="button"
					onClick={toggle}
					className="grid size-7 place-items-center rounded-sm text-t3 hover:bg-muted hover:text-t1"
					aria-label={`Actions for ${t.key}`}
					{...buttonProps}
				>
					<MoreVertical size={16} />
				</button>
			)}
			items={[
				{
					key: 'open',
					label: (
						<Link
							to="/$org/tickets/$key"
							params={{ org: orgSlug, key: t.key }}
							search={{}}
						>
							Open full page
						</Link>
					),
					icon: <ExternalLink size={14} />,
				},
				{
					key: 'assign',
					label: t.assigneeId === actor.id ? 'Unassign me' : 'Assign to me',
					icon: <UserPlus size={14} />,
					onSelect: () => {
						assign(
							t.key,
							t.assigneeId === actor.id ? undefined : actor.id,
							actor,
						);
						toast(
							t.assigneeId === actor.id
								? `${t.key} unassigned`
								: `${t.key} assigned to you`,
							{ tone: 'success' },
						);
					},
				},
				{
					key: 'resolve',
					label: 'Resolve',
					icon: <Check size={14} />,
					disabled: !canResolve,
					onSelect: () => {
						transition(t.key, 'Resolved', actor);
						toast(`${t.key} resolved`, { tone: 'success' });
					},
				},
				{
					key: 'delete',
					label: 'Delete ticket',
					icon: <Trash2 size={14} />,
					danger: true,
					onSelect: () => {
						if (window.confirm(`Delete ${t.key}? This cannot be undone.`)) {
							del(t.key);
							toast(`${t.key} deleted`);
						}
					},
				},
			]}
		/>
	);
}
