// The console's front door.
//
// Four states, in the order the server forces them:
//
//   checking          a session is being established — nothing rendered
//   signed-out        the sign-in screen
//   not-an-operator   a session exists, but this account has no standing
//   ready + no factor an operator with no second factor: enrol first
//   ready + elevated  the console
//
// The two middle cases are the interesting ones and the reason this is a
// component rather than a route guard. A guard can only redirect, and both of
// these need to *explain*: an operator who lands on "not an operator" has
// usually followed a link from a colleague and deserves to know the link was
// not broken, and an operator without a second factor is one screen away from
// being locked out of the only surface that can fix it.
//
// Note what the gate does NOT do: it does not treat "not elevated" as a gate.
// The server refuses individual elevated endpoints, and the pages handle that
// by showing the elevation prompt. Gating the whole console on elevation would
// mean re-authenticating to read a row of the audit log, and would train
// operators to type their code on demand rather than when it means something.

import { useEffect, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button, Card } from '@/shared/ui';
import { useConsoleStore } from '../store';
import { useOperatorHeartbeat } from '../hooks/useOperatorHeartbeat';
import { ELEVATION_MINUTES } from '../model';
import { ConsoleShell } from './ConsoleShell';

export function ConsoleGate({ children, requireFactor = true }: { children: ReactNode; requireFactor?: boolean }) {
	const state = useConsoleStore((s) => s.state);
	const operator = useConsoleStore((s) => s.operator);
	const reason = useConsoleStore((s) => s.reason);
	const establish = useConsoleStore((s) => s.establish);

	// Runs unconditionally on mount, but no-ops unless the console is open — so
	// the security page (which is reachable without a factor) still gets its
	// standing refreshed by the same hook.
	useOperatorHeartbeat();

	// Establish once per mount. The store is a module singleton, so a strict-mode
	// double-effect runs this twice; `establish` is idempotent and both calls
	// converge on the same server answer, so there is nothing to guard.
	useEffect(() => {
		if (state === 'checking') void establish();
	}, [state, establish]);

	if (state === 'checking') return <FullPageWait label="Checking your access…" />;

	if (state === 'signed-out') {
		// The sign-in screen is a route, not a branch here, so it can own its own
		// URL and survive a reload. This only covers the "cookie expired while you
		// were here" case.
		return <SignedOut reason={reason} />;
	}

	if (state === 'not-an-operator') {
		return <NotAnOperator message={reason ?? 'That account is not a platform operator.'} />;
	}

	if (!operator) return <FullPageWait label="Checking your access…" />;

	// No second factor: nothing past this point can work, and the security page
	// is the only route that does not need one.
	if (requireFactor && !operator.totpEnrolled) return <FactorRequired name={operator.name || operator.email} />;

	return <ConsoleShell>{children}</ConsoleShell>;
}

// ---------------------------------------------------------------------------

function FullPageWait({ label }: { label: string }) {
	return (
		<div className="grid min-h-[100dvh] place-items-center bg-muted">
			<div className="flex items-center gap-2.5 text-sm text-t2">
				<Loader2 className="animate-spin" size={16} aria-hidden />
				{label}
			</div>
		</div>
	);
}

function SignedOut({ reason }: { reason: string | null }) {
	return (
		<div className="grid min-h-[100dvh] place-items-center bg-muted px-5">
			<Card className="w-full max-w-[420px] p-7 text-center">
				<h1 className="text-base font-semibold text-t1">Your session has ended</h1>
				<p className="mt-2 text-[13px] text-t2">{reason ?? 'Sign in again to use the console.'}</p>
				{/* A link, not a retry: this branch means the refresh cookie is already
				    dead, so `establish` would only land back here. Retrying is the right
				    response to a *network* failure, and that is what the reason below it
				    says — which is why both are offered. */}
				<Link to="/console/sign-in" search={{}} className="mt-5 block no-underline">
					<Button variant="primary" size="lg" block>
						Sign in
					</Button>
				</Link>
				{reason ? (
					<button
						type="button"
						onClick={() => void useConsoleStore.getState().establish()}
						className="mt-3 text-[12px] font-medium text-t2 underline"
					>
						Try again without signing in
					</button>
				) : null}
			</Card>
		</div>
	);
}

function NotAnOperator({ message }: { message: string }) {
	return (
		<div className="grid min-h-[100dvh] place-items-center bg-muted px-5">
			<Card className="w-full max-w-[460px] p-7">
				<span className="grid size-9 place-items-center rounded-full bg-danger-bg text-danger-fg">
					<ShieldAlert size={18} />
				</span>
				<h1 className="mt-3.5 text-base font-semibold text-t1">You are signed in, but not an operator</h1>
				<p className="mt-2 text-[13px] leading-relaxed text-t2">{message}</p>
				<p className="mt-3 text-[12px] leading-relaxed text-t3">
					The console is limited to accounts with a platform role. If you need one, ask an existing admin — granting standing
					is itself an audited action, and an operator cannot grant it to themselves.
				</p>
				<Button variant="secondary" size="lg" className="mt-5" onClick={() => (window.location.href = '/')} block>
					Go to Ledge
				</Button>
			</Card>
		</div>
	);
}

/**
 * The enrolment wall.
 *
 * Shown instead of the console, not as a modal over it: there is nothing behind
 * it that would work, and a shell full of dead controls is a worse first
 * impression than a single clear instruction.
 */
function FactorRequired({ name }: { name: string }) {
	return (
		<div className="grid min-h-[100dvh] place-items-center bg-muted px-5">
			<Card className="w-full max-w-[480px] p-7">
				<span className="grid size-9 place-items-center rounded-full bg-brand-100 text-brand-900">
					<ShieldAlert size={18} />
				</span>
				<h1 className="mt-3.5 text-base font-semibold text-t1">Add a second factor first</h1>
				<p className="mt-2 text-[13px] leading-relaxed text-t2">
					Hi {name.split(' ')[0] || 'there'} — the console needs an authenticator app before it will do anything. It takes
					about a minute, and it is the only thing protecting every account on the platform.
				</p>
				{/* A client-side Link, not window.location: a full reload would throw away
				    the in-memory access token and make the operator re-establish the
				    session from the cookie for no reason. */}
				<Link to="/console/security" search={{}} className="mt-5 block no-underline">
					<Button variant="primary" size="lg" block>
						Set up an authenticator
					</Button>
				</Link>
				<p className="mt-4 text-[11px] leading-relaxed text-t3">
					You will need any app that generates time-based codes — Aegis, 1Password, Bitwarden and Google Authenticator all
					work. Codes are checked for {ELEVATION_MINUTES} minutes at a time.
				</p>
			</Card>
		</div>
	);
}
