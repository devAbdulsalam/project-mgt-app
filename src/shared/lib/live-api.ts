// Per-module data-source switch for the mock → live cutover (backend plan §17.2).
// A module flips to the real API when enabled; the rest keep reading the mock DB.

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'ledgedesk.live-api';

function initialValue(): boolean {
	if (import.meta.env.VITE_USE_LIVE_API === '1') return true;
	try {
		return window.sessionStorage.getItem(STORAGE_KEY) === '1';
	} catch {
		return false;
	}
}

let enabled = initialValue();
const listeners = new Set<() => void>();

export function isLiveApi() {
	return enabled;
}

export function setLiveApi(value: boolean) {
	if (value === enabled) return;
	enabled = value;
	try {
		if (value) window.sessionStorage.setItem(STORAGE_KEY, '1');
		else window.sessionStorage.removeItem(STORAGE_KEY);
	} catch {
		// Storage unavailable (private mode) — keep in-memory flag.
	}
	for (const listener of [...listeners]) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** Reactive flag; components re-render when it flips. */
export function useLiveApi() {
	return useSyncExternalStore(subscribe, isLiveApi);
}