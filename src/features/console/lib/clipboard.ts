// Clipboard, with the two things that actually go wrong handled.
//
// `navigator.clipboard` is unavailable on http:// origins and inside some
// in-app webviews, and it rejects without a user gesture. Both are normal
// enough that a bare `await writeText()` in a click handler is a latent crash,
// so every call here has a fallback and resolves rather than rejects.

import { useCallback, useRef, useState } from 'react';

/** Copies text, resolving false when the platform refused. Never throws. */
export async function copyText(text: string): Promise<boolean> {
	try {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return true;
		}
	} catch {
		// Fall through to the textarea path.
	}

	// The old way, still the only one that works without a secure context.
	try {
		const el = document.createElement('textarea');
		el.value = text;
		// Off-screen rather than display:none — a hidden element cannot be
		// selected, and select() is what puts the text on the clipboard.
		el.setAttribute('readonly', '');
		el.style.position = 'fixed';
		el.style.top = '-1000px';
		el.style.opacity = '0';
		document.body.appendChild(el);
		el.select();
		const ok = document.execCommand('copy');
		document.body.removeChild(el);
		return ok;
	} catch {
		return false;
	}
}

/**
 * A copy button with a "copied" acknowledgement.
 *
 * `resetAfter` is what keeps it honest: without it the label would sit on
 * "Copied" and imply the last action was a copy when it was not.
 */
export function useCopy(resetAfter = 2000) {
	const [copied, setCopied] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	const copy = useCallback(
		async (text: string) => {
			const ok = await copyText(text);
			clearTimeout(timer.current);
			if (!ok) return false;
			setCopied(true);
			timer.current = setTimeout(() => setCopied(false), resetAfter);
			return true;
		},
		[resetAfter],
	);

	return { copied, copy };
}
