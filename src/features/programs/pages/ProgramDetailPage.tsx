import { useState } from 'react';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { CalendarDays, ChevronLeft, GraduationCap, MapPin, Plus, Users, Wallet } from 'lucide-react';
import { AppShell, MobileHeader } from '@/shared/layouts/AppShell';
import { Button, Card, EmptyState, LineTabs, Pill, ProgressBar, StatTile } from '@/shared/ui';
import { useAuthStore } from '@/shared/lib/auth-store';
import { formatDateTime, relativeTime, useNow } from '@/shared/lib/time';
import type { ProgramActivity } from '@/mocks/types';
import { useActivities, useProgram, useProgramBudget } from '../api';
import {
	activityStatusLabels,
	activityTone,
	categoryLabels,
	formatMoney,
	kindLabels,
	programStatusLabels,
	programTone,
	type ProgramDetailSearch,
} from '../model';
import { NewActivityDialog } from '../components/NewActivityDialog';
import { ActivityPanel } from '../components/ActivityPanel';

function ActivityRow({
	activity,
	onOpen,
	now,
}: {
	activity: ProgramActivity;
	onOpen: () => void;
	now: number;
}) {
	return (
		<button
			type="button"
			onClick={onOpen}
			className="flex w-full items-start gap-3 border-b border-border px-5 py-3.5 text-start last:border-0 hover:bg-muted"
		>
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-2">
					<span className="tabular text-xs text-t3">{activity.key}</span>
					<span className="truncate font-semibold">{activity.title}</span>
					<Pill tone={activityTone[activity.status]}>{activityStatusLabels[activity.status]}</Pill>
					<Pill tone="closed">{kindLabels[activity.kind]}</Pill>
				</div>
				<div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-t3">
					{activity.startsAt ? (
						<span className="inline-flex items-center gap-1">
							<CalendarDays size={12} aria-hidden /> {formatDateTime(activity.startsAt)}
							<span className="text-t3"> · {relativeTime(activity.startsAt, now)}</span>
						</span>
					) : (
						<span>Not scheduled</span>
					)}
					{activity.location ? (
						<span className="inline-flex items-center gap-1">
							<MapPin size={12} aria-hidden /> {activity.location}
						</span>
					) : null}
					{activity.facilitatorName ? <span>Run by {activity.facilitatorName}</span> : null}
				</div>
			</div>
			<div className="shrink-0 text-end">
				<div className="tabular text-[13px] font-semibold">
					{activity.capacity == null ? activity.registeredCount : `${activity.registeredCount}/${activity.capacity}`}
				</div>
				<div className="text-xs text-t3">{activity.full ? 'Full' : 'registered'}</div>
			</div>
		</button>
	);
}

export function ProgramDetailPage() {
	const org = useAuthStore((s) => s.org)!;
	const navigate = useNavigate();
	const { programKey } = useParams({ from: '/authed/$org/programs/$programKey' });
	const search = useSearch({ from: '/authed/$org/programs/$programKey' });
	const now = useNow(60_000);
	const [creating, setCreating] = useState(false);

	const { program, loading } = useProgram(org.slug, programKey);
	const { activities } = useActivities(org.slug, programKey);
	const { budget } = useProgramBudget(org.slug, programKey);

	const setSearch = (patch: Partial<ProgramDetailSearch>) =>
		navigate({
			to: '/$org/programs/$programKey',
			params: { org: org.slug, programKey },
			search: { ...search, ...patch },
			replace: true,
		});

	if (loading) {
		return (
			<AppShell meta={{ title: 'Programme' }} mobileHeader={<MobileHeader>Programme</MobileHeader>}>
				<div className="card p-10 text-center text-[13px] text-t2">Loading {programKey}…</div>
			</AppShell>
		);
	}

	if (!program) {
		return (
			<AppShell meta={{ title: 'Programme' }} mobileHeader={<MobileHeader>Programme</MobileHeader>}>
				<div className="card">
					<EmptyState
						icon={<GraduationCap size={20} />}
						title={`${programKey} not found`}
						action={
							<Link to="/$org/programs" params={{ org: org.slug }} search={{ tab: 'active' as const }}>
								<Button>Back to programmes</Button>
							</Link>
						}
					>
						It may have been deleted.
					</EmptyState>
				</div>
			</AppShell>
		);
	}

	const upcoming = activities.filter((a) => a.status !== 'completed' && a.status !== 'cancelled');
	const openActivity = search.activity ? activities.find((a) => a.key === search.activity) : undefined;

	return (
		<AppShell
			meta={{ title: program.name, subtitle: `${program.key} · ${programStatusLabels[program.status]}` }}
			mobileHeader={<MobileHeader>{program.name}</MobileHeader>}
		>
			<div className="space-y-4">
				<Link
					to="/$org/programs"
					params={{ org: org.slug }}
					search={{ tab: 'active' as const }}
					className="inline-flex items-center gap-1 text-[13px] text-t2 hover:text-t1"
				>
					<ChevronLeft size={15} aria-hidden /> All programmes
				</Link>

				<div className="flex flex-wrap items-center gap-2">
					<Pill tone={programTone[program.status]}>{programStatusLabels[program.status]}</Pill>
					{program.clientName ? <Pill tone="teal">{program.clientName}</Pill> : null}
					{program.archived ? <Pill tone="closed">Archived</Pill> : null}
					{program.startsOn ? (
						<span className="text-xs text-t3">
							{program.startsOn}
							{program.endsOn ? ` → ${program.endsOn}` : ''}
						</span>
					) : null}
				</div>

				<LineTabs
					value={search.tab}
					onChange={(tab) => setSearch({ tab })}
					items={[
						{ key: 'overview' as const, label: 'Overview' },
						{ key: 'activities' as const, label: 'Activities', count: activities.length },
						{ key: 'budget' as const, label: 'Budget' },
					]}
				/>

				{search.tab === 'overview' ? (
					<div className="space-y-4">
						<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
							<StatTile label="Budget" value={formatMoney(program.budgetAmount, program.currency)} />
							<StatTile
								label="Spent"
								value={formatMoney(budget?.spent ?? 0, program.currency)}
								sub={budget?.overBudget ? 'Over budget' : budget?.usedPct != null ? `${budget.usedPct}% of plan` : 'No plan set'}
								subTone={budget?.overBudget ? 'bad' : 'muted'}
							/>
							<StatTile label="Activities" value={activities.length} sub={`${upcoming.length} still ahead`} />
							<StatTile
								label="Attendees"
								value={activities.reduce((sum, a) => sum + a.registeredCount, 0)}
								sub={`${activities.reduce((sum, a) => sum + a.attendedCount, 0)} attended so far`}
							/>
						</div>

						<Card className="p-5">
							<h2 className="text-sm font-semibold">About</h2>
							<p className="mt-2 text-[13px] text-t2">{program.description || 'No description yet.'}</p>
							<dl className="mt-4 grid gap-4 border-t border-border pt-4 text-[13px] sm:grid-cols-3">
								<div>
									<dt className="text-xs text-t3">Lead</dt>
									<dd className="mt-0.5">{program.leadName ?? '—'}</dd>
								</div>
								<div>
									<dt className="text-xs text-t3">Client</dt>
									<dd className="mt-0.5">{program.clientName ?? 'Internal'}</dd>
								</div>
								<div>
									<dt className="text-xs text-t3">Created</dt>
									<dd className="mt-0.5">{relativeTime(program.createdAt, now)}</dd>
								</div>
							</dl>
						</Card>
					</div>
				) : null}

				{search.tab === 'activities' ? (
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<p className="text-[13px] text-t2">Trainings, events and workshops under this programme.</p>
							<Button variant="primary" onClick={() => setCreating(true)}>
								<Plus size={15} aria-hidden /> Schedule
							</Button>
						</div>

						{activities.length === 0 ? (
							<div className="card">
								<EmptyState
									icon={<CalendarDays size={20} />}
									title="Nothing scheduled"
									action={
										<Button variant="primary" onClick={() => setCreating(true)}>
											Schedule the first one
										</Button>
									}
								>
									Add a training session, a workshop or an event.
								</EmptyState>
							</div>
						) : (
							<div className="card overflow-hidden">
								{activities.map((a) => (
									<ActivityRow key={a.id} activity={a} now={now} onOpen={() => setSearch({ activity: a.key })} />
								))}
							</div>
						)}
					</div>
				) : null}

				{search.tab === 'budget' ? (
					<div className="space-y-4">
						<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
							<StatTile label="Budget" value={formatMoney(budget?.budgetAmount ?? null, program.currency)} />
							<StatTile
								label="Spent"
								value={formatMoney(budget?.spent ?? 0, program.currency)}
								sub="approved and paid only"
							/>
							<StatTile
								label="Awaiting approval"
								value={formatMoney(budget?.pending ?? 0, program.currency)}
								sub={budget?.pending ? 'not counted yet' : 'nothing pending'}
								subTone={budget?.pending ? 'bad' : 'muted'}
							/>
							<StatTile
								label="Remaining"
								value={formatMoney(budget?.remaining ?? null, program.currency)}
								sub={budget?.overBudget ? 'Over budget' : undefined}
								subTone={budget?.overBudget ? 'bad' : 'muted'}
							/>
						</div>

						{budget?.usedPct != null ? (
							<Card className="p-5">
								<div className="flex items-center justify-between text-[13px]">
									<span className="font-semibold">{budget.usedPct}% of the budget used</span>
									<span className="text-t3">
										{formatMoney(budget.spent, program.currency)} of {formatMoney(budget.budgetAmount, program.currency)}
									</span>
								</div>
								<ProgressBar
									className="mt-3"
									value={Math.min(100, budget.usedPct)}
									color={budget.overBudget ? 'var(--color-danger)' : undefined}
									label={`${budget.usedPct}% of budget used`}
								/>
							</Card>
						) : null}

						<Card className="p-5">
							<h2 className="flex items-center gap-2 text-sm font-semibold">
								<Wallet size={15} aria-hidden /> Where it went
							</h2>
							{budget && budget.byCategory.length > 0 ? (
								<ul className="mt-3 space-y-2">
									{budget.byCategory.map((row) => (
										<li key={row.category} className="flex items-center gap-3 text-[13px]">
											<span className="w-36 shrink-0">{categoryLabels[row.category] ?? row.category}</span>
											<ProgressBar
												className="flex-1"
												value={budget.spent ? Math.round((row.total / budget.spent) * 100) : 0}
												label={`${categoryLabels[row.category] ?? row.category}`}
											/>
											<span className="tabular w-24 shrink-0 text-end font-semibold">
												{formatMoney(row.total, program.currency)}
											</span>
										</li>
									))}
								</ul>
							) : (
								<p className="mt-2 text-[13px] text-t2">Nothing approved yet, so nothing has been spent.</p>
							)}
						</Card>

						{budget?.margin != null ? (
							<Card className="p-5">
								<h2 className="text-sm font-semibold">Billed to the client</h2>
								<dl className="mt-3 grid gap-4 text-[13px] sm:grid-cols-3">
									<div>
										<dt className="text-xs text-t3">Invoiced</dt>
										<dd className="tabular mt-0.5 font-semibold">{formatMoney(budget.invoiced, program.currency)}</dd>
									</div>
									<div>
										<dt className="text-xs text-t3">Cost</dt>
										<dd className="tabular mt-0.5 font-semibold">{formatMoney(budget.spent, program.currency)}</dd>
									</div>
									<div>
										<dt className="text-xs text-t3">Margin</dt>
										<dd className="tabular mt-0.5 font-semibold">{formatMoney(budget.margin, program.currency)}</dd>
									</div>
								</dl>
							</Card>
						) : null}

						<Link
							to="/$org/expenses"
							params={{ org: org.slug }}
							search={{ program: program.key, status: undefined }}
							className="inline-flex items-center gap-1 text-[13px] text-brand-600 hover:underline"
						>
							<Users size={14} aria-hidden /> See every expense on this programme
						</Link>
					</div>
				) : null}
			</div>

			<NewActivityDialog
				open={creating}
				onClose={() => setCreating(false)}
				orgSlug={org.slug}
				programKey={program.key}
				onCreated={(key) => setSearch({ tab: 'activities', activity: key })}
			/>

			{openActivity ? (
				<ActivityPanel
					activity={openActivity}
					orgSlug={org.slug}
					onClose={() => setSearch({ activity: undefined })}
				/>
			) : null}
		</AppShell>
	);
}
