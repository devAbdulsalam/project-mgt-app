import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { Archive, ArchiveRestore, CalendarDays, GraduationCap, MoreVertical, Plus, Search, Users } from 'lucide-react';
import { AppShell, MobileHeader } from '@/shared/layouts/AppShell';
import { Button, Card, EmptyState, Input, Menu, Pill, PillTabs, ProgressBar } from '@/shared/ui';
import { useAuthStore } from '@/shared/lib/auth-store';
import { toast } from '@/shared/lib/toast-store';
import { cn } from '@/shared/lib/cn';
import type { Program } from '@/mocks/types';
import { useProgramActions, useProgramList } from '../api';
import { formatMoney, programStatusLabels, programTone, type ProgramsSearch } from '../model';
import { NewProgramDialog } from '../components/NewProgramDialog';

function ProgramCard({ program, orgSlug }: { program: Program; orgSlug: string }) {
	const actions = useProgramActions(orgSlug);

	// Spend against plan is shown on the detail page, where the real numbers
	// live. The card shows the shape of the programme: how much is scheduled and
	// how much of it is still ahead.
	const scheduled = program.activityCount;
	const upcoming = program.upcomingCount;

	return (
		<Card className="flex flex-col gap-3 p-5">
			<div className="flex items-start gap-3">
				<span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-brand-100 text-brand-900">
					<GraduationCap size={17} aria-hidden />
				</span>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<Link
							to="/$org/programs/$programKey"
							params={{ org: orgSlug, programKey: program.key }}
							search={{ tab: 'overview' as const }}
							className="truncate font-semibold hover:underline"
						>
							{program.name}
						</Link>
						<span className="tabular shrink-0 text-xs text-t3">{program.key}</span>
					</div>
					<p className="mt-0.5 line-clamp-2 text-[13px] text-t2">{program.description || 'No description yet.'}</p>
				</div>
				<Menu
					width="w-52"
					trigger={({ toggle, buttonProps }) => (
						<button type="button" onClick={toggle} aria-label={`Actions for ${program.name}`} className="text-t3 hover:text-t1" {...buttonProps}>
							<MoreVertical size={16} />
						</button>
					)}
					items={[
						{
							key: 'archive',
							label: program.archived ? 'Restore programme' : 'Archive programme',
							icon: program.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />,
							danger: !program.archived,
							onSelect: () => {
								void actions.setArchived(program.key, !program.archived).then(() =>
									toast(program.archived ? `${program.name} restored` : `${program.name} archived`),
								);
							},
						},
					]}
				/>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<Pill tone={programTone[program.status]}>{programStatusLabels[program.status]}</Pill>
				{program.archived ? <Pill tone="closed">Archived</Pill> : null}
				{program.clientName ? <Pill tone="teal">{program.clientName}</Pill> : null}
			</div>

			<dl className="grid grid-cols-3 gap-3 border-t border-border pt-3 text-[13px]">
				<div>
					<dt className="text-xs text-t3">Budget</dt>
					<dd className="tabular mt-0.5 font-semibold">{formatMoney(program.budgetAmount, program.currency)}</dd>
				</div>
				<div>
					<dt className="text-xs text-t3">Scheduled</dt>
					<dd className="mt-0.5 font-semibold">{scheduled}</dd>
				</div>
				<div>
					<dt className="text-xs text-t3">Still ahead</dt>
					<dd className="mt-0.5 font-semibold">{upcoming}</dd>
				</div>
			</dl>

			{scheduled > 0 ? (
				<ProgressBar
					value={Math.round(((scheduled - upcoming) / scheduled) * 100)}
					label={`${scheduled - upcoming} of ${scheduled} activities behind us`}
				/>
			) : null}

			<div className="flex items-center gap-3 text-xs text-t3">
				{program.leadName ? (
					<span className="inline-flex items-center gap-1">
						<Users size={13} aria-hidden /> {program.leadName}
					</span>
				) : null}
				{program.startsOn ? (
					<span className="inline-flex items-center gap-1">
						<CalendarDays size={13} aria-hidden /> {program.startsOn}
						{program.endsOn ? ` → ${program.endsOn}` : ''}
					</span>
				) : null}
			</div>
		</Card>
	);
}

export function ProgramsPage() {
	const org = useAuthStore((s) => s.org)!;
	const navigate = useNavigate();
	const search = useSearch({ from: '/authed/$org/programs' });
	const [creating, setCreating] = useState(false);

	// Archived programmes are fetched only when asked for, the same way the
	// projects list does it.
	const { programs, loading } = useProgramList(org.slug, search.tab !== 'active');

	const setSearch = (patch: Partial<ProgramsSearch>) =>
		navigate({ to: '/$org/programs', params: { org: org.slug }, search: { ...search, ...patch }, replace: true });

	const visible = useMemo(() => {
		const byTab = programs.filter((p) =>
			search.tab === 'archived' ? p.archived : search.tab === 'all' ? true : !p.archived,
		);
		const q = search.q?.trim().toLowerCase();
		if (!q) return byTab;
		return byTab.filter(
			(p) => p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
		);
	}, [programs, search.tab, search.q]);

	const counts = {
		active: programs.filter((p) => !p.archived).length,
		all: programs.length,
		archived: programs.filter((p) => p.archived).length,
	};

	return (
		<AppShell
			meta={{
				title: 'Programmes',
				subtitle: `${counts.active} running · trainings, events and what they cost`,
			}}
			mobileHeader={<MobileHeader>Programmes</MobileHeader>}
		>
			<div className="space-y-4">
				<div className="flex flex-wrap items-center gap-3">
					<PillTabs
						value={search.tab}
						onChange={(tab) => setSearch({ tab })}
						ariaLabel="Filter programmes"
						items={[
							{ key: 'active' as const, label: 'Active', count: counts.active },
							{ key: 'all' as const, label: 'All', count: counts.all },
							{ key: 'archived' as const, label: 'Archived', count: counts.archived },
						]}
					/>
					<label className="relative ms-auto w-full sm:w-64">
						<Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-t3" aria-hidden />
						<Input
							value={search.q ?? ''}
							onChange={(e) => setSearch({ q: e.target.value || undefined })}
							placeholder="Search programmes"
							aria-label="Search programmes"
							className="ps-9"
						/>
					</label>
					<Button variant="primary" onClick={() => setCreating(true)}>
						<Plus size={15} aria-hidden /> New programme
					</Button>
				</div>

				{loading ? (
					<div className="card p-10 text-center text-[13px] text-t2">Loading programmes…</div>
				) : visible.length === 0 ? (
					<div className="card">
						<EmptyState
							icon={<GraduationCap size={20} />}
							title={search.q ? 'No programmes match' : 'No programmes yet'}
							action={
								search.q ? (
									<Button onClick={() => setSearch({ q: undefined })}>Clear search</Button>
								) : (
									<Button variant="primary" onClick={() => setCreating(true)}>
										Create the first one
									</Button>
								)
							}
						>
							{search.q
								? 'Try a different word.'
								: 'A programme groups the trainings and events you run, and tracks what they cost.'}
						</EmptyState>
					</div>
				) : (
					<div className={cn('grid gap-4', 'sm:grid-cols-2 xl:grid-cols-3')}>
						{visible.map((p) => (
							<ProgramCard key={p.id} program={p} orgSlug={org.slug} />
						))}
					</div>
				)}
			</div>

			<NewProgramDialog
				open={creating}
				onClose={() => setCreating(false)}
				orgSlug={org.slug}
				onCreated={(key) =>
					navigate({
						to: '/$org/programs/$programKey',
						params: { org: org.slug, programKey: key },
						search: { tab: 'overview' as const },
					})
				}
			/>
		</AppShell>
	);
}
