// One account, everything an operator can do to it.
//
// The order on this screen is deliberate: state first, then what is wrong, then
// the actions. A support call usually opens with "they say they cannot get in",
// and the two numbers that answer it — failed attempts and the lockout window —
// are the reason they are on this screen at all rather than buried in a generic
// profile layout.
//
// Every action here is admin-only, and the action bar is hidden rather than
// disabled for support: a row of greyed-out buttons is a worse answer than no
// row, because it implies the operator lacks a permission they could ask for.

import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { ArrowLeft, Building2 } from 'lucide-react';
import { Button, Card, CardHeader, Dialog, Field, Input, Pill } from '@/shared/ui';
import { toast } from '@/shared/lib/toast-store';
import { useConsoleQuery } from '../hooks/useConsoleQuery';
import { userQuery } from '../api/queries';
import { changeEmailMutation, sendPasswordResetMutation, setUserDisabledMutation, signOutUserMutation, unlockUserMutation } from '../api/mutations';
import { Detail, ErrorState, Pending, Row, TableShell, Td, Th } from '../components/Primitives';
import { ConfirmDialog, ReasonDialog, type ReasonRequest } from '../components/ReasonDialog';
import { relativeTime } from '../hooks/useElevationClock';
import { classify, fieldError, refusalMessage } from '../lib/errors';
import { useConsoleStore } from '../store';
import { MEMBER_ROLE_LABEL, PLATFORM_ROLE_LABEL } from '../lib/constants';

/** Which way the disable endpoint is being pushed, or neither. */
type DisableMode = 'disable' | 'restore' | null;

export function ConsoleUserDetailPage() {
	const { userId } = useParams({ from: '/console/users/$userId' }) as { userId: string };
	const queryClient = useQueryClient();
	const operator = useConsoleStore((s) => s.operator);
	const isOperator = operator !== null;
	const canWrite = operator?.role === 'admin';

	const { data: user, loading, error, refetch, gate } = useConsoleQuery(userQuery(userId));

	const [disableFor, setDisableFor] = useState<DisableMode>(null);
	const [dialogError, setDialogError] = useState<string>();
	const [emailOpen, setEmailOpen] = useState(false);
	const [signOutOpen, setSignOutOpen] = useState(false);

	// Dialog errors stay in the dialog: the reason or address is worth correcting
	// and re-sending, and a toast leaves the operator guessing which field the
	// server objected to.
	const keepOpen = (err: unknown) => setDialogError(refusalMessage(classify(err, isOperator)));
	const toToast = (err: unknown) => toast(refusalMessage(classify(err, isOperator)), { tone: 'danger' });

	const setDisabled = useMutation({
		...setUserDisabledMutation(queryClient),
		onSuccess: (updated) => {
			setDisableFor(null);
			setDialogError(undefined);
			toast(updated.disabled ? 'Account disabled' : 'Account restored', {
				description: updated.disabled ? `${updated.email} has been signed out everywhere.` : `${updated.email} can sign in again.`,
				tone: 'success',
			});
		},
		onError: keepOpen,
	});

	const unlock = useMutation({
		...unlockUserMutation(queryClient),
		onSuccess: (updated) =>
			toast(updated.locked ? 'Counter cleared, still locked' : 'Account unlocked', {
				// The server only clears the counter; the lockout window is its own
				// clock, so an operator who expects this to unblock someone now is
				// being told the truth rather than left to find out.
				description: updated.locked
					? 'Failed attempts are reset, but the lockout window has not elapsed — the account is still locked.'
					: 'Failed attempts cleared and the account is unlocked.',
				tone: updated.locked ? 'default' : 'success',
			}),
		onError: toToast,
	});

	const resetPassword = useMutation({
		...sendPasswordResetMutation(queryClient),
		onSuccess: () =>
			toast('Reset link sent', {
				description: `A link was emailed to ${user?.email}. It expires shortly, and the operator never sees the value.`,
				tone: 'success',
			}),
		onError: toToast,
	});

	const signOut = useMutation({
		...signOutUserMutation(queryClient),
		onSuccess: () => {
			setSignOutOpen(false);
			toast('Signed out everywhere', { description: 'Every session for this account has been revoked.', tone: 'success' });
		},
		onError: keepOpen,
	});

	const closeEmail = () => {
		setEmailOpen(false);
		setDialogError(undefined);
	};

	// Defined before the early returns below, so the dialog keeps its identity
	// across the loading and error states instead of remounting when data lands.
	const changeEmail = useMutation({
		...changeEmailMutation(queryClient),
		onSuccess: () => {
			closeEmail();
			toast('Address changed', { description: 'A verification mail is on its way to the new address.', tone: 'success' });
		},
	});

	if (loading) {
		return (
			<Card className="p-6">
				<Pending label="Loading account…" />
			</Card>
		);
	}

	if (error || !user) {
		return (
			<Card className="p-0">
				{gate}
				{error ? <ErrorState message={error} onRetry={refetch} /> : null}
			</Card>
		);
	}

	const disableRequest: ReasonRequest | null =
		disableFor === 'disable'
			? {
					title: 'Disable this account',
					intro: `${user.email} will be signed out of every device immediately and will not be able to sign in. The reason you give is recorded in the audit trail, where the account's owner and other operators can read it.`,
					confirmLabel: 'Disable account',
				}
			: null;

	return (
		<>
			<div className="mb-4">
				<Link to="/console/users" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-t2 no-underline hover:text-t1">
					<ArrowLeft size={14} aria-hidden />
					All accounts
				</Link>
			</div>

			<div className="mb-5 flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0">
					<h1 className="text-xl font-semibold text-t1">{user.name || user.email}</h1>
					<div className="mt-1 flex flex-wrap items-center gap-1.5">
						<span className="text-[13px] text-t2">{user.email}</span>
						{user.platformRole ? <Pill tone="teal">Operator: {PLATFORM_ROLE_LABEL[user.platformRole]}</Pill> : null}
						{user.disabled ? <Pill tone="blocked">Disabled</Pill> : null}
						{user.locked ? <Pill tone="pending">Locked</Pill> : null}
						{!user.emailVerified ? <Pill tone="closed">Email unverified</Pill> : null}
					</div>
				</div>
				{canWrite ? (
					<div className="flex flex-wrap gap-2">
						<Button variant="secondary" loading={resetPassword.isPending} onClick={() => resetPassword.mutate(user.id)}>
							Send password reset
						</Button>
						<Button variant="secondary" onClick={() => setEmailOpen(true)}>
							Change email
						</Button>
						<Button variant="secondary" onClick={() => setSignOutOpen(true)}>
							Sign out
						</Button>
						<Button
							variant={user.disabled ? 'soft' : 'danger'}
							onClick={() => {
								setDialogError(undefined);
								setDisableFor(user.disabled ? 'restore' : 'disable');
							}}
						>
							{user.disabled ? 'Restore account' : 'Disable account'}
						</Button>
					</div>
				) : (
					<span className="text-xs text-t2">Read only · write actions need admin standing</span>
				)}
			</div>

			{gate}

			<div className="grid gap-5 lg:grid-cols-2">
				<Card className="p-0">
					<CardHeader title="Sign-in state" sub="The numbers that explain a failed sign-in" className="p-5 pb-2" />
					<dl className="px-5 pb-4">
						<Detail label="Last sign-in">{user.lastLoginAt ? relativeTime(user.lastLoginAt) : 'Never'}</Detail>
						<Detail label="Failed attempts">
							{user.failedAttempts === 0 ? <span className="text-t2">None</span> : <span className="font-semibold text-danger">{user.failedAttempts}</span>}
						</Detail>
						<Detail label="Locked until">
							{user.locked ? (user.lockedUntil ? relativeTime(user.lockedUntil) : 'Yes') : <span className="text-t2">Not locked</span>}
						</Detail>
						<Detail label="Email verified">{user.emailVerified ? 'Yes' : 'No'}</Detail>
						<Detail label="Phone">{user.phone ?? <span className="text-t2">None</span>}</Detail>
						<Detail label="Workspaces">{user.orgCount}</Detail>
					</dl>
					{canWrite && user.locked ? (
						<div className="border-t border-border px-5 py-3">
							<Button size="sm" variant="secondary" loading={unlock.isPending} onClick={() => unlock.mutate(user.id)}>
								Unlock account
							</Button>
						</div>
					) : null}
				</Card>

				<Card className="p-0">
					<CardHeader title="Record" sub="Immutable facts about this account" className="p-5 pb-2" />
					<dl className="px-5 pb-4">
						<Detail label="Account ID">
							<code className="font-mono text-[11px] text-t2">{user.id}</code>
						</Detail>
						<Detail label="Joined">{relativeTime(user.createdAt)}</Detail>
						<Detail label="Disabled">
							{user.disabled ? (
								<>
									<span className="block">{user.disabledAt ? relativeTime(user.disabledAt) : 'Yes'}</span>
									{user.disabledReason ? <span className="mt-0.5 block text-[11px] font-normal text-t2">“{user.disabledReason}”</span> : null}
								</>
							) : (
								<span className="text-t2">No</span>
							)}
						</Detail>
					</dl>
				</Card>
			</div>

			<div className="mt-5">
				<TableShell>
					<table className="w-full border-collapse">
						<thead>
							<tr>
								<Th>Workspaces</Th>
								<Th>Role</Th>
								<Th>Status</Th>
								<Th>Workspace state</Th>
							</tr>
						</thead>
						<tbody>
							{user.orgs.length ? (
								user.orgs.map((m) => (
									<Row key={m.orgId}>
										<Td>
											<Link to="/console/workspaces/$slug" params={{ slug: m.slug }} className="font-medium text-t1 no-underline hover:underline">
												{m.name}
											</Link>
											<p className="text-[11px] text-t2">{m.slug}</p>
										</Td>
										<Td className="text-t2">{MEMBER_ROLE_LABEL[m.role]}</Td>
										<Td className="text-t2">{m.status}</Td>
										<Td>{m.suspended ? <Pill tone="blocked">Suspended</Pill> : <span className="text-t2">Active</span>}</Td>
									</Row>
								))
							) : (
								<Row>
									<Td>
										<span className="flex items-center gap-2 text-t2">
											<Building2 size={14} aria-hidden />
											This account belongs to no workspace.
										</span>
									</Td>
								</Row>
							)}
						</tbody>
					</table>
				</TableShell>
			</div>

			<ReasonDialog
				request={disableRequest}
				busy={setDisabled.isPending}
				error={dialogError}
				onCancel={() => {
					setDisableFor(null);
					setDialogError(undefined);
				}}
				onConfirm={(reason) => setDisabled.mutate({ userId: user.id, reason })}
			/>

			<ConfirmDialog
				open={disableFor === 'restore'}
				title="Restore this account"
				body={`${user.email} will be able to sign in and use the product again.`}
				confirmLabel="Restore account"
				busy={setDisabled.isPending}
				error={dialogError}
				danger={false}
				onCancel={() => {
					setDisableFor(null);
					setDialogError(undefined);
				}}
				onConfirm={() => setDisabled.mutate({ userId: user.id, reason: null })}
			/>

			<ConfirmDialog
				open={signOutOpen}
				title="Sign out everywhere"
				body={`Every session for ${user.email} is revoked immediately, on every device. They will need to sign in again. Their password and second factor are not changed.`}
				confirmLabel="Sign out everywhere"
				busy={signOut.isPending}
				error={dialogError}
				onCancel={() => {
					setSignOutOpen(false);
					setDialogError(undefined);
				}}
				onConfirm={() => signOut.mutate(user.id)}
			/>

			<ChangeEmailDialog open={emailOpen} userId={user.id} current={user.email} mutation={changeEmail} onClose={closeEmail} />
		</>
	);
}

interface ChangeEmailVars {
	userId: string;
	newEmail: string;
}

/**
 * Changing the address on an account.
 *
 * Worth a dialog rather than an inline field: the new address starts unverified
 * and a verification mail goes to it, so this is a consequential, hard-to-undo
 * step that deserves the same weight as the destructive ones above it.
 *
 * The mutation arrives as a prop so its success and failure handling stays with
 * the rest of this page's actions, and this component is only the form.
 */
function ChangeEmailDialog({
	open,
	userId,
	current,
	mutation,
	onClose,
}: {
	open: boolean;
	userId: string;
	current: string;
	mutation: UseMutationResult<unknown, Error, ChangeEmailVars, unknown>;
	onClose: () => void;
}) {
	const [value, setValue] = useState('');
	const [touched, setTouched] = useState(false);
	const [wasOpen, setWasOpen] = useState(open);

	// Clear on open, so a previous address is not one keystroke from being
	// resubmitted. Adjusted during render rather than in an effect, which would
	// show the old address for a frame after the dialog appeared.
	if (open !== wasOpen) {
		setWasOpen(open);
		if (open) {
			setValue('');
			setTouched(false);
		}
	}

	if (!open) return null;

	const trimmed = value.trim();
	// Deliberately loose: the server owns what an address may look like, and a
	// stricter client rule would only block legitimate addresses.
	const valid = trimmed.length >= 3 && trimmed.includes('@') && trimmed !== current;
	const invalid = touched && trimmed.length > 0 && !valid;

	return (
		<Dialog
			open
			onClose={onClose}
			title="Change email address"
			width="max-w-[460px]"
			footer={
				<div className="flex items-center justify-end gap-2">
					<Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
						Cancel
					</Button>
					<Button variant="primary" loading={mutation.isPending} disabled={!valid} onClick={() => mutation.mutate({ userId, newEmail: trimmed })}>
						Change address
					</Button>
				</div>
			}
		>
			<div className="px-5 py-5 sm:px-7">
				<p className="text-[13px] leading-relaxed text-t2">
					The account will sign in with this address from now on, and it starts <b>unverified</b> — a verification mail is sent
					to it before the change is usable. Recorded in the audit trail.
				</p>
				<form
					className="mt-4"
					onSubmit={(e) => {
						e.preventDefault();
						if (valid && !mutation.isPending) mutation.mutate({ userId, newEmail: trimmed });
					}}
				>
					<Field
						label="New address"
						required
						hint={`currently ${current}`}
						error={invalid ? 'Enter an address different from the current one.' : undefined}
					>
						{(id, describedBy) => (
							<Input
								id={id}
								aria-describedby={describedBy}
								autoFocus
								type="email"
								value={value}
								onChange={(e) => {
									setValue(e.target.value);
									setTouched(true);
								}}
								placeholder="name@company.com"
								invalid={invalid}
							/>
						)}
					</Field>
					{/* Lets Enter submit without a visible second button. */}
					<button type="submit" className="hidden" aria-hidden tabIndex={-1} />
				</form>
				{mutation.isError ? (
					<p role="alert" className="mt-3 text-xs text-danger">
						{fieldError(mutation.error, 'new_email', refusalMessage(classify(mutation.error, true)))}
					</p>
				) : null}
			</div>
		</Dialog>
	);
}
