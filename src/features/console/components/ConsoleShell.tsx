// The console's own frame.
//
// Deliberately not AppShell. That shell is org-shaped: it resolves a workspace
// from the URL, shows that workspace's switcher, and links to that workspace's
// pages. None of that means anything to an operator, and an operator may belong
// to no workspace at all. Reusing it would have meant a shell that renders a
// broken workspace switcher for exactly the people who need the console most.
//
// The header carries the two things that are load-bearing here and nowhere else:
// who you are as an operator, and how long your elevation has left.

import { useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import {
	Activity,
	Building2,
	FileClock,
	LogOut,
	ScrollText,
	ShieldAlert,
	ShieldCheck,
	Users,
} from 'lucide-react';
import { Avatar, Button, Dialog } from '@/shared/ui';
import { toast } from '@/shared/lib/toast-store';
import { useQueryClient } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { stepDownMutation } from '../api/mutations';
import { useConsoleStore } from '../store';
import { useElevationClock } from '../hooks/useElevationClock';
import { ELEVATION_MINUTES, canWrite } from '../model';
import { PLATFORM_ROLE_LABEL } from '../lib/constants';
import { useSignOut } from '../lib/session';
import patternBg from '@/assets/patterns/pattern8.webp';

const NAV = [
	{ to: '/console', label: 'Overview', icon: Activity, exact: true },
	{ to: '/console/users', label: 'Accounts', icon: Users },
	{ to: '/console/workspaces', label: 'Workspaces', icon: Building2 },
	{
		to: '/console/operators',
		label: 'Operators',
		icon: ShieldCheck,
		adminOnly: true,
	},
	{ to: '/console/audit', label: 'Audit trail', icon: ScrollText },
	{ to: '/console/security', label: 'Security', icon: FileClock },
] as const;

export function ConsoleShell({ children }: { children: React.ReactNode }) {
	const queryClient = useQueryClient();
	const signOut = useSignOut();
	const operator = useConsoleStore((s) => s.operator);
	const pathname = useRouterState({ select: (s) => s.location.pathname });

	const clock = useElevationClock(
		operator?.elevatedUntil ?? null,
		ELEVATION_MINUTES * 60_000,
	);
	const stepDown = useMutation(stepDownMutation(queryClient));
	const isAdmin = canWrite(operator?.role ?? null);

	const [confirmSignOut, setConfirmSignOut] = useState(false);
	const [signingOut, setSigningOut] = useState(false);

	if (!operator) return null;

	return (
		<div
			className="min-h-dvh bg-muted"
			style={{
				// The interior stays a *light* surface — this is texture, not the dark
				// wash `ConsoleAuthBackdrop` uses before sign-in. Without a near-opaque
				// tint on top, the raw pattern reads as loud line art directly behind
				// plain text (`PageHeader` renders its title with no card underneath
				// it), so it's blended almost entirely into the muted canvas colour
				// first — enough to texture the page, not enough to compete with text.
				backgroundImage: `linear-gradient(rgba(238, 241, 244, .95), rgba(238, 241, 244, .95)), url(${patternBg})`,
				backgroundSize: 'auto, 320px 320px',
				backgroundRepeat: 'no-repeat, repeat',
				backgroundPosition: 'center, center',
			}}
		>
			<header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur">
				<div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-5">
					<Link
						to="/console"
						className="flex items-center gap-2 text-t1 no-underline"
					>
						<span className="grid size-7 place-items-center rounded-sm bg-brand-900 text-white">
							<ShieldCheck size={15} />
						</span>
						<span className="text-sm font-semibold">Ledge console</span>
						{/* Marks the surface as not-the-product, everywhere it appears. An
						 operator who screenshots this and pastes it into a support thread
						 should make clear it is the operator console. */}
						<span className="rounded-sm bg-danger-bg px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-danger-fg">
							Internal
						</span>
					</Link>

					<div className="ml-auto flex items-center gap-3">
						<ElevationBadge
							label={clock.label}
							progress={clock.progress}
							elevated={clock.elevated}
						/>

						<div className="flex items-center gap-2 border-l border-border pl-3">
							<Avatar
								name={operator.name || operator.email}
								size="sm"
								className="size-7 text-[10px]"
							/>
							<div className="hidden leading-tight sm:block">
								<p className="max-w-[160px] truncate text-xs font-semibold text-t1">
									{operator.name || operator.email}
								</p>
								<p className="text-[11px] text-t2">
									{PLATFORM_ROLE_LABEL[operator.role]}
								</p>
							</div>
						</div>

						{clock.elevated ? (
							<Button
								size="sm"
								variant="ghost"
								loading={stepDown.isPending}
								onClick={() =>
									stepDown.mutate(undefined, {
										onSuccess: () => {
											toast('Stepped down', {
												description:
													'You will be asked for a code again on the next action.',
												tone: 'success',
											});
										},
									})
								}
								title="Drop elevation without signing out"
							>
								Step down
							</Button>
						) : null}

						{/* Confirmed, not immediate: a stray click here does not just end a
						    session, it drops elevation and, for an admin mid-task, can mean
						    re-authenticating through TOTP to pick back up. */}
						<Button
							size="sm"
							variant="ghost"
							iconOnly
							title="Sign out of the console"
							onClick={() => setConfirmSignOut(true)}
						>
							<LogOut size={15} />
						</Button>
					</div>
				</div>
			</header>

			<div className="mx-auto flex max-w-[1400px] gap-6 px-5 py-6">
				<nav aria-label="Console sections" className="hidden w-[190px] shrink-0 md:block">
					{/* Opaque, bordered, and its own sticky unit — one card the pattern
					    never shows through, rather than the title bar and footnote
					    stickying independently at two magic offsets. */}
					<div className="sticky top-20 rounded-md border border-border bg-white p-4 shadow-[0_1px_2px_rgba(27,42,50,.06)]">
						<ul className="space-y-0.5">
							{NAV.filter(
								(item) => !('adminOnly' in item && item.adminOnly) || isAdmin,
							).map((item) => {
								const active =
									'exact' in item && item.exact
										? pathname === item.to
										: pathname.startsWith(item.to);
								return (
									<li key={item.to}>
										<Link
											to={item.to}
											className={`flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13px] no-underline transition-colors ${
												active
													? 'bg-muted font-semibold text-t1'
													: 'text-t2 hover:bg-muted hover:text-t1'
											}`}
										>
											<item.icon size={15} aria-hidden />
											{item.label}
										</Link>
									</li>
								);
							})}
						</ul>

						<p className="mt-6 border-t border-border pt-4 text-[11px] leading-relaxed text-t3">
							Every action here is written to the audit trail with your account,
							IP and user agent. There is no tenant content on this surface — only
							accounts, workspaces and counts.
						</p>
					</div>
				</nav>

				<main className="min-w-0 flex-1">{children}</main>
			</div>

			<Dialog
				open={confirmSignOut}
				onClose={() => (signingOut ? null : setConfirmSignOut(false))}
				title="Sign out of the console?"
				width="max-w-[420px]"
				footer={
					<div className="flex justify-end gap-2">
						<Button variant="ghost" disabled={signingOut} onClick={() => setConfirmSignOut(false)}>
							Stay signed in
						</Button>
						<Button
							variant="danger"
							loading={signingOut}
							onClick={async () => {
								setSigningOut(true);
								await signOut();
								// No navigate: `signOut` resets the store to `signed-out`, and
								// `ConsoleGate` reacts by swapping this shell for the sign-in
								// screen in place — the dialog unmounts along with it.
							}}
						>
							<LogOut size={15} aria-hidden /> Sign out
						</Button>
					</div>
				}
			>
				<div className="px-5 py-5 sm:px-7">
					<div className="flex items-center gap-3 rounded-md bg-muted p-3">
						<Avatar name={operator.name || operator.email} size="lg" />
						<span className="min-w-0">
							<b className="block truncate text-[13px]">{operator.name || operator.email}</b>
							<span className="block truncate text-xs text-t2">{PLATFORM_ROLE_LABEL[operator.role]}</span>
						</span>
					</div>
					{clock.elevated ? (
						<p className="mt-3 flex items-start gap-2 rounded-md border border-warning bg-warning-bg px-3 py-2.5 text-[12px] leading-relaxed text-warning-fg">
							<ShieldAlert size={15} className="mt-0.5 shrink-0" aria-hidden />
							You are elevated right now — signing out drops that immediately. Coming back means re-entering a TOTP code.
						</p>
					) : (
						<p className="mt-3 text-[13px] leading-relaxed text-t2">
							You&rsquo;ll be returned to the console sign-in screen. This — like everything else here — is recorded against
							your account.
						</p>
					)}
				</div>
			</Dialog>
		</div>
	);
}

/**
 * The elevation indicator.
 *
 * Deliberately loud, and it turns amber in the last two minutes. Elevation is
 * the only thing standing between a stolen access token and every account on
 * the platform, so the console never lets an operator lose track of it.
 */
function ElevationBadge({
	label,
	progress,
	elevated,
}: {
	label: string | null;
	progress: number;
	elevated: boolean;
}) {
	if (!elevated || !label) {
		return (
			<span className="hidden items-center gap-1.5 text-[11px] font-semibold text-t2 sm:inline-flex">
				<span className="size-1.5 rounded-full bg-grey-fg" aria-hidden />
				Not elevated
			</span>
		);
	}

	// "29:59" — the last two digits turning amber in the final minute is the
	// cue to re-verify before an action is refused mid-flow.
	const [minutes] = label.split(':');
	const urgent = Number(minutes) === 0;

	return (
		<span
			className={`hidden items-center gap-2 rounded-sm border px-2 py-1 text-[11px] font-semibold sm:inline-flex ${urgent ? 'border-warning bg-warning-bg text-warning-fg' : 'border-border-strong bg-white text-t2'}`}
			title="Elevation remaining. The server enforces this; the countdown is only a heads-up."
		>
			<span className="size-1.5 rounded-full bg-success" aria-hidden />
			Elevated {label}
			<span
				className="h-1 w-10 overflow-hidden rounded-full bg-muted"
				aria-hidden
			>
				<span
					className="block h-full rounded-full bg-brand-600 transition-[width] duration-1000"
					style={{ width: `${Math.round(progress * 100)}%` }}
				/>
			</span>
		</span>
	);
}
