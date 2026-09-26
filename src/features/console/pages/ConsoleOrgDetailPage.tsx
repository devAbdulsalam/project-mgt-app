// One workspace: its standing, its plan, and who is in it.
//
// Member rows carry a role dropdown rather than a dialog, because changing
// someone's role in a workspace is a routine correction — an intern promoted,
// somebody moved teams — and the server treats it as idempotent (PUT creates the
// membership if it is missing, which is how an owner who lost their seat gets
// repaired). Making the common case three clicks deep would be wrong.
//
// Removal is the exception, and it goes through a confirm that names the last
// owner case explicitly, because the server refuses it — the operator should
// learn that from the dialog rather than from a toast.

import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserMinus } from 'lucide-react';
import { Button, Card, CardHeader, Pill, Select } from '@/shared/ui';
import { toast } from '@/shared/lib/toast-store';
import { useConsoleQuery } from '../hooks/useConsoleQuery';
import { orgQuery } from '../api/queries';
import { removeMemberMutation, setMemberRoleMutation, setOrgPlanMutation, setOrgSuspendedMutation } from '../api/mutations';
import { Detail, ErrorState, Pending, Row, TableShell, Td, Th } from '../components/Primitives';
import { ConfirmDialog, ReasonDialog, type ReasonRequest } from '../components/ReasonDialog';
import { relativeTime } from '../hooks/useElevationClock';
import { classify, refusalMessage } from '../lib/errors';
import { useConsoleStore } from '../store';
import { MEMBER_ROLE_LABEL, MEMBER_ROLES, PLANS, PLAN_LABEL } from '../lib/constants';
import type { MemberRole, Plan } from '../model';

export function ConsoleOrgDetailPage() {
	const { slug } = useParams({ from: '/console/workspaces/$slug' }) as { slug: string };
	const queryClient = useQueryClient();
	const operator = useConsoleStore((s) => s.operator);
	const isOperator = operator !== null;
	const canWrite = operator?.role === 'admin';

	const { data: org, loading, error, refetch, gate } = useConsoleQuery(orgQuery(slug));

	const [suspendOpen, setSuspendOpen] = useState(false);
	const [restoreOpen, setRestoreOpen] = useState(false);
	const [removeMember, setRemoveMember] = useState<{ userId: string; name: string; email: string; role: MemberRole } | null>(null);
	const [dialogError, setDialogError] = useState<string>();

	const toToast = (err: unknown) => toast(refusalMessage(classify(err, isOperator)), { tone: 'danger' });

	const suspend = useMutation({
		...setOrgSuspendedMutation(queryClient),
		onSuccess: (updated) => {
			setSuspendOpen(false);
			setRestoreOpen(false);
			setDialogError(undefined);
			toast(updated.suspended ? 'Workspace suspended' : 'Workspace restored', { tone: 'success' });
		},
		onError: (err) => setDialogError(refusalMessage(classify(err, isOperator))),
	});

	const setPlan = useMutation({
		...setOrgPlanMutation(queryClient),
		onSuccess: (updated) => toast('Plan changed', { description: `${updated.name} is now on ${PLAN_LABEL[updated.plan]}.`, tone: 'success' }),
		onError: toToast,
	});

	const setRole = useMutation({
		...setMemberRoleMutation(queryClient),
		onSuccess: (_membership, variables) => {
			const member = org?.members.find((m) => m.userId === variables.userId);
			toast('Role updated', { description: `${member?.name ?? member?.email ?? 'That member'} is now ${MEMBER_ROLE_LABEL[variables.role]}.`, tone: 'success' });
		},
		// A refusal here is nearly always last_owner, which is a real constraint
		// rather than a bug — so the server's wording is passed through verbatim.
		onError: toToast,
	});

	const remove = useMutation({
		...removeMemberMutation(queryClient),
		onSuccess: (_data, variables) => {
			const who = org?.members.find((m) => m.userId === variables.userId);
			setRemoveMember(null);
			toast('Member removed', { description: `${who?.name ?? who?.email ?? 'That member'} no longer has access.`, tone: 'success' });
		},
		onError: (err) => setDialogError(refusalMessage(classify(err, isOperator))),
	});

	if (loading) {
		return (
			<Card className="p-6">
				<Pending label="Loading workspace…" />
			</Card>
		);
	}

	if (error || !org) {
		return (
			<Card className="p-0">
				{gate}
				{error ? <ErrorState message={error} onRetry={refetch} /> : null}
			</Card>
		);
	}

	const owners = org.members.filter((m) => m.role === 'owner');
	const suspendRequest: ReasonRequest | null = suspendOpen
		? {
				title: 'Suspend this workspace',
				intro: `Every member of ${org.name} loses access immediately. Their data and their sign-in are untouched, and the workspace returns the moment it is restored.`,
				confirmLabel: 'Suspend workspace',
				initial: org.suspendedReason ?? '',
			}
		: null;

	// Usage is whatever the server chose to count; rendered generically so a new
	// counter on the backend shows up here without a frontend change.
	const usage = Object.entries(org.usage);

	return (
		<>
			<div className="mb-4">
				<Link to="/console/workspaces" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-t2 no-underline hover:text-t1">
					<ArrowLeft size={14} aria-hidden />
					All workspaces
				</Link>
			</div>

			<div className="mb-5 flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0">
					<h1 className="text-xl font-semibold text-t1">{org.name}</h1>
					<div className="mt-1 flex flex-wrap items-center gap-1.5">
						<code className="font-mono text-[12px] text-t2">{org.slug}</code>
						{org.suspended ? <Pill tone="blocked">Suspended</Pill> : <Pill tone="done">Live</Pill>}
					</div>
				</div>
				{canWrite ? (
					<Button
						variant={org.suspended ? 'soft' : 'danger'}
						onClick={() => {
							setDialogError(undefined);
							if (org.suspended) setRestoreOpen(true);
							else setSuspendOpen(true);
						}}
					>
						{org.suspended ? 'Restore workspace' : 'Suspend workspace'}
					</Button>
				) : null}
			</div>

			{gate}

			{org.suspended && org.suspendedReason ? (
				<div className="mb-5 rounded-sm border border-warning bg-warning-bg px-4 py-3">
					<p className="text-[13px] font-semibold text-warning-fg">Suspended {org.suspendedAt ? relativeTime(org.suspendedAt) : ''}</p>
					<p className="mt-0.5 text-[13px] text-t2">“{org.suspendedReason}”</p>
				</div>
			) : null}

			<div className="mb-5 grid gap-5 lg:grid-cols-2">
				<Card className="p-0">
					<CardHeader title="Workspace" className="p-5 pb-2" />
					<dl className="px-5 pb-4">
						<Detail label="Workspace ID">
							<code className="font-mono text-[11px] text-t2">{org.id}</code>
						</Detail>
						<Detail label="Ticket prefix">{org.prefix ?? <span className="text-t2">None</span>}</Detail>
						<Detail label="Members">{org.memberCount}</Detail>
						<Detail label="Owners">{owners.length}</Detail>
						<Detail label="Created">{relativeTime(org.createdAt)}</Detail>
					</dl>
				</Card>

				<Card className="p-0">
					<CardHeader title="Plan" sub="Change takes effect on the next invoice" className="p-5 pb-2" />
					<div className="px-5 pb-5">
						{canWrite ? (
							<Select
								value={org.plan}
								aria-label="Plan"
								disabled={setPlan.isPending}
								onChange={(e) => setPlan.mutate({ slug: org.slug, plan: e.target.value as Plan })}
							>
								{PLANS.map((p) => (
									<option key={p} value={p}>
										{PLAN_LABEL[p]}
									</option>
								))}
							</Select>
						) : (
							<p className="text-[13px] text-t1">{PLAN_LABEL[org.plan]}</p>
						)}

						{usage.length ? (
							<dl className="mt-4">
								{usage.map(([key, value]) => (
									<Detail key={key} label={key.replace(/_/g, ' ')}>
										{typeof value === 'number' ? value.toLocaleString() : String(value)}
									</Detail>
								))}
							</dl>
						) : (
							<p className="mt-3 text-[12px] text-t3">No usage recorded yet.</p>
						)}
					</div>
				</Card>
			</div>

			<TableShell>
				<table className="w-full border-collapse">
					<thead>
						<tr>
							<Th>Member</Th>
							<Th>Role</Th>
							<Th>Status</Th>
							<Th>Last seen</Th>
							<Th align="right">Actions</Th>
						</tr>
					</thead>
					<tbody>
						{org.members.map((member) => (
							<Row key={member.userId}>
								<Td>
									<Link to="/console/users/$userId" params={{ userId: member.userId }} className="font-medium text-t1 no-underline hover:underline">
										{member.name || member.email}
									</Link>
									<p className="text-[11px] text-t2">{member.email}</p>
								</Td>
								<Td>
									{canWrite ? (
										<Select
											value={member.role}
											aria-label={`Role for ${member.email}`}
											disabled={setRole.isPending}
											className="min-w-[120px]"
											onChange={(e) => setRole.mutate({ slug: org.slug, userId: member.userId, role: e.target.value as MemberRole })}
										>
											{MEMBER_ROLES.map((r) => (
												<option key={r} value={r}>
													{MEMBER_ROLE_LABEL[r]}
												</option>
											))}
										</Select>
									) : (
										<span className="text-t2">{MEMBER_ROLE_LABEL[member.role]}</span>
									)}
								</Td>
								<Td>
									<div className="flex flex-wrap items-center gap-1.5">
										{member.disabled ? <Pill tone="blocked">Account disabled</Pill> : null}
										<span className="text-[11px] text-t2">{member.status}</span>
									</div>
								</Td>
								<Td className="text-xs text-t2">{member.lastLoginAt ? relativeTime(member.lastLoginAt) : 'Never'}</Td>
								<Td className="text-right">
									{canWrite ? (
										<Button
											size="sm"
											variant="ghost"
											onClick={() => {
												setDialogError(undefined);
												setRemoveMember({ userId: member.userId, name: member.name, email: member.email, role: member.role });
											}}
										>
											<UserMinus size={13} aria-hidden />
											Remove
										</Button>
									) : null}
								</Td>
							</Row>
						))}
					</tbody>
				</table>
			</TableShell>

			<ReasonDialog
				request={suspendRequest}
				busy={suspend.isPending}
				error={dialogError}
				onCancel={() => {
					setSuspendOpen(false);
					setDialogError(undefined);
				}}
				onConfirm={(reason) => suspend.mutate({ slug: org.slug, reason })}
			/>

			<ConfirmDialog
				open={restoreOpen}
				title="Restore this workspace"
				body={`${org.name} will be live again and every member regains access.`}
				confirmLabel="Restore workspace"
				busy={suspend.isPending}
				error={dialogError}
				danger={false}
				onCancel={() => {
					setRestoreOpen(false);
					setDialogError(undefined);
				}}
				onConfirm={() => suspend.mutate({ slug: org.slug, reason: null })}
			/>

			<ConfirmDialog
				open={removeMember !== null}
				// The last-owner refusal is a server rule (last_owner), so the dialog
				// says so before the round trip rather than after it.
				title={removeMember?.role === 'owner' ? 'This member is an owner' : 'Remove this member'}
				body={
					removeMember?.role === 'owner'
						? `${removeMember.name || removeMember.email} owns this workspace. The server will refuse to remove the last owner — promote somebody else first, then come back.`
						: `${removeMember?.name || removeMember?.email} will lose access to ${org.name} immediately. Their account and any tickets they raised stay exactly as they are.`
				}
				confirmLabel="Remove member"
				busy={remove.isPending}
				error={dialogError}
				onCancel={() => {
					setRemoveMember(null);
					setDialogError(undefined);
				}}
				onConfirm={() => {
					if (!removeMember) return;
					remove.mutate({ slug: org.slug, userId: removeMember.userId });
				}}
			/>
		</>
	);
}
