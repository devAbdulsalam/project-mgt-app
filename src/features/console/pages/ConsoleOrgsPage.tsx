// Every workspace on the platform.
//
// Suspension is the row's primary action and it is a reason dialog, because the
// server refuses to suspend without one — not as a policy choice the UI has to
// respect, but as a guarantee that anyone asking "why is this workspace dead"
// gets an answer. So the reason field is presented as the reason it exists.

import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus } from 'lucide-react';
import { Button, EmptyState, Pagination, Pill } from '@/shared/ui';
import { toast } from '@/shared/lib/toast-store';
import { useConsoleQuery } from '../hooks/useConsoleQuery';
import { orgsQuery } from '../api/queries';
import { setOrgSuspendedMutation } from '../api/mutations';
import { orgsSearchSchema, pageCount, type OrgsSearch } from '../model';
import { ErrorState, LoadingRows, PageHeader, Row, SearchBox, TableShell, Td, Th } from '../components/Primitives';
import { ConfirmDialog, ReasonDialog, type ReasonRequest } from '../components/ReasonDialog';
import { relativeTime } from '../hooks/useElevationClock';
import { classify, refusalMessage } from '../lib/errors';
import { useConsoleStore } from '../store';
import { PLAN_LABEL } from '../lib/constants';

type SuspendMode = 'suspend' | 'restore' | null;

export function ConsoleOrgsPage() {
	const search = useSearch({ from: '/console/workspaces' }) as OrgsSearch;
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const operator = useConsoleStore((s) => s.operator);
	const isOperator = operator !== null;
	const canWrite = operator?.role === 'admin';

	const [term, setTerm] = useState(search.q ?? '');
	const [synced, setSynced] = useState(search.q ?? '');

	// Adjusted during render, not in an effect — see the note in ConsoleUsersPage.
	if ((search.q ?? '') !== synced) {
		setSynced(search.q ?? '');
		setTerm(search.q ?? '');
	}

	useEffect(() => {
		if ((search.q ?? '') === term) return;
		const id = setTimeout(() => {
			void navigate({ to: '/console/workspaces', search: { ...search, q: term || undefined, page: 1 } });
		}, 300);
		return () => clearTimeout(id);
	}, [term, search, navigate]);

	const { data, loading, isFetching, error, refetch, gate } = useConsoleQuery(orgsQuery(orgsSearchSchema.parse(search)));

	const [target, setTarget] = useState<SuspendMode>(null);
	const [slugs, setSlugs] = useState<{ slug: string; name: string } | null>(null);
	const [dialogError, setDialogError] = useState<string>();

	const suspend = useMutation({
		...setOrgSuspendedMutation(queryClient),
		onSuccess: (org) => {
			setTarget(null);
			setSlugs(null);
			setDialogError(undefined);
			toast(org.suspended ? 'Workspace suspended' : 'Workspace restored', {
				description: org.suspended ? `${org.name} is offline for every member.` : `${org.name} is live again.`,
				tone: 'success',
			});
		},
		onError: (err) => setDialogError(refusalMessage(classify(err, isOperator))),
	});

	const suspendRequest: ReasonRequest | null =
		target === 'suspend' && slugs
			? {
					title: 'Suspend this workspace',
					intro: `Every member of ${slugs.name} loses access immediately. They keep their data and their sign-in, and the workspace returns the moment it is restored. The reason is recorded in the audit trail.`,
					confirmLabel: 'Suspend workspace',
				}
			: null;

	return (
		<>
			<PageHeader
				title="Workspaces"
				sub="A workspace holds tickets, members and billing. It can only be created by an operator — the product has no self-serve path."
				action={
					canWrite ? (
						<Link to="/console/workspaces/new">
							<Button size="sm">
								<Plus size={14} aria-hidden />
								New workspace
							</Button>
						</Link>
					) : null
				}
			/>

			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<SearchBox value={term} onChange={setTerm} placeholder="Search name or slug…" />
				{isFetching && !loading ? <span className="text-[11px] text-t3">Updating…</span> : null}
			</div>

			{gate}

			<TableShell>
				<table className="w-full border-collapse">
					<thead>
						<tr>
							<Th>Workspace</Th>
							<Th>Plan</Th>
							<Th>Members</Th>
							<Th>State</Th>
							<Th>Created</Th>
							<Th align="right">Actions</Th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<LoadingRows rows={8} cols={6} />
						) : (
							data?.items.map((org) => (
								<Row key={org.id}>
									<Td>
										<Link to="/console/workspaces/$slug" params={{ slug: org.slug }} className="font-medium text-t1 no-underline hover:underline">
											{org.name}
										</Link>
										<p className="text-[11px] text-t2">
											{org.slug}
											{org.prefix ? ` · ${org.prefix}` : ''}
										</p>
									</Td>
									<Td className="text-t2">{PLAN_LABEL[org.plan]}</Td>
									<Td className="text-t2">{org.memberCount}</Td>
									<Td>{org.suspended ? <Pill tone="blocked">Suspended</Pill> : <Pill tone="done">Live</Pill>}</Td>
									<Td className="text-xs text-t2">{relativeTime(org.createdAt)}</Td>
									<Td className="text-right">
										{canWrite ? (
											<Button
												size="sm"
												variant={org.suspended ? 'soft' : 'danger'}
												onClick={() => {
													setDialogError(undefined);
													setSlugs({ slug: org.slug, name: org.name });
													setTarget(org.suspended ? 'restore' : 'suspend');
												}}
											>
												{org.suspended ? 'Restore' : 'Suspend'}
											</Button>
										) : (
											<span className="text-[11px] text-t3">Read only</span>
										)}
									</Td>
								</Row>
							))
						)}
					</tbody>
				</table>

				{!loading && !error && !data?.items.length ? (
					<EmptyState icon={<Building2 size={18} />} title="No workspaces match">
						{search.q ? `Nothing matched “${search.q}”.` : 'No workspace has been created yet.'}
					</EmptyState>
				) : null}
				{error ? <ErrorState message={error} onRetry={refetch} /> : null}
			</TableShell>

			<div className="mt-3 flex justify-end">
				<Pagination
					page={search.page}
					pageCount={pageCount(data?.total ?? 0, search.limit)}
					total={data?.total ?? 0}
					pageSize={search.limit}
					onChange={(page) => void navigate({ to: '/console/workspaces', search: { ...search, page } })}
				/>
			</div>

			<ReasonDialog
				request={suspendRequest}
				busy={suspend.isPending}
				error={dialogError}
				onCancel={() => {
					setTarget(null);
					setSlugs(null);
					setDialogError(undefined);
				}}
				onConfirm={(reason) => {
					if (!slugs) return;
					suspend.mutate({ slug: slugs.slug, reason });
				}}
			/>

			<ConfirmDialog
				open={target === 'restore'}
				title="Restore this workspace"
				body={`${slugs?.name ?? ''} will be live again and every member regains access.`}
				confirmLabel="Restore workspace"
				busy={suspend.isPending}
				error={dialogError}
				danger={false}
				onCancel={() => {
					setTarget(null);
					setSlugs(null);
					setDialogError(undefined);
				}}
				onConfirm={() => {
					if (!slugs) return;
					suspend.mutate({ slug: slugs.slug, reason: null });
				}}
			/>
		</>
	);
}
