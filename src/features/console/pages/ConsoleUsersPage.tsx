// Every account on the platform.
//
// The list is the operator surface's centre of gravity, so it is built around
// the questions support actually arrives with: who is this person, are they
// locked out, are they an operator, and which workspaces would I break if I
// touched them. Hence `org_count` in its own column and the state flags on the
// row rather than behind a click.
//
// The destructive actions reach a dialog that names the consequence, because
// `PUT /users/:id/disabled` with a null reason turns an account back on. A row
// of unlabelled icons over a table of accounts is how someone disables the
// wrong person at 6pm on a Friday.

import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { Button, EmptyState, Pagination, Pill } from '@/shared/ui';
import { toast } from '@/shared/lib/toast-store';
import { useConsoleQuery } from '../hooks/useConsoleQuery';
import { usersQuery } from '../api/queries';
import { setUserDisabledMutation, signOutUserMutation, unlockUserMutation } from '../api/mutations';
import { pageCount, usersSearchSchema, type UsersSearch } from '../model';
import { ErrorState, LoadingRows, PageHeader, Row, SearchBox, TableShell, Td, Th } from '../components/Primitives';
import { ConfirmDialog, ReasonDialog, type ReasonRequest } from '../components/ReasonDialog';
import { relativeTime } from '../hooks/useElevationClock';
import { refusalMessage, classify } from '../lib/errors';
import { useConsoleStore } from '../store';

/** Which way the disable endpoint is being pushed. */
type DisableMode = 'disable' | 'restore';

interface DisableTarget {
	userId: string;
	email: string;
	mode: DisableMode;
}

export function ConsoleUsersPage() {
	const search = useSearch({ from: '/console/users' }) as UsersSearch;
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const operator = useConsoleStore((s) => s.operator);
	const isOperator = operator !== null;
	const canWrite = operator?.role === 'admin';

	// Local mirror so typing stays responsive; the URL is only written on a pause.
	// Without the pause, every keystroke is a navigation and a request.
	const [term, setTerm] = useState(search.q ?? '');
	const [synced, setSynced] = useState(search.q ?? '');

	// Adjusting during render rather than in an effect: an effect would leave the
	// box showing the old term for one paint after the URL changed underneath it,
	// which reads as the search not working when you press Back.
	if ((search.q ?? '') !== synced) {
		setSynced(search.q ?? '');
		setTerm(search.q ?? '');
	}

	useEffect(() => {
		if ((search.q ?? '') === term) return;
		const id = setTimeout(() => {
			void navigate({ to: '/console/users', search: { ...search, q: term || undefined, page: 1 } });
		}, 300);
		return () => clearTimeout(id);
	}, [term, search, navigate]);

	const { data, loading, isFetching, error, refetch, gate } = useConsoleQuery(usersQuery(usersSearchSchema.parse(search)));

	const [target, setTarget] = useState<DisableTarget | null>(null);
	const [dialogError, setDialogError] = useState<string>();

	const setDisabled = useMutation({
		...setUserDisabledMutation(queryClient),
		onSuccess: (user) => {
			setTarget(null);
			setDialogError(undefined);
			toast(user.disabled ? 'Account disabled' : 'Account restored', {
				description: user.disabled ? `${user.email} has been signed out everywhere.` : `${user.email} can sign in again.`,
				tone: 'success',
			});
		},
		// Stays in the dialog: the reason is worth correcting and re-sending, and a
		// toast would leave the operator guessing which field the server objected to.
		onError: (err) => setDialogError(refusalMessage(classify(err, isOperator))),
	});

	const unlock = useMutation({
		...unlockUserMutation(queryClient),
		onSuccess: (user) => toast('Account unlocked', { description: `${user.email} can attempt to sign in again.`, tone: 'success' }),
		onError: (err) => toast(refusalMessage(classify(err, isOperator)), { tone: 'danger' }),
	});

	const signOut = useMutation({
		...signOutUserMutation(queryClient),
		onSuccess: (_result, userId) => {
			const email = data?.items.find((u) => u.id === userId)?.email;
			toast('Signed out everywhere', { description: email ? `Every session for ${email} has been revoked.` : 'All sessions revoked.', tone: 'success' });
		},
		onError: (err) => toast(refusalMessage(classify(err, isOperator)), { tone: 'danger' }),
	});

	// The two directions get different dialogs, not one shared one. A disable has
	// to collect a reason the server refuses to do without; a restore has no
	// reason to give, and routing it through the reason form would put a minimum
	// length in front of a button that must be one click to undo a mistake.
	const disableTarget = target?.mode === 'disable' ? target : null;
	const restoreTarget = target?.mode === 'restore' ? target : null;

	const disableRequest: ReasonRequest | null = disableTarget
		? {
				title: 'Disable this account',
				intro: `${disableTarget.email} will be signed out of every device immediately and will not be able to sign in. The reason you give is recorded in the audit trail, where the account's owner and other operators can read it.`,
				confirmLabel: 'Disable account',
			}
		: null;

	return (
		<>
			<PageHeader
				title="Accounts"
				sub="Every account on the platform, whether or not it belongs to a workspace. Search matches name and email."
				action={
					<span className="text-xs text-t2">
						{canWrite ? 'You have admin standing — write actions are available' : 'Read only · write actions need admin standing'}
					</span>
				}
			/>

			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<SearchBox value={term} onChange={setTerm} placeholder="Search name or email…" />
				{isFetching && !loading ? <span className="text-[11px] text-t3">Updating…</span> : null}
			</div>

			{gate}

			<TableShell>
				<table className="w-full border-collapse">
					<thead>
						<tr>
							<Th>Account</Th>
							<Th>State</Th>
							<Th>Workspaces</Th>
							<Th>Last seen</Th>
							<Th>Joined</Th>
							<Th align="right">Actions</Th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<LoadingRows rows={8} cols={6} />
						) : (
							data?.items.map((user) => (
								<Row key={user.id}>
									<Td>
										<Link to="/console/users/$userId" params={{ userId: user.id }} className="font-medium text-t1 no-underline hover:underline">
											{user.name || user.email}
										</Link>
										<p className="text-[11px] text-t2">{user.email}</p>
									</Td>
									<Td>
										<div className="flex flex-wrap items-center gap-1.5">
											{user.platformRole ? <Pill tone="teal">Operator: {user.platformRole}</Pill> : null}
											{user.disabled ? <Pill tone="blocked">Disabled</Pill> : null}
											{user.locked ? <Pill tone="pending">Locked</Pill> : null}
											{!user.emailVerified ? <Pill tone="closed">Unverified</Pill> : null}
											{!user.disabled && !user.locked && user.emailVerified && !user.platformRole ? <Pill tone="done">Active</Pill> : null}
										</div>
									</Td>
									<Td className="text-t2">{user.orgCount}</Td>
									<Td className="text-xs text-t2">{relativeTime(user.lastLoginAt)}</Td>
									<Td className="text-xs text-t2">{relativeTime(user.createdAt)}</Td>
									<Td className="text-right">
										{canWrite ? (
											<div className="flex justify-end gap-1.5">
												{user.locked ? (
													<Button size="sm" variant="secondary" loading={unlock.isPending} onClick={() => unlock.mutate(user.id)}>
														Unlock
													</Button>
												) : null}
												<Button
													size="sm"
													variant="secondary"
													loading={signOut.isPending}
													onClick={() => {
														const ok = window.confirm(`Sign ${user.email} out of every device?\n\nAll of their refresh tokens are revoked. They will need to sign in again.`);
														if (ok) signOut.mutate(user.id);
													}}
												>
													Sign out
												</Button>
												<Button
													size="sm"
													variant={user.disabled ? 'soft' : 'danger'}
													onClick={() => {
														setDialogError(undefined);
														setTarget({ userId: user.id, email: user.email, mode: user.disabled ? 'restore' : 'disable' });
													}}
												>
													{user.disabled ? 'Restore' : 'Disable'}
												</Button>
											</div>
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
					<EmptyState icon={<Users size={18} />} title="No accounts match">
						{search.q ? `Nothing matched “${search.q}”.` : 'There are no accounts yet.'}
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
					onChange={(page) => void navigate({ to: '/console/users', search: { ...search, page } })}
				/>
			</div>

			<ReasonDialog
				request={disableRequest}
				busy={setDisabled.isPending}
				error={dialogError}
				onCancel={() => {
					setTarget(null);
					setDialogError(undefined);
				}}
				onConfirm={(reason) => {
					if (!disableTarget) return;
					setDisabled.mutate({ userId: disableTarget.userId, reason });
				}}
			/>

			<ConfirmDialog
				open={restoreTarget !== null}
				title="Restore this account"
				body={`${restoreTarget?.email ?? ''} will be able to sign in and use the product again.`}
				confirmLabel="Restore account"
				busy={setDisabled.isPending}
				error={dialogError}
				danger={false}
				onCancel={() => {
					setTarget(null);
					setDialogError(undefined);
				}}
				onConfirm={() => {
					if (!restoreTarget) return;
					// The absence of a reason is what the server reads as "off", which
					// is how one endpoint covers both directions.
					setDisabled.mutate({ userId: restoreTarget.userId, reason: null });
				}}
			/>
		</>
	);
}
