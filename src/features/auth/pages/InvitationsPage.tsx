// Answering the invitations waiting on you.
//
// Reachable while signed in with no workspace, which is the state an invited
// person lands in: signing in no longer joins anything by itself, so this is
// where they say yes or no. It is also where someone with no invitations is
// told to create a workspace instead, so the "signed in with nowhere to go"
// state always has an answer on screen.

import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowRight, Building2, Check, X } from 'lucide-react';
import { AuthShell, PanelHeadline } from '@/shared/layouts/AuthShell';
import { Button, EmptyState, Pill } from '@/shared/ui';
import { toast } from '@/shared/lib/toast-store';
import { useAuthStore } from '@/shared/lib/auth-store';
import { relativeTime } from '@/shared/lib/time';
import { acceptInvitation, declineInvitation, listInvitations, type Invitation } from '../live';
import { AuthHeading, FormError } from '../components/AuthHeading';

export function InvitationsPage() {
	const navigate = useNavigate();
	const hydrate = useAuthStore((s) => s.hydrate);
	const user = useAuthStore((s) => s.user);

	const [invitations, setInvitations] = useState<Invitation[]>();
	const [error, setError] = useState<string>();
	/** The slug currently being answered, so only its own buttons spin. */
	const [busy, setBusy] = useState<string>();

	useEffect(() => {
		let cancelled = false;
		listInvitations()
			.then((list) => {
				if (!cancelled) setInvitations(list);
			})
			.catch(() => {
				if (!cancelled) {
					setInvitations([]);
					setError('We could not load your invitations. Try again in a moment.');
				}
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const accept = async (invite: Invitation) => {
		setBusy(invite.orgSlug);
		setError(undefined);
		try {
			const session = await acceptInvitation(invite.orgSlug);
			hydrate({
				user: session.user,
				org: session.org,
				orgs: session.orgs,
				permissions: session.permissions,
				pendingInvitations: session.pendingInvitations,
			});
			toast(`You joined ${invite.orgName}`, { tone: 'success' });
			navigate({ to: '/$org/dashboard', params: { org: invite.orgSlug }, replace: true, search: {} });
		} catch (e) {
			setError(e instanceof Error ? e.message : 'We could not accept that invitation.');
		} finally {
			setBusy(undefined);
		}
	};

	const decline = async (invite: Invitation) => {
		setBusy(invite.orgSlug);
		setError(undefined);
		try {
			await declineInvitation(invite.orgSlug);
			setInvitations((list) => (list ?? []).filter((i) => i.orgSlug !== invite.orgSlug));
			toast(`Declined ${invite.orgName}`);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'We could not decline that invitation.');
		} finally {
			setBusy(undefined);
		}
	};

	const pending = invitations ?? [];

	return (
		<AuthShell
			panel={
				<PanelHeadline title="You have been invited">
					A workspace holds its own tickets, clients and team. Joining one does not give it access to any
					other workspace you are in.
				</PanelHeadline>
			}
		>
			<AuthHeading title={pending.length ? 'Your invitations' : 'No invitations waiting'}>
				{pending.length
					? `Signed in as ${user?.email ?? 'you'}. Accept the ones you want to join.`
					: `Signed in as ${user?.email ?? 'you'}, but no workspace has invited you.`}
			</AuthHeading>

			<FormError message={error} />

			{invitations === undefined ? (
				<p className="text-[13px] text-t2">Loading your invitations…</p>
			) : pending.length === 0 ? (
				<div className="space-y-4">
					<EmptyState icon={<Building2 size={18} />} title="Nothing to answer">
						If you were expecting an invitation, check that it was sent to this email address.
					</EmptyState>
					<Button variant="primary" size="lg" block onClick={() => navigate({ to: '/signup/workspace' })}>
						Create a workspace <ArrowRight size={15} aria-hidden />
					</Button>
				</div>
			) : (
				<ul className="space-y-2.5">
					{pending.map((invite) => (
						<li
							key={invite.orgSlug}
							className="flex flex-wrap items-center gap-3 rounded-[10px] border border-border-strong bg-white p-4"
						>
							<span className="grid size-9 shrink-0 place-items-center rounded-sm bg-brand-100 text-brand-900">
								<Building2 size={16} aria-hidden />
							</span>
							<span className="min-w-0 flex-1 text-[13px]">
								<b className="block">{invite.orgName}</b>
								<span className="mt-0.5 block text-t2">
									{invite.invitedBy ? `Invited by ${invite.invitedBy}` : 'Invited'}
									{invite.invitedAt ? ` · ${relativeTime(invite.invitedAt)}` : ''}
								</span>
							</span>
							<Pill tone="open">{invite.role}</Pill>
							<span className="flex gap-1.5">
								<Button
									size="sm"
									variant="primary"
									loading={busy === invite.orgSlug}
									onClick={() => void accept(invite)}
								>
									<Check size={14} aria-hidden /> Accept
								</Button>
								<Button
									size="sm"
									variant="ghost"
									disabled={busy === invite.orgSlug}
									onClick={() => void decline(invite)}
								>
									<X size={14} aria-hidden /> Decline
								</Button>
							</span>
						</li>
					))}
				</ul>
			)}
		</AuthShell>
	);
}
