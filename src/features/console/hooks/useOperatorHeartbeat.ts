// Keeps the operator's standing fresh for as long as the console is open.
//
// The store holds the single copy of `operator`; this only tells it to re-read.
// That is deliberate — a second copy in a query cache would be a second thing to
// keep in sync with a 30-minute elevation window, and the two would eventually
// disagree about whether the operator is still allowed to act.
//
// Why poll at all, when the server enforces elevation anyway? Because the
// console's job is to tell the operator the truth before they act, not to
// discover it afterwards. Polling the standing-only endpoint is cheap, and it
// means a revoked operator's console closes on its own rather than waiting for
// them to click something and meet a 403.
//
// 30 seconds, and re-read on focus: a tab left open overnight must not sit on
// an elevation that expired hours ago, and the countdown in the header is
// derived from this same state.

import { useEffect } from 'react';
import { useConsoleStore } from '../store';

const HEARTBEAT_MS = 30_000;

export function useOperatorHeartbeat() {
	const state = useConsoleStore((s) => s.state);
	const refreshOperator = useConsoleStore((s) => s.refreshOperator);

	useEffect(() => {
		if (state !== 'ready') return;

		const refresh = () => void refreshOperator();
		const onVisible = () => {
			if (document.visibilityState === 'visible') refresh();
		};

		refresh();
		const id = setInterval(refresh, HEARTBEAT_MS);
		window.addEventListener('focus', refresh);
		document.addEventListener('visibilitychange', onVisible);

		return () => {
			clearInterval(id);
			window.removeEventListener('focus', refresh);
			document.removeEventListener('visibilitychange', onVisible);
		};
	}, [state, refreshOperator]);
}
