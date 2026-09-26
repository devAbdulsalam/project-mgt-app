// The layout for everything under /console.
//
// Its only real job is one exception: /console/security has to be reachable by an
// operator who does not yet have a second factor, because that is where they go
// to get one. ConsoleGate enforces the factor wall by replacing the console with
// an enrolment prompt, which is right for every data screen and fatal for the
// enrolment screen itself.
//
// So the exemption is decided here, once, by path — rather than by threading a
// flag through every leaf route, and rather than teaching the gate about route
// ids. The security route is the only one under /console that is safe to open
// without a factor: it reads standing-only endpoints, and every call it makes
// that needs elevation is the operator's own.
//
// The sign-in route is a sibling rather than a child, so an expired cookie
// cannot bounce a half-signed-in operator into a form they have already filled
// in. ConsoleGate covers the expired-mid-session case and points here.

import { Outlet, useRouterState } from '@tanstack/react-router';
import { ConsoleGate } from './components/ConsoleGate';

const SECURITY_PATH = '/console/security';

export function ConsoleLayout() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });

	// The exemption is deliberately narrow: the exact security path, not a
	// prefix, so a future /console/security/anything is not accidentally exempt.
	const needsFactor = pathname !== SECURITY_PATH;

	return (
		<ConsoleGate requireFactor={needsFactor}>
			<Outlet />
		</ConsoleGate>
	);
}
