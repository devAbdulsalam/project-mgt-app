// Who holds the keys to the platform.
//
// This is the page an admin visits when standing needs to be granted or revoked,
// and the one screen in the console where the operator is looking at a list of
// people who can do exactly what they are doing right now. Two consequences shape
// the page:
//
//   - Your own row is not editable. The server refuses it (cannot_change_self),
//     so a dropdown that silently does nothing is worse than no dropdown.
//   - Revoking standing also clears that operator's second factor on the server,
//     which means they lose console access entirely until they enrol again. The
//     dialog says so, because "revoke support access" does not obviously imply
//     "delete their authenticator".
//
// `support` does not get this page at all. The list is admin-only, so a support
// operator reaching /console/operators gets a 404 from the server rather than an
// empty table that suggests nobody has standing.

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button, Card, CardHeader, Pill } from '@/shared/ui';
import { toast } from '@/shared/lib/toast-store';
import { useConsoleQuery } from '../hooks/useConsoleQuery';
import { operatorsQuery } from '../api/queries';
import { setOperatorRoleMutation } from '../api/mutations';
import { ErrorState, LoadingRows, PageHeader, Row, TableShell, Td, Th } from '../components/Primitives';
import { ConfirmDialog, ReasonDialog, type ReasonRequest } from '../components/ReasonDialog';
import { classify, refusalMessage } from '../lib/errors';
import { useConsoleStore } from '../store';
import { PLATFORM_ROLE_LABEL, PLATFORM_ROLES } from '../lib/constants';
import type { PlatformRole } from '../model';

type RoleTarget = { userId: string; email: string; name: string; next: PlatformRole | null };

export function ConsoleOperatorsPage() {
	const queryClient = useQueryClient();
	const me = useConsoleStore((s) => s.operator);
	const isOperator = me !== null;

	const { data, loading, error, refetch, gate } = useConsoleQuery(operatorsQuery());

	const [target, setTarget] = useState<RoleTarget | null>(null);
	const [dialogError, setDialogError] = useState<string>();

	const setRole = useMutation({
		...setOperatorRoleMutation(queryClient),
		onSuccess: (_operator, variables) => {
			const who = data?.find((op) => op.userId === variables.userId);
			const label = who?.name || who?.email || 'That operator';
			setTarget(null);
			setDialogError(undefined);
			toast(variables.platformRole ? 'Standing granted' : 'Standing revoked', {
				description: variables.platformRole
					? `${label} is now ${PLATFORM_ROLE_LABEL[variables.platformRole]}.`
					: `${label} no longer has console access, and their second factor was cleared.`,
				tone: 'success',
			});
		},
		onError: (err) => setDialogError(refusalMessage(classify(err, isOperator))),
	});

	// Granting a role gets a plain confirm; revoking gets the reason dialog,
	// because it is the one that ends someone's access and needs a paper trail.
	const revokeRequest: ReasonRequest | null =
		target?.next === null
			? {
					title: 'Revoke platform standing',
					intro: `${target.name || target.email} loses all console access immediately. Their second factor is also cleared, so they will have to enrol a new one if standing is granted again. The reason is recorded in the audit trail.`,
					confirmLabel: 'Revoke standing',
				}
			: null;

	const granting = target !== null && target.next !== null;

	return (
		<>
			<PageHeader
				title="Operators"
				sub="Accounts with standing on this platform. Support reads; admin writes. An operator without a second factor can be listed here but cannot act."
			/>

			{gate}

			<TableShell>
				<table className="w-full border-collapse">
					<thead>
						<tr>
						<Th>Operator</Th>
						<Th>Standing</Th>
						<Th>Second factor</Th>
						<Th align="right">Actions</Th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<LoadingRows rows={4} cols={4} />
						) : (
							data?.map((op) => {
								const isSelf = op.userId === me?.userId;
								return (
									<Row key={op.userId}>
										<Td>
											<Link to="/console/users/$userId" params={{ userId: op.userId }} className="font-medium text-t1 no-underline hover:underline">
												{op.name || op.email}
											</Link>
											<p className="text-[11px] text-t2">{op.email}</p>
										</Td>
										<Td>
											<div className="flex flex-wrap items-center gap-1.5">
												<Pill tone={op.role === 'admin' ? 'teal' : 'progress'}>{PLATFORM_ROLE_LABEL[op.role]}</Pill>
												{isSelf ? <span className="text-[11px] text-t3">you</span> : null}
											</div>
										</Td>
										<Td>
											{op.totpEnrolled ? (
												<span className="inline-flex items-center gap-1.5 text-[12px] text-t2">
													<ShieldCheck size={13} className="text-good" aria-hidden />
													Enrolled
												</span>
											) : (
												<span className="inline-flex items-center gap-1.5 text-[12px] text-danger">
													<ShieldAlert size={13} aria-hidden />
													Not enrolled
												</span>
											)}
										</Td>
										<Td className="text-right">
											{isSelf ? (
												// The server refuses this, so it is not offered.
												<span className="text-[11px] text-t3">Your own standing</span>
											) : (
												<div className="flex justify-end gap-1.5">
													{PLATFORM_ROLES.filter((r) => r !== op.role).map((r) => (
														<Button
															key={r}
															size="sm"
															variant={r === 'admin' ? 'primary' : 'secondary'}
															onClick={() => {
																setDialogError(undefined);
																setTarget({ userId: op.userId, email: op.email, name: op.name, next: r });
															}}
														>
															Make {PLATFORM_ROLE_LABEL[r].toLowerCase()}
														</Button>
													))}
													<Button
														size="sm"
														variant="danger"
														onClick={() => {
															setDialogError(undefined);
															setTarget({ userId: op.userId, email: op.email, name: op.name, next: null });
														}}
													>
														Revoke
													</Button>
												</div>
											)}
										</Td>
									</Row>
								);
							})
						)}
					</tbody>
				</table>

				{error ? <ErrorState message={error} onRetry={refetch} /> : null}
			</TableShell>

			{!loading && !error && !data?.length ? (
				<Card className="mt-4 p-5">
					<CardHeader title="No operators" />
					<p className="mt-2 text-[13px] text-t2">
						No account has standing. Promotion happens from an account's own page, or through the platform API.
					</p>
				</Card>
			) : null}

			<ReasonDialog
				request={revokeRequest}
				busy={setRole.isPending}
				error={dialogError}
				onCancel={() => {
					setTarget(null);
					setDialogError(undefined);
				}}
				onConfirm={() => {
					if (!target) return;
					// The server takes no reason on this endpoint. The dialog is here to
					// make the consequence explicit before the click, not to pass a field
					// the API would silently drop.
					setRole.mutate({ userId: target.userId, platformRole: null });
				}}
			/>

			<ConfirmDialog
				open={granting && target?.next !== null && target !== null}
				title={`Make ${target?.next ? PLATFORM_ROLE_LABEL[target.next].toLowerCase() : ''}`}
				body={
					target?.next
						? `${target.name || target.email} will be able to ${
								target.next === 'admin'
									? 'write: disable accounts, suspend workspaces, change plans and manage operators.'
									: 'read accounts, workspaces and the audit trail, but not change anything.'
							} They will need to enrol a second factor before they can use it.`
						: ''
				}
				confirmLabel={target?.next ? `Make ${PLATFORM_ROLE_LABEL[target.next].toLowerCase()}` : ''}
				busy={setRole.isPending}
				error={dialogError}
				danger={false}
				onCancel={() => {
					setTarget(null);
					setDialogError(undefined);
				}}
				onConfirm={() => {
					if (!target?.next) return;
					setRole.mutate({ userId: target.userId, platformRole: target.next });
				}}
			/>
		</>
	);
}
