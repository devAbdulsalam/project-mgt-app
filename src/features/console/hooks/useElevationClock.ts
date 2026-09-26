// Elevation as a countdown, not a boolean.
//
// The server grants 30 minutes from a TOTP verification and enforces it on every
// request. The console has to show the same truth the server holds, which means:
//
//   - the clock is derived from `elevation_expires_at`, never from a local
//     "I verified, so I am fine for 30 minutes" timer. A local timer would
//     drift from the server's and, worse, would keep believing after the
//     operator's authenticator had been removed or their standing revoked.
//   - it flips to not-elevated the moment it reaches zero rather than waiting
//     for the next failed request, so the gate closes under the operator
//     rather than after they click something and get a 403.
//   - the tab waking from sleep re-reads the clock rather than trusting however
//     many intervals the browser decided to run.
//
// The last point is why this ticks against Date.now() instead of decrementing a
// counter: a backgrounded tab has its timers throttled to roughly once a
// minute, and a decrementing counter would happily believe it had 29 minutes
// left when 29 seconds was the truth.

import { useEffect, useState } from 'react';

export interface ElevationClock {
	/** True while the server's window is still open. */
	elevated: boolean;
	/** Seconds left, 0 when not elevated. */
	remaining: number;
	/** "29:59", or null when not elevated. */
	label: string | null;
	/** 0–1, for a progress bar. 0 when not elevated. */
	progress: number;
}

/**
 * Pure, so it can be called during render.
 *
 * The clock is derived from two inputs and stored nowhere: the server's deadline
 * and the current time. Making it a function of both means a change to
 * `elevatedUntil` — a new window granted, or a revoke that nulls it — is
 * reflected in the very next render, with no synchronisation effect to run a
 * frame late and briefly show a window that no longer exists.
 */
function compute(elevatedUntil: number | null, now: number, windowMs: number): ElevationClock {
	if (elevatedUntil === null) return { elevated: false, remaining: 0, label: null, progress: 0 };
	const left = elevatedUntil - now;
	if (left <= 0) return { elevated: false, remaining: 0, label: null, progress: 0 };
	const remaining = Math.ceil(left / 1000);
	const m = Math.floor(remaining / 60);
	const s = remaining % 60;
	return {
		elevated: true,
		remaining,
		label: `${m}:${s.toString().padStart(2, '0')}`,
		progress: Math.min(1, Math.max(0, left / windowMs)),
	};
}

/**
 * @param elevatedUntil epoch ms from the server, or null
 * @param windowMs      the full window, for the progress bar. Mirrors ELEVATION_MINUTES.
 */
export function useElevationClock(elevatedUntil: number | null, windowMs: number): ElevationClock {
	// The only piece of state is "what time is it". The deadline is not state here.
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		if (elevatedUntil === null || elevatedUntil <= Date.now()) return;

		// This is a subscription to an external system — the wall clock — so
		// updating state from its callbacks is exactly what effects are for.
		const tick = () => setNow(Date.now());
		const id = setInterval(tick, 1000);
		window.addEventListener('focus', tick);
		// visibilitychange fires where focus does not, e.g. switching tabs on
		// mobile, and is the more reliable of the two on a phone.
		const onVisible = () => {
			if (document.visibilityState === 'visible') tick();
		};
		document.addEventListener('visibilitychange', onVisible);

		return () => {
			clearInterval(id);
			window.removeEventListener('focus', tick);
			document.removeEventListener('visibilitychange', onVisible);
		};
	}, [elevatedUntil]);

	return compute(elevatedUntil, now, windowMs);
}

/** "just now" / "4 min ago" / "3 days ago", for audit rows and account history. */
export function relativeTime(epochMs: number | null | undefined): string {
	if (epochMs == null) return '—';
	const delta = Date.now() - epochMs;
	const future = delta < 0;
	const abs = Math.abs(delta);

	const minute = 60_000;
	const hour = 60 * minute;
	const day = 24 * hour;

	let text: string;
	if (abs < minute) text = 'just now';
	else if (abs < hour) text = `${Math.floor(abs / minute)} min`;
	else if (abs < day) text = `${Math.floor(abs / hour)} h`;
	else if (abs < 30 * day) text = `${Math.floor(abs / day)} d`;
	else text = `${Math.floor(abs / (30 * day))} mo`;

	if (text === 'just now') return text;
	return future ? `in ${text}` : `${text} ago`;
}
