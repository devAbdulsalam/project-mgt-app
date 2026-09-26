// Where an operator starts.
//
// Answers the three questions someone opening the console actually has, in
// order: is anything on fire, what is my own standing, and what has my
// colleagues been doing. Everything else is a click away from the nav.
//
// The shape of the data constrains the shape of the page. There is no
// "platform health" endpoint and no way to get one without inventing a
// cross-tenant metric the server deliberately does not compute, so this is three
// real queries side by side rather than a synthesised chart: a sample of recent
// accounts, a sample of recent workspaces, and the head of the audit trail. All
// three are `limit`-capped reads, not aggregates, because the operator surface
// returns rows and counts and nothing else.

import { Link } from '@tanstack/react-router';
import { Building2, ScrollText, ShieldAlert, Users } from 'lucide-react';
import { Button, Card, CardHeader, EmptyState, StatTile } from '@/shared/ui';
import { useConsoleQuery } from '../hooks/useConsoleQuery';
import { usersQuery, orgsQuery, auditQuery, operatorsQuery } from '../api/queries';
import { useConsoleStore } from '../store';
import { isElevated, ELEVATION_MINUTES, type AuditSearch, type OrgsSearch, type UsersSearch } from '../model';
import { PageHeader, TableShell, Td, Th, Row, LoadingRows, Pending, ErrorState } from '../components/Primitives';
import { relativeTime } from '../hooks/useElevationClock';
import { PLAN_LABEL } from '../lib/constants';

const RECENT_LIMIT = 8;

export function ConsoleOverviewPage() {
	const operator = useConsoleStore((s) => s.operator);

	// The operator list is admin-only, so the card is only mounted for an admin.
	// Not hidden behind a CSS class: an operator with `support` would get a 404
	// from a request the page had no business making.
	const isAdmin = operator?.role === 'admin';

	return (
		<>
			<PageHeader
				title={`Good to see you, ${(operator?.name || operator?.email || '').split(' ')[0] || 'operator'}`}
				sub="The platform console. Everything here is written to the audit trail against your account — including the reads that need elevation."
			/>

			<StandingCards />

			<div className="mt-5 grid gap-5 xl:grid-cols-2">
				<RecentAccounts />
				<RecentWorkspaces />
			</div>

			<div className="mt-5 grid gap-5 xl:grid-cols-2">
				<RecentAudit />
				{isAdmin ? <OperatorsCard /> : <BoundaryNote />}
			</div>
		</>
	);
}

/**
 * The operator's own standing, in tiles.
 *
 * Not decoration: an operator who cannot tell whether they are currently
 * elevated has no way to predict which of their next three clicks will work.
 */
function StandingCards() {
	const operator = useConsoleStore((s) => s.operator);
	const refresh = useConsoleStore((s) => s.refreshOperator);
	if (!operator) return null;

	const live = isElevated(operator);

	return (
		<div className="grid gap-3 sm:grid-cols-3">
			<Card className="p-4">
				<StatTile
					label="Your role"
					value={operator.role === 'admin' ? 'Admin' : 'Support'}
					sub={operator.role === 'admin' ? 'Can write: suspend, disable, change plans' : 'Read-only, plus audit'}
				/>
			</Card>
			<Card className="p-4">
				<StatTile
					label="Second factor"
					value={operator.totpEnrolled ? 'Enrolled' : 'Not set up'}
					sub={operator.totpEnrolled ? 'Authenticator required' : 'The console is locked until this is done'}
					subTone={operator.totpEnrolled ? 'good' : 'bad'}
				/>
			</Card>
			<Card className="p-4">
				<StatTile
					label="Elevation"
					value={live ? 'Active' : 'Expired'}
					sub={live ? `Re-verify within ${ELEVATION_MINUTES} minutes` : 'Needed for most actions'}
					subTone={live ? 'good' : 'muted'}
				/>
				<Button size="sm" variant="ghost" className="mt-2" onClick={() => void refresh()}>
					Re-check now
				</Button>
			</Card>
		</div>
	);
}

function RecentAccounts() {
	// A fixed, empty search: the overview shows the newest accounts, and the
	// list screen is where search belongs. Encoding it as a search object rather
	// than calling the API directly keeps the cache key identical to the list
	// screen's, so paging from here to there does not refetch.
	const search: UsersSearch = { page: 1, limit: RECENT_LIMIT, q: undefined };
	const { data, loading, error, refetch, gate } = useConsoleQuery(usersQuery(search));

	return (
		<Card className="flex flex-col p-0">
			<CardHeader
				title="Newest accounts"
				sub="The most recently created accounts on the platform"
				action={
					<Link to="/console/users" className="text-xs font-semibold text-brand-900 no-underline hover:underline">
						All accounts
					</Link>
				}
				className="p-5 pb-3"
			/>
			{gate}
			{error ? <ErrorState message={error} onRetry={refetch} /> : null}
			<TableShell className="rounded-none border-0 shadow-none">
				<table className="w-full border-collapse">
					<thead>
						<tr>
							<Th>Account</Th>
							<Th>Workspaces</Th>
							<Th>Joined</Th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<LoadingRows rows={4} cols={3} />
						) : (
							data?.items.map((u) => (
								<Row key={u.id}>
									<Td>
										<Link to="/console/users/$userId" params={{ userId: u.id }} className="font-medium text-t1 no-underline hover:underline">
											{u.name || u.email}
										</Link>
										<p className="text-[11px] text-t2">{u.email}</p>
									</Td>
									<Td className="text-t2">{u.orgCount}</Td>
									<Td className="text-xs text-t2">{relativeTime(u.createdAt)}</Td>
								</Row>
							))
						)}
					</tbody>
				</table>
				{!loading && !data?.items.length && !error ? <EmptyState icon={<Users size={18} />} title="No accounts yet" /> : null}
			</TableShell>
		</Card>
	);
}

function RecentWorkspaces() {
	const search: OrgsSearch = { page: 1, limit: RECENT_LIMIT, q: undefined };
	const { data, loading, error, refetch, gate } = useConsoleQuery(orgsQuery(search));

	return (
		<Card className="flex flex-col p-0">
			<CardHeader
				title="Newest workspaces"
				sub="A workspace can only be created by an operator"
				action={
					<Link to="/console/workspaces" className="text-xs font-semibold text-brand-900 no-underline hover:underline">
						All workspaces
					</Link>
				}
				className="p-5 pb-3"
			/>
			{gate}
			{error ? <ErrorState message={error} onRetry={refetch} /> : null}
			<TableShell className="rounded-none border-0 shadow-none">
				<table className="w-full border-collapse">
					<thead>
						<tr>
							<Th>Workspace</Th>
							<Th>Plan</Th>
							<Th>Members</Th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<LoadingRows rows={4} cols={3} />
						) : (
							data?.items.map((o) => (
								<Row key={o.id}>
									<Td>
										<Link to="/console/workspaces/$slug" params={{ slug: o.slug }} className="font-medium text-t1 no-underline hover:underline">
											{o.name}
										</Link>
										<p className="text-[11px] text-t2">
											{o.slug}
											{o.prefix ? ` · ${o.prefix}` : ''}
										</p>
									</Td>
									<Td className="text-t2">{PLAN_LABEL[o.plan]}</Td>
									<Td className="text-t2">{o.memberCount}</Td>
								</Row>
							))
						)}
					</tbody>
				</table>
				{!loading && !data?.items.length && !error ? <EmptyState icon={<Building2 size={18} />} title="No workspaces yet" /> : null}
			</TableShell>
		</Card>
	);
}

function RecentAudit() {
	const search: AuditSearch = { limit: 10, action: undefined, targetId: undefined };
	const { data, loading, error, refetch, gate } = useConsoleQuery(auditQuery(search));

	return (
		<Card className="flex flex-col p-0">
			<CardHeader
				title="Latest activity"
				sub="Every operator action, newest first"
				action={
					<Link to="/console/audit" className="text-xs font-semibold text-brand-900 no-underline hover:underline">
						Full trail
					</Link>
				}
				className="p-5 pb-3"
			/>
			{gate}
			{error ? <ErrorState message={error} onRetry={refetch} /> : null}
			<div className="flex-1">
				{loading ? (
					<div className="p-5">
						<Pending label="Loading activity…" />
					</div>
				) : data?.length ? (
					<ul className="divide-y divide-border">
						{data.map((entry) => (
							<li key={entry.id} className="flex items-baseline justify-between gap-3 px-5 py-2.5">
								<div className="min-w-0">
									<p className="truncate text-[13px] text-t1">
										<b className="font-semibold">{entry.action}</b>
										<span className="text-t2"> by {entry.actorEmail}</span>
									</p>
									{entry.targetKind ? (
										<p className="truncate text-[11px] text-t3">
											{entry.targetKind} {entry.targetId}
										</p>
									) : null}
								</div>
								<span className="shrink-0 text-[11px] text-t3">{relativeTime(entry.createdAt)}</span>
							</li>
						))}
					</ul>
				) : (
					<EmptyState icon={<ScrollText size={18} />} title="Nothing logged yet" />
				)}
			</div>
		</Card>
	);
}

function OperatorsCard() {
	const { data, loading, error, refetch, gate } = useConsoleQuery(operatorsQuery());

	return (
		<Card className="p-0">
			<CardHeader title="Operators" sub="Accounts with platform standing" className="p-5 pb-3" />
			{gate}
			{error ? <ErrorState message={error} onRetry={refetch} /> : null}
			<div className="p-5 pt-0">
				{loading ? (
					<Pending label="Loading operators…" />
				) : (
					<ul className="space-y-2.5">
						{data?.map((op) => (
							<li key={op.userId} className="flex items-center justify-between gap-3">
								<div className="min-w-0">
									<p className="truncate text-[13px] font-medium text-t1">{op.name || op.email}</p>
									<p className="truncate text-[11px] text-t2">{op.email}</p>
								</div>
								<div className="flex shrink-0 items-center gap-1.5">
									{!op.totpEnrolled ? (
										<span title="No second factor — cannot act on the console" className="text-danger-fg">
											<ShieldAlert size={14} aria-label="No second factor" />
										</span>
									) : null}
									<span className="text-[11px] font-semibold text-t2">{op.role}</span>
								</div>
							</li>
						))}
					</ul>
				)}
			</div>
		</Card>
	);
}

/**
 * Shown to a `support` operator in the operators' slot.
 *
 * An explanation rather than an empty card: they have noticed the nav item is
 * missing, and "this list is admin-only" is a better answer than whitespace.
 */
function BoundaryNote() {
	return (
		<Card className="p-5">
			<CardHeader title="Operator management" sub="Admin only" />
			<p className="mt-3 text-[13px] leading-relaxed text-t2">
				You have <b>support</b> standing, which reads accounts, workspaces and the audit trail. Granting or revoking
				platform standing needs <b>admin</b>, and no operator can change their own — so this is not something you can grant
				yourself.
			</p>
		</Card>
	);
}
