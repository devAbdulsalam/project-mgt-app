import { useState } from 'react';
import { CalendarDays, Check, MapPin, UserPlus, Video, X } from 'lucide-react';
import { Avatar, Button, Field, Input, Menu, Pill, Select } from '@/shared/ui';
import { formatDateTime } from '@/shared/lib/time';
import { toast } from '@/shared/lib/toast-store';
import { cn } from '@/shared/lib/cn';
import { useMembers } from '@/api/resources';
import { useDb } from '@/mocks/db';
import type { ParticipantKind, ProgramActivity } from '@/mocks/types';
import { useParticipants, useProgramActions } from '../api';
import { activityStatusLabels, activityTone, formatMoney, kindLabels } from '../model';

/**
 * Adding an attendee.
 *
 * Three kinds, because that is what the record allows: a colleague, a contact
 * at a client, or somebody with no account anywhere. The third is the common
 * case for a public training, so it is not hidden behind the other two.
 */
function AddAttendee({ activity, orgSlug }: { activity: ProgramActivity; orgSlug: string }) {
	const actions = useProgramActions(orgSlug);
	const [open, setOpen] = useState(false);
	const [kind, setKind] = useState<ParticipantKind>('external');
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [memberId, setMemberId] = useState('');
	const [busy, setBusy] = useState(false);

	const liveMembers = useMembers(orgSlug);
	const mockMembers = useDb((s) => s.members);
	const members = liveMembers.data
		? liveMembers.data.map((m) => ({ id: m.id, name: m.name }))
		: mockMembers.filter((m) => m.status === 'Active').map((m) => ({ id: m.id, name: m.name }));

	const submit = async () => {
		setBusy(true);
		try {
			const ok = await actions.addParticipant(activity.key, activity.id, {
				kind,
				name: kind === 'external' ? name : members.find((m) => m.id === memberId)?.name,
				email: kind === 'external' ? email || undefined : undefined,
				userId: kind === 'member' ? memberId : undefined,
			});
			if (ok) {
				toast('Attendee added', { tone: 'success' });
				setName('');
				setEmail('');
				setMemberId('');
				setOpen(false);
			}
		} finally {
			setBusy(false);
		}
	};

	if (!open) {
		return (
			<Button size="sm" onClick={() => setOpen(true)} disabled={activity.full}>
				<UserPlus size={14} aria-hidden /> {activity.full ? 'No places left' : 'Add attendee'}
			</Button>
		);
	}

	return (
		<div className="rounded-[10px] border border-border bg-muted/40 p-3">
			<div className="grid gap-3">
				<Field label="Who">
					{(id) => (
						<Select id={id} value={kind} onChange={(e) => setKind(e.target.value as ParticipantKind)}>
							<option value="external">Someone outside the workspace</option>
							<option value="member">A colleague</option>
						</Select>
					)}
				</Field>

				{kind === 'member' ? (
					<Field label="Colleague">
						{(id) => (
							<Select id={id} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
								<option value="">Choose someone</option>
								{members.map((m) => (
									<option key={m.id} value={m.id}>
										{m.name}
									</option>
								))}
							</Select>
						)}
					</Field>
				) : (
					<div className="grid gap-3 sm:grid-cols-2">
						<Field label="Name">
							{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ngozi Adewale" />}
						</Field>
						<Field label="Email" hint="optional">
							{(id) => <Input id={id} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ngozi@shopfront.ng" />}
						</Field>
					</div>
				)}

				<div className="flex gap-2">
					<Button
						variant="primary"
						size="sm"
						loading={busy}
						disabled={kind === 'member' ? !memberId : name.trim().length < 2}
						onClick={() => void submit()}
					>
						Add
					</Button>
					<Button size="sm" onClick={() => setOpen(false)}>
						Cancel
					</Button>
				</div>
			</div>
		</div>
	);
}

export function ActivityPanel({
	activity,
	orgSlug,
	onClose,
}: {
	activity: ProgramActivity;
	orgSlug: string;
	onClose: () => void;
}) {
	const actions = useProgramActions(orgSlug);
	const { participants } = useParticipants(orgSlug, activity.key, activity.id);

	return (
		<div className="fixed inset-0 z-40 flex justify-end bg-[rgba(27,42,50,.25)]" onClick={onClose}>
			<aside
				className="flex h-full w-full max-w-[520px] flex-col overflow-y-auto bg-white shadow-xl"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-label={`${activity.key} ${activity.title}`}
			>
				<header className="flex items-start gap-3 border-b border-border px-5 py-4">
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<span className="tabular text-xs text-t3">{activity.key}</span>
							<Pill tone={activityTone[activity.status]}>{activityStatusLabels[activity.status]}</Pill>
							<Pill tone="closed">{kindLabels[activity.kind]}</Pill>
						</div>
						<h2 className="mt-1 text-lg font-semibold">{activity.title}</h2>
					</div>
					<button type="button" onClick={onClose} aria-label="Close" className="text-t3 hover:text-t1">
						<X size={18} />
					</button>
				</header>

				<div className="space-y-5 px-5 py-4">
					{activity.description ? <p className="text-[13px] text-t2">{activity.description}</p> : null}

					<dl className="grid gap-3 text-[13px]">
						<div className="flex items-center gap-2">
							<CalendarDays size={14} className="text-t3" aria-hidden />
							<dd>{activity.startsAt ? formatDateTime(activity.startsAt) : 'Not scheduled'}</dd>
						</div>
						{activity.location ? (
							<div className="flex items-center gap-2">
								<MapPin size={14} className="text-t3" aria-hidden />
								<dd>{activity.location}</dd>
							</div>
						) : null}
						{activity.meetingUrl ? (
							<div className="flex items-center gap-2">
								<Video size={14} className="text-t3" aria-hidden />
								<dd>
									<a href={activity.meetingUrl} className="text-brand-600 hover:underline" target="_blank" rel="noreferrer">
										Join link
									</a>
								</dd>
							</div>
						) : null}
						{activity.budgetAmount != null ? (
							<div className="flex items-center gap-2">
								<span className="w-[14px] text-center text-t3">₦</span>
								<dd>{formatMoney(activity.budgetAmount, activity.currency)} budgeted</dd>
							</div>
						) : null}
					</dl>

					{activity.transitions.length > 0 ? (
						<Menu
							width="w-48"
							trigger={({ toggle, buttonProps }) => (
								<Button size="sm" onClick={toggle} {...buttonProps}>
									Move to…
								</Button>
							)}
							items={activity.transitions.map((t) => ({
								key: t.to,
								label: t.name,
								onSelect: () => {
									void actions.transitionActivity(activity.key, t.to).then((ok) => {
										if (ok) toast(`${activity.key} is now ${t.name.toLowerCase()}`, { tone: 'success' });
									});
								},
							}))}
						/>
					) : null}

					<section>
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-semibold">
								Attendees{' '}
								<span className="font-normal text-t3">
									{activity.capacity == null
										? `(${participants.length})`
										: `(${participants.length} of ${activity.capacity})`}
								</span>
							</h3>
						</div>

						<ul className="mt-3 space-y-1.5">
							{participants.length === 0 ? (
								<li className="py-4 text-center text-[13px] text-t3">Nobody registered yet.</li>
							) : (
								participants.map((p) => (
									<li key={p.id} className="flex items-center gap-2.5 rounded-[10px] border border-border px-3 py-2">
										<Avatar name={p.name} size="sm" />
										<div className="min-w-0 flex-1">
											<div className="truncate text-[13px] font-semibold">{p.name}</div>
											<div className="truncate text-xs text-t3">
												{p.email ?? (p.kind === 'member' ? 'Colleague' : 'No email')}
											</div>
										</div>
										<Pill tone={p.status === 'attended' ? 'done' : p.status === 'no_show' ? 'blocked' : 'new'}>
											{p.status === 'no_show' ? 'No show' : p.status}
										</Pill>
										<button
											type="button"
											aria-label={p.status === 'attended' ? `Undo check-in for ${p.name}` : `Check in ${p.name}`}
											title={p.status === 'attended' ? 'Undo check-in' : 'Check in'}
											className={cn('rounded p-1', p.status === 'attended' ? 'text-success' : 'text-t3 hover:text-t1')}
											onClick={() =>
												void actions.setParticipantStatus(p.id, p.status === 'attended' ? 'registered' : 'attended')
											}
										>
											<Check size={15} />
										</button>
										<button
											type="button"
											aria-label={`Remove ${p.name}`}
											className="rounded p-1 text-t3 hover:text-danger"
											onClick={() => void actions.removeParticipant(p.id)}
										>
											<X size={15} />
										</button>
									</li>
								))
							)}
						</ul>

						<div className="mt-3">
							<AddAttendee activity={activity} orgSlug={orgSlug} />
						</div>
					</section>
				</div>
			</aside>
		</div>
	);
}
