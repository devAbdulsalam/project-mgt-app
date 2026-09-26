// The bridge between "the server wants a code" and "the operator is looking at a
// screen".
//
// Every elevated endpoint answers 403 `elevation_required` when the window has
// closed. Without something in the middle, each page would have to interpret
// that error itself, and the interpretation is exactly the sort of thing that
// gets forgotten on the page nobody tested — leaving a support operator staring
// at an empty table with no idea that a six-digit code would fix it.
//
// So the handling lives here once: run the query only while elevated, and when
// the server says otherwise, put the prompt up over whatever is on screen. The
// page keeps its own data, its own scroll position and its own filters, and the
// prompt goes away by itself once elevation is granted — because the query
// re-runs the moment the store's elevation flips, and a fresh 200 replaces the
// error without the page having to know that happened.
//
// `enabled: elevated` is also why this is a wrapper and not just an error
// handler: not firing a request the server is going to refuse is cheaper than
// firing it and rendering the refusal.

import { useState, type ReactNode } from 'react';
import { useQuery, type QueryKey, type UseQueryOptions } from '@tanstack/react-query';
import { useConsoleStore } from '../store';
import { isElevated } from '../model';
import { classify, refusalMessage } from '../lib/errors';
import { ElevationPrompt } from '../components/ElevationPrompt';

export interface ConsoleQueryResult<T> {
	data: T | undefined;
	/** A refusal that is not a request for a code — null while an elevation prompt is up. */
	error: string | null;
	loading: boolean;
	isFetching: boolean;
	refetch: () => void;
	/** The elevation prompt to render over the page, or null. */
	gate: ReactNode;
}

/**
 * `TQueryKey` is threaded through rather than left to default to `unknown[]`,
 * because TanStack infers the registered key type from it. Erasing it here made
 * every call site fail to typecheck against its own `queryKey`.
 */
export function useConsoleQuery<TData, TQueryKey extends QueryKey = QueryKey>(
	options: UseQueryOptions<TData, Error, TData, TQueryKey>,
	config?: { requireElevation?: boolean },
): ConsoleQueryResult<TData> {
	const requireElevation = config?.requireElevation ?? true;
	const operator = useConsoleStore((s) => s.operator);
	const elevated = isElevated(operator ?? { elevatedUntil: null });

	const query = useQuery({
		...options,
		enabled: requireElevation ? elevated : true,
		// A refusal is not a failure worth retrying: the operator is about to
		// prove themselves, and elevation flipping is the retry.
		retry: false,
	});

	const refusal = query.error ? classify(query.error, operator !== null) : null;
	const wantsCode = refusal !== null && (refusal.kind === 'elevation' || refusal.kind === 'enrolment');

	// The prompt is derived, not stored. `dismissed` records only the one piece
	// of history that cannot be recomputed — that this particular refusal was
	// waved away — and it is keyed by the message, so a *different* refusal later
	// still gets its prompt without anything having to reset it.
	//
	// The two things that used to live in effects are now consequences of state
	// that already exists: elevation grants a window, and TanStack clears
	// `query.error` as soon as the refetch succeeds, so both fall out of the
	// render rather than needing a synchronisation effect that could run late.
	const [dismissed, setDismissed] = useState<string | null>(null);
	const reason = wantsCode && !elevated ? refusalMessage(refusal) : null;
	const prompt = reason !== null && reason !== dismissed ? reason : null;

	return {
		data: query.data,
		// Anything the prompt is not covering is a real error the page must show.
		error: refusal && !wantsCode ? refusalMessage(refusal) : null,
		loading: query.isPending,
		isFetching: query.isFetching,
		refetch: () => void query.refetch(),
		gate: prompt ? <ElevationPrompt reason={prompt} onCancel={() => setDismissed(prompt)} /> : null,
	};
}
